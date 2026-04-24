import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { uploadBuffer } from '@/lib/storage';
import { notifyAdmin } from '@/lib/email';
import { extractExif } from '@/lib/exif';
import { reverseGeocode, detectPlaceType } from '@/lib/geocode';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Body = z.object({
  authorName: z.string().max(100).optional(),
  authorEmail: z.string().email().optional(),
  caption: z.string().max(500).optional(),
  placeName: z.string().max(120).optional(),
  placeType: z.enum(['CHURCH', 'MOSQUE', 'SYNAGOGUE', 'TEMPLE', 'PUBLIC_SPACE', 'OTHER']).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  source: z.enum(['WEB', 'IOS', 'ANDROID', 'IMPORT']).default('WEB')
});

export async function POST(req: Request) {
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 });

    const parsed = Body.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.length > 15 * 1024 * 1024) return NextResponse.json({ error: 'file too large (max 15MB)' }, { status: 413 });

    // EXIF + géo automatique si pas fourni manuellement
    const exif = await extractExif(buf);
    let lat = parsed.data.latitude ?? exif.latitude;
    let lon = parsed.data.longitude ?? exif.longitude;
    let autoCity = parsed.data.city;
    let autoCountry = parsed.data.country;
    let autoPlace = parsed.data.placeName;
    let autoType = parsed.data.placeType;
    if (lat && lon && (!autoCity || !autoCountry)) {
      const geo = await reverseGeocode(lat, lon);
      autoCity = autoCity || geo.city;
      autoCountry = autoCountry || geo.country;
      autoPlace = autoPlace || geo.placeName;
      autoType = autoType || detectPlaceType(geo);
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const key = `uploads/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
    await uploadBuffer(key, buf, file.type || 'image/jpeg');

    const ipHash = crypto
      .createHash('sha256')
      .update(req.headers.get('x-forwarded-for') || 'local')
      .digest('hex')
      .slice(0, 16);

    const photo = await prisma.photo.create({
      data: {
        ...parsed.data,
        latitude: lat,
        longitude: lon,
        city: autoCity,
        country: autoCountry,
        placeName: autoPlace,
        placeType: autoType,
        storageKey: key,
        status: 'PENDING',
        ipHash
      }
    });

    notifyAdmin(
      `Nouvelle photo en modération`,
      `<p>Une nouvelle photo a été soumise (${parsed.data.source}).</p>
       <p><strong>${parsed.data.authorName || 'Anonyme'}</strong> — ${parsed.data.placeName || ''}</p>
       <p>${parsed.data.caption || ''}</p>
       <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/moderation">Modérer</a></p>`
    ).catch(() => {});

    return NextResponse.json({ ok: true, id: photo.id });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'upload failed' }, { status: 500 });
  }
}
