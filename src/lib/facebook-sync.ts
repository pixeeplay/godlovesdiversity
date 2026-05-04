/**
 * Synchro événements Facebook → table Event de GLD.
 *
 * IMPORTANT (Meta API en 2026) :
 * - L'API publique d'événements Facebook a été sunsetée. Il faut un Page Access Token
 *   du Page que l'on synchronise (l'utilisateur doit être admin/editor du Page sur FB).
 * - Endpoint : GET /{page-id}/events?fields=id,name,description,start_time,end_time,place,cover,ticket_uri
 *   avec access_token=PAGE_TOKEN
 * - Permissions requises sur l'app Meta : pages_show_list, pages_read_engagement, pages_manage_metadata
 *
 * Usage : `await syncFacebookEvents({ venueId, pageId, pageToken, autoPublish })`
 */
import { prisma } from './prisma';

const FB_API_VERSION = 'v19.0';

export type FbSyncResult = {
  ok: boolean;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type FbEvent = {
  id: string;
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  place?: {
    name?: string;
    location?: { city?: string; country?: string; street?: string; latitude?: number; longitude?: number };
  };
  cover?: { source?: string; offset_x?: number; offset_y?: number };
  ticket_uri?: string;
  is_canceled?: boolean;
};

export async function syncFacebookEvents(opts: {
  venueId: string;
  pageId: string;
  pageToken: string;
  autoPublish: boolean;
  /** Limite optionnelle (défaut 25, max raisonnable 100) */
  limit?: number;
}): Promise<FbSyncResult> {
  const result: FbSyncResult = { ok: false, fetched: 0, created: 0, updated: 0, skipped: 0, errors: [] };

  const venue = await prisma.venue.findUnique({
    where: { id: opts.venueId },
    select: { id: true, slug: true, city: true, country: true, address: true, name: true }
  }).catch(() => null);

  if (!venue) {
    result.errors.push('Venue introuvable');
    return result;
  }

  const fields = 'id,name,description,start_time,end_time,place,cover,ticket_uri,is_canceled';
  const limit = Math.min(opts.limit || 25, 100);
  const url = `https://graph.facebook.com/${FB_API_VERSION}/${encodeURIComponent(opts.pageId)}/events?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(opts.pageToken)}`;

  let fbEvents: FbEvent[] = [];
  try {
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json();
    if (!r.ok || j.error) {
      result.errors.push(`Facebook API: ${j.error?.message || `HTTP ${r.status}`}`);
      return result;
    }
    fbEvents = (j.data || []) as FbEvent[];
  } catch (e: any) {
    result.errors.push(`Fetch error: ${e?.message || 'unknown'}`);
    return result;
  }

  result.fetched = fbEvents.length;

  for (const fb of fbEvents) {
    if (!fb.id || !fb.name || !fb.start_time) {
      result.skipped++;
      continue;
    }
    try {
      const data = {
        slug: `fb-${fb.id}`,
        title: fb.name,
        description: fb.description || null,
        startsAt: new Date(fb.start_time),
        endsAt: fb.end_time ? new Date(fb.end_time) : null,
        location: fb.place?.name || venue.name || null,
        city: fb.place?.location?.city || venue.city,
        country: fb.place?.location?.country || venue.country,
        address: fb.place?.location?.street || venue.address,
        lat: fb.place?.location?.latitude || null,
        lng: fb.place?.location?.longitude || null,
        coverImage: fb.cover?.source || null,
        url: fb.ticket_uri || `https://www.facebook.com/events/${fb.id}`,
        tags: ['facebook'],
        venueId: venue.id,
        published: opts.autoPublish,
        cancelled: !!fb.is_canceled,
        externalSource: 'facebook',
        externalId: fb.id,
        externalUrl: `https://www.facebook.com/events/${fb.id}`
      };

      const existing = await prisma.event.findUnique({
        where: { externalSource_externalId: { externalSource: 'facebook', externalId: fb.id } }
      });

      if (existing) {
        // On NE force PAS published à autoPublish si l'admin a déjà choisi (préserve le brouillon validé manuellement)
        const { published: _, ...updateData } = data;
        await prisma.event.update({
          where: { id: existing.id },
          data: { ...updateData, cancelled: data.cancelled }
        });
        result.updated++;
      } else {
        await prisma.event.create({ data });
        result.created++;
      }
    } catch (e: any) {
      result.errors.push(`Event ${fb.id}: ${e?.message?.slice(0, 80)}`);
      result.skipped++;
    }
  }

  await prisma.venue.update({ where: { id: venue.id }, data: { fbSyncedAt: new Date() } }).catch(() => null);

  result.ok = result.errors.length === 0 || (result.created + result.updated) > 0;
  return result;
}

/**
 * Sync TOUS les venues qui ont une connexion FB configurée.
 * Appelable par cron quotidien.
 */
export async function syncAllFacebookVenues(): Promise<{ totalVenues: number; results: Array<{ venueId: string; venueName: string; result: FbSyncResult }> }> {
  const venues = await prisma.venue.findMany({
    where: { facebookPageId: { not: null }, facebookPageToken: { not: null } },
    select: { id: true, name: true, facebookPageId: true, facebookPageToken: true, autoPublishFbEvents: true }
  }).catch(() => []);

  const results = [];
  for (const v of venues) {
    if (!v.facebookPageId || !v.facebookPageToken) continue;
    const r = await syncFacebookEvents({
      venueId: v.id,
      pageId: v.facebookPageId,
      pageToken: v.facebookPageToken,
      autoPublish: v.autoPublishFbEvents
    });
    results.push({ venueId: v.id, venueName: v.name, result: r });
  }
  return { totalVenues: venues.length, results };
}
