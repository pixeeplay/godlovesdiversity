import { NextRequest, NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';
import { checkQuota, bumpQuota } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/share-card/ai-generate
 * Body : { topic, text, author, country }
 *
 * Génère une affiche sociale carrée 1080×1080 via Gemini Nano Banana
 * en respectant STRICTEMENT les valeurs du site GLD :
 *  - inclusion réelle (pas "diversity-washing" superficiel)
 *  - foi RESPECTUEUSE (pas de symboles religieux clivants)
 *  - PAS de visages identifiables (silhouettes / abstrait)
 *  - PAS de nudité, pas de stéréotypes ethniques
 *  - PAS de symboles politiques en dehors de l'arc-en-ciel LGBT
 *
 * Endpoint PUBLIC (pas d'auth) avec quota global Gemini partagé.
 */

// Mapping topic → consigne visuelle
const VISUAL_GUIDELINES: Record<string, string> = {
  testimony: 'Soft cinematic atmosphere, abstract silhouette of a person from behind facing a glowing rainbow light source, painterly style, golden particles, peaceful and hopeful mood, no facial features',
  verse: 'Stained glass window with rainbow light beams, ancient architecture (cathedral, mosque, synagogue or temple — pick one subtly, not religiously dominant), serene atmosphere, no human figure, no specific religious symbol prominent',
  venue: 'Warm interior of an inclusive community space, soft rainbow accents, comfortable seating, plants, painterly cinematic style, no people, welcoming mood',
  event: 'Abstract crowd silhouettes from far away under soft rainbow flag colors blending into evening sky, festival atmosphere, dreamy, painterly, no individual faces',
  pride: 'Abstract flowing rainbow ribbons in motion across a soft gradient sky, cinematic painterly style, hope and movement, no human figures'
};

const GLOBAL_RULES = `
STRICT GUIDELINES (MUST RESPECT) :
- NO identifiable human faces (use silhouettes from behind, abstract shapes, or empty scenes)
- NO nudity, no explicit content
- NO political symbols other than the LGBT rainbow flag colors
- NO racial / ethnic stereotypes
- NO aggressive or shocking imagery
- Religious imagery must be RESPECTFUL and inclusive (cathedral / mosque / synagogue / temple all welcome but none dominant)
- Style : cinematic painterly, soft pastel rainbow lighting, golden particles, peaceful hopeful mood
- Format : square 1:1 ratio
- Leave clean space at top center for adding text overlay later
- Leave clean space at bottom (last 20%) for logo/QR overlay
- High quality, photorealistic but artistic
`;

export async function POST(req: NextRequest) {
  // Quota partagé avec autopilot pour ne pas exploser le free tier
  const quota = await checkQuota();
  if (!quota.ok) {
    return NextResponse.json({ error: 'Quota IA quotidien atteint. Réessaie demain.', quota }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const topic = String(body.topic || 'testimony');
  const text = String(body.text || '').slice(0, 220);
  const author = String(body.author || '').slice(0, 40);
  const country = String(body.country || 'FR').slice(0, 4);

  const visualHint = VISUAL_GUIDELINES[topic] || VISUAL_GUIDELINES.testimony;

  const prompt = `Generate a 1080x1080 social media share card image for a LGBT-friendly inclusive religious platform called "God Loves Diversity" (gld.pixeeplay.com).

CONTEXT FROM USER :
- Topic : ${topic}
- Their message (do NOT render as text in image, just inspire) : "${text.slice(0, 120)}"
${author ? `- Author : ${author} (do not display name in image)` : ''}

VISUAL CONCEPT : ${visualHint}

${GLOBAL_RULES}

Generate the image now. Pure visual, no text overlays, no watermarks (those will be added separately).`;

  const settings = await getSettings(['integrations.gemini.apiKey', 'integrations.gemini.imageModel']).catch(() => ({} as any));
  const key = settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
  const model = settings['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

  if (!key) {
    return NextResponse.json({ error: 'Génération IA temporairement indisponible (clé non configurée).' }, { status: 503 });
  }

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
    if (j.error) {
      return NextResponse.json({ error: j.error.message || 'Génération IA échouée', detail: j.error }, { status: 500 });
    }
    const parts = j?.candidates?.[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.inlineData?.data) {
        await bumpQuota(2); // images coûtent +
        // Retourne en data URI pour affichage immédiat (peut être uploaded MinIO en V2)
        const imageUrl = `data:${p.inlineData.mimeType || 'image/png'};base64,${p.inlineData.data}`;
        return NextResponse.json({ ok: true, imageUrl, prompt: prompt.slice(0, 200) });
      }
    }
    return NextResponse.json({ error: 'Pas d\'image dans la réponse Gemini' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur réseau' }, { status: 500 });
  }
}
