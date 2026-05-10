import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

/**
 * GET /api/admin/leads/scraper/jobs
 * Liste les jobs de scrape avec leur état (idle/queued/running/done/error).
 */
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get('limit')) || 20);

  const jobs = await (prisma as any).leadScrapeJob.findMany({
    orderBy: { updatedAt: 'desc' },
    take: limit
  }).catch(() => []);

  return NextResponse.json({ jobs });
}

/**
 * POST /api/admin/leads/scraper/jobs
 * Crée + lance un nouveau job de scrape.
 * Body : { name, source, config: { urls[], depth, country, target: 'b2c'|'b2b' } }
 */
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = (body.name as string)?.trim();
  const source = (body.source as string) || 'website';
  const config = body.config || {};

  if (!name) return NextResponse.json({ error: 'name-required' }, { status: 400 });
  if (!Array.isArray(config.urls) || config.urls.length === 0) {
    return NextResponse.json({ error: 'urls-required' }, { status: 400 });
  }

  const job = await (prisma as any).leadScrapeJob.create({
    data: {
      name,
      source,
      config,
      active: true,
      status: 'queued',
      progress: 0
    }
  });

  // Lance le scrape en arrière-plan (fire-and-forget)
  // En production, ce serait dans un worker BullMQ. Ici on lance direct.
  void runScrapeJob(job.id).catch((e) => console.error('scrape-job-error', job.id, e));

  return NextResponse.json({ ok: true, job });
}

/**
 * Exécute un job de scrape : itère sur les URLs, appelle scrapeWebUrl,
 * agrège les contacts, met à jour progress + result en DB,
 * upsert les leads dans la table Lead.
 */
async function runScrapeJob(jobId: string) {
  const { scrapeWebUrl } = await import('@/lib/scrape-adapters/web');
  const { validateEmailsBulk } = await import('@/lib/contact-validators');

  const job = await (prisma as any).leadScrapeJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  const config = job.config as any;
  const urls: string[] = config.urls || [];
  const depth: number = typeof config.depth === 'number' ? config.depth : 1;
  const country: string = config.country || 'FR';
  const target: 'b2c' | 'b2b' = config.target || 'b2b';
  const tags: string[] = Array.isArray(config.tags) ? config.tags : [target === 'b2c' ? 'b2c-mariage' : 'b2b-pros'];
  const segments: string[] = Array.isArray(config.segments) ? config.segments : [];

  await (prisma as any).leadScrapeJob.update({
    where: { id: jobId },
    data: { status: 'running', progress: 0 }
  });

  const allContacts: any[] = [];
  const errors: string[] = [];
  let pagesVisited = 0;
  let pagesSucceeded = 0;
  let pagesBlocked = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    try {
      const r = await scrapeWebUrl({
        url,
        depth,
        defaultCountry: country as any,
        maxPages: 8,
        jinaFallback: true
      });
      pagesVisited += r.pagesVisited.length;
      pagesSucceeded += r.pagesSucceeded;
      pagesBlocked += r.pagesBlocked;
      allContacts.push(...r.contacts.map((c) => ({ ...c, sourceUrl: url })));
      if (r.errors?.length) errors.push(...r.errors.slice(0, 3));
    } catch (e: any) {
      errors.push(`${url}: ${e?.message || 'unknown'}`);
    }
    const progress = Math.round(((i + 1) / urls.length) * 80);
    await (prisma as any).leadScrapeJob.update({
      where: { id: jobId },
      data: { progress }
    }).catch(() => {});
  }

  // Validation MX en bulk
  const emails = allContacts.map((c) => c.email).filter(Boolean) as string[];
  const validations = emails.length > 0 ? await validateEmailsBulk(emails) : [];
  const valMap: Record<string, any> = {};
  for (const v of validations) valMap[v.email] = v;

  await (prisma as any).leadScrapeJob.update({
    where: { id: jobId },
    data: { progress: 90 }
  }).catch(() => {});

  // Upsert dans Lead
  let created = 0;
  let merged = 0;
  let skipped = 0;
  for (const c of allContacts) {
    if (!c.email && !c.phoneE164) {
      skipped++;
      continue;
    }
    const validation = c.email ? valMap[c.email] : null;
    const score = validation?.score ?? (c.email ? 30 : 20);
    if (validation && validation.score < 30) {
      skipped++;
      continue;
    }
    try {
      const baseData: any = {
        phone: c.phoneE164 || null,
        linkedinUrl: c.handles?.linkedin ? `https://linkedin.com/in/${c.handles.linkedin}` : null,
        instagramUrl: c.handles?.instagram ? `https://instagram.com/${c.handles.instagram}` : null,
        twitterUrl: c.handles?.twitter ? `https://twitter.com/${c.handles.twitter}` : null,
        facebookUrl: c.handles?.facebook ? `https://facebook.com/${c.handles.facebook}` : null,
        score,
        source: 'scrape-web',
        sourceDetail: c.sourceUrl,
        scrapedFromUrl: c.sourceUrl,
        tags,
        segments,
        status: 'new'
      };
      if (c.email) {
        const existing = await (prisma as any).lead.findUnique({ where: { email: c.email } });
        if (existing) {
          await (prisma as any).lead.update({
            where: { id: existing.id },
            data: {
              phone: existing.phone || baseData.phone,
              linkedinUrl: existing.linkedinUrl || baseData.linkedinUrl,
              instagramUrl: existing.instagramUrl || baseData.instagramUrl,
              twitterUrl: existing.twitterUrl || baseData.twitterUrl,
              facebookUrl: existing.facebookUrl || baseData.facebookUrl,
              tags: Array.from(new Set([...existing.tags, ...tags])),
              segments: Array.from(new Set([...existing.segments, ...segments]))
            }
          });
          merged++;
        } else {
          await (prisma as any).lead.create({ data: { email: c.email, ...baseData } });
          created++;
        }
      } else {
        await (prisma as any).lead.create({ data: baseData });
        created++;
      }
    } catch {
      skipped++;
    }
  }

  await (prisma as any).leadScrapeJob.update({
    where: { id: jobId },
    data: {
      status: 'done',
      progress: 100,
      lastRunAt: new Date(),
      lastRunCount: created + merged,
      totalLeads: { increment: created },
      result: { contactsFound: allContacts.length, pagesVisited, pagesSucceeded, pagesBlocked, created, merged, skipped, errors: errors.slice(0, 5) }
    }
  }).catch(async (e: any) => {
    await (prisma as any).leadScrapeJob.update({
      where: { id: jobId },
      data: { status: 'error', errorMessage: e?.message?.slice(0, 500) || 'unknown' }
    }).catch(() => {});
  });
}
