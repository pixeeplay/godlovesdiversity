import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/establishments/import
 * Body: { csv: string } OU multipart/form-data avec fichier "file"
 *
 * Supporte 2 formats de headers :
 * - EN: name,city,country,address,phone,website,email,description,categories
 * - FR: NOM ÉTABLISSEMENT,CATÉGORIES,TAGS,ADRESSE,VILLE,CP,RÉGION,Pays,Accroche,Description,COVER IMG,Logo,Web,Facebook,Instagram,Contact,Téléphone
 *
 * Parser robuste : gère les champs multi-lignes entre guillemets.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Récupère le CSV depuis JSON body OU upload fichier
  let csv = '';
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const f = fd.get('file');
    if (f instanceof File) {
      // Force UTF-8 (Excel ajoute parfois un BOM ou utilise Windows-1252)
      const buf = await f.arrayBuffer();
      // Tente UTF-8 d'abord
      let txt = new TextDecoder('utf-8').decode(buf);
      // Si on détecte du mojibake (caractères Ã suivis d'un autre), essayer latin-1 → UTF-8
      if (/Ã[-ÿ]/.test(txt.slice(0, 5000))) {
        // Le fichier semble être en latin-1 mais lu en UTF-8 — relire en latin1
        try { txt = new TextDecoder('windows-1252').decode(buf); } catch {}
      }
      // Retire BOM si présent
      if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1);
      csv = txt;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    csv = body.csv || '';
  }
  if (!csv) return NextResponse.json({ error: 'csv vide' }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length < 2) return NextResponse.json({ error: 'CSV doit contenir au moins 1 header + 1 ligne' }, { status: 400 });

  const headers = rows[0].map((h) => h.trim());
  const map = mapHeaders(headers);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const get = (key: string) => (map[key] !== undefined ? (r[map[key]] || '').trim() : '');

    const name = get('name');
    if (!name) { skipped++; continue; }

    const slug = slugify(name) + '-' + slugify(get('city')).slice(0, 8);
    try {
      const existing = await prisma.venue.findUnique({ where: { slug } }).catch(() => null);

      // Concat catégories + tags
      const tags: string[] = [];
      const categoriesRaw = get('categories');
      if (categoriesRaw) tags.push(...categoriesRaw.split(/[|,;]/).map((c) => c.trim()).filter(Boolean));
      if (get('tags')) tags.push(...get('tags').split(/[|,;]/).map((c) => c.trim()).filter(Boolean));

      const data: any = {
        name,
        slug,
        type: mapVenueType(categoriesRaw),
        city: get('city') || null,
        country: get('country') || 'France',
        region: get('region') || null,
        postalCode: get('postal') || null,
        address: get('address') || null,
        phone: get('phone') || null,
        website: cleanUrl(get('website')),
        email: get('email') || null,
        description: get('description') || null,
        shortDescription: get('tagline') || null,
        coverImage: cleanUrl(get('cover')),
        logo: cleanUrl(get('logo')),
        facebook: cleanUrl(get('facebook')),
        instagram: cleanUrl(get('instagram')),
        tags: Array.from(new Set(tags)),
        published: true
      };

      if (existing) {
        await prisma.venue.update({ where: { id: existing.id }, data });
        updated++;
      } else {
        await prisma.venue.create({ data });
        created++;
      }
    } catch (e: any) {
      errors.push(`Ligne ${i + 1} (${name}) : ${e.message}`);
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    updated,
    skipped,
    total: rows.length - 1,
    errorsPreview: errors.slice(0, 5)
  });
}

// ─────────────────────────────────────────────
// Mapping des headers FR ou EN → clés normalisées
// ─────────────────────────────────────────────
function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = h.toLowerCase().trim();
    if (/^name$|^nom/.test(k))                       map.name = i;
    else if (/^categor/.test(k))                     map.categories = i;
    else if (/^tags?$/.test(k))                      map.tags = i;
    else if (/^address|^adresse/.test(k))            map.address = i;
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

// ─────────────────────────────────────────────
// CSV parser robuste (RFC 4180 — gère champs multi-lignes entre guillemets)
// ─────────────────────────────────────────────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // double-quote = escape
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') {
      row.push(field); field = '';
      if (row.length > 1 || row[0]) rows.push(row);
      row = []; i++; continue;
    }
    field += c; i++;
  }
  if (field || row.length > 0) { row.push(field); if (row.length > 1 || row[0]) rows.push(row); }
  return rows;
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

/** Mappe les catégories FR → enum VenueType. */
function mapVenueType(categoriesRaw: string): 'RESTAURANT' | 'BAR' | 'CAFE' | 'CLUB' | 'HOTEL' | 'SHOP' | 'CULTURAL' | 'CHURCH' | 'TEMPLE' | 'COMMUNITY_CENTER' | 'HEALTH' | 'ASSOCIATION' | 'OTHER' {
  const c = (categoriesRaw || '').toLowerCase();
  if (/restaurant|brasserie|bistro/.test(c)) return 'RESTAURANT';
  if (/cruising|sauna|club|discoth|nightclub|boîte/.test(c)) return 'CLUB';
  if (/bar|pub|cocktail/.test(c)) return 'BAR';
  if (/café|coffee|salon de thé/.test(c)) return 'CAFE';
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
