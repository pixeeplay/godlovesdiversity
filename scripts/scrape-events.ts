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

// ─── Source 1 : Pride 2026 (single source of truth : src/lib/pride-data.ts) ──
// Importée via fonction pour éviter le couplage Prisma↔frontend lib.
function getPrideEventsRaw(): RawEvent[] {
  // Date corrigées 2026 (utilisateur + datesdesprides.fr) — synchronisée avec src/lib/pride-data.ts
  const evts = [
    { id: 'paris-2026', name: 'Marche des Fiertés Paris', city: 'Paris', cp: '75001', lat: 48.8566, lng: 2.3522, date: '2026-06-27', desc: 'Marche officielle Inter-LGBT, Châtelet → République, concert final. ~500 000 personnes.' },
    { id: 'lille-2026', name: 'Marche des Fiertés Lille', city: 'Lille', cp: '59000', lat: 50.6292, lng: 3.0573, date: '2026-05-30', desc: 'Première Pride de la saison française. Vieux-Lille.' },
    { id: 'rennes-2026', name: 'Pride Rennes', city: 'Rennes', cp: '35000', lat: 48.1173, lng: -1.6778, date: '2026-06-06', desc: 'Marche festive du centre de Rennes.' },
    { id: 'toulouse-2026', name: 'Marche des Fiertés Toulouse', city: 'Toulouse', cp: '31000', lat: 43.6047, lng: 1.4442, date: '2026-06-06', desc: 'Pride toulousaine, l\'une des plus anciennes de France.' },
    { id: 'bordeaux-2026', name: 'Marche des Fiertés Bordeaux', city: 'Bordeaux', cp: '33000', lat: 44.8378, lng: -0.5792, date: '2026-06-06', desc: 'Marche sur les quais de la Garonne.' },
    { id: 'grenoble-2026', name: 'Marche des Fiertés Grenoble', city: 'Grenoble', cp: '38000', lat: 45.1885, lng: 5.7245, date: '2026-06-06', desc: 'Pride alpine.' },
    { id: 'lyon-2026', name: 'Marche des Fiertés Lyon', city: 'Lyon', cp: '69002', lat: 45.7640, lng: 4.8357, date: '2026-06-13', desc: 'La 2e Pride de France. ~50 000 personnes.' },
    { id: 'strasbourg-2026', name: 'Festigays — Pride Strasbourg', city: 'Strasbourg', cp: '67000', lat: 48.5734, lng: 7.7521, date: '2026-06-13', desc: 'Festival Festigays de 10 jours + marche.' },
    { id: 'metz-2026', name: 'Marche des Fiertés Metz', city: 'Metz', cp: '57000', lat: 49.1193, lng: 6.1757, date: '2026-06-13', desc: 'Pride mosellanne.' },
    { id: 'caen-2026', name: 'Marche des Fiertés Caen-Normandie', city: 'Caen', cp: '14000', lat: 49.1829, lng: -0.3707, date: '2026-06-13', desc: 'Pride normande.' },
    { id: 'reims-2026', name: 'Marche des Fiertés Reims', city: 'Reims', cp: '51100', lat: 49.2583, lng: 4.0317, date: '2026-06-20', desc: 'Marche champenoise.' },
    { id: 'nantes-2026', name: 'Marche des Fiertés Nantes', city: 'Nantes', cp: '44000', lat: 47.2184, lng: -1.5536, date: '2026-06-20', desc: 'Pride le long de l\'Erdre.' },
    { id: 'pride-nuit-2026', name: 'Pride de Nuit Paris', city: 'Paris', cp: '75011', lat: 48.8532, lng: 2.3692, date: '2026-06-21', time: '19:00', desc: 'Marche radicale autogérée, Bastille. Sans char sponsorisé.' },
    { id: 'marseille-2026', name: 'Pride Marseille', city: 'Marseille', cp: '13001', lat: 43.2965, lng: 5.3698, date: '2026-07-04', desc: 'Pride méditerranéenne, Vieux-Port → Prado.' },
    { id: 'montpellier-2026', name: 'Pride Montpellier', city: 'Montpellier', cp: '34000', lat: 43.6108, lng: 3.8767, date: '2026-07-11', desc: 'Comédie → Antigone.' },
    { id: 'nice-2026', name: 'Pink Parade Nice', city: 'Nice', cp: '06000', lat: 43.7102, lng: 7.2620, date: '2026-07-25', desc: 'Pride niçoise sur la Promenade des Anglais.' },
    { id: 'existrans-2026', name: 'Existrans', city: 'Paris', cp: '75001', lat: 48.8566, lng: 2.3522, date: '2026-10-17', desc: 'Marche pour les droits trans, intersexes et non-binaires. Depuis 1997.' }
  ];
  return evts.map((e) => ({
    source: 'pride-officiel',
    name: e.name,
    city: e.city,
    postal_code: e.cp,
    lat: e.lat,
    lng: e.lng,
    start: `${e.date}T${(e as any).time || '14:00'}:00+02:00`,
    description: e.desc,
    price: 'Gratuit',
    source_url: 'https://parislgbt.com/fr/pride'
  }));
}

const PRIDE_2026: RawEvent[] = getPrideEventsRaw();

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
