import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/pro/ai
 * Body: { tool: 'describe-venue' | 'event-ideas' | 'reply-review' | 'generate-tags' | 'sentiment' | 'translate', venueId?, payload?, locales? }
 *
 * Routeur central pour les outils IA de l'Espace Pro.
 * Chaque tool appelle Gemini avec un prompt système dédié.
 */

async function checkAccess(venueId: string | undefined, userId: string, isAdmin: boolean) {
  if (!venueId) return true; // outils sans venue
  if (isAdmin) return true;
  const v = await prisma.venue.findFirst({ where: { id: venueId, ownerId: userId } });
  return !!v;
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'login requis' }, { status: 401 });
  const userId = (s.user as any).id;
  const isAdmin = (s.user as any).role === 'ADMIN';

  try {
    const { tool, venueId, payload, locales } = await req.json();
    if (!tool) return NextResponse.json({ error: 'tool requis' }, { status: 400 });

    const ok = await checkAccess(venueId, userId, isAdmin);
    if (!ok) return NextResponse.json({ error: 'non autorisé' }, { status: 403 });

    let venue: any = null;
    if (venueId) venue = await prisma.venue.findUnique({ where: { id: venueId } });

    switch (tool) {
      case 'describe-venue':       return NextResponse.json(await describeVenue(venue, payload, locales));
      case 'event-ideas':          return NextResponse.json(await eventIdeas(venue, payload));
      case 'reply-review':         return NextResponse.json(await replyReview(venue, payload));
      case 'generate-tags':        return NextResponse.json(await generateTags(venue, payload));
      case 'sentiment':            return NextResponse.json(await analyzeSentiment(venue));
      case 'translate':            return NextResponse.json(await translate(payload, locales));
      case 'event-promo-post':     return NextResponse.json(await eventPromoPost(payload));
      default:                     return NextResponse.json({ error: 'tool inconnu' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

/* ============= TOOLS ============= */

async function describeVenue(venue: any, payload: any, locales?: string[]) {
  const name = venue?.name || payload?.name || 'Mon lieu';
  const type = venue?.type || payload?.type || 'venue';
  const city = venue?.city || payload?.city || '';
  const tone = payload?.tone || 'chaleureux';
  const hint = payload?.hint || '';

  const langs = locales?.length ? locales : ['fr'];
  const out: Record<string, string> = {};

  for (const lang of langs) {
    const langLabel: any = { fr: 'français', en: 'anglais', es: 'espagnol', pt: 'portugais brésilien' };
    const sys = `Tu rédiges la description publique d'un lieu LGBT-friendly référencé sur le site GLD (God Loves Diversity).
Lieu : "${name}" (type ${type}${city ? `, à ${city}` : ''})
Ton : ${tone}, accueillant, inclusif. Évite le jargon militant lourd.
Indications de l'utilisateur : ${hint || '(aucune)'}
Renvoie 2 paragraphes (~120 mots), en ${langLabel[lang] || lang}, adressés directement aux visiteurs LGBTQ+.
N'utilise pas de markdown, juste du texte brut.`;
    const { text } = await generateText('Rédige la description maintenant.', sys);
    out[lang] = text.trim();
  }

  return { ok: true, descriptions: out };
}

async function eventIdeas(venue: any, payload: any) {
  const count = Math.min(payload?.count || 5, 10);
  const sys = `Tu suggères ${count} idées d'événements LGBT-friendly originaux pour le lieu suivant :
Nom : ${venue?.name || 'Mon lieu'}
Type : ${venue?.type || 'venue'}
Ville : ${venue?.city || 'inconnue'}
Tags actuels : ${(venue?.tags || []).join(', ') || 'aucun'}

Renvoie EXACTEMENT du JSON valide (commence par "[", finit par "]") :
[
  { "title": "...", "description": "1 phrase", "duration": "2h", "audience": "qui ça vise", "month": "mois recommandé" }
]
Pas de markdown, pas de prefix, JUSTE le JSON.`;
  const { text } = await generateText('Génère le JSON.', sys);
  let ideas: any[] = [];
  try {
    const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
    ideas = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: 'IA n\'a pas renvoyé un JSON valide', raw: text };
  }
  return { ok: true, ideas };
}

async function replyReview(venue: any, payload: any) {
  const reviewText = payload?.reviewText || '';
  const reviewRating = payload?.rating || 5;
  const tone = payload?.tone || 'chaleureux et professionnel';
  if (!reviewText) return { ok: false, error: 'reviewText requis' };

  const sys = `Tu réponds à un avis client pour le lieu "${venue?.name || 'mon établissement'}" (${venue?.type || ''}).
L'avis : "${reviewText}" (note ${reviewRating}/5)
Ton : ${tone}, en français, en utilisant le tutoiement bienveillant.
- Si l'avis est positif : remercie, valorise un point précis, invite à revenir
- Si l'avis est négatif : reconnais sans excuses excessives, propose une action concrète, invite à reprendre contact
- Si l'avis évoque l'expérience LGBT : remercie pour la confiance, rappelle l'engagement du lieu
3-4 phrases max. Pas de markdown, juste le texte de la réponse.`;
  const { text } = await generateText('Écris la réponse maintenant.', sys);
  return { ok: true, reply: text.trim() };
}

async function generateTags(venue: any, payload: any) {
  const sys = `Tu génères 8-12 tags pertinents et chercheurs de SEO pour ce lieu LGBT-friendly :
Nom : ${venue?.name || payload?.name || 'Mon lieu'}
Type : ${venue?.type || payload?.type}
Ville : ${venue?.city || payload?.city}
Description : ${venue?.description || payload?.description || ''}

Renvoie les tags en JSON, 1 mot ou 2 mots maximum chacun, en kebab-case (ex: "drag-show", "brunch-veggie", "happy-hour-7-9").
Format : ["tag1", "tag2", ...]
Pas de markdown, JUSTE le tableau JSON.`;
  const { text } = await generateText('Génère les tags.', sys);
  try {
    const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
    return { ok: true, tags: JSON.parse(cleaned) };
  } catch {
    return { ok: false, error: 'IA n\'a pas renvoyé un JSON valide', raw: text };
  }
}

async function analyzeSentiment(venue: any) {
  if (!venue) return { ok: false, error: 'venue requis' };
  // On charge tous les avis du venue (via products du venue ? ou on attend ProductReview venueId)
  // Pour l'instant : analyser depuis ProductReview de tous les products du shop pas idéal — placeholder
  return {
    ok: true,
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    insights: 'Pas encore d\'avis spécifiques au venue. Cette fonction sera complétée quand le système d\'avis venue sera en place.',
    recommendations: []
  };
}

async function translate(payload: any, locales?: string[]) {
  const text = payload?.text || '';
  const from = payload?.from || 'fr';
  if (!text) return { ok: false, error: 'text requis' };
  const targets = (locales || ['en', 'es', 'pt']).filter(l => l !== from);
  const langLabel: any = { fr: 'français', en: 'anglais', es: 'espagnol', pt: 'portugais brésilien' };

  const out: Record<string, string> = {};
  for (const lang of targets) {
    const sys = `Tu traduis du ${langLabel[from]} vers le ${langLabel[lang] || lang}. Garde le ton et le sens. Renvoie UNIQUEMENT la traduction.`;
    const { text: t } = await generateText(text, sys);
    out[lang] = t.trim();
  }
  return { ok: true, translations: out };
}

async function eventPromoPost(payload: any) {
  const eventTitle = payload?.title || 'Mon événement';
  const eventDate = payload?.startsAt || '';
  const eventDescription = payload?.description || '';
  const venueName = payload?.venueName || '';

  const sys = `Tu rédiges un post de promotion pour les réseaux sociaux pour cet événement :
Titre : ${eventTitle}
Date : ${eventDate}
Lieu : ${venueName}
Description : ${eventDescription}

Renvoie en JSON :
{
  "instagram": "post Instagram (≤220 chars + 5 hashtags relevants LGBT)",
  "facebook": "post Facebook (≤500 chars, plus chaleureux, peut inclure mention)",
  "twitter": "tweet ≤270 chars + 2 hashtags",
  "telegram": "message Telegram court avec emoji"
}
Pas de markdown, JUSTE le JSON.`;
  const { text } = await generateText('Génère les posts.', sys);
  try {
    const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
    return { ok: true, posts: JSON.parse(cleaned) };
  } catch {
    return { ok: false, error: 'IA n\'a pas renvoyé un JSON valide', raw: text };
  }
}
