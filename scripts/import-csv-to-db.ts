/**
 * import-csv-to-db.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Import du CSV "Liste LGBT finale" (2 711 listings France entière) vers Prisma.
 *
 * Stratégie :
 *  - 339 listings sont déjà sur le WordPress parislgbt.com (slugs précieux pour SEO)
 *    → Match par nom (normalisé) avec les JSON scrapés → préserve le slug WP
 *  - Les 2 372 autres sont nouveaux → slug généré depuis le nom
 *  - Catégorisation : Paris (75xxx) → site parislgbt, autres régions → site lgbtfrance
 *  - Tous les listings sont mis en PUBLISHED (data validée par Arnaud)
 *
 * Usage :
 *   cd ~/Desktop/parislgbt.com
 *   DATABASE_URL=postgresql://... npx tsx scripts/import-csv-to-db.ts
 *
 * Options :
 *   --csv=path        chemin CSV (default: scripts/data/liste-lgbt-france.csv)
 *   --scrape-dir=path dossier output/ du scraping pour match SEO (default: scripts/output)
 *   --dry-run         simule sans écrire en BDD
 */
import { PrismaClient, ListingStatus } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

// ─── ARGS ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argCsv = args.find(a => a.startsWith('--csv='))?.split('=')[1] || './scripts/data/liste-lgbt-france.csv';
const argScrapeDir = args.find(a => a.startsWith('--scrape-dir='))?.split('=')[1] || './scripts/output';
const isDryRun = args.includes('--dry-run');

// ─── MAPPING ──────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, { slug: string; name_fr: string; name_en: string; order: number }> = {
  'Bars': { slug: 'bars', name_fr: 'Bars', name_en: 'Bars', order: 1 },
  'Restaurants': { slug: 'restaurant', name_fr: 'Restaurants', name_en: 'Restaurants', order: 2 },
  'Cabarets & Spectacles': { slug: 'cabarets', name_fr: 'Cabarets & Spectacles', name_en: 'Cabarets & Shows', order: 3 },
  'Clubs': { slug: 'clubs', name_fr: 'Clubs', name_en: 'Clubs', order: 4 },
  'Saunas': { slug: 'saunas', name_fr: 'Saunas', name_en: 'Saunas', order: 5 },
  'Cruising': { slug: 'cruising', name_fr: 'Cruising', name_en: 'Cruising', order: 6 },
  'Associations': { slug: 'associations', name_fr: 'Associations', name_en: 'Associations', order: 7 },
  'Collectifs & Orga': { slug: 'collectifs', name_fr: 'Collectifs & Organisations', name_en: 'Collectives', order: 8 },
  'Santé & Prévention': { slug: 'sante', name_fr: 'Santé & Prévention', name_en: 'Health & Prevention', order: 9 },
  'Boutiques': { slug: 'boutiques', name_fr: 'Boutiques', name_en: 'Shops', order: 10 },
  'Hébergements': { slug: 'hebergement', name_fr: 'Hébergements', name_en: 'Accommodation', order: 11 },
  'Visites & Tourisme': { slug: 'visites', name_fr: 'Visites & Tourisme', name_en: 'Tours & Tourism', order: 12 }
};

// Normalize accents + casse for region slug
function regionSlug(r: string): string {
  return r.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[\s‑'-]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Slugify name → URL-safe slug
function slugify(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[\s'_-]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// Normalize name for matching (drop punctuation, lowercase, no accents)
function normName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// ─── CSV PARSER (handles quoted fields with embedded commas) ──────────
function parseCSV(text: string): Record<string, string>[] {
  const lines: string[][] = [];
  let i = 0, inQuote = false, field = '', row: string[] = [];
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
      else if (c === '"') { inQuote = false; i++; }
      else { field += c; i++; }
    } else {
      if (c === '"') { inQuote = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\n' || c === '\r') {
        if (field.length || row.length) { row.push(field); lines.push(row); }
        row = []; field = '';
        if (c === '\r' && text[i + 1] === '\n') i += 2; else i++;
      } else { field += c; i++; }
    }
  }
  if (field.length || row.length) { row.push(field); lines.push(row); }

  const headers = lines[0].map(h => h.trim());
  return lines.slice(1).filter(r => r.some(x => x?.trim())).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => obj[h] = (r[idx] ?? '').trim());
    return obj;
  });
}

// ─── LOAD SCRAPED SLUGS for SEO mapping ───────────────────────────────
async function loadScrapedNames(): Promise<Map<string, { slug: string; sourceUrl: string }>> {
  const map = new Map<string, { slug: string; sourceUrl: string }>();
  if (!fs.existsSync(argScrapeDir)) {
    console.log(`⚠️  Scrape dir ${argScrapeDir} not found — no SEO slug mapping.`);
    return map;
  }
  const files = fs.readdirSync(argScrapeDir).filter(f => f.startsWith('listing__') && f.endsWith('.json'));
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(argScrapeDir, f), 'utf-8'));
      if (data.name && data.slug) {
        map.set(normName(data.name), { slug: data.slug, sourceUrl: data.source_url });
      }
    } catch {}
  }
  console.log(`📌 ${map.size} slugs WP chargés depuis ${argScrapeDir}`);
  return map;
}

// ─── MAIN ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Import CSV Liste LGBT — démarré');
  console.log(`   CSV: ${argCsv}`);
  console.log(`   Scrape dir: ${argScrapeDir} (pour mapping SEO)`);
  console.log(`   Dry run: ${isDryRun}\n`);

  // 1. Charger CSV
  const csvText = fs.readFileSync(argCsv, 'utf-8');
  const rows = parseCSV(csvText);
  console.log(`📂 ${rows.length} lignes CSV chargées\n`);

  // 2. Charger slugs WordPress (pour SEO preservation)
  const wpSlugs = await loadScrapedNames();

  // 3. Sites (parislgbt + lgbtfrance)
  if (!isDryRun) {
    await prisma.site.upsert({
      where: { domain: 'parislgbt.com' },
      create: { domain: 'parislgbt.com', name: 'Paris LGBT', description: 'Le hub queer de Paris', primary_color: '#FF2BB1' },
      update: {}
    });
    await prisma.site.upsert({
      where: { domain: 'lgbtfrance.fr' },
      create: { domain: 'lgbtfrance.fr', name: 'LGBT France', description: 'Le hub queer de toute la France', primary_color: '#6D28D9' },
      update: {}
    });
  }
  const sites = !isDryRun ? await prisma.site.findMany() : [];
  const sitePAris = sites.find(s => s.domain === 'parislgbt.com');
  const siteFrance = sites.find(s => s.domain === 'lgbtfrance.fr');
  console.log(`✓ Sites prêts: parislgbt.com (${sitePAris?.id}), lgbtfrance.fr (${siteFrance?.id})\n`);

  // 4. Catégories
  for (const [, c] of Object.entries(CATEGORY_MAP)) {
    if (!isDryRun) {
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: { slug: c.slug, name_fr: c.name_fr, name_en: c.name_en, display_order: c.order },
        update: { name_fr: c.name_fr, name_en: c.name_en, display_order: c.order }
      });
    }
  }
  console.log(`✓ ${Object.keys(CATEGORY_MAP).length} catégories upsertées\n`);

  // 5. Régions (extraites du CSV)
  const regionsSet = new Set<string>();
  for (const r of rows) {
    const reg = (r['RÉGION'] || '').trim();
    if (reg) regionsSet.add(reg);
  }
  for (const reg of regionsSet) {
    if (!isDryRun) {
      await prisma.region.upsert({
        where: { slug: regionSlug(reg) },
        create: { slug: regionSlug(reg), name_fr: reg, name_en: reg },
        update: { name_fr: reg }
      });
    }
  }
  console.log(`✓ ${regionsSet.size} régions upsertées\n`);

  // 6. Listings
  const catRecords = !isDryRun ? await prisma.category.findMany() : [];
  const catBySlug = new Map(catRecords.map(c => [c.slug, c]));
  const regionRecords = !isDryRun ? await prisma.region.findMany() : [];
  const regionBySlug = new Map(regionRecords.map(r => [r.slug, r]));

  let created = 0, updated = 0, seoMatched = 0, skipped = 0;
  const slugsUsed = new Set<string>();

  for (const r of rows) {
    const name = r['NOM ÉTABLISSEMENT'];
    if (!name) { skipped++; continue; }

    const csvCat = r['CATÉGORIES'];
    const catConf = CATEGORY_MAP[csvCat];
    if (!catConf) { skipped++; continue; }

    // SEO: si le nom matche un slug WP scrapé → préserver
    const wpMatch = wpSlugs.get(normName(name));
    let slug = wpMatch ? wpMatch.slug : slugify(name);

    // Évite collisions slugs
    let unique = slug;
    let counter = 1;
    while (slugsUsed.has(unique)) {
      unique = `${slug}-${++counter}`;
    }
    slug = unique;
    slugsUsed.add(slug);

    // Détermine le site (Paris si CP 75xxx, sinon France)
    const cp = (r['CP'] || '').trim();
    const isPAris = cp.startsWith('75') || (r['VILLE'] || '').toLowerCase() === 'paris';
    const siteId = isPAris ? sitePAris?.id : siteFrance?.id;
    if (!siteId) { skipped++; continue; }

    const regionId = regionBySlug.get(regionSlug(r['RÉGION'] || ''))?.id;
    const categoryId = catBySlug.get(catConf.slug)?.id;

    const data = {
      slug,
      site_id: siteId,
      region_id: regionId,
      name,
      subtitle_fr: r['Accroche'] || null,
      description_fr: r['Description'] || null,
      phone: r['Téléphone'] || null,
      website: (r['Web'] && r['Web'] !== 'Non trouvé') ? r['Web'] : null,
      email: r['Contact'] || null,
      street: r['ADRESSE'] || null,
      postal_code: cp || null,
      city: r['VILLE'] || null,
      country: r['Pays'] || 'France',
      cover_image: r['COVER IMG'] || null,
      logo: r['Logo'] || null,
      facebook_url: r['Facebook'] || null,
      instagram_url: r['Instagram'] || null,
      status: ListingStatus.PUBLISHED,
      source_url: wpMatch?.sourceUrl || null,
      imported_at: new Date()
    };

    if (isDryRun) {
      if (wpMatch) seoMatched++;
      created++;
      continue;
    }

    try {
      const existing = await prisma.listing.findFirst({ where: { site_id: siteId, slug } });
      let listing;
      if (existing) {
        listing = await prisma.listing.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        listing = await prisma.listing.create({ data });
        created++;
      }

      // Link category (M2M)
      if (categoryId) {
        await prisma.listingCategory.upsert({
          where: { listing_id_category_id: { listing_id: listing.id, category_id: categoryId } },
          create: { listing_id: listing.id, category_id: categoryId },
          update: {}
        });
      }

      if (wpMatch) seoMatched++;
    } catch (e: any) {
      console.log(`  ⚠️  ${name}: ${e.message?.slice(0, 80)}`);
      skipped++;
    }
  }

  console.log(`\n✅ Import terminé`);
  console.log(`   ${created} créés, ${updated} mis à jour, ${skipped} ignorés`);
  console.log(`   ${seoMatched} listings avec slug WordPress préservé (SEO ✓)`);
  console.log(`   Site Paris: ${sitePAris?.id} — Site France: ${siteFrance?.id}`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
