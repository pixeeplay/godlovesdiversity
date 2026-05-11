/**
 * /api/orgs/[slug]/leads/import — import CSV multi-tenant (port faithful GLD).
 *
 * Multipart : { file: CSV } OU JSON : { csv: string, mapping: { email: "Email", ... } }
 *  - Auto-détecte colonnes email, firstname, etc. (aliases EN/FR)
 *  - Délimiteur , ou ; auto
 *  - Upsert sur email (merge si existe)
 *  - Tag chaque lead avec sourceDetail = nom du fichier
 *  - Stocke linkedin/twitter/instagram dans customFields.social
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const COLUMN_ALIASES: Record<string, string[]> = {
  email:        ['email', 'mail', 'e-mail', 'courriel', 'address'],
  firstName:    ['firstname', 'first_name', 'first name', 'prenom', 'prénom', 'given_name'],
  lastName:     ['lastname', 'last_name', 'last name', 'nom', 'family_name', 'surname'],
  phone:        ['phone', 'tel', 'téléphone', 'telephone', 'mobile', 'gsm'],
  company:      ['company', 'entreprise', 'organisation', 'org', 'société'],
  jobTitle:     ['title', 'job', 'job_title', 'jobtitle', 'poste', 'fonction', 'role'],
  city:         ['city', 'ville', 'town'],
  country:      ['country', 'pays'],
  linkedinUrl:  ['linkedin', 'linkedin_url', 'linkedinurl'],
  twitterUrl:   ['twitter', 'twitter_url', 'x_url'],
  instagramUrl: ['instagram', 'insta', 'ig_url'],
  facebookUrl:  ['facebook', 'fb', 'fb_url'],
  websiteUrl:   ['website', 'site', 'url', 'web'],
  notes:        ['notes', 'note', 'comment', 'commentaire']
};

function detectMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_-]+/g, '');
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < headers.length; i++) {
      const h = norm(headers[i]);
      if (aliases.some((a) => norm(a) === h)) { mapping[field] = i; break; }
    }
  }
  return mapping;
}

function parseCSV(text: string, delimiter = ','): string[][] {
  if (delimiter === ',' && text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length) {
    delimiter = ';';
  }
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { inQuote = false; }
      else { cell += c; }
    } else {
      if (c === '"') inQuote = true;
      else if (c === delimiter) { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (cell || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = ''; }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else { cell += c; }
    }
  }
  if (cell || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const contentType = req.headers.get('content-type') || '';
  let csvText = '';
  let fileName = 'import.csv';
  let userMapping: Record<string, string> | null = null;
  let segments: string[] = [];
  let optIn = false;

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file-required' }, { status: 400 });
    csvText = await file.text();
    fileName = file.name || 'import.csv';
    const segStr = fd.get('segments') as string;
    if (segStr) segments = segStr.split(',').map((s) => s.trim()).filter(Boolean);
    optIn = fd.get('newsletterOptIn') === 'true';
  } else {
    const body = await req.json().catch(() => ({}));
    csvText = body.csv || '';
    fileName = body.fileName || 'import.csv';
    userMapping = body.mapping || null;
    segments = Array.isArray(body.segments) ? body.segments : [];
    optIn = !!body.newsletterOptIn;
  }

  if (!csvText.trim()) return NextResponse.json({ error: 'empty-csv' }, { status: 400 });

  const rows = parseCSV(csvText);
  if (rows.length < 2) return NextResponse.json({ error: 'csv-too-small' }, { status: 400 });

  const headers = rows[0];
  const mapping = userMapping
    ? Object.fromEntries(Object.entries(userMapping).map(([field, colName]) => [field, headers.indexOf(colName)]))
    : detectMapping(headers);

  const tenantDb = await getTenantPrisma(orgSlug);
  let created = 0, merged = 0, skipped = 0, errors = 0;
  const errorList: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const get = (field: string) => {
      const idx = mapping[field];
      return idx != null && idx >= 0 ? (row[idx] || '').trim() : '';
    };

    const email = get('email').toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errors++;
      if (errorList.length < 10) errorList.push(`Row ${i + 1} : email invalide "${email}"`);
      continue;
    }
    if (!email && !get('firstName') && !get('linkedinUrl') && !get('phone')) {
      skipped++;
      continue;
    }

    try {
      const social: Record<string, string> = {};
      if (get('linkedinUrl')) social.linkedin = get('linkedinUrl');
      if (get('twitterUrl')) social.twitter = get('twitterUrl');
      if (get('instagramUrl')) social.instagram = get('instagramUrl');
      if (get('facebookUrl')) social.facebook = get('facebookUrl');
      if (get('websiteUrl')) social.website = get('websiteUrl');

      const baseData: any = {
        email: email || null,
        firstName: get('firstName') || null,
        lastName: get('lastName') || null,
        phone: get('phone') || null,
        company: get('company') || null,
        jobTitle: get('jobTitle') || null,
        city: get('city') || null,
        country: get('country') || null,
        notes: get('notes') || null,
        source: 'csv-import',
        sourceDetail: fileName,
        segments,
        newsletterOptIn: optIn,
        optInAt: optIn ? new Date() : null,
        customFields: Object.keys(social).length > 0 ? { social } : null
      };

      if (email) {
        const existing = await (tenantDb as any).lead.findUnique({ where: { email } });
        if (existing) {
          const existingSocial = (existing.customFields?.social || {}) as Record<string, string>;
          const mergedSocial = { ...existingSocial, ...social };
          const updateData: any = {};
          for (const [k, v] of Object.entries(baseData)) {
            if (v != null && k !== 'source' && k !== 'sourceDetail' && k !== 'customFields') updateData[k] = v;
          }
          updateData.segments = Array.from(new Set([...(existing.segments || []), ...segments]));
          if (Object.keys(mergedSocial).length > 0) updateData.customFields = { ...(existing.customFields || {}), social: mergedSocial };
          await (tenantDb as any).lead.update({ where: { id: existing.id }, data: updateData });
          merged++;
        } else {
          await (tenantDb as any).lead.create({ data: baseData });
          created++;
        }
      } else {
        await (tenantDb as any).lead.create({ data: baseData });
        created++;
      }
    } catch (e: any) {
      errors++;
      if (errorList.length < 10) errorList.push(`Row ${i + 1} : ${e?.message?.slice(0, 100) || 'erreur'}`);
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      totalRows: rows.length - 1,
      created,
      merged,
      skipped,
      errors,
      detectedColumns: Object.keys(mapping)
    },
    errorSamples: errorList
  });
}
