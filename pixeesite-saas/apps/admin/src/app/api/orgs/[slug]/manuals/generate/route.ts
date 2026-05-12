import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';
import { getOrgSecret } from '@/lib/secrets';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/orgs/[slug]/manuals/generate
 *  body: { audience: 'b2b'|'b2c'|'internal', tone?: string, productContext?: string, withVideoScript?: boolean, language?: string }
 *
 * Génère :
 *   - un manuel (texte structuré markdown) via aiCall feature='text'
 *   - un outline (3-7 sections)
 *   - optionnellement un script vidéo court (HeyGen/Synthesia friendly)
 *   - persiste dans AiManual du tenant
 */

const AUDIENCE_LABELS: Record<string, string> = {
  b2b: 'professionnels (B2B)',
  b2c: 'particuliers (B2C)',
  internal: 'équipes internes (onboarding/process)',
};

function defaultPromptFor(audience: string, tone: string, productContext: string, language: string) {
  const aLabel = AUDIENCE_LABELS[audience] || audience;
  return `Tu es un rédacteur expert en manuels d'utilisation. Génère un manuel complet en ${language} pour les ${aLabel}, ton: ${tone}.

Contexte produit/service :
${productContext || '(aucun contexte fourni — invente un produit générique adapté au site)'}

Structure attendue (markdown) :
# Titre principal du manuel
## 1. Introduction (2-3 paragraphes)
## 2. Pour commencer (étapes 1-2-3 numérotées)
## 3. Fonctionnalités principales (sous-titres + bullet points)
## 4. Cas d'usage typiques (3 mini-scénarios)
## 5. Dépannage / FAQ (5 questions courantes)
## 6. Pour aller plus loin (ressources, contacts)

Règles :
- Phrases courtes, vocabulaire adapté à l'audience.
- Jamais de promesse fausse, jamais de jargon non-expliqué.
- Markdown propre (headings ##, listes -, code blocks si besoin).
- 1500-2500 mots au total.

Génère uniquement le manuel, rien d'autre.`;
}

function videoScriptPrompt(audience: string, tone: string, manualMd: string, language: string) {
  return `Voici un manuel d'utilisation en markdown.

${manualMd.slice(0, 6000)}

Transforme-le en script vidéo court (90-120 secondes) en ${language}, ton: ${tone}, pour audience ${AUDIENCE_LABELS[audience] || audience}.

Format :
[SCÈNE 1 — 0:00-0:10]
(visuel: description courte)
VOIX OFF: "phrase courte naturelle"

[SCÈNE 2 — 0:10-0:25]
...

Règles :
- 5-7 scènes max, total 90-120 s.
- Voix off : 1 phrase par scène, max 25 mots.
- Premier mot accroche, dernier mot CTA.
- Adapté HeyGen / Synthesia (avatar parlant).`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const b = await req.json().catch(() => ({}));
  const audience = String(b.audience || 'b2c');
  const tone = String(b.tone || 'pédagogue, chaleureux, sans jargon');
  const productContext = String(b.productContext || '');
  const language = String(b.language || 'fr');
  const withVideoScript = !!b.withVideoScript;
  const title = b.title || `Manuel ${audience.toUpperCase()} — ${new Date().toLocaleDateString('fr-FR')}`;

  const prompt = b.prompt || defaultPromptFor(audience, tone, productContext, language);

  // 1) Generate manual
  const r = await aiCall({ orgId, feature: 'text', prompt, maxTokens: b.maxTokens || 6000 });
  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.error || 'aiCall failed', provider: r.provider, model: r.model }, { status: 502 });
  }
  const content = r.output;

  // Extract outline from headings
  const outline = content.split('\n')
    .filter((l: string) => /^##\s+/.test(l))
    .map((l: string) => l.replace(/^##\s+/, '').trim());

  // 2) Optionally generate video script
  let videoScript: string | null = null;
  if (withVideoScript) {
    const v = await aiCall({ orgId, feature: 'text', prompt: videoScriptPrompt(audience, tone, content, language), maxTokens: 1500 });
    videoScript = v.ok ? v.output : null;

    // Optionally also enqueue a HeyGen render if key present (stub — we only save the script)
    const heygenKey = await getOrgSecret(orgId, 'HEYGEN_API_KEY');
    if (heygenKey && videoScript) {
      // Real call to HeyGen would happen here; we just annotate.
      videoScript = `# HeyGen-ready script (clé détectée — render à brancher)\n\n${videoScript}`;
    }
  }

  // 3) Save
  const id = randomUUID();
  const slugVal = (b.slug || title).toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70) + '-' + Math.random().toString(36).slice(2, 6);
  const db = await getTenantPrisma(slug);
  await (db as any).$executeRawUnsafe(
    `INSERT INTO "AiManual" ("id","slug","title","audience","tone","language","content","outline","provider","model","tokensUsed","videoScript","tags")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,$13)`,
    id, slugVal, title, audience, tone, language,
    content, JSON.stringify(outline), r.provider, r.model, (r.outputTokens || 0) + (r.promptTokens || 0),
    videoScript, []
  );
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiManual" WHERE id = $1`, id);
  return NextResponse.json({ ok: true, item: rows?.[0], wordCount: content.split(/\s+/).length, sectionCount: outline.length });
}
