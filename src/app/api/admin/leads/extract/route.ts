import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { scrapeWebUrl } from '@/lib/scrape-adapters/web';
import { validateEmailsBulk } from '@/lib/contact-validators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

/**
 * POST /api/admin/leads/extract
 * Body : {
 *   url: "https://example.com",
 *   depth?: 1 (default),
 *   country?: "FR",
 *   validateEmails?: true (MX check),
 *   importToLeads?: false (par défaut, juste preview)
 * }
 *
 * Retourne les contacts trouvés + (optionnellement) crée les leads en DB.
 */
export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const url = (body.url as string)?.trim();
  if (!url) return NextResponse.json({ error: 'url-required' }, { status: 400 });
  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'invalid-url' }, { status: 400 });
  }

  const depth = typeof body.depth === 'number' ? Math.min(2, Math.max(0, body.depth)) : 1;
  const country = (body.country as any) || 'FR';
  const validateEmails = body.validateEmails !== false;
  const importToLeads = !!body.importToLeads;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t: any) => typeof t === 'string') : [];
  const segments = Array.isArray(body.segments) ? body.segments.filter((t: any) => typeof t === 'string') : [];

  // 1. Scrape
  const result = await scrapeWebUrl({
    url,
    depth,
    defaultCountry: country,
    maxPages: 10,
    jinaFallback: true
  });

  // 2. Validate emails si demandé
  let emailValidations: Record<string, any> = {};
  if (validateEmails && result.contacts.length > 0) {
    const emails = result.contacts
      .map((c) => c.email)
      .filter((e): e is string => !!e);
    if (emails.length > 0) {
      const validations = await validateEmailsBulk(emails);
      for (const v of validations) emailValidations[v.email] = v;
    }
  }

  // 3. Enrichir le résultat
  const enriched = result.contacts.map((c) => {
    const validation = c.email ? emailValidations[c.email] : null;
    return {
      ...c,
      emailValidation: validation,
      emailScore: validation?.score
    };
  });

  // 4. Import en DB si demandé
  let imported = { created: 0, merged: 0, skipped: 0 };
  if (importToLeads && enriched.length > 0) {
    const sourceDetail = url;
    for (const c of enriched) {
      // Skip les contacts sans email ni phone (juste handles → moins utile)
      if (!c.email && !c.phoneE164 && Object.keys(c.handles).length === 0) {
        imported.skipped++;
        continue;
      }
      // Skip emails clairement invalides si on a validé
      if (c.email && c.emailValidation && c.emailValidation.score < 30) {
        imported.skipped++;
        continue;
      }

      try {
        if (c.email) {
          const existing = await prisma.lead.findUnique({ where: { email: c.email } });
          const data: any = {
            phone: c.phoneE164 || null,
            linkedinUrl: c.handles.linkedin ? `https://linkedin.com/in/${c.handles.linkedin}` : null,
            instagramUrl: c.handles.instagram ? `https://instagram.com/${c.handles.instagram}` : null,
            twitterUrl: c.handles.twitter ? `https://twitter.com/${c.handles.twitter}` : null,
            facebookUrl: c.handles.facebook ? `https://facebook.com/${c.handles.facebook}` : null,
            score: c.emailScore || 0
          };
          if (existing) {
            // Merge sans écraser
            await prisma.lead.update({
              where: { id: existing.id },
              data: {
                phone: existing.phone || data.phone,
                linkedinUrl: existing.linkedinUrl || data.linkedinUrl,
                instagramUrl: existing.instagramUrl || data.instagramUrl,
                twitterUrl: existing.twitterUrl || data.twitterUrl,
                facebookUrl: existing.facebookUrl || data.facebookUrl,
                tags: Array.from(new Set([...existing.tags, ...tags])),
                segments: Array.from(new Set([...existing.segments, ...segments]))
              }
            });
            imported.merged++;
          } else {
            await prisma.lead.create({
              data: {
                email: c.email,
                ...data,
                source: 'scrape-web',
                sourceDetail,
                scrapedFromUrl: url,
                tags,
                segments,
                status: 'new'
              }
            });
            imported.created++;
          }
        } else if (c.phoneE164) {
          // Pas d'email : crée par phone (lead anonyme)
          await prisma.lead.create({
            data: {
              phone: c.phoneE164,
              linkedinUrl: c.handles.linkedin ? `https://linkedin.com/in/${c.handles.linkedin}` : null,
              instagramUrl: c.handles.instagram ? `https://instagram.com/${c.handles.instagram}` : null,
              source: 'scrape-web',
              sourceDetail,
              scrapedFromUrl: url,
              tags,
              segments,
              status: 'new'
            }
          });
          imported.created++;
        } else {
          imported.skipped++;
        }
      } catch (e: any) {
        imported.skipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      pagesVisited: result.pagesVisited.length,
      pagesSucceeded: result.pagesSucceeded,
      pagesFailed: result.pagesFailed,
      pagesBlocked: result.pagesBlocked,
      contactsFound: result.contacts.length,
      emailsValidated: Object.keys(emailValidations).length,
      durationMs: result.durationMs
    },
    contacts: enriched,
    pagesVisited: result.pagesVisited,
    errors: result.errors,
    imported: importToLeads ? imported : null
  });
}
