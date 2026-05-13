/**
 * parislgbt-scraper.js
 * ---------------------------------------------------------------
 * Scrape complet de parislgbt.com :
 *  - 339 listings (bars, restos, clubs, saunas, événements...)
 *  - 13 catégories, 30 tags, 4 régions, 19 pages
 *
 * Pipeline :
 *   1. Lecture du sitemap → liste des URLs
 *   2. Pour chaque URL : Jina Reader → markdown propre
 *   3. Gemini 3.1 Flash Lite → JSON structuré (responseSchema)
 *   4. Fetch HTML brut en parallèle → extraction lat/lng par regex
 *   5. Validation Zod + écriture dans ./output/
 *
 * Usage :
 *   cp .env.example .env  # ajouter GEMINI_API_KEY et JINA_API_KEY
 *   npm install
 *   node parislgbt-scraper.js                  # tout
 *   node parislgbt-scraper.js --type=listing   # filtrer un type
 *   node parislgbt-scraper.js --limit=20       # limiter (pour tests)
 *   node parislgbt-scraper.js --dry-run        # n'écrit rien, juste log
 *
 * Coût estimé : ~3€ pour tout le site avec Batch API.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import pLimit from "p-limit";

// ─── CONFIG ──────────────────────────────────────────────────────────
const BASE = "https://www.parislgbt.com";
const OUTPUT_DIR = "./output";
const CONCURRENCY = 3;           // requêtes en parallèle (respecte rate limits)
const RETRY_MAX = 3;
const RETRY_DELAY_MS = 2000;
const GEMINI_MODEL = "gemini-flash-lite-latest";
const JINA_BASE = "https://r.jina.ai/";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const JINA_API_KEY = process.env.JINA_API_KEY; // optionnel mais recommandé
if (!GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY manquante dans .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ─── SCHÉMA DE SORTIE ────────────────────────────────────────────────
const ListingSchema = z.object({
  type: z.enum(["listing", "event", "page", "category", "tag"]),
  source_url: z.string().url(),
  slug: z.string(),
  name: z.string(),
  subtitle: z.string().nullable(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  address: z.object({
    street: z.string().nullable(),
    postal_code: z.string().nullable(),
    city: z.string().nullable(),
    country: z.string().nullable(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
  }).nullable(),
  transport: z.string().nullable(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  hours: z.record(z.string().nullable()).nullable(),
  social: z.object({
    facebook: z.string().nullable(),
    instagram: z.string().nullable(),
    twitter: z.string().nullable(),
    tiktok: z.string().nullable().optional(),
  }).nullable(),
  cover_image: z.string().nullable(),
  logo: z.string().nullable(),
  gallery: z.array(z.string()),
  dates: z.array(z.object({
    start: z.string(),
    end: z.string().nullable(),
  })).optional(),
  venue: z.object({
    name: z.string(),
    slug: z.string(),
    url: z.string(),
  }).nullable().optional(),
  registration_url: z.string().nullable().optional(),
  linked_events: z.array(z.object({ title: z.string(), url: z.string() })),
  region: z.string().nullable(),
  i18n_urls: z.object({
    fr: z.string().nullable(),
    en: z.string().nullable(),
  }),
});

// Schéma JSON pour Gemini structured output (forme allégée — Gemini gère mal Zod direct)
const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING", enum: ["listing", "event", "page", "category", "tag"] },
    name: { type: "STRING" },
    subtitle: { type: "STRING", nullable: true },
    description: { type: "STRING", nullable: true },
    phone: { type: "STRING", nullable: true },
    website: { type: "STRING", nullable: true },
    email: { type: "STRING", nullable: true },
    address: {
      type: "OBJECT",
      nullable: true,
      properties: {
        street: { type: "STRING", nullable: true },
        postal_code: { type: "STRING", nullable: true },
        city: { type: "STRING", nullable: true },
        country: { type: "STRING", nullable: true },
      },
    },
    transport: { type: "STRING", nullable: true },
    categories: { type: "ARRAY", items: { type: "STRING" } },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    hours: {
      type: "OBJECT",
      nullable: true,
      properties: {
        monday: { type: "STRING", nullable: true },
        tuesday: { type: "STRING", nullable: true },
        wednesday: { type: "STRING", nullable: true },
        thursday: { type: "STRING", nullable: true },
        friday: { type: "STRING", nullable: true },
        saturday: { type: "STRING", nullable: true },
        sunday: { type: "STRING", nullable: true },
      },
    },
    social: {
      type: "OBJECT",
      nullable: true,
      properties: {
        facebook: { type: "STRING", nullable: true },
        instagram: { type: "STRING", nullable: true },
        twitter: { type: "STRING", nullable: true },
        tiktok: { type: "STRING", nullable: true },
      },
    },
    cover_image: { type: "STRING", nullable: true },
    logo: { type: "STRING", nullable: true },
    gallery: { type: "ARRAY", items: { type: "STRING" } },
    dates: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          start: { type: "STRING" },
          end: { type: "STRING", nullable: true },
        },
      },
    },
    venue: {
      type: "OBJECT",
      nullable: true,
      properties: {
        name: { type: "STRING" },
        slug: { type: "STRING" },
        url: { type: "STRING" },
      },
    },
    registration_url: { type: "STRING", nullable: true },
    linked_events: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: { type: "STRING" }, url: { type: "STRING" } },
      },
    },
  },
  required: ["type", "name", "categories", "tags", "gallery", "linked_events"],
};

// ─── PROMPT D'EXTRACTION ─────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un extracteur de données structurées pour parislgbt.com, un guide LGBT+.
À partir du markdown fourni (sortie de Jina Reader), produis un JSON STRICTEMENT conforme au schéma.

Règles :
- "type" : "event" si la page a une section "Prochaines dates" avec dates futures (sinon "listing").
- "categories" et "tags" : utilise les SLUGS (extraire du dernier segment des URLs /category/X/ et /tag/X/), pas les libellés.
- "description" : préserve la mise en forme markdown (**gras**, listes, paragraphes).
- "address.street", "postal_code", "city" : extrais depuis la section Maps OU depuis l'URL Google Maps daddr= si présent. Si l'URL daddr= ne contient que "Paris, France", laisser street/postal_code à null.
- "hours" : format "HH:MM-HH:MM" (24h). Si "N/A" ou fermé : null. Conserver la valeur littérale pour les cas spéciaux ("Uniquement sur rendez-vous").
- "cover_image", "logo", "gallery" : URLs absolues. La cover est généralement marquée "Listing cover image". Le logo est généralement la première image après la cover, dans une balise avec un title contenant "logo" ou correspondant au nom.
- "linked_events" : seulement les événements explicitement liés au listing (section "Evenements" en bas), pas les "Ces adresses pourraient vous intéresser aussi".
- "social" : URLs absolues vers les profils. Jamais d'URLs internes de parislgbt.com.
- "dates" (events uniquement) : format ISO 8601 avec timezone +02:00 (Europe/Paris).
- Ignore complètement les sections : consentement aux cookies, panier, newsletter signup, partenaires, footer, "Ces adresses pourraient vous intéresser aussi".
- Si une info n'existe pas : utilise null (pas de chaîne vide).`;

// ─── UTILS ───────────────────────────────────────────────────────────
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry(fn, label) {
  let lastErr;
  for (let i = 0; i < RETRY_MAX; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      console.warn(`  ⚠️  ${label} (try ${i + 1}/${RETRY_MAX}): ${e.message}`);
      await sleep(RETRY_DELAY_MS * (i + 1));
    }
  }
  throw lastErr;
}

function slugFromUrl(url) {
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "home";
}

// ─── STEP 1 : SITEMAP ────────────────────────────────────────────────
async function fetchAllUrls() {
  const indexXml = await (await fetch(`${BASE}/sitemap_index.xml`)).text();
  const parser = new XMLParser();
  const idx = parser.parse(indexXml);
  const subSitemaps = idx.sitemapindex.sitemap.map(s => s.loc);
  const allUrls = {};
  for (const sm of subSitemaps) {
    const xml = await (await fetch(sm)).text();
    const parsed = parser.parse(xml);
    const urls = (parsed.urlset?.url || []).map(u => ({
      url: u.loc, lastmod: u.lastmod || null,
    }));
    const key = sm.split("/").pop().replace("-sitemap.xml", "");
    allUrls[key] = urls;
    console.log(`  📋 ${key}: ${urls.length} URLs`);
  }
  return allUrls;
}

// ─── STEP 2 : JINA READER ────────────────────────────────────────────
async function fetchMarkdown(url) {
  const headers = {};
  if (JINA_API_KEY) headers["Authorization"] = `Bearer ${JINA_API_KEY}`;
  const r = await fetch(`${JINA_BASE}${url}`, { headers });
  if (!r.ok) throw new Error(`Jina ${r.status} ${r.statusText}`);
  return r.text();
}

// ─── STEP 3 : LAT/LNG DEPUIS LE HTML BRUT ────────────────────────────
async function fetchLatLng(url) {
  try {
    const html = await (await fetch(url)).text();
    const latM = html.match(/"lat":\s*"([0-9.-]+)"/);
    const lngM = html.match(/"lng":\s*"([0-9.-]+)"/);
    if (!latM || !lngM) return { lat: null, lng: null };
    const lat = parseFloat(latM[1]);
    const lng = parseFloat(lngM[1]);
    // Fallback générique connu (centre de Paris par défaut)
    const isGeneric = Math.abs(lat - 48.85350) < 0.0001 && Math.abs(lng - 2.34839) < 0.0001;
    return { lat, lng, _generic_fallback: isGeneric };
  } catch { return { lat: null, lng: null }; }
}

// ─── STEP 4 : EXTRACTION GEMINI ──────────────────────────────────────
async function extractWithGemini(markdown, url) {
  // Nettoyer le markdown : tronquer après "Ces adresses pourraient vous intéresser aussi"
  const cutIdx = markdown.indexOf("Ces adresses pourraient vous intéresser aussi");
  const clean = cutIdx > 0 ? markdown.slice(0, cutIdx) : markdown;

  const resp = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{
      role: "user",
      parts: [{ text: `URL source : ${url}\n\n=== MARKDOWN ===\n${clean}` }],
    }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      temperature: 0,
      maxOutputTokens: 4000,
    },
  });
  return JSON.parse(resp.text);
}

// ─── PIPELINE D'UNE URL ──────────────────────────────────────────────
async function processUrl(url, region) {
  const slug = slugFromUrl(url);
  const [markdown, geo] = await Promise.all([
    withRetry(() => fetchMarkdown(url), `Jina ${slug}`),
    fetchLatLng(url),
  ]);
  const data = await withRetry(() => extractWithGemini(markdown, url), `Gemini ${slug}`);

  // Merge GPS + URL i18n
  const result = {
    ...data,
    source_url: url,
    slug,
    region: region || data.region || null,
    address: {
      ...(data.address || {}),
      lat: geo.lat,
      lng: geo.lng,
      ...(geo._generic_fallback ? { _warning: "Coordonnées génériques centre de Paris — à enrichir." } : {}),
    },
    i18n_urls: {
      fr: url,
      en: url.replace("parislgbt.com/", "parislgbt.com/en/"),
    },
  };

  // Validation
  try { ListingSchema.parse(result); }
  catch (e) { console.warn(`  ⚠️  Validation Zod ${slug} :`, e.errors?.[0]); }

  return result;
}

// ─── MAIN ────────────────────────────────────────────────────────────
const argv = Object.fromEntries(
  process.argv.slice(2).map(a => a.replace(/^--/, "").split("=")),
);

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log("📥 Étape 1 — récupération des sitemaps…");
  const all = await fetchAllUrls();

  // Sélection des URLs à traiter
  let work = [];
  for (const [type, list] of Object.entries(all)) {
    if (argv.type && type !== argv.type) continue;
    list.forEach(item => work.push({ ...item, sitemap_type: type }));
  }
  if (argv.limit) work = work.slice(0, parseInt(argv.limit));
  console.log(`\n🎯 ${work.length} URLs à traiter (concurrency ${CONCURRENCY}).\n`);

  if (argv["dry-run"] !== undefined) {
    console.log("🧪 DRY RUN — pas d'appel Gemini, pas d'écriture.");
    work.slice(0, 10).forEach(w => console.log(`  - [${w.sitemap_type}] ${w.url}`));
    return;
  }

  const limit = pLimit(CONCURRENCY);
  const results = [];
  let done = 0;
  await Promise.all(work.map(item => limit(async () => {
    try {
      const out = await processUrl(item.url, null);
      const filename = `${item.sitemap_type}__${out.slug}.json`;
      await fs.writeFile(
        path.join(OUTPUT_DIR, filename),
        JSON.stringify(out, null, 2),
        "utf-8",
      );
      results.push(out);
      done++;
      console.log(`  ✅ [${done}/${work.length}] ${out.slug} (${out.type})`);
    } catch (e) {
      console.error(`  ❌ ${item.url} : ${e.message}`);
    }
  })));

  // Index global
  await fs.writeFile(
    path.join(OUTPUT_DIR, "_index.json"),
    JSON.stringify({
      generated_at: new Date().toISOString(),
      total: results.length,
      by_type: results.reduce((acc, r) => ({ ...acc, [r.type]: (acc[r.type] || 0) + 1 }), {}),
      slugs: results.map(r => r.slug),
    }, null, 2),
  );
  console.log(`\n🎉 Terminé. ${results.length} fichiers JSON dans ${OUTPUT_DIR}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
