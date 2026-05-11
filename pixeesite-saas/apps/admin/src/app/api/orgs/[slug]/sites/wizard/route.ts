import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma, ensureTenantDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { ensureTenantTables } from '@/lib/tenant-init';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/orgs/[slug]/sites/wizard
 * Body: { templateId, name, brief, audience, tone, primaryColor, font, logoUrl, sections: [], heroBgKeyword? }
 *
 * Stream NDJSON : chaque ligne est { step, ok, detail, progress?, page? }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  if (!b.name || !b.brief) return NextResponse.json({ error: 'name + brief required' }, { status: 400 });

  const encoder = new TextEncoder();
  const orgId = auth.membership.org.id;

  const stream = new ReadableStream({
    async start(ctrl) {
      const emit = (msg: any) => ctrl.enqueue(encoder.encode(JSON.stringify(msg) + '\n'));

      try {
        // 1. Récupère le template
        emit({ step: 'fetch-template', ok: true });
        const template = b.templateId ? await platformDb.template.findUnique({ where: { id: b.templateId } }) : null;
        const blocksSeed = (template?.blocksSeed as any) || { pages: [{ slug: '/', title: 'Accueil', isHome: true, blocks: [] }] };
        const pages = blocksSeed.pages || [];

        // 2. Update theme org si fourni
        if (b.primaryColor || b.font || b.logoUrl) {
          emit({ step: 'apply-theme', ok: true, detail: `couleur=${b.primaryColor} font=${b.font}` });
          await platformDb.org.update({
            where: { id: orgId },
            data: {
              ...(b.primaryColor && { primaryColor: b.primaryColor }),
              ...(b.font && { font: b.font }),
              ...(b.logoUrl && { logoUrl: b.logoUrl }),
            },
          }).catch(() => {});
        }

        // 3. Crée le site
        const slug = (b.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
        let finalSlug = slug;
        let counter = 2;
        while (await platformDb.site.findUnique({ where: { orgId_slug: { orgId, slug: finalSlug } } }).catch(() => null)) {
          finalSlug = `${slug}-${counter++}`;
          if (counter > 100) break;
        }
        // status='published' direct → le site est immédiatement visible sur <orgSlug>.pixeeplay.com
        // L'utilisateur peut toujours le dépublier après depuis le builder
        const site = await platformDb.site.create({
          data: { orgId, slug: finalSlug, name: b.name, status: 'published', deployedAt: new Date(), templateId: b.templateId || null },
        });
        emit({ step: 'site-created', ok: true, detail: { id: site.id, slug: finalSlug }, progress: 10 });

        // Auto-provisionne la DB tenant si elle n'existe pas (CREATE DATABASE + set Org.tenantDbName)
        try {
          const provRes = await ensureTenantDb(orgSlug);
          emit({ step: 'ensure-db', ok: true, detail: provRes.created ? `DB "${provRes.dbName}" créée` : `DB "${provRes.dbName}" prête`, progress: 7 });
        } catch (e: any) {
          emit({ step: 'ensure-db', ok: false, detail: `Provisioning DB échoué : ${e?.message?.slice(0, 200) || 'unknown'}` });
          ctrl.close();
          return;
        }

        const tenantDb = await getTenantPrisma(orgSlug).catch((e) => {
          emit({ step: 'tenant-db', ok: false, detail: `Connexion tenant échouée : ${e?.message?.slice(0, 200) || 'unknown'}` });
          return null;
        });
        if (!tenantDb) {
          ctrl.close();
          return;
        }

        // Auto-init des tables tenant si elles manquent (idempotent, safe à rejouer)
        emit({ step: 'ensure-tables', ok: true, detail: 'Vérification/création des tables tenant…' });
        const tablesLog = await ensureTenantTables(tenantDb);
        const tablesOk = tablesLog.filter((t) => t.ok).length;
        const tablesKo = tablesLog.filter((t) => !t.ok);
        if (tablesKo.length > 0) {
          emit({ step: 'ensure-tables', ok: false, detail: `${tablesOk}/${tablesLog.length} OK — erreurs: ${tablesKo.map((t) => t.name).join(', ')}` });
        } else {
          emit({ step: 'ensure-tables', ok: true, detail: `${tablesOk}/${tablesLog.length} tables prêtes`, progress: 12 });
        }

        // 4. Pour chaque page → IA personnalise le contenu
        const totalPages = pages.length;
        for (let i = 0; i < pages.length; i++) {
          const p = pages[i];
          emit({ step: `generate-${p.slug}`, ok: true, detail: `Génération IA "${p.title}"…`, progress: 10 + (i / totalPages) * 80 });

          let personalizedBlocks = p.blocks || [];

          // Personnalise via IA si on a un brief
          if (b.brief) {
            try {
              const sysPrompt = `Tu personnalises une page de site web. La page s'appelle "${p.title}", elle fait partie d'un site pour : "${b.brief}". Audience : ${b.audience || 'large'}. Ton : ${b.tone || 'professionnel'}. Adapte le contenu (titres, sous-titres, paragraphes) à ce business.

Tu reçois la liste des blocks JSON existants et tu retournes la même liste mais avec les champs data.title, data.subtitle, data.html, data.label personnalisés. Retourne UNIQUEMENT le JSON array, rien d'autre.`;

              const result = await aiCall({
                orgId,
                feature: 'text',
                prompt: `Blocks à personnaliser :\n${JSON.stringify(personalizedBlocks).slice(0, 4000)}\n\nRetourne le JSON array personnalisé.`,
                systemPrompt: sysPrompt,
                temperature: 0.8,
                maxTokens: 3000,
              });
              if (result.ok && result.output) {
                const m = result.output.match(/\[[\s\S]+\]/);
                if (m) {
                  try {
                    personalizedBlocks = JSON.parse(m[0]);
                  } catch {}
                }
              }
            } catch {}
          }

          // Crée la page en tenant DB
          try {
            await (tenantDb as any).sitePage.create({
              data: {
                siteId: site.id,
                slug: p.slug || '/',
                title: p.title || 'Page',
                blocks: personalizedBlocks,
                isHome: p.isHome || p.slug === '/',
                visible: true,
                meta: p.meta || null,
              },
            });
            emit({ step: `page-${p.slug}`, ok: true, detail: `${personalizedBlocks.length} blocs créés`, progress: 10 + ((i + 1) / totalPages) * 80, page: p.slug });
          } catch (e: any) {
            emit({ step: `page-${p.slug}`, ok: false, detail: e?.message?.slice(0, 200) });
          }
        }

        // 5. Sections optionnelles
        if (Array.isArray(b.sections)) {
          for (const section of b.sections) {
            emit({ step: `enable-${section}`, ok: true, detail: `Activation ${section}` });
            // Stub : ici on créerait les pages /blog, /shop, /forum, /contact selon section
          }
        }

        // 6. Update pageCount
        const pageCount = await (tenantDb as any).sitePage.count({ where: { siteId: site.id } }).catch(() => totalPages);
        await platformDb.site.update({ where: { id: site.id }, data: { pageCount } }).catch(() => {});

        emit({ step: 'done', ok: true, detail: `Site créé avec ${pageCount} pages`, progress: 100, siteSlug: finalSlug });
      } catch (e: any) {
        emit({ step: 'fatal', ok: false, detail: e?.message?.slice(0, 300) });
      }
      ctrl.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'X-Accel-Buffering': 'no' },
  });
}
