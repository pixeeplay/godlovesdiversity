import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/admin/establishments/import-xlsx
 * multipart/form-data avec fichier "file" (.xlsx) + optionnel field "sheet"
 *
 * Lit le sheet "Intégration base" par défaut (qui contient lat/lng + tous les champs)
 * et upserte les venues. Si "sheet" est fourni, utilise ce sheet à la place.
 *
 * Mapping headers (français/anglais) :
 *  NOM ÉTABLISSEMENT / Name → name
 *  CATÉGORIES / Categories → type (mapped to enum) + tags
 *  ADRESSE / Address → address
 *  Latitude / Longitude → lat/lng
 *  VILLE / City, CP / PostalCode, RÉGION / Region, Pays / Country
 *  Accroche / Tagline → shortDescription
 *  Description → description
 *  COVER IMG / Cover → coverImage
 *  Logo → logo
 *  Web / Website → website
 *  Facebook → facebook
 *  Instagram → instagram
 *  Contact / Email → email
 *  Téléphone / Phone → phone
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'multipart-required' }, { status: 400 });
  }

  const fd = await req.formData();
  const f = fd.get('file');
  const requestedSheet = (fd.get('sheet') as string) || '';
  const dryRun = fd.get('dry') === '1';
  if (!(f instanceof File)) return NextResponse.json({ error: 'file-missing' }, { status: 400 });

  const buf = await f.arrayBuffer();
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: 'array', cellDates: false, raw: false });
  } catch (e: any) {
    return NextResponse.json({ error: 'xlsx-parse-failed', detail: e.message }, { status: 400 });
  }

  // Choix du sheet : préférence pour "Intégration base" (avec lat/lng), sinon le premier
  const targetSheet =
    requestedSheet ||
    wb.SheetNames.find((n) => /intégration|integration|base/i.test(n)) ||
    wb.SheetNames[0];

  const ws = wb.Sheets[targetSheet];
  if (!ws) return NextResponse.json({ error: 'sheet-not-found', available: wb.SheetNames }, { status: 400 });

  // Convertit en array of arrays
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  if (rows.length < 2) return NextResponse.json({ error: 'sheet-empty' }, { status: 400 });

  const headers = (rows[0] as string[]).map((h) => String(h || '').trim());
  const map = mapHeaders(headers);

  // Si dry-run, juste retourner le mapping et un sample
  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dry: true,
      sheet: targetSheet,
      sheetsAvailable: wb.SheetNames,
      headers,
      mapping: map,
      totalRows: rows.length - 1,
      sample: rows.slice(1, 4).map((r) => extractRow(r, map))
    });
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const x = extractRow(r, map);
    if (!x.name) { skipped++; continue; }

    const slug = slugify(x.name) + '-' + slugify(x.city || '').slice(0, 8);
    try {
      const existing = await prisma.venue.findUnique({ where: { slug } }).catch(() => null);

      const tags: string[] = [];
      if (x.categoriesRaw) tags.push(...x.categoriesRaw.split(/[|,;]/).map((c) => c.trim()).filter(Boolean));
      if (x.tagsRaw) tags.push(...x.tagsRaw.split(/[|,;]/).map((c) => c.trim()).filter(Boolean));

      const data: any = {
        name: x.name,
        slug,
        type: mapVenueType(x.categoriesRaw),
        city: x.city || null,
        country: x.country || 'France',
        region: x.region || null,
        postalCode: cleanPostal(x.postal),
        address: x.address || null,
        lat: x.lat ?? undefined,
        lng: x.lng ?? undefined,
        phone: cleanPhone(x.phone),
        website: cleanUrl(x.website),
        email: x.email || null,
        description: x.description || null,
        shortDescription: x.tagline || null,
        coverImage: cleanUrl(x.cover),
        logo: cleanUrl(x.logo),
        facebook: cleanUrl(x.facebook),
        instagram: cleanUrl(x.instagram),
        tags: Array.from(new Set(tags)),
        published: true
      };

      // Strip undefined to not nuke existing data
      Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

      if (existing) {
        await prisma.venue.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.venue.create({ data });
        created++;
      }
    } catch (e: any) {
      errors.push(`Ligne ${i + 1} (${x.name}) : ${e.message}`);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    sheet: targetSheet,
    created,
    updated,
    skipped,
    total: rows.length - 1,
    errorsPreview: errors.slice(0, 10)
  });
}

interface ExtractedRow {
  name: string; city: string; postal: string; region: string; country: string;
  address: string; lat?: number; lng?: number;
  phone: string; email: string; website: string; facebook: string; instagram: string;
  cover: string; logo: string;
  tagline: string; description: string;
  categoriesRaw: string; tagsRaw: string;
}

function extractRow(r: any[], map: Record<string, number>): ExtractedRow {
  const get = (key: string) => map[key] !== undefined ? String(r[map[key]] ?? '').trim() : '';
  const num = (key: string) => {
    const v = get(key);
    if (!v) return undefined;
    const n = parseFloat(v.replace(',', '.'));
    return isNaN(n) ? undefined : n;
  };
  return {
    name: get('name'),
    city: get('city'),
    postal: get('postal'),
    region: get('region'),
    country: get('country'),
    address: get('address'),
    lat: num('lat'),
    lng: num('lng'),
    phone: get('phone'),
    email: get('email'),
    website: get('website'),
    facebook: get('facebook'),
    instagram: get('instagram'),
    cover: get('cover'),
    logo: get('logo'),
    tagline: get('tagline'),
    description: get('description'),
    categoriesRaw: get('categories'),
    tagsRaw: get('tags')
  };
}

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = h.toLowerCase().trim();
    if (/^name$|^nom/.test(k))                       map.name = i;
    else if (/^categor/.test(k))                     map.categories = i;
    else if (/^tags?$/.test(k))                      map.tags = i;
    else if (/^address|^adresse/.test(k))            map.address = i;
    else if (/^lat\b|latitude/.test(k))              map.lat = i;
    else if (/^lng\b|^lon\b|longitude/.test(k))      map.lng = i;
    else if (/^city$|^ville/.test(k))                map.city = i;
    else if (/^cp$|^postal|^zip/.test(k))            map.postal = i;
    else if (/^region|^région/.test(k))              map.region = i;
    else if (/^country|^pays/.test(k))               map.country = i;
    else if (/^accroche|^tagline|^subtitle/.test(k)) map.tagline = i;
    else if (/^description/.test(k))                 map.description = i;
    else if (/^cover/.test(k))                       map.cover = i;
    else if (/^logo/.test(k))                        map.logo = i;
    else if (/^web|^website|^url/.test(k))           map.website = i;
    else if (/^facebook|^fb$/.test(k))               map.facebook = i;
    else if (/^instagram|^insta|^ig$/.test(k))       map.instagram = i;
    else if (/^contact|^email|^mail/.test(k))        map.email = i;
    else if (/^tel|^phone|^téléphone/.test(k))       map.phone = i;
  });
  return map;
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function cleanUrl(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || /^non trouvé$/i.test(t) || t === '—' || t === '-') return null;
  if (/^https?:\/\//.test(t)) return t;
  if (/^www\./.test(t) || /^[a-z0-9-]+\.[a-z]{2,}/i.test(t)) return 'https://' + t;
  return null;
}

function cleanPhone(s: string): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t || /^non trouvé$/i.test(t)) return null;
  return t;
}

function cleanPostal(s: string): string | null {
  if (!s) return null;
  const t = s.trim().replace(/\.0+$/, ''); // Excel transforme "13100" en "13100.0"
  if (!t) return null;
  return t;
}

function mapVenueType(categoriesRaw: string): 'RESTAURANT' | 'BAR' | 'CAFE' | 'CLUB' | 'HOTEL' | 'SHOP' | 'CULTURAL' | 'CHURCH' | 'TEMPLE' | 'COMMUNITY_CENTER' | 'HEALTH' | 'ASSOCIATION' | 'OTHER' {
  const c = (categoriesRaw || '').toLowerCase();
  if (/restaurant|brasserie|bistro/.test(c)) return 'RESTAURANT';
  if (/cruising|sauna|club|discoth|nightclub|boîte/.test(c)) return 'CLUB';
  if (/bar|pub|cocktail/.test(c)) return 'BAR';
  if (/café|cafe|coffee|salon de thé/.test(c)) return 'CAFE';
  if (/hotel|hôtel|chambre|gîte|airbnb/.test(c)) return 'HOTEL';
  if (/boutique|shop|magasin|sex/.test(c)) return 'SHOP';
  if (/musée|galerie|théâtre|cinéma|culturel|culture/.test(c)) return 'CULTURAL';
  if (/église|paroisse|chapelle/.test(c)) return 'CHURCH';
  if (/temple|synagogue|mosquée|mandir/.test(c)) return 'TEMPLE';
  if (/centre|community|lgbt center/.test(c)) return 'COMMUNITY_CENTER';
  if (/santé|sante|planning|clinique|médecin|psy/.test(c)) return 'HEALTH';
  if (/asso|association|ong/.test(c)) return 'ASSOCIATION';
  return 'OTHER';
}
