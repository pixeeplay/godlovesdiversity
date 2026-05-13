/**
 * import-to-db.ts
 * --------------------------------------------------------------
 * Lit les JSON produits par parislgbt-scraper.js et seed la DB
 * PostgreSQL via Prisma.
 *
 * À placer dans le repo godlovesdiversity sous : prisma/import-parislgbt.ts
 *
 * Usage :
 *   npx tsx prisma/import-parislgbt.ts ./output
 */

import { PrismaClient, ListingStatus } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const INPUT_DIR = process.argv[2] || "./output";

// Mapping slugs → libellés FR pour les catégories (depuis le site actuel)
const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  bars: { fr: "Bars", en: "Bars" },
  restaurant: { fr: "Restaurants", en: "Restaurants" },
  cabarets: { fr: "Cabarets", en: "Cabarets" },
  clubs: { fr: "Clubs", en: "Clubs" },
  "salle-de-sport": { fr: "Salles de sport", en: "Gyms" },
  saunas: { fr: "Saunas", en: "Saunas" },
  cruising: { fr: "Cruisings", en: "Cruisings" },
  associations: { fr: "Associations", en: "Associations" },
  hebergement: { fr: "Hébergements", en: "Accommodation" },
  boutiques: { fr: "Boutiques", en: "Shops" },
  "etablissement-culturel": { fr: "Établissements culturels", en: "Cultural venues" },
  sante: { fr: "Santé", en: "Health" },
  visites: { fr: "Visites", en: "Tours" },
};

const TAG_LABELS: Record<string, { fr: string; en: string }> = {
  lesbien: { fr: "Lesbien", en: "Lesbian" },
  gay: { fr: "Gay", en: "Gay" },
  trans: { fr: "Trans", en: "Trans" },
  bi: { fr: "Bisexuel·le·s", en: "Bisexual" },
  queer: { fr: "Queer", en: "Queer" },
  drags: { fr: "Drags", en: "Drags" },
  bears: { fr: "Bears", en: "Bears" },
  cruising: { fr: "Cruising", en: "Cruising" },
  fetichisme: { fr: "Fétichisme", en: "Fetish" },
  naturisme: { fr: "Naturisme", en: "Naturism" },
  // ... à compléter à partir des 30 tags du sitemap
};

async function main() {
  console.log(`📂 Import depuis ${INPUT_DIR}\n`);

  // ─── 1. Sites ────────────────────────────────────────────────
  const paris = await prisma.site.upsert({
    where: { domain: "parislgbt.com" },
    create: {
      domain: "parislgbt.com",
      name: "Paris LGBT+ Guide",
      description: "Votre guide & agenda LGBT+ à Paris",
      locales: ["fr", "en"],
    },
    update: {},
  });
  const france = await prisma.site.upsert({
    where: { domain: "francelgbt.com" },
    create: {
      domain: "francelgbt.com",
      name: "France LGBT+ Guide",
      description: "Le guide LGBT+ des villes de France",
      locales: ["fr", "en"],
    },
    update: {},
  });
  console.log(`✓ Sites créés : ${paris.domain}, ${france.domain}`);

  // ─── 2. Categories ───────────────────────────────────────────
  for (const [slug, labels] of Object.entries(CATEGORY_LABELS)) {
    await prisma.category.upsert({
      where: { slug },
      create: { slug, name_fr: labels.fr, name_en: labels.en },
      update: { name_fr: labels.fr, name_en: labels.en },
    });
  }
  console.log(`✓ ${Object.keys(CATEGORY_LABELS).length} catégories`);

  // ─── 3. Tags ─────────────────────────────────────────────────
  for (const [slug, labels] of Object.entries(TAG_LABELS)) {
    await prisma.tag.upsert({
      where: { slug },
      create: { slug, name_fr: labels.fr, name_en: labels.en },
      update: { name_fr: labels.fr, name_en: labels.en },
    });
  }
  console.log(`✓ ${Object.keys(TAG_LABELS).length} tags`);

  // ─── 4. Regions ──────────────────────────────────────────────
  const REGIONS = [
    { slug: "paris", name_fr: "Île-de-France" },
    { slug: "grand-est", name_fr: "Grand Est" },
    { slug: "occitanie", name_fr: "Occitanie" },
    { slug: "paca-corse", name_fr: "Provence-Alpes-Côte d'Azur / Corse" },
  ];
  for (const r of REGIONS) {
    await prisma.region.upsert({ where: { slug: r.slug }, create: r, update: r });
  }
  console.log(`✓ ${REGIONS.length} régions\n`);

  // ─── 5. Listings & Events ────────────────────────────────────
  const files = (await fs.readdir(INPUT_DIR)).filter(f => f.endsWith(".json") && !f.startsWith("_"));
  let listingsCount = 0, eventsCount = 0, skipped = 0;

  for (const file of files) {
    const raw = await fs.readFile(path.join(INPUT_DIR, file), "utf-8");
    const data = JSON.parse(raw);

    // Choix du site : si "region" === "paris" ou null → parislgbt ; sinon francelgbt
    const targetSite = (data.region === "paris" || !data.region) ? paris : france;
    const region = data.region ? await prisma.region.findUnique({ where: { slug: data.region } }) : null;

    try {
      if (data.type === "event") {
        const event = await prisma.directoryEvent.upsert({
          where: { site_id_slug: { site_id: targetSite.id, slug: data.slug } },
          create: {
            slug: data.slug,
            site_id: targetSite.id,
            name: data.name,
            description_fr: data.description,
            cover_image: data.cover_image,
            gallery: data.gallery || [],
            registration_url: data.registration_url,
            venue_name: data.venue?.name,
            street: data.address?.street,
            postal_code: data.address?.postal_code,
            city: data.address?.city,
            lat: data.address?.lat,
            lng: data.address?.lng,
            source_url: data.source_url,
            imported_at: new Date(),
            status: ListingStatus.PUBLISHED,
            // venue_listing_id à rattacher en 2ème passe quand tous les listings existent
          },
          update: {},
        });
        // Dates
        if (data.dates?.length) {
          await prisma.eventDate.deleteMany({ where: { event_id: event.id } });
          for (const d of data.dates) {
            await prisma.eventDate.create({
              data: { event_id: event.id, start_at: new Date(d.start), end_at: d.end ? new Date(d.end) : null },
            });
          }
        }
        eventsCount++;
      } else if (data.type === "listing") {
        const listing = await prisma.listing.upsert({
          where: { site_id_slug: { site_id: targetSite.id, slug: data.slug } },
          create: {
            slug: data.slug,
            site_id: targetSite.id,
            region_id: region?.id,
            name: data.name,
            subtitle_fr: data.subtitle,
            description_fr: data.description,
            phone: data.phone,
            website: data.website,
            email: data.email,
            street: data.address?.street,
            postal_code: data.address?.postal_code,
            city: data.address?.city,
            country: data.address?.country || "France",
            lat: data.address?.lat,
            lng: data.address?.lng,
            transport: data.transport,
            cover_image: data.cover_image,
            logo: data.logo,
            gallery: data.gallery || [],
            facebook_url: data.social?.facebook,
            instagram_url: data.social?.instagram,
            twitter_url: data.social?.twitter,
            tiktok_url: data.social?.tiktok,
            hours: data.hours,
            source_url: data.source_url,
            imported_at: new Date(),
            status: ListingStatus.PUBLISHED,
          },
          update: {},
        });
        // Catégories
        for (const catSlug of data.categories || []) {
          const cat = await prisma.category.findUnique({ where: { slug: catSlug } });
          if (cat) {
            await prisma.listingCategory.upsert({
              where: { listing_id_category_id: { listing_id: listing.id, category_id: cat.id } },
              create: { listing_id: listing.id, category_id: cat.id },
              update: {},
            });
          }
        }
        // Tags
        for (const tagSlug of data.tags || []) {
          const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });
          if (tag) {
            await prisma.listingTag.upsert({
              where: { listing_id_tag_id: { listing_id: listing.id, tag_id: tag.id } },
              create: { listing_id: listing.id, tag_id: tag.id },
              update: {},
            });
          }
        }
        // PostGIS : mise à jour de la géométrie (raw SQL)
        if (data.address?.lat && data.address?.lng) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Listing" SET geom = ST_SetSRID(ST_MakePoint($1, $2), 4326) WHERE id = $3`,
            data.address.lng, data.address.lat, listing.id,
          );
        }
        listingsCount++;
      } else {
        skipped++;
      }
    } catch (e: any) {
      console.warn(`  ⚠️  ${data.slug} : ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n🎉 Import terminé :`);
  console.log(`   ${listingsCount} listings`);
  console.log(`   ${eventsCount} événements`);
  console.log(`   ${skipped} ignorés`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
