/**
 * /api/orgs/[slug]/leads/extract — extraction de contacts depuis une URL ou un texte.
 *
 * Body : { url?, text?, depth?, country?, validateEmails?, importToLeads?, tags?, segments? }
 *
 * Pipeline :
 *  1. Fetch contenu via Jina Reader (clé JINA_KEY si dispo)
 *  2. Extraction email/téléphone par regex
 *  3. (Optionnel) extraction IA via Gemini pour nom/entreprise/jobTitle
 *  4. (Optionnel) import direct dans table Lead (upsert email)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g;
const PHONE_RE = /(?:(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?)?\d{2,4}[ .-]?\d{2,4}[ .-]?\d{2,4})/g;
const LINKEDIN_RE = /linkedin\.com\/(?:in|company)\/([A-Za-z0-9_-]+)/g;
const TWITTER_RE = /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/g;
const INSTAGRAM_RE = /instagram\.com\/([A-Za-z0-9_.]+)/g;
const FACEBOOK_RE = /facebook\.com\/([A-Za-z0-9_.-]+)/g;

const SKIP_EMAIL_DOMAINS = new Set(['sentry.io', 'wixpress.com', 'wix.com', 'cloudfront.net', 'example.com', 'example.org', 'localhost']);

function extractContacts(text: string, sourceUrl?: string): any[] {
  const emailsRaw = (text.match(EMAIL_RE) || []).map((e) => e.toLowerCase());
  const emails = Array.from(new Set(emailsRaw)).filter((e) => {
    const d = e.split('@')[1];
    return d && !SKIP_EMAIL_DOMAINS.has(d) && !d.includes('.local');
  });
  const phones = Array.from(new Set((text.match(PHONE_RE) || []).map((p) => p.replace(/\s+/g, ' ').trim()))).filter((p) => p.replace(/\D/g, '').length >= 9);
  const handles: any = {};
  let m: RegExpExecArray | null;
  while ((m = LINKEDIN_RE.exec(text))) { handles.linkedin = m[1]; break; }
  while ((m = TWITTER_RE.exec(text))) { handles.twitter = m[1]; break; }
  while ((m = INSTAGRAM_RE.exec(text))) { handles.instagram = m[1]; break; }
  while ((m = FACEBOOK_RE.exec(text))) { handles.facebook = m[1]; break; }

  const contacts: any[] = [];
  if (emails.length === 0 && phones.length === 0 && Object.keys(handles).length === 0) return contacts;
  if (emails.length > 0) {
    for (const email of emails.slice(0, 50)) {
      contacts.push({ email, phoneE164: phones[0] || null, handles: { ...handles }, sourceUrl });
    }
  } else {
    contacts.push({ email: null, phoneE164: phones[0] || null, handles: { ...handles }, sourceUrl });
  }
  return contacts;
}

async function jinaFetch(url: string, jinaKey: string | null): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const target = `https://r.jina.ai/${url}`;
    const headers: Record<string, string> = { 'Accept': 'text/plain' };
    if (jinaKey) headers['Authorization'] = `Bearer ${jinaKey}`;
    const r = await fetch(target, { headers, signal: AbortSignal.timeout(45_000) });
    if (!r.ok) return { ok: false, error: `Jina HTTP ${r.status}` };
    const text = await r.text();
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch-error' };
  }
}

async function directFetch(url: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PixeesiteBot/1.0; +https://pixeesite.com)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
    const text = await r.text();
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'fetch-error' };
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  let auth;
  try { auth = await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;

  const body = await req.json().catch(() => ({}));
  const url = (body.url as string)?.trim();
  const textInput = (body.text as string)?.trim();

  if (!url && !textInput) return NextResponse.json({ error: 'url-or-text-required' }, { status: 400 });

  if (url) {
    try { new URL(url); } catch { return NextResponse.json({ error: 'invalid-url' }, { status: 400 }); }
  }

  const importToLeads = !!body.importToLeads;
  const tags = Array.isArray(body.tags) ? body.tags.filter((t: any) => typeof t === 'string') : [];
  const segments = Array.isArray(body.segments) ? body.segments.filter((t: any) => typeof t === 'string') : [];

  let pageText = textInput || '';
  let sourceUrl: string | undefined;

  if (url) {
    sourceUrl = url;
    const jinaKey = await getOrgSecret(orgId, 'JINA_KEY');
    const r = await jinaFetch(url, jinaKey);
    if (r.ok) pageText = r.text || '';
    else {
      const r2 = await directFetch(url);
      if (r2.ok) pageText = r2.text || '';
      else return NextResponse.json({ error: 'fetch-failed', detail: r.error || r2.error }, { status: 502 });
    }
  }

  const contacts = extractContacts(pageText, sourceUrl);

  // Optionnel : enrichissement Gemini si configuré
  let enrichedByAi = false;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (geminiKey && contacts.length > 0 && pageText.length > 100) {
    try {
      const prompt = `Extrait UN JSON valide avec les noms/prénoms/entreprises associés aux emails suivants depuis ce texte. Format: {"<email>":{"firstName":"...","lastName":"...","company":"...","jobTitle":"..."}, ...}. Emails: ${contacts.map((c) => c.email).filter(Boolean).slice(0, 10).join(', ')}. Texte:\n${pageText.slice(0, 4000)}`;
      const gr = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json' } }),
        signal: AbortSignal.timeout(30_000),
      });
      if (gr.ok) {
        const gj = await gr.json();
        const raw = gj.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(raw);
        for (const c of contacts) {
          if (c.email && parsed[c.email]) {
            c.firstName = parsed[c.email].firstName;
            c.lastName = parsed[c.email].lastName;
            c.company = parsed[c.email].company;
            c.jobTitle = parsed[c.email].jobTitle;
          }
        }
        enrichedByAi = true;
      }
    } catch { /* fallback silencieux */ }
  }

  let imported = { created: 0, merged: 0, skipped: 0 };
  if (importToLeads && contacts.length > 0) {
    const tenantDb = await getTenantPrisma(orgSlug);
    for (const c of contacts) {
      if (!c.email && !c.phoneE164 && Object.keys(c.handles || {}).length === 0) { imported.skipped++; continue; }
      try {
        const social: Record<string, string> = {};
        if (c.handles?.linkedin) social.linkedin = `https://linkedin.com/in/${c.handles.linkedin}`;
        if (c.handles?.twitter) social.twitter = `https://twitter.com/${c.handles.twitter}`;
        if (c.handles?.instagram) social.instagram = `https://instagram.com/${c.handles.instagram}`;
        if (c.handles?.facebook) social.facebook = `https://facebook.com/${c.handles.facebook}`;

        if (c.email) {
          const existing = await (tenantDb as any).lead.findUnique({ where: { email: c.email } });
          if (existing) {
            const existingSocial = (existing.customFields?.social || {}) as Record<string, string>;
            await (tenantDb as any).lead.update({
              where: { id: existing.id },
              data: {
                phone: existing.phone || c.phoneE164,
                firstName: existing.firstName || c.firstName,
                lastName: existing.lastName || c.lastName,
                company: existing.company || c.company,
                jobTitle: existing.jobTitle || c.jobTitle,
                tags: Array.from(new Set([...(existing.tags || []), ...tags])),
                segments: Array.from(new Set([...(existing.segments || []), ...segments])),
                customFields: { ...(existing.customFields || {}), social: { ...existingSocial, ...social } }
              }
            });
            imported.merged++;
          } else {
            await (tenantDb as any).lead.create({
              data: {
                email: c.email,
                phone: c.phoneE164 || null,
                firstName: c.firstName || null,
                lastName: c.lastName || null,
                company: c.company || null,
                jobTitle: c.jobTitle || null,
                source: 'scrape-web',
                sourceDetail: sourceUrl || null,
                status: 'new',
                tags,
                segments,
                customFields: Object.keys(social).length > 0 ? { social } : null
              }
            });
            imported.created++;
          }
        } else if (c.phoneE164) {
          await (tenantDb as any).lead.create({
            data: {
              phone: c.phoneE164,
              source: 'scrape-web',
              sourceDetail: sourceUrl || null,
              tags,
              segments,
              status: 'new',
              customFields: Object.keys(social).length > 0 ? { social } : null
            }
          });
          imported.created++;
        } else {
          imported.skipped++;
        }
      } catch {
        imported.skipped++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      contactsFound: contacts.length,
      enrichedByAi
    },
    contacts,
    imported: importToLeads ? imported : null
  });
}
