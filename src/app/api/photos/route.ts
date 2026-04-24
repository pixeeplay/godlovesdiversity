import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publicUrl } from '@/lib/storage';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') || undefined;
  const placeType = searchParams.get('placeType') || undefined;
  const take = Math.min(Number(searchParams.get('take') || 60), 200);

  const photos = await prisma.photo.findMany({
    where: {
      status: 'APPROVED',
      ...(country && { country }),
      ...(placeType && { placeType: placeType as any })
    },
    orderBy: { createdAt: 'desc' },
    take
  });

  return NextResponse.json({
    photos: photos.map((p) => ({
      id: p.id,
      url: publicUrl(p.storageKey),
      caption: p.caption,
      placeName: p.placeName,
      placeType: p.placeType,
      city: p.city,
      country: p.country,
      latitude: p.latitude,
      longitude: p.longitude,
      author: p.authorName,
      createdAt: p.createdAt
    }))
  });
}
