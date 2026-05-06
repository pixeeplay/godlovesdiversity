import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { bumpQuota, checkQuota } from '@/lib/ai-autopilot';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Cron : reclassifie les venues type=OTHER par IA Gemini grounded.
 * À déclencher 1×/heure ou 1×/jour par Coolify.
 *
 * Sécurité : header X-Cron-Secret = process.env.CRON_SECRET.
 *
 * Limite par run :
 *  - max 30 venues / run (ne pas saturer le quota Gemini)
 *  - skip si quota IA dépassé
 *
 * Stratégie :
 *  1. Heuristique rapide sur le nom (ne consomme PAS de quota Gemini) :
 *     - "Église", "Cathédrale", "Basilique", "Chapelle" → CHURCH_CATHOLIC ou CHURCH générique
 *     - "Temple bouddhiste", "Pagode" → TEMPLE_BUDDHIST
 *     - "Mosquée", "Mosque" → MOSQUE
 *     - "Synagogue", "Beit"  → SYNAGOGUE
 *     - "Gurdwara"           → GURDWARA
 *  2. Si pas matché → demande à Gemini avec grounded search.
 */

const RELIGIOUS_TYPES_VALUES = [
  'CHURCH', 'CHURCH_CATHOLIC', 'CHURCH_PROTESTANT', 'CHURCH_ORTHODOX', 'CHURCH_ANGLICAN', 'CHURCH_EVANGELICAL',
  'MOSQUE', 'SYNAGOGUE',
  'TEMPLE', 'TEMPLE_BUDDHIST', 'TEMPLE_HINDU',
  'GURDWARA', 'MEDITATION_CENTER',
  'HOLY_SITE', 'PILGRIMAGE_PATH', 'INTERFAITH_CENTER'
];

const SECULAR_TYPES_VALUES = [
  'RESTAURANT', 'BAR', 'CAFE', 'CLUB', 'HOTEL', 'SHOP',
  'CULTURAL', 'COMMUNITY_CENTER', 'HEALTH', 'ASSOCIATION'
];

function quickClassify(name: string, description: string | null): string | null {
  const txt = `${name || ''} ${description || ''}`.toLowerCase();
  // Christianisme
  if (/(\beglise|cathedrale|cathédrale|basilique|chapelle|paroisse|abbaye|monastère|monastere|couvent|sanctuaire chrétien|sanctuaire chretien|church|cathedral|chapel)/.test(txt)) {
    if (/(catholique|catholic|romaine)/.test(txt)) return 'CHURCH_CATHOLIC';
    if (/(orthodoxe|orthodox|grec|russe|copte)/.test(txt)) return 'CHURCH_ORTHODOX';
    if (/(anglican|episcopalien|episcopalian)/.test(txt)) return 'CHURCH_ANGLICAN';
    if (/(évangélique|evangelique|evangelical|baptiste|baptist|pentecostal|pentecôtiste|pentecotiste)/.test(txt)) return 'CHURCH_EVANGELICAL';
    if (/(protestant|luthérien|lutherien|methodiste|méthodiste|calviniste|reformee|réformée)/.test(txt)) return 'CHURCH_PROTESTANT';
    return 'CHURCH';
  }
  // Islam
  if (/(\bmosqu[ée]e?|mosque|masjid|jamaat|islamic center|centre islamique)/.test(txt)) return 'MOSQUE';
  // Judaïsme
  if (/(\bsynagogue|beit|beth|hebrew|jewish center|congrégation juive|congregation juive)/.test(txt)) return 'SYNAGOGUE';
  // Bouddhisme
  if (/(\bpagode|temple bouddh|buddhist temple|monastère bouddh|monastere bouddh|sangha|stupa|wat\b|dojo zen)/.test(txt)) return 'TEMPLE_BUDDHIST';
  // Hindouisme
  if (/(\btemple hindou|hindu temple|mandir|swaminarayan|krishna temple|shiva temple)/.test(txt)) return 'TEMPLE_HINDU';
  // Sikhisme
  if (/(gurdwara|gurudwara)/.test(txt)) return 'GURDWARA';
  // Méditation
  if (/(centre de méditation|centre de meditation|meditation center|méditation transcendantale|vipassana|mindfulness center)/.test(txt)) return 'MEDITATION_CENTER';
  // Inter-religieux
  if (/(inter-religieux|interfaith|interreligieux)/.test(txt)) return 'INTERFAITH_CENTER';
  return null;
}

async function deepClassify(name: string, city: string | null, country: string | null, description: string | null): Promise<{ type: string | null; confidence: number; notes: string }> {
  const prompt = `Tu es un classificateur de type de lieu. Voici un lieu LGBT-friendly :

Nom: "${name}"
Ville: ${city || '?'}
Pays: ${country || '?'}
Description: ${description ? description.slice(0, 300) : '(aucune)'}

Détermine si ce lieu est un LIEU DE CULTE / SPIRITUEL et lequel précisément.

Choix possibles:
- ${RELIGIOUS_TYPES_VALUES.join('\n- ')}
- ${SECULAR_TYPES_VALUES.join('\n- ')}

Réponds UNIQUEMENT en JSON strict (pas de markdown):
{
  "type": "VENUE_TYPE_VALUE",      // un des choix ci-dessus
  "confidence": 0.0,               // 0=incertain, 1=certain
  "notes": "courte justification (max 100 chars)"
}

Si vraiment pas sûr ou que ce lieu est manifestement un commerce/loisir non-religieux, mets "type":"OTHER".`;

  try {
    const r = await generateText(prompt);
    await bumpQuota(1);
    const cleaned = (r.text || '')
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.type === 'string') {
      const upper = parsed.type.toUpperCase();
      if ([...RELIGIOUS_TYPES_VALUES, ...SECULAR_TYPES_VALUES, 'OTHER'].includes(upper)) {
        return { type: upper, confidence: parsed.confidence || 0.5, notes: parsed.notes || '' };
      }
    }
  } catch {}
  return { type: null, confidence: 0, notes: 'parse-failed' };
}

async function handler(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (expected && provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);

  const venues = await prisma.venue.findMany({
    where: { type: 'OTHER' as any, published: true },
    select: { id: true, name: true, city: true, country: true, description: true },
    take: limit,
    orderBy: { createdAt: 'asc' }
  });

  if (venues.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Aucun venue type=OTHER à classifier.' });
  }

  let quickHit = 0;
  let deepHit = 0;
  let skipped = 0;
  const results: any[] = [];

  for (const v of venues) {
    // Étape 1 : heuristique rapide (pas de quota)
    const quick = quickClassify(v.name, v.description);
    if (quick) {
      try {
        await prisma.venue.update({
          where: { id: v.id },
          data: { type: quick as any, enrichmentNotes: `[auto-classify quick] → ${quick}` }
        });
        quickHit++;
        results.push({ id: v.id, name: v.name, classifiedAs: quick, method: 'quick' });
      } catch {}
      continue;
    }

    // Étape 2 : Gemini si quota dispo
    const quota = await checkQuota();
    if (!quota.ok) {
      skipped++;
      results.push({ id: v.id, name: v.name, skipped: 'quota-exhausted' });
      continue;
    }

    const deep = await deepClassify(v.name, v.city, v.country, v.description);
    if (deep.type && deep.confidence >= 0.6 && deep.type !== 'OTHER') {
      try {
        await prisma.venue.update({
          where: { id: v.id },
          data: {
            type: deep.type as any,
            enrichmentNotes: `[auto-classify deep] → ${deep.type} (conf ${Math.round(deep.confidence * 100)}%) — ${deep.notes}`
          }
        });
        deepHit++;
        results.push({ id: v.id, name: v.name, classifiedAs: deep.type, method: 'deep', confidence: deep.confidence });
      } catch {}
    } else {
      results.push({ id: v.id, name: v.name, classifiedAs: null, method: 'deep', confidence: deep.confidence, notes: deep.notes });
    }

    // Délai entre appels Gemini
    await new Promise((r) => setTimeout(r, 600));
  }

  return NextResponse.json({
    ok: true,
    processed: venues.length,
    quickHit,
    deepHit,
    skipped,
    summary: `${quickHit + deepHit}/${venues.length} reclassifiés (${quickHit} via heuristique, ${deepHit} via Gemini)`,
    sampleResults: results.slice(0, 10)
  });
}

export async function GET(req: NextRequest)  { return handler(req); }
export async function POST(req: NextRequest) { return handler(req); }
