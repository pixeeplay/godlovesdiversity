/**
 * scrape-events.ts — Pipeline d'agrégation d'événements LGBT pour /fr/agenda
 *
 * Sources (par ordre de fiabilité) :
 *   1. Pride Marches 2026 — données officielles hardcodées (haute fiabilité)
 *   2. Eventbrite Search API — query "LGBT" en France (1000 req/jour gratuit)
 *   3. Jina Reader + Gemini — extraction structurée depuis sites LGBT FR
 *      (tetu.com/agenda, komitid.fr/agenda, pride.com)
 *
 * Dédupe : hash(normalize(name) + city + ISO date YYYY-MM-DD)
 * Idempotent : upsert sur slug. Re-runnable sans doublons.
 *
 * Usage :
 *   DATABASE_URL=... GEMINI_API_KEY=... npx tsx scripts/scrape-events.ts
 *   --dry-run       n'écrit pas en BDD
 *   --source=pride|eventbrite|web     limite à une source
 *   --limit=N       max events
 */
import { PrismaClient, ListingStatus } from '@prisma/client';
import crypto from 'node:crypto';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const sourceArg = args.find((a) => a.startsWith('--source='))?.split('=')[1];
const argLimit = parseInt(args.find((a) => a.startsWith('--limit='))?.split('=')[1] || '0');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_EVENT_MODEL || 'gemini-2.5-flash';

type RawEvent = {
  source: string;
  source_url?: string;
  name: string;
  description?: string;
  start: string;      // ISO
  end?: string;
  venue_name?: string;
  city?: string;
  postal_code?: string;
  street?: string;
  lat?: number;
  lng?: number;
  cover_image?: string;
  price?: string;
  registration_url?: string;
};

// ─── Source 1 : Pride 2026 (officielles, hardcoded) ──────────────────────
const PRIDE_2026: RawEvent[] = [
  // Source : datesdesprides.fr + sites officiels (à actualiser chaque année)
  { source: 'pride-officiel', name: 'Marche des Fiertés Paris', city: 'Paris', postal_code: '75001', lat: 48.8566, lng: 2.3522, start: '2026-06-27T14:00:00+02:00', description: 'La Marche des Fiertés de Paris défile du Châtelet à République, suivie d\'un grand concert place de la République.', registration_url: 'https://www.inter-lgbt.org', price: 'Gratuit', cover_image: undefined },
  { source: 'pride-officiel', name: 'Marche des Fiertés Lyon', city: 'Lyon', postal_code: '69002', lat: 45.7640, lng: 4.8357, start: '2026-06-13T14:00:00+02:00', description: 'La Marche LGBT+ de Lyon, organisée par le LGBTI Centre de Lyon.', registration_url: 'https://www.facebook.com/MarcheDesFiertesLyon' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Marseille', city: 'Marseille', postal_code: '13001', lat: 43.2965, lng: 5.3698, start: '2026-07-04T14:00:00+02:00', description: 'La Pride de Marseille traverse le Vieux-Port jusqu\'aux plages du Prado.' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Toulouse', city: 'Toulouse', postal_code: '31000', lat: 43.6047, lng: 1.4442, start: '2026-06-13T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Bordeaux', city: 'Bordeaux', postal_code: '33000', lat: 44.8378, lng: -0.5792, start: '2026-06-06T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Lille', city: 'Lille', postal_code: '59000', lat: 50.6292, lng: 3.0573, start: '2026-06-06T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Nantes', city: 'Nantes', postal_code: '44000', lat: 47.2184, lng: -1.5536, start: '2026-06-13T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Rennes', city: 'Rennes', postal_code: '35000', lat: 48.1173, lng: -1.6778, start: '2026-06-13T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Strasbourg', city: 'Strasbourg', postal_code: '67000', lat: 48.5734, lng: 7.7521, start: '2026-06-13T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Montpellier', city: 'Montpellier', postal_code: '34000', lat: 43.6108, lng: 3.8767, start: '2026-06-13T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Nice', city: 'Nice', postal_code: '06000', lat: 43.7102, lng: 7.2620, start: '2026-07-25T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Marche des Fiertés Grenoble', city: 'Grenoble', postal_code: '38000', lat: 45.1885, lng: 5.7245, start: '2026-06-06T14:00:00+02:00' },
  { source: 'pride-officiel', name: 'Pride de Nuit Paris', city: 'Paris', postal_code: '75011', lat: 48.8632, lng: 2.3792, start: '2026-06-21T19:00:00+02:00', description: 'Marche nocturne radicale, point de départ habituel place de la Bastille.' },
  { source: 'pride-officiel', name: 'Existrans (Paris)', city: 'Paris', postal_code: '75001', lat: 48.8566, lng: 2.3522, start: '2026-10-17T14:00:00+02:00', description: 'Marche pour les droits des personnes trans, intersexes et non-binaires.' }
];

// ─── Source 2 : Eventbrite Search API ────────────────────────────────────
async function fetchEventbrite(): Promise<RawEvent[]> {
  // Eventbrite Public Search API utilise un token App ; sans token on tombe sur l'API search publique limitée.
  // Pour rester sans token, on parse le RSS feed Eventbrite "LGBT" pour la France.
  // Cette approche tient sans clé API jusqu'à un certain volume.
  const rssUrls = [
    'https://www.eventbrite.fr/d/france/lgbt/?lang=fr',
    'https://www.eventbrite.fr/d/france/queer/?lang=fr',
    'https://www.eventbrite.fr/d/france/drag/?lang=fr',
    'https://www.eventbrite.fr/d/france/pride/?lang=fr'
  ];
  const events: RawEvent[] = [];
  for (const url of rssUrls) {
    try {
      const r = await fetch(`https://r.jina.ai/${url}`, { headers: { Accept: 'text/markdown' } });
      const text = await r.text();
      // Extrait via Gemini les events depuis le markdown
      const extracted = await geminiExtractEvents(text, url);
      events.push(...extracted);
    } catch (e: any) {
      console.log(`  ⚠ Eventbrite ${url}: ${e.message?.slice(0, 80)}`);
    }
  }
  return events;
}

// ─── Source 3 : Sites LGBT FR (Têtu, Komitid, Pride.com) ─────────────────
async function fetchLgbtSites(): Promise<RawEvent[]> {
  const urls = [
    'https://www.tetu.com/agenda/',
    'https://www.komitid.fr/agenda/',
    'https://www.pride.com/events',
    'https://www.queer.fr/agenda/'
  ];
  const events: RawEvent[] = [];
  for (const url of urls) {
    try {
      const r = await fetch(`https://r.jina.ai/${url}`, { headers: { Accept: 'text/markdown' } });
      const text = await r.text();
      const extracted = await geminiExtractEvents(text, url);
      events.push(...extracted);
    } catch (e: any) {
      console.log(`  ⚠ Site ${url}: ${e.message?.slice(0, 80)}`);
    }
  }
  return events;
}

// ─── Gemini extraction structurée ───────────────────────────────────────
async function geminiExtractEvents(markdown: string, sourceUrl: string): Promise<RawEvent[]> {
  if (!GEMINI_API_KEY || isDryRun) return [];
  const truncated = markdown.slice(0, 18000); // limite tokens

  const prompt = `Extrait TOUS les événements LGBT/queer mentionnés dans ce contenu. Pour chaque event, renvoie un JSON :
{
  "events": [
    {
      "name": "Nom de l'event",
      "description": "Description courte (1-2 phrases)",
      "start": "YYYY-MM-DDTHH:MM:SS+02:00",
      "end": "YYYY-MM-DDTHH:MM:SS+02:00" ou null,
      "venue_name": "Nom du lieu hôte ou null",
      "city": "Ville en France",
      "postal_code": "CP ou null",
      "price": "Texte libre ou null",
      "registration_url": "URL inscription ou null",
      "cover_image": "URL image ou null"
    }
  ]
}

Règles strictes :
- Garde UNIQUEMENT les events LGBT, queer, drag, ballroom, Pride, sapphique, transmasc, transfémin, conférence LGBT, soirée queer.
- Skip les events généralistes (concerts non queer, événements politiques non LGBT).
- Skip les events PASSÉS (avant aujourd'hui).
- Date au format ISO 8601 avec timezone (+02:00 = Paris été, +01:00 = Paris hiver).
- Si pas de date précise, skip.
- N'INVENTE RIEN — si l'info n'est pas dans le contenu, mets null.

Contenu à analyser (source: ${sourceUrl}) :
---
${truncated}
---

Renvoie UNIQUEMENT le JSON, sans markdown wrapper, sans commentaire.`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 8000, responseMimeType: 'application/json' }
        })
      }
    );
    if (!r.ok) {
      console.log(`  ⚠ Gemini HTTP ${r.status}`);
      return [];
    }
    const j: any = await r.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return [];
    const parsed = JSON.parse(text);
    return (parsed.events || []).map((e: any) => ({ ...e, source: new URL(sourceUrl).hostname, source_url: sourceUrl })).filter((e: any) => e.name && e.start);
  } catch (e: any) {
    console.log(`  ⚠ Gemini extract ${sourceUrl}: ${e.message?.slice(0, 80)}`);
    return [];
  }
}

// ─── Dédupe + slug ───────────────────────────────────────────────────────
function normalizeKey(name: string, city: string | undefined, start: string): string {
  const n = (name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const c = (city || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const d = start.slice(0, 10); // YYYY-MM-DD
  return crypto.createHash('sha1').update(`${n}-${c}-${d}`).digest('hex').slice(0, 16);
}

function slugify(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[\s'_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// ─── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🎉 Scrape events agenda — pipeline LGBT');
  console.log(`   Dry: ${isDryRun}, source: ${sourceArg || 'all'}, limit: ${argLimit || 'no limit'}\n`);

  const sources: { id: string; fetch: () => Promise<RawEvent[]> }[] = [
    { id: 'pride', fetch: async () => PRIDE_2026 },
    { id: 'eventbrite', fetch: fetchEventbrite },
    { id: 'web', fetch: fetchLgbtSites }
  ];

  const filtered = sourceArg ? sources.filter((s) => s.id === sourceArg) : sources;

  // Resolve sites
  const sitePAris = await prisma.site.findUnique({ where: { domain: 'parislgbt.com' } });
  const siteFrance = await prisma.site.findUnique({ where: { domain: 'lgbtfrance.fr' } });
  if (!sitePAris || !siteFrance) {
    console.error('❌ Sites parislgbt.com / lgbtfrance.fr introuvables');
    return;
  }

  const allRaw: RawEvent[] = [];
  for (const src of filtered) {
    console.log(`📥 Source: ${src.id}`);
    const items = await src.fetch();
    console.log(`   → ${items.length} raw events`);
    allRaw.push(...items);
    if (argLimit && allRaw.length >= argLimit) break;
  }

  // Filter past + dedupe
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seen = new Set<string>();
  const unique: RawEvent[] = [];
  for (const e of allRaw) {
    if (!e.name || !e.start) continue;
    const date = new Date(e.start);
    if (isNaN(date.getTime()) || date < today) continue;
    const key = normalizeKey(e.name, e.city, e.start);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(e);
  }
  console.log(`\n📦 ${unique.length} events uniques (après dédupe + filtre passé)\n`);

  let created = 0, updated = 0, errors = 0;
  for (const e of unique) {
    try {
      const slug = `${slugify(e.name)}-${e.start.slice(0, 10)}`.slice(0, 100);
      // L'event va sur les 2 sites (Paris pour Paris/CP 75, France pour tout)
      const isParis = e.city?.toLowerCase() === 'paris' || (e.postal_code || '').startsWith('75');
      const targetSites = isParis ? [sitePAris, siteFrance] : [siteFrance];

      for (const site of targetSites) {
        const data = {
          slug,
          site_id: site.id,
          name: e.name,
          description_fr: e.description || null,
          cover_image: e.cover_image || null,
          registration_url: e.registration_url || null,
          price: e.price || null,
          venue_name: e.venue_name || null,
          street: e.street || null,
          postal_code: e.postal_code || null,
          city: e.city || null,
          lat: e.lat || null,
          lng: e.lng || null,
          meta_title_fr: `${e.name} | ${e.city || 'France'} | parislgbt`,
          meta_description_fr: e.description?.slice(0, 160) || null,
          status: ListingStatus.PUBLISHED,
          source_url: e.source_url || null,
          imported_at: new Date()
        };

        if (!isDryRun) {
          const existing = await prisma.directoryEvent.findFirst({
            where: { site_id: site.id, slug }
          });
          let eventRow;
          if (existing) {
            eventRow = await prisma.directoryEvent.update({ where: { id: existing.id }, data });
            updated++;
          } else {
            eventRow = await prisma.directoryEvent.create({ data });
            created++;
          }
          // EventDate (un seul début, optionnellement une fin)
          await prisma.eventDate.deleteMany({ where: { event_id: eventRow.id } });
          await prisma.eventDate.create({
            data: {
              event_id: eventRow.id,
              start_at: new Date(e.start),
              end_at: e.end ? new Date(e.end) : null
            }
          });
        } else {
          created++;
        }
      }
    } catch (err: any) {
      errors++;
      if (errors <= 5) console.log(`  ⚠ ${e.name}: ${err.message?.slice(0, 80)}`);
    }
  }

  console.log('\n═══════════════════════════════════');
  console.log(`✅ ${created} créés, ${updated} mis à jour, ${errors} erreurs`);
  console.log(`👉 Vérifie /fr/agenda et /admin/events`);
  console.log('═══════════════════════════════════');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
