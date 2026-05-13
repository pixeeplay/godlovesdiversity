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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SCRIPTS: Record<string, string> = {
  import: 'scripts/import-final.ts',
  regions: '',  // static, no script needed
  rewrite: 'scripts/rewrite-descriptions.ts',
  top10: 'scripts/generate-top10-articles.ts'
};

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

  if (!script) return new Response(`boost inconnu: ${boost}`, { status: 400 });

  const cwd = process.cwd();
  const scriptPath = path.join(cwd, script);

  // Resolve Gemini API key from DB Setting (override env if defined in BO)
  let geminiKey = process.env.GEMINI_API_KEY;
  try {
    const dbKey = await getSetting('integrations.gemini.apiKey');
    if (dbKey) geminiKey = dbKey;
  } catch { /* ignore */ }

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
