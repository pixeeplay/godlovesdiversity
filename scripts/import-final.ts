/**
 * import-final.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Import définitif après scrape WP + CSV France.
 *
 * STRATÉGIE :
 *   1. parislgbt.com :
 *      - 100% des 360 WP scrapes (listings + events) → SEO PRESERVÉ
 *      - + venues CSV avec CP 75xxx pas déjà couvertes par WP
 *      - Contenu : WP description (SEO d'origine)
 *
 *   2. lgbtfrance.fr :
 *      - 100% des 2711 CSV venues → couverture France entière
 *      - + 168 events WP avec dates → table DirectoryEvent
 *      - Contenu : CSV description (différent de WP → pas de duplicate content)
 *
 *   3. Catégories + tags + régions : seedés une fois pour les 2 sites
 *
 * Usage :
 *   DATABASE_URL=postgresql://... npx tsx scripts/import-final.ts
 *   --dry-run    pour simuler
 *   --paris-only / --france-only pour cibler un site
 */
import { PrismaClient, ListingStatus } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const parisOnly = args.includes('--paris-only');
const franceOnly = args.includes('--france-only');
const SCRAPE_DIR = './scripts/output';
const CSV_PATH = './scripts/data/liste-lgbt-france.csv';

const CATEGORY_MAP: Record<string, { slug: string; name_fr: string; name_en: string; order: number }> = {
  'Bars': { slug: 'bars', name_fr: 'Bars', name_en: 'Bars', order: 1 },
  'Restaurants': { slug: 'restaurant', name_fr: 'Restaurants', name_en: 'Restaurants', order: 2 },
  'Cabarets & Spectacles': { slug: 'cabarets', name_fr: 'Cabarets & Spectacles', name_en: 'Cabarets', order: 3 },
  'Clubs': { slug: 'clubs', name_fr: 'Clubs', name_en: 'Clubs', order: 4 },
  'Saunas': { slug: 'saunas', name_fr: 'Saunas', name_en: 'Saunas', order: 5 },
  'Cruising': { slug: 'cruising', name_fr: 'Cruising', name_en: 'Cruising', order: 6 },
  'Associations': { slug: 'associations', name_fr: 'Associations', name_en: 'Associations', order: 7 },
  'Collectifs & Orga': { slug: 'collectifs', name_fr: 'Collectifs & Organisations', name_en: 'Collectives', order: 8 },
  'Santé & Prévention': { slug: 'sante', name_fr: 'Santé & Prévention', name_en: 'Health', order: 9 },
  'Boutiques': { slug: 'boutiques', name_fr: 'Boutiques', name_en: 'Shops', order: 10 },
  'Hébergements': { slug: 'hebergement', name_fr: 'Hébergements', name_en: 'Accommodation', order: 11 },
  'Visites & Tourisme': { slug: 'visites', name_fr: 'Visites & Tourisme', name_en: 'Tours', order: 12 }
};

// WP scrape categories → our slugs
const WP_CAT_MAP: Record<string, string> = {
  'bars': 'bars', 'restaurant': 'restaurant', 'cabarets': 'cabarets', 'clubs': 'clubs',
  'salle-de-sport': 'sante', 'saunas': 'saunas', 'cruising': 'cruising', 'associations': 'associations',
  'hebergement': 'hebergement', 'boutiques': 'boutiques', 'etablissement-culturel': 'visites',
  'sante': 'sante', 'visites': 'visites'
};

const stripDia = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const slugify = (s: string) => stripDia(s).toLowerCase().replace(/[\s'_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');

function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let i = 0, inQ = false, field = '', row: string[] = [];
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

async function main() {
  console.log('🚀 Import final scrape + CSV');
  console.log(`   Dry: ${isDryRun}, paris-only: ${parisOnly}, france-only: ${franceOnly}\n`);

  // ─── Setup base data ────────────────────────────────────────────────
  if (!isDryRun) {
    await prisma.site.upsert({
      where: { domain: 'parislgbt.com' },
      create: { domain: 'parislgbt.com', name: 'Paris LGBT', description: 'Le hub queer de Paris', primary_color: '#FF2BB1' },
      update: {}
    });
    await prisma.site.upsert({
      where: { domain: 'lgbtfrance.fr' },
      create: { domain: 'lgbtfrance.fr', name: 'LGBT France', description: 'L\'annuaire LGBT+ de toute la France', primary_color: '#6D28D9' },
      update: {}
    });
    for (const c of Object.values(CATEGORY_MAP)) {
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: { slug: c.slug, name_fr: c.name_fr, name_en: c.name_en, display_order: c.order },
        update: { name_fr: c.name_fr, name_en: c.name_en }
      });
    }
  }

  const sitePAris = isDryRun ? { id: 'dry-paris' } : await prisma.site.findUnique({ where: { domain: 'parislgbt.com' } });
  const siteFrance = isDryRun ? { id: 'dry-france' } : await prisma.site.findUnique({ where: { domain: 'lgbtfrance.fr' } });
  if (!sitePAris || !siteFrance) throw new Error('Sites not found');

  const catRecords = isDryRun ? [] : await prisma.category.findMany();
  const catBySlug = new Map(catRecords.map(c => [c.slug, c]));

  // ─── 1. Paris : WP scrapes (preserve all SEO) ──────────────────────
  let parisFromWp = 0, parisFromCsv = 0;
  if (!franceOnly) {
    console.log('📦 Paris site — import WP scrapes…');
    if (!fs.existsSync(SCRAPE_DIR)) {
      console.log(`⚠️ ${SCRAPE_DIR} introuvable — skipping WP scrape (Paris ne recevra que les venues CSV)`);
    }
    const wpFiles = fs.existsSync(SCRAPE_DIR)
      ? fs.readdirSync(SCRAPE_DIR).filter(f => (f.startsWith('job_listing__')) && f.endsWith('.json'))
      : [];
    const wpSlugsAdded = new Set<string>();

    for (const f of wpFiles) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(SCRAPE_DIR, f), 'utf-8'));
        if (!d.slug || !d.name) continue;

        const slug = d.slug;
        if (wpSlugsAdded.has(slug)) continue;
        wpSlugsAdded.add(slug);

        // Détermine catégorie (1ère matched WP cat)
        const wpCat = (d.categories || []).find((c: string) => WP_CAT_MAP[c]);
        const catRecord = wpCat ? catBySlug.get(WP_CAT_MAP[wpCat]) : null;

        const cityFromAddr = d.address?.city || (d.address?.postal_code?.startsWith('75') ? 'Paris' : null);

        const data: any = {
          slug,
          site_id: sitePAris.id,
          name: d.name,
          subtitle_fr: d.subtitle || null,
          description_fr: d.description || null,
          phone: d.phone || null,
          website: d.website || null,
          email: d.email || null,
          street: d.address?.street || null,
          postal_code: d.address?.postal_code || null,
          city: cityFromAddr,
          country: d.address?.country || 'France',
          lat: d.address?.lat || null,
          lng: d.address?.lng || null,
          transport: d.transport || null,
          cover_image: d.cover_image || null,
          logo: d.logo || null,
          gallery: d.gallery || [],
          facebook_url: d.social?.facebook || null,
          instagram_url: d.social?.instagram || null,
          twitter_url: d.social?.twitter || null,
          hours: d.hours || undefined,
          meta_title_fr: `${d.name} | parislgbt`,
          meta_description_fr: (d.subtitle || (d.description || '').slice(0, 150)) || `${d.name} — lieu LGBT à Paris.`,
          status: ListingStatus.PUBLISHED,
          source_url: d.source_url || null,
          imported_at: new Date()
        };

        if (!isDryRun) {
          const existing = await prisma.listing.findFirst({ where: { site_id: sitePAris.id, slug } });
          const listing = existing
            ? await prisma.listing.update({ where: { id: existing.id }, data })
            : await prisma.listing.create({ data });
          if (catRecord) {
            await prisma.listingCategory.upsert({
              where: { listing_id_category_id: { listing_id: listing.id, category_id: catRecord.id } },
              create: { listing_id: listing.id, category_id: catRecord.id }, update: {}
            });
          }
        }
        parisFromWp++;
      } catch (e: any) { console.log(`  ⚠️ WP ${f}: ${e.message?.slice(0, 60)}`); }
    }
    console.log(`✓ ${parisFromWp} Paris listings from WP scrape\n`);

    // Add CSV Paris venues NOT already in Paris from WP
    console.log('📦 Paris site — ajout venues CSV manquantes…');
    const csvRows = parseCSV(fs.readFileSync(CSV_PATH, 'utf-8'));
    for (const r of csvRows) {
      const cp = (r['CP'] || '').trim();
      const isPAris = cp.startsWith('75') || (r['VILLE'] || '').toLowerCase() === 'paris';
      if (!isPAris) continue;
      const name = r['NOM ÉTABLISSEMENT'];
      if (!name) continue;
      const catConf = CATEGORY_MAP[r['CATÉGORIES']];
      if (!catConf) continue;

      let slug = slugify(name);
      let n = 1;
      while (wpSlugsAdded.has(slug)) { slug = `${slugify(name)}-${++n}`; }
      wpSlugsAdded.add(slug);

      const catRecord = catBySlug.get(catConf.slug);
      const data: any = {
        slug, site_id: sitePAris.id, name,
        subtitle_fr: r['Accroche'] || null,
        description_fr: r['Description'] || null,
        phone: r['Téléphone'] || null,
        website: r['Web'] !== 'Non trouvé' && r['Web'] ? r['Web'] : null,
        email: r['Contact'] || null,
        street: r['ADRESSE'] || null, postal_code: cp || null, city: r['VILLE'] || null,
        country: r['Pays'] || 'France',
        cover_image: r['COVER IMG'] || null, logo: r['Logo'] || null,
        facebook_url: r['Facebook'] || null, instagram_url: r['Instagram'] || null,
        meta_title_fr: `${name} — ${catConf.name_fr.toLowerCase()} LGBT à Paris | parislgbt`,
        meta_description_fr: `${name}${r['Accroche'] ? ' : ' + r['Accroche'] : ''}. ${catConf.name_fr} LGBT à Paris.`,
        status: ListingStatus.PUBLISHED, imported_at: new Date()
      };
      if (!isDryRun) {
        try {
          const listing = await prisma.listing.create({ data });
          if (catRecord) {
            await prisma.listingCategory.create({
              data: { listing_id: listing.id, category_id: catRecord.id }
            }).catch(() => null);
          }
          parisFromCsv++;
        } catch (e: any) {
          if (!e.message?.includes('Unique constraint')) console.log(`  ⚠️ CSV Paris ${name}: ${e.message?.slice(0, 60)}`);
        }
      } else parisFromCsv++;
    }
    console.log(`✓ ${parisFromCsv} Paris listings extra from CSV\n`);
  }

  // ─── 2. France : 2711 CSV venues + 168 WP events ────────────────────
  let franceFromCsv = 0;
  if (!parisOnly) {
    console.log('📦 France site — import CSV (toutes régions)…');
    const csvRows = parseCSV(fs.readFileSync(CSV_PATH, 'utf-8'));
    const franceSlugs = new Set<string>();

    for (const r of csvRows) {
      const name = r['NOM ÉTABLISSEMENT'];
      if (!name) continue;
      const catConf = CATEGORY_MAP[r['CATÉGORIES']];
      if (!catConf) continue;

      let slug = slugify(name);
      let n = 1;
      while (franceSlugs.has(slug)) { slug = `${slugify(name)}-${++n}`; }
      franceSlugs.add(slug);

      const catRecord = catBySlug.get(catConf.slug);
      const region = r['RÉGION'] || 'France';
      const cp = (r['CP'] || '').trim();
      const ville = r['VILLE'] || '';

      const data: any = {
        slug, site_id: siteFrance.id, name,
        subtitle_fr: r['Accroche'] || null,
        description_fr: r['Description'] || null,
        phone: r['Téléphone'] || null,
        website: r['Web'] !== 'Non trouvé' && r['Web'] ? r['Web'] : null,
        email: r['Contact'] || null,
        street: r['ADRESSE'] || null, postal_code: cp || null, city: ville || null,
        country: r['Pays'] || 'France',
        cover_image: r['COVER IMG'] || null, logo: r['Logo'] || null,
        facebook_url: r['Facebook'] || null, instagram_url: r['Instagram'] || null,
        // DIFFÉRENCIATION SEO : title + meta avec ANGLE NATIONAL (vs Paris-only)
        meta_title_fr: `${name} : ${catConf.name_fr.toLowerCase()} LGBT à ${ville} (${region}) | LGBT France`,
        meta_description_fr: `Découvrez ${name}, ${catConf.name_fr.toLowerCase().replace(/s$/, '')} LGBT-friendly situé·e à ${ville} en ${region}. Annuaire complet des lieux LGBT+ de France sur lgbtfrance.fr.`,
        status: ListingStatus.PUBLISHED, imported_at: new Date()
      };

      if (!isDryRun) {
        try {
          const listing = await prisma.listing.create({ data });
          if (catRecord) {
            await prisma.listingCategory.create({
              data: { listing_id: listing.id, category_id: catRecord.id }
            }).catch(() => null);
          }
          franceFromCsv++;
        } catch (e: any) {
          if (!e.message?.includes('Unique constraint')) console.log(`  ⚠️ CSV France ${name}: ${e.message?.slice(0, 60)}`);
        }
      } else franceFromCsv++;
    }
    console.log(`✓ ${franceFromCsv} listings France from CSV\n`);
  }

  console.log('=================================');
  console.log(`✅ Total Paris (parislgbt.com):   ${parisFromWp + parisFromCsv} (${parisFromWp} from WP scrape, ${parisFromCsv} extra from CSV)`);
  console.log(`✅ Total France (lgbtfrance.fr):  ${franceFromCsv}`);
  console.log('=================================');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
