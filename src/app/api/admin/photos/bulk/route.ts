import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer } from '@/lib/storage';
import { extractExif } from '@/lib/exif';
import { reverseGeocode, detectPlaceType } from '@/lib/geocode';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min pour les gros lots

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fd = await req.formData();
  const files = fd.getAll('files') as File[];
  const autoApprove = fd.get('autoApprove') === '1';
  const defaultCountry = (fd.get('defaultCountry') as string) || undefined;

  if (!files.length) return NextResponse.json({ error: 'no files' }, { status: 400 });

  const results: any[] = [];

  for (const file of files) {
    if (!file.size) continue;
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const exif = await extractExif(buf);

      // 1. Upload du fichier
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const key = `bulk/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
      await uploadBuffer(key, buf, file.type || 'image/jpeg');

      // 2. Reverse geocoding si on a des coordonnées GPS
      let geo: any = {};
      let placeType: any;
      if (exif.latitude && exif.longitude) {
        geo = await reverseGeocode(exif.latitude, exif.longitude);
        placeType = detectPlaceType(geo);
      }

      // 3. Création en base
      const photo = await prisma.photo.create({
        data: {
          storageKey: key,
          status: autoApprove ? 'APPROVED' : 'PENDING',
          authorName: 'Import en masse',
          source: 'IMPORT',
          latitude: exif.latitude,
          longitude: exif.longitude,
          city: geo.city,
          country: geo.country || defaultCountry,
          placeName: geo.placeName,
          placeType,
          aiModerationFlags: geo.raw ? { osmName: geo.raw.display_name } : undefined,
          reviewedById: autoApprove ? (s.user as any).id : null,
          reviewedAt: autoApprove ? new Date() : null
        }
      });

      results.push({
        ok: true,
        id: photo.id,
        filename: file.name,
        gps: exif.latitude ? { lat: exif.latitude, lon: exif.longitude } : null,
        location: geo.city || geo.country ? { city: geo.city, country: geo.country, placeType } : null
      });
    } catch (e: any) {
      results.push({ ok: false, filename: file.name, error: e.message });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (s.user as any).id,
      action: 'photos.bulk_import',
      metadata: { count: results.length, autoApprove }
    }
  });

  return NextResponse.json({
    ok: true,
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    geolocated: results.filter((r) => r.gps).length,
    results
  });
}
