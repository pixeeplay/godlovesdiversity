/**
 * /api/admin/seo/[boost] — Lance un job SEO en streaming.
 *   POST /api/admin/seo/import
 *   POST /api/admin/seo/regions
 *   POST /api/admin/seo/rewrite
 *   POST /api/admin/seo/top10
 *
 * Streame les logs en SSE-like (text/plain chunked) au client.
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { getSetting } from '@/lib/settings';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCRIPTS: Record<string, string> = {
  import: 'scripts/import-final.ts',
  regions: '',  // static, no script needed
  rewrite: 'scripts/rewrite-descriptions.ts',
  top10: 'scripts/generate-top10-articles.ts'
};

// Boosts spéciaux non-script (purges DB ou orchestration)
const SPECIAL_BOOSTS = ['run-all', 'reset-articles', 'reset-rewrites', 'reset-all'];

export async function POST(req: NextRequest, { params }: { params: Promise<{ boost: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new Response('forbidden', { status: 403 });
  }

  const { boost } = await params;
  const script = SCRIPTS[boost];

  // Regions = static, no job needed
  if (boost === 'regions') {
    return new Response('✅ Pages régionales sont statiques, déjà actives.\nVérifie : /fr/region/ile-de-france, /fr/region/occitanie, etc.\nAucune action serveur nécessaire.\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }

  // Resolve Gemini API key from DB Setting (override env if defined in BO)
  let geminiKey = process.env.GEMINI_API_KEY;
  try {
    const dbKey = await getSetting('integrations.gemini.apiKey');
    if (dbKey) geminiKey = dbKey;
  } catch { /* ignore */ }

  // === Boosts spéciaux non-script (run-all + resets DB) ===
  if (SPECIAL_BOOSTS.includes(boost)) {
    return handleSpecial(boost, geminiKey);
  }

  if (!script) return new Response(`boost inconnu: ${boost}`, { status: 400 });

  const cwd = process.cwd();
  const scriptPath = path.join(cwd, script);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (line: string) => controller.enqueue(enc.encode(line + '\n'));

      send(`▶ Lancement ${script}`);
      send(`  cwd=${cwd}`);
      if (boost !== 'import') {
        send(`  gemini_key=${geminiKey ? 'OK (' + geminiKey.slice(0, 6) + '…)' : 'MANQUANTE'}`);
      }

      try {
        const child = spawn('npx', ['tsx', scriptPath], {
          cwd,
          env: { ...process.env, GEMINI_API_KEY: geminiKey || '' },
          shell: false
        });

        child.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const l of lines) if (l.trim()) send(l);
        });
        child.stderr.on('data', (data) => {
          const lines = data.toString().split('\n');
          for (const l of lines) if (l.trim()) send(`⚠ ${l}`);
        });
        child.on('close', (code) => {
          send(`\n${code === 0 ? '✅' : '❌'} Process terminé (code=${code})`);
          controller.close();
        });
        child.on('error', (err) => {
          send(`❌ Spawn error: ${err.message}`);
          controller.close();
        });
      } catch (e: any) {
        send(`❌ ${e.message}`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' }
  });
}

// ───────────────────────────────────────────────────────────────────────────
// Boosts spéciaux : orchestration multi-scripts + purges DB ciblées
// ───────────────────────────────────────────────────────────────────────────

function streamReply(): { res: Response; send: (line: string) => void; close: () => void } {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const enc = new TextEncoder();
  const stream = new ReadableStream({ start(c) { controller = c; } });
  return {
    res: new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' } }),
    send: (line: string) => { try { controller.enqueue(enc.encode(line + '\n')); } catch { /* closed */ } },
    close: () => { try { controller.close(); } catch { /* already closed */ } }
  };
}

function spawnScript(script: string, geminiKey: string | undefined, send: (l: string) => void): Promise<number> {
  return new Promise((resolve) => {
    const cwd = process.cwd();
    const scriptPath = path.join(cwd, script);
    send(`▶ Lancement ${script}`);
    if (script.includes('rewrite') || script.includes('top10')) {
      send(`  gemini_key=${geminiKey ? 'OK (' + geminiKey.slice(0, 6) + '…)' : 'MANQUANTE'}`);
    }
    const child = spawn('npx', ['tsx', scriptPath], {
      cwd,
      env: { ...process.env, GEMINI_API_KEY: geminiKey || '' },
      shell: false
    });
    child.stdout.on('data', (d) => d.toString().split('\n').forEach((l: string) => l.trim() && send(l)));
    child.stderr.on('data', (d) => d.toString().split('\n').forEach((l: string) => l.trim() && send(`⚠ ${l}`)));
    child.on('close', (code) => { send(`${code === 0 ? '✅' : '❌'} ${script} terminé (code=${code})\n`); resolve(code ?? 1); });
    child.on('error', (err) => { send(`❌ Spawn error: ${err.message}`); resolve(1); });
  });
}

function handleSpecial(boost: string, geminiKey: string | undefined): Response {
  const { res, send, close } = streamReply();

  (async () => {
    try {
      send(`▶ Spécial: ${boost}`);
      send(`  cwd=${process.cwd()}`);
      send('─'.repeat(50));

      if (boost === 'reset-articles' || boost === 'reset-all') {
        send('🗑  Suppression des articles SEO auto-générés (slug LIKE "top-10-%")…');
        const del = await prisma.article.deleteMany({ where: { slug: { startsWith: 'top-10-' } } });
        send(`   → ${del.count} articles supprimés`);
      }

      if (boost === 'reset-rewrites' || boost === 'reset-all') {
        // Re-aligne les descriptions France sur Paris pour permettre à boost 2 de re-Gemini
        send('🗑  Re-synchronisation descriptions France ← Paris (pour relancer rewrite)…');
        const sitePAris = await prisma.site.findUnique({ where: { domain: 'parislgbt.com' } });
        const siteFrance = await prisma.site.findUnique({ where: { domain: 'lgbtfrance.fr' } });
        if (sitePAris && siteFrance) {
          const parisListings = await prisma.listing.findMany({
            where: { site_id: sitePAris.id, description_fr: { not: null } },
            select: { slug: true, description_fr: true }
          });
          let resynced = 0;
          for (const p of parisListings) {
            const r = await prisma.listing.updateMany({
              where: { site_id: siteFrance.id, slug: p.slug },
              data: { description_fr: p.description_fr }
            });
            if (r.count > 0) resynced++;
          }
          send(`   → ${resynced} descriptions France resynchronisées`);
        } else {
          send('   ⚠ Sites introuvables (skip)');
        }
      }

      if (boost === 'reset-all') {
        send('🗑  Suppression de tous les listings…');
        const dlc = await prisma.listingCategory.deleteMany({});
        const dl = await prisma.listing.deleteMany({});
        send(`   → ${dlc.count} ListingCategory + ${dl.count} Listing supprimés`);
      }

      // Pour run-all et reset-all : enchaîne les 3 boosts dans l'ordre
      if (boost === 'run-all' || boost === 'reset-all') {
        send('\n═══════════════════════════════════════════');
        send('🚀 Enchaînement des 3 boosts SEO');
        send('═══════════════════════════════════════════\n');

        const c1 = await spawnScript('scripts/import-final.ts', geminiKey, send);
        if (c1 !== 0) { send('❌ Stop : import a échoué.'); close(); return; }

        send('\nℹ️  Pages régionales : statiques, déjà actives (skip).\n');

        const c2 = await spawnScript('scripts/rewrite-descriptions.ts', geminiKey, send);
        if (c2 !== 0) send('⚠ rewrite a échoué — on continue tout de même.');

        const c3 = await spawnScript('scripts/generate-top10-articles.ts', geminiKey, send);
        if (c3 !== 0) send('⚠ top10 a échoué.');

        send('\n═══════════════════════════════════════════');
        send('✅ Chaîne terminée — vérifie /sitemap.xml et /fr/blog');
        send('═══════════════════════════════════════════');
      } else {
        send('\n✅ Reset terminé. Relance maintenant les boosts manuellement ou utilise "Tout regénérer".');
      }
    } catch (e: any) {
      send(`❌ Erreur: ${e.message || String(e)}`);
    } finally {
      close();
    }
  })();

  return res;
}
