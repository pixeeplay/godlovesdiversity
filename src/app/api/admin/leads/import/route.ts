import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/admin/leads/import
 * Multipart : { file: CSV } OU JSON : { csv: string, mapping: { email: "Email", ... } }
 *
 * - Détecte automatiquement les colonnes email, firstname, lastname, phone, company, etc.
 * - Si mapping fourni, override la détection auto.
 * - Upsert sur email (merge si existe).
 * - Tag chaque lead avec sourceDetail = nom du fichier.
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) return null;
  return s;
}

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
      if (aliases.some((a) => norm(a) === h)) {
        mapping[field] = i;
        break;
      }
    }
  }
  return mapping;
}

function parseCSV(text: string, delimiter = ','): string[][] {
  // Auto-detect delimiter
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
        if (cell || row.length > 0) {
          row.push(cell);
          rows.push(row);
          row = [];
          cell = '';
        }
        if (c === '\r' && text[i + 1] === '\n') i++;
      } else { cell += c; }
    }
  }
  if (cell || row.length > 0) { row.push(cell); rows.push(row); }
  return rows;
}

export async function POST(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

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
    ? Object.fromEntries(
        Object.entries(userMapping).map(([field, colName]) => [field, headers.indexOf(colName)])
      )
    : detectMapping(headers);

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
      const data = {
        email: email || null,
        firstName: get('firstName') || null,
        lastName: get('lastName') || null,
        phone: get('phone') || null,
        company: get('company') || null,
        jobTitle: get('jobTitle') || null,
        city: get('city') || null,
        country: get('country') || null,
        linkedinUrl: get('linkedinUrl') || null,
        twitterUrl: get('twitterUrl') || null,
        instagramUrl: get('instagramUrl') || null,
        facebookUrl: get('facebookUrl') || null,
        websiteUrl: get('websiteUrl') || null,
        notes: get('notes') || null,
        source: 'csv-import',
        sourceDetail: fileName,
        segments,
        newsletterOptIn: optIn,
        optInAt: optIn ? new Date() : null
      };

      if (email) {
        const existing = await prisma.lead.findUnique({ where: { email } });
        if (existing) {
          await prisma.lead.update({ where: { id: existing.id }, data: {
            ...Object.fromEntries(Object.entries(data).filter(([k, v]) => v != null && k !== 'source' && k !== 'sourceDetail')),
            segments: Array.from(new Set([...existing.segments, ...segments]))
          }});
          merged++;
        } else {
          await prisma.lead.create({ data });
          created++;
        }
      } else {
        await prisma.lead.create({ data });
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
