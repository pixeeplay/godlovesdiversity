import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { getSettings } from '@/lib/settings';
import { checkQuota, bumpQuota } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 90;

/**
 * GET /api/admin/ai/newsletter/plan/[id]
 * PATCH /api/admin/ai/newsletter/plan/[id] — édition manuelle
 * POST /api/admin/ai/newsletter/plan/[id]/?action=generate-html|generate-image|generate-video|send
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return null;
  return s;
}

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const item = await prisma.newsletterPlan.findUnique({ where: { id: ctx.params.id } });
  if (!item) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const allowed: any = {};
  for (const k of ['title', 'theme', 'subject', 'preheader', 'htmlContent', 'markdownContent', 'imagePrompt', 'videoPrompt', 'status']) {
    if (typeof body[k] === 'string') allowed[k] = body[k];
  }
  if (Object.keys(allowed).length) allowed.manuallyEdited = true;
  const item = await prisma.newsletterPlan.update({
    where: { id: ctx.params.id },
    data: allowed
  });
  return NextResponse.json({ item });
}

export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const action = new URL(req.url).searchParams.get('action');
  const item = await prisma.newsletterPlan.findUnique({ where: { id: ctx.params.id } });
  if (!item) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const quota = await checkQuota();
  if (!quota.ok) return NextResponse.json({ error: 'quota-exceeded' }, { status: 429 });

  if (action === 'generate-html') {
    return await generateHtmlContent(item);
  }
  if (action === 'generate-image') {
    return await generateImage(item);
  }
  if (action === 'generate-video') {
    return await generateVideo(item);
  }
  if (action === 'send') {
    return await sendNewsletter(item);
  }
  return NextResponse.json({ error: 'unknown-action' }, { status: 400 });
}

// ────────────────────────────────────────────
async function generateHtmlContent(item: any) {
  const dateLong = new Date(item.scheduledFor).toLocaleDateString('fr-FR', { dateStyle: 'long' });

  const prompt = `Rédige une newsletter hebdo COMPLÈTE pour le site parislgbt (réseau social inclusif religieux LGBT+).

THÈME : ${item.theme || 'Communauté'}
TITRE : ${item.title}
DATE PRÉVUE : ${dateLong} (semaine ${item.weekNumber} de ${item.year})

Réponds UNIQUEMENT en JSON strict :
{
  "subject": "objet email max 50 chars avec emoji",
  "preheader": "preview 90 chars max",
  "html": "corps HTML complet ~400-600 mots, structure : intro perso → 2-3 sections (titre + paragraphes) → call-to-action vers gld.pixeeplay.com. Utilise <h3>, <p>, <ul>. Pas de <html>/<body>.",
  "markdown": "version markdown texte plat équivalente"
}

Règles :
- Ton inclusif, chaleureux, pas de cliché
- Mentionne le thème de la semaine subtilement
- Évite "découvrez", "n'hésitez pas"
- Aucune info inventée (chiffres, noms de personnes), parle abstrait/communautaire`;

  try {
    const r = await generateText(prompt);
    await bumpQuota(2);
    const cleaned = (r.text || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const updated = await prisma.newsletterPlan.update({
      where: { id: item.id },
      data: {
        subject: parsed.subject || item.title,
        preheader: parsed.preheader || '',
        htmlContent: wrapHtml(parsed.subject || item.title, parsed.preheader || '', parsed.html || ''),
        markdownContent: parsed.markdown || '',
        status: item.status === 'sent' ? 'sent' : 'ready'
      }
    });
    return NextResponse.json({ ok: true, item: updated });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'generation-failed' }, { status: 500 });
  }
}

async function generateImage(item: any) {
  const settings = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.imageModel']).catch(() => ({} as any));
  const key = settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  if (!key) return NextResponse.json({ error: 'no-gemini-key' }, { status: 503 });

  const prompt = item.imagePrompt || `A beautiful banner image illustrating the theme "${item.theme || 'community'}" for an inclusive LGBT-friendly religious newsletter. Style: cinematic painterly, soft pastel rainbow lighting, golden particles, peaceful hopeful mood. NO identifiable faces, NO political symbols other than rainbow. NO religious symbols dominant. Clean composition with space at top and bottom. 16:9 ratio.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    });
    const j = await r.json();
    if (j.error) return NextResponse.json({ ok: false, error: j.error.message }, { status: 500 });
    const parts = j?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.inlineData?.data) {
        await bumpQuota(2);
        const imageUrl = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
        const updated = await prisma.newsletterPlan.update({
          where: { id: item.id },
          data: { imageUrl, imagePrompt: prompt }
        });
        return NextResponse.json({ ok: true, item: updated });
      }
    }
    return NextResponse.json({ ok: false, error: 'no-image-in-response' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}

async function generateVideo(item: any) {
  // Placeholder : la génération vidéo (Seedance / fal.ai) est plus coûteuse + plus lente.
  // On stocke juste le prompt pour génération différée, ou on peut intégrer Seedance ici.
  const prompt = item.videoPrompt || `Cinematic 5-second video on theme "${item.theme || 'community'}". Slow camera motion, soft rainbow light particles drifting, warm peaceful mood. NO faces, NO text, NO logos, abstract scene.`;

  // Pour V1 : marque comme à générer manuellement via Studio IA Seedance
  const updated = await prisma.newsletterPlan.update({
    where: { id: item.id },
    data: { videoPrompt: prompt }
  });
  return NextResponse.json({
    ok: true,
    item: updated,
    note: 'Prompt vidéo enregistré. Lance la génération Seedance dans /admin/ai-studio en utilisant ce prompt.'
  });
}

async function sendNewsletter(item: any) {
  if (!item.htmlContent) {
    return NextResponse.json({ error: 'html-missing', hint: 'Génère d\'abord le HTML' }, { status: 400 });
  }
  // Crée une NewsletterCampaign et envoie via la route existante
  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject: item.subject || item.title,
      htmlContent: item.htmlContent,
      textContent: item.markdownContent || '',
      status: 'DRAFT'
    }
  });
  await prisma.newsletterPlan.update({
    where: { id: item.id },
    data: { campaignId: campaign.id, status: 'sent', sentAt: new Date() }
  });
  return NextResponse.json({
    ok: true,
    campaignId: campaign.id,
    note: 'Campagne créée en draft. Va dans /admin/newsletter pour confirmer l\'envoi à tous les abonnés.'
  });
}

function wrapHtml(subject: string, preheader: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${subject}</title></head>
<body style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#111;background:#f9f9f9;">
<div style="background:white;padding:32px;border-radius:12px;">
<div style="font-size:11px;color:#888;margin-bottom:8px;">${preheader}</div>
<h1 style="font-size:22px;color:#d4537e;margin:0 0 16px;">🌈 parislgbt</h1>
${body}
<hr style="margin:32px 0;border:0;border-top:1px solid #eee;"/>
<p style="font-size:12px;color:#999;text-align:center;">
Tu reçois ce mail car tu es abonné·e à la newsletter GLD.<br/>
<a href="https://gld.pixeeplay.com">gld.pixeeplay.com</a> · <a href="{{unsubscribeUrl}}">Se désabonner</a>
</p>
</div></body></html>`;
}
