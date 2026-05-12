import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { aiCall } from '@/lib/ai-client';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/orgs/[slug]/translations/auto
 * body: { sourceLang: 'fr', targetLangs: ['en','es',...], keys?: string[], namespace?: string, provider?: 'deepl'|'llm' }
 * → traduit en batch les valeurs depuis sourceLang vers targetLangs.
 * Si keys absent, traduit toutes les clés qui n'ont pas encore de valeur dans targetLang.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  const sourceLang = String(b.sourceLang || 'fr');
  const targetLangs = Array.isArray(b.targetLangs) ? b.targetLangs.map(String) : [];
  if (!targetLangs.length) return NextResponse.json({ error: 'targetLangs required' }, { status: 400 });
  const ns = String(b.namespace || 'default');

  const db = await getTenantPrisma(slug);
  // 1. récupère les sources (sourceLang)
  let sources: any[] = [];
  if (Array.isArray(b.keys) && b.keys.length) {
    sources = await (db as any).$queryRawUnsafe(
      `SELECT "key", "value", "context" FROM "Translation"
       WHERE "namespace"=$1 AND "lang"=$2 AND "key" = ANY($3::text[])`, ns, sourceLang, b.keys,
    );
  } else {
    sources = await (db as any).$queryRawUnsafe(
      `SELECT "key", "value", "context" FROM "Translation" WHERE "namespace"=$1 AND "lang"=$2`, ns, sourceLang,
    );
  }
  if (!sources.length) return NextResponse.json({ ok: true, processed: 0, message: 'aucune source à traduire' });

  const orgId = auth.membership.org.id;
  const provider = b.provider === 'deepl' ? 'deepl' : 'llm';
  const deeplKey = provider === 'deepl' ? await getOrgSecret(orgId, 'DEEPL_KEY') : null;
  if (provider === 'deepl' && !deeplKey) return NextResponse.json({ error: 'DEEPL_KEY non configurée' }, { status: 400 });

  let ok = 0, failed = 0;
  const results: any[] = [];

  for (const target of targetLangs) {
    for (const s of sources) {
      // skip si déjà existante (sauf forceOverwrite)
      const existing = await (db as any).$queryRawUnsafe(
        `SELECT "id" FROM "Translation" WHERE "namespace"=$1 AND "key"=$2 AND "lang"=$3`, ns, s.key, target,
      ).catch(() => []);
      if (existing.length && !b.forceOverwrite) {
        results.push({ key: s.key, lang: target, skipped: 'exists' });
        continue;
      }

      let translated: string | null = null;
      try {
        if (provider === 'deepl' && deeplKey) {
          const r = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': `DeepL-Auth-Key ${deeplKey}` },
            body: new URLSearchParams({
              text: s.value,
              source_lang: sourceLang.toUpperCase(),
              target_lang: target.toUpperCase(),
            }),
          });
          if (r.ok) {
            const j: any = await r.json();
            translated = j?.translations?.[0]?.text || null;
          }
        }
        if (!translated) {
          // LLM fallback / primary
          const sys = `Tu es un traducteur professionnel. Tu traduis du ${sourceLang} vers le ${target}.
Rends uniquement la traduction, rien d'autre, pas de guillemets. Préserve les balises HTML, variables {x}, formatage Markdown, et le ton de la source.`;
          const result = await aiCall({
            orgId, feature: 'text',
            prompt: `Source (${sourceLang}) : ${s.value}\n\n${s.context ? `Contexte : ${s.context}\n\n` : ''}Traduis maintenant en ${target}.`,
            systemPrompt: sys,
            temperature: 0.2, maxTokens: 500,
          });
          if (result.ok) translated = result.output.trim();
        }
        if (translated) {
          await (db as any).$executeRawUnsafe(
            `INSERT INTO "Translation" ("id","namespace","key","lang","value","context","approved","translatedBy","createdAt","updatedAt")
             VALUES ($1,$2,$3,$4,$5,$6,false,$7,NOW(),NOW())
             ON CONFLICT ("namespace","key","lang") DO UPDATE SET "value"=EXCLUDED."value","approved"=false,"translatedBy"=EXCLUDED."translatedBy","updatedAt"=NOW()`,
            randomUUID(), ns, s.key, target, translated, s.context || null, provider,
          );
          ok++;
          results.push({ key: s.key, lang: target, ok: true });
        } else {
          failed++;
          results.push({ key: s.key, lang: target, failed: 'no output' });
        }
      } catch (e: any) {
        failed++;
        results.push({ key: s.key, lang: target, failed: e?.message });
      }
    }
  }
  return NextResponse.json({ ok: true, processed: ok, failed, results: results.slice(0, 200) });
}
