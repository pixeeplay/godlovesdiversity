/**
 * POST /api/admin/venues/import-from-listings
 *
 * Hydrate la table Venue à partir des Listings importés via les SEO Boosts.
 * Mapping :
 *   - Listing.categories[0].slug → VenueType (bars→BAR, clubs→CLUB, etc.)
 *   - Idempotent : slug Listing → slug Venue (skip si déjà existant).
 *   - Limite optionnelle (test) ou site (paris/france/all).
 *
 * Streame les logs en text/plain chunked.
 */
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mapping slug catégorie SEO → VenueType
const CAT_TO_TYPE: Record<string, string> = {
  bars: 'BAR',
  restaurant: 'RESTAURANT',
  cabarets: 'CULTURAL',
  clubs: 'CLUB',
  saunas: 'BAR',           // pas de SAUNA dans l'enum → BAR + tag "sauna"
  cruising: 'BAR',
  associations: 'ASSOCIATION',
  collectifs: 'ASSOCIATION',
  sante: 'HEALTH',
  boutiques: 'SHOP',
  hebergement: 'HOTEL',
  visites: 'CULTURAL'
};

const CAT_TO_TAG: Record<string, string> = {
  saunas: 'sauna',
  cruising: 'cruising',
  cabarets: 'cabaret',
  visites: 'tourisme'
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return new Response('forbidden', { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const limit: number | undefined = typeof body.limit === 'number' ? body.limit : undefined;
  const siteFilter: 'paris' | 'france' | 'all' | undefined = body.site;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (l: string) => controller.enqueue(enc.encode(l + '\n'));

      try {
        send('▶ Import Listings → Venues');
        send(`  limit=${limit ?? 'all'}, site=${siteFilter ?? 'all'}`);

        // Resolve sites
        const sitePAris = await prisma.site.findUnique({ where: { domain: 'parislgbt.com' } });
        const siteFrance = await prisma.site.findUnique({ where: { domain: 'lgbtfrance.fr' } });
        if (!sitePAris || !siteFrance) {
          send('❌ Sites parislgbt.com / lgbtfrance.fr introuvables — lance d\'abord l\'Import SEO.');
          controller.close();
          return;
        }

        const where: any = { status: 'PUBLISHED' };
        if (siteFilter === 'paris') where.site_id = sitePAris.id;
        else if (siteFilter === 'france') where.site_id = siteFrance.id;

        const total = await prisma.listing.count({ where });
        send(`📦 ${total} listings candidats (avant filtre type)`);

        const listings = await prisma.listing.findMany({
          where,
          include: { categories: { include: { category: true } } },
          orderBy: { created_at: 'asc' },
          take: limit
        });

        const existingSlugs = new Set(
          (await prisma.venue.findMany({ select: { slug: true } })).map((v) => v.slug)
        );
        send(`📦 ${existingSlugs.size} venues déjà existantes (seront ignorées)`);

        let created = 0, skippedExisting = 0, skippedNoCategory = 0, errors = 0;
        const startedAt = Date.now();

        for (const l of listings) {
          // Skip si déjà importé
          if (existingSlugs.has(l.slug)) { skippedExisting++; continue; }

          // Déterminer type depuis la 1ère catégorie matchée
          const firstCatSlug = l.categories[0]?.category.slug;
          const venueType = firstCatSlug ? CAT_TO_TYPE[firstCatSlug] : null;
          if (!venueType) { skippedNoCategory++; continue; }

          const extraTag = firstCatSlug ? CAT_TO_TAG[firstCatSlug] : null;
          const tags = extraTag ? [extraTag] : [];

          try {
            await prisma.venue.create({
              data: {
                slug: l.slug,
                type: venueType as any,
                rating: 'FRIENDLY',
                name: l.name,
                description: l.description_fr,
                shortDescription: l.subtitle_fr,
                address: l.street,
                city: l.city,
                postalCode: l.postal_code,
                country: 'FR',
                region: null,
                lat: l.lat,
                lng: l.lng,
                phone: l.phone,
                email: l.email,
                website: l.website,
                coverImage: l.cover_image,
                logo: l.logo,
                photos: (l.gallery as any[] | null) || [],
                tags,
                instagram: l.instagram_url,
                facebook: l.facebook_url,
                published: true,
                verified: false,
                featured: l.featured ?? false
              }
            });
            created++;
            existingSlugs.add(l.slug);
            if (created % 50 === 0) send(`  ✓ ${created} créés (en cours…)`);
          } catch (e: any) {
            errors++;
            if (errors <= 3) send(`  ⚠ ${l.slug}: ${e.message?.slice(0, 80)}`);
          }
        }

        const elapsed = Math.round((Date.now() - startedAt) / 1000);
        send('');
        send('═══════════════════════════════════');
        send(`✅ Terminé en ${elapsed}s`);
        send(`   ${created} venues créées`);
        send(`   ${skippedExisting} skippées (déjà existantes)`);
        send(`   ${skippedNoCategory} skippées (pas de catégorie compatible)`);
        if (errors > 0) send(`   ${errors} erreurs`);
        send('═══════════════════════════════════');
        send(`👉 Vérifie /admin/venues et la page publique /fr/lieux`);
      } catch (e: any) {
        send(`❌ Erreur: ${e.message || String(e)}`);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' }
  });
}
