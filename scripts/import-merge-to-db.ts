/**
 * import-merge-to-db.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Merge complet pour DB Prisma :
 *   1. Lit les 414 JSON scrapés (priorité = slugs WordPress = SEO)
 *   2. Lit le CSV "Liste LGBT finale" (2711 listings, France entière)
 *   3. Match par nom normalisé → 1 listing unique (315 préservent leur slug WP)
 *   4. Crée 2 versions par listing :
 *        - parislgbt.com : ATTACHED si CP 75xxx ou ville=Paris
 *        - lgbtfrance.fr : ATTACHED pour TOUS, avec contenu DIFFÉRENCIÉ
 *
 * Différenciation contenus (anti-duplicate content Google) :
 *   - meta_title_fr : Paris → "X — Bar gay à Paris" / France → "X — Bar LGBT en France (Paris)"
 *   - meta_description_fr : reformule subtitle + city pour les 2 versions
 *   - subtitle_fr : conservé identique (court, factuel)
 *   - description_fr : Paris = WP scrape | France = CSV (texte différent)
 *
 * Usage :
 *   DATABASE_URL=postgresql://... npx tsx scripts/import-merge-to-db.ts
 *
 * Options :
 *   --csv=path          (default: scripts/data/liste-lgbt-france.csv)
 *   --scrape-dir=path   (default: scripts/output)
 *   --dry-run           simule sans BDD
 *   --limit=N           limite à N listings (pour test)
 */
import { PrismaClient, ListingStatus } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const argCsv = args.find(a => a.startsWith('--csv='))?.split('=')[1] || './scripts/data/liste-lgbt-france.csv';
const argScrapeDir = args.find(a => a.startsWith('--scrape-dir='))?.split('=')[1] || './scripts/output';
const isDryRun = args.includes('--dry-run');
const argLimit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');

// ─── Catégorie map (CSV label → WP slug) ──────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────
const stripDiacritics = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const slugify = (s: string) => stripDiacritics(s).toLowerCase().replace(/[\s'_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
const normName = (s: string) => stripDiacritics(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

function parseCSV(text: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  let i = 0, inQ = false, field = '', row: string[] = [];
  const rows: string[][] = [];
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 2; }
      else if (c === '"') { inQ = false; i++; }
      else { field += c; i++; }
    } else {
      if (c === '"') { inQ = true; i++; }
      else if (c === ',') { row.push(field); field = ''; i++; }
      else if (c === '\n' || c === '\r') {
        if (field.length || row.length) { row.push(field); rows.push(row); }
        row = []; field = '';
        if (c === '\r' && text[i + 1] === '\n') i += 2; else i++;
      } else { field += c; i++; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.some(x => x?.trim())).map(r => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => obj[h] = (r[idx] ?? '').trim());
    return obj;
  });
}

// ─── Différenciation contenus (anti-duplicate content) ────────────────
function generateMetaParis(listing: any, catName: string): { title: string; description: string } {
  const name = listing.name;
  const city = listing.city || 'Paris';
  const district = listing.postal_code ? ` (${listing.postal_code})` : '';
  const subtitle = listing.subtitle_fr ? ` — ${listing.subtitle_fr}` : '';
  return {
    title: `${name} : ${catName.toLowerCase()} LGBT à ${city}${district} | parislgbt`,
    description: `Découvrez ${name}${subtitle}. ${catName.replace(/s$/, '')} LGBT-friendly à ${city}. Adresse, horaires, contact et avis sur parislgbt.com.`
  };
}

function generateMetaFrance(listing: any, catName: string, regionName: string): { title: string; description: string } {
  const name = listing.name;
  const city = listing.city || '';
  const region = regionName || 'France';
  return {
    title: `${name} — ${catName} LGBT à ${city} (${region}) | LGBT France`,
    description: `${name} fait partie de notre annuaire des ${catName.toLowerCase()} LGBT en ${region}. Lieu situé à ${city}. Découvrez tous les lieux LGBT-friendly de la région sur lgbtfrance.fr.`
  };
}

// Rewrite description for France site (different from Paris version)
function rewriteDescriptionForFrance(csvDesc: string | null, wpDesc: string | null, listing: any, regionName: string): string | null {
  // For France, prefer CSV description (Arnaud's curated data)
  // If both available: CSV (already different from WP). If only WP: prepend a regional framing
  if (csvDesc) return csvDesc;
  if (wpDesc) {
    const region = regionName || 'France';
    return `Situé en ${region}. ${wpDesc}`;
  }
  return null;
}

function rewriteDescriptionForParis(csvDesc: string | null, wpDesc: string | null): string | null {
  // For Paris, prefer WP description (original SEO content), fallback CSV
  return wpDesc || csvDesc;
}

// ─── MAIN ─────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Import merge scrape + CSV → 2 sites');
  console.log(`   CSV:          ${argCsv}`);
  console.log(`   Scrape dir:   ${argScrapeDir}`);
  console.log(`   Dry run:      ${isDryRun}`);
  if (argLimit) console.log(`   Limit:        ${argLimit}`);
  console.log('');

  // 1. Charger scrape (priorité = slugs WP)
  type WpData = { slug: string; sourceUrl: string; name: string; subtitle: string|null; description: string|null;
    phone: string|null; website: string|null; email: string|null; categories: string[]; tags: string[];
    address: any; hours: any; social: any; cover_image: string|null; logo: string|null; gallery: string[] };
  const wpByName = new Map<string, WpData>();
  if (fs.existsSync(argScrapeDir)) {
    const files = fs.readdirSync(argScrapeDir).filter(f =>
      (f.startsWith('job_listing__') || f.startsWith('listing__')) && f.endsWith('.json')
    );
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(argScrapeDir, f), 'utf-8'));
        if (d.name && d.slug) wpByName.set(normName(d.name), d);
      } catch {}
    }
    console.log(`📦 ${wpByName.size} listings scrapés chargés (slugs WP)`);
  }

  // 2. Charger CSV
  const rows = parseCSV(fs.readFileSync(argCsv, 'utf-8'));
  console.log(`📦 ${rows.length} listings CSV chargés`);

  if (isDryRun) {
    // Just stats
    const matchedWp = rows.filter(r => wpByName.has(normName(r['NOM ÉTABLISSEMENT'] || ''))).length;
    const parisOnly = rows.filter(r => (r['CP'] || '').startsWith('75') || (r['VILLE'] || '').toLowerCase() === 'paris').length;
    console.log(`\n📊 Stats (dry-run) :`);
    console.log(`   ${matchedWp} CSV ↔ WP scrape match (slug WP préservé)`);
    console.log(`   ${parisOnly} listings → parislgbt.com (Paris)`);
    console.log(`   ${rows.length} listings → lgbtfrance.fr (toutes régions)`);
    return;
  }

  // 3. Sites
  const sitePAris = await prisma.site.upsert({
    where: { domain: 'parislgbt.com' },
    create: { domain: 'parislgbt.com', name: 'Paris LGBT', description: 'Le hub queer de Paris depuis 2014', primary_color: '#FF2BB1' },
    update: { description: 'Le hub queer de Paris depuis 2014' }
  });
  const siteFrance = await prisma.site.upsert({
    where: { domain: 'lgbtfrance.fr' },
    create: { domain: 'lgbtfrance.fr', name: 'LGBT France', description: 'L\'annuaire LGBT+ de toute la France — 2700+ adresses', primary_color: '#6D28D9' },
    update: { description: 'L\'annuaire LGBT+ de toute la France — 2700+ adresses' }
  });
  console.log(`✓ Sites : ${sitePAris.id} (parislgbt) + ${siteFrance.id} (lgbtfrance)`);

  // 4. Catégories
  for (const c of Object.values(CATEGORY_MAP)) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: { slug: c.slug, name_fr: c.name_fr, name_en: c.name_en, display_order: c.order },
      update: { name_fr: c.name_fr, name_en: c.name_en }
    });
  }
  console.log(`✓ ${Object.keys(CATEGORY_MAP).length} catégories upsertées`);

  // 5. Régions
  const regionsSet = new Set<string>();
  for (const r of rows) {
    const reg = (r['RÉGION'] || '').trim();
    if (reg) regionsSet.add(reg);
  }
  for (const reg of regionsSet) {
    await prisma.region.upsert({
      where: { slug: slugify(reg) },
      create: { slug: slugify(reg), name_fr: reg, name_en: reg },
      update: { name_fr: reg }
    });
  }
  console.log(`✓ ${regionsSet.size} régions upsertées`);

  const catRecords = await prisma.category.findMany();
  const catBySlug = new Map(catRecords.map(c => [c.slug, c]));
  const regionRecords = await prisma.region.findMany();
  const regionBySlug = new Map(regionRecords.map(r => [r.slug, r]));

  // 6. Listings (Paris version + France version)
  let createdParis = 0, createdFrance = 0, seoMatched = 0, skipped = 0;
  const slugsUsedParis = new Set<string>();
  const slugsUsedFrance = new Set<string>();

  const toProcess = argLimit ? rows.slice(0, argLimit) : rows;

  for (const r of toProcess) {
    const name = r['NOM ÉTABLISSEMENT'];
    if (!name) { skipped++; continue; }
    const catConf = CATEGORY_MAP[r['CATÉGORIES']];
    if (!catConf) { skipped++; continue; }

    const cp = (r['CP'] || '').trim();
    const isPAris = cp.startsWith('75') || (r['VILLE'] || '').toLowerCase() === 'paris';

    const wpMatch = wpByName.get(normName(name));
    const baseSlug = wpMatch ? wpMatch.slug : slugify(name);

    const regionRecord = regionBySlug.get(slugify(r['RÉGION'] || ''));
    const categoryRecord = catBySlug.get(catConf.slug);

    // ─── Paris version (if applicable) ───
    if (isPAris) {
      let slug = baseSlug;
      let n = 1;
      while (slugsUsedParis.has(slug)) slug = `${baseSlug}-${++n}`;
      slugsUsedParis.add(slug);

      const meta = generateMetaParis(
        { name, city: r['VILLE'], postal_code: cp, subtitle_fr: r['Accroche'] },
        catConf.name_fr
      );
      const desc = rewriteDescriptionForParis(r['Description'] || null, wpMatch?.description || null);

      try {
        const existing = await prisma.listing.findFirst({ where: { site_id: sitePAris.id, slug } });
        const data: any = {
          slug,
          site_id: sitePAris.id,
          region_id: regionRecord?.id,
          name,
          subtitle_fr: r['Accroche'] || wpMatch?.subtitle || null,
          description_fr: desc,
          phone: r['Téléphone'] || wpMatch?.phone || null,
          website: r['Web'] !== 'Non trouvé' && r['Web'] ? r['Web'] : (wpMatch?.website || null),
          email: r['Contact'] || wpMatch?.email || null,
          street: r['ADRESSE'] || wpMatch?.address?.street || null,
          postal_code: cp || null,
          city: r['VILLE'] || null,
          country: r['Pays'] || 'France',
          lat: wpMatch?.address?.lat || null,
          lng: wpMatch?.address?.lng || null,
          cover_image: r['COVER IMG'] || wpMatch?.cover_image || null,
          logo: r['Logo'] || wpMatch?.logo || null,
          gallery: wpMatch?.gallery || [],
          facebook_url: r['Facebook'] || wpMatch?.social?.facebook || null,
          instagram_url: r['Instagram'] || wpMatch?.social?.instagram || null,
          twitter_url: wpMatch?.social?.twitter || null,
          hours: wpMatch?.hours || undefined,
          meta_title_fr: meta.title,
          meta_description_fr: meta.description,
          status: ListingStatus.PUBLISHED,
          source_url: wpMatch?.sourceUrl || null,
          imported_at: new Date()
        };
        const listing = existing
          ? await prisma.listing.update({ where: { id: existing.id }, data })
          : await prisma.listing.create({ data });
        if (categoryRecord) {
          await prisma.listingCategory.upsert({
            where: { listing_id_category_id: { listing_id: listing.id, category_id: categoryRecord.id } },
            create: { listing_id: listing.id, category_id: categoryRecord.id },
            update: {}
          });
        }
        createdParis++;
        if (wpMatch) seoMatched++;
      } catch (e: any) { console.log(`  ⚠️ Paris ${name}: ${e.message?.slice(0, 80)}`); }
    }

    // ─── France version (ALL listings) ───
    let slug = baseSlug;
    let n = 1;
    while (slugsUsedFrance.has(slug)) slug = `${baseSlug}-${++n}`;
    slugsUsedFrance.add(slug);

    const metaF = generateMetaFrance(
      { name, city: r['VILLE'] },
      catConf.name_fr,
      r['RÉGION'] || ''
    );
    const descF = rewriteDescriptionForFrance(r['Description'] || null, wpMatch?.description || null, r, r['RÉGION'] || '');

    try {
      const existing = await prisma.listing.findFirst({ where: { site_id: siteFrance.id, slug } });
      const data: any = {
        slug,
        site_id: siteFrance.id,
        region_id: regionRecord?.id,
        name,
        subtitle_fr: r['Accroche'] || null,
        description_fr: descF,
        phone: r['Téléphone'] || null,
        website: r['Web'] !== 'Non trouvé' && r['Web'] ? r['Web'] : null,
        email: r['Contact'] || null,
        street: r['ADRESSE'] || null,
        postal_code: cp || null,
        city: r['VILLE'] || null,
        country: r['Pays'] || 'France',
        cover_image: r['COVER IMG'] || null,
        logo: r['Logo'] || null,
        facebook_url: r['Facebook'] || null,
        instagram_url: r['Instagram'] || null,
        meta_title_fr: metaF.title,
        meta_description_fr: metaF.description,
        status: ListingStatus.PUBLISHED,
        source_url: wpMatch?.sourceUrl || null,
        imported_at: new Date()
      };
      const listing = existing
        ? await prisma.listing.update({ where: { id: existing.id }, data })
        : await prisma.listing.create({ data });
      if (categoryRecord) {
        await prisma.listingCategory.upsert({
          where: { listing_id_category_id: { listing_id: listing.id, category_id: categoryRecord.id } },
          create: { listing_id: listing.id, category_id: categoryRecord.id },
          update: {}
        });
      }
      createdFrance++;
    } catch (e: any) { console.log(`  ⚠️ France ${name}: ${e.message?.slice(0, 80)}`); }
  }

  console.log(`\n✅ Import terminé`);
  console.log(`   ${createdParis} listings sur parislgbt.com`);
  console.log(`   ${createdFrance} listings sur lgbtfrance.fr`);
  console.log(`   ${seoMatched} slugs WordPress préservés (SEO ✓)`);
  console.log(`   ${skipped} skipped`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
