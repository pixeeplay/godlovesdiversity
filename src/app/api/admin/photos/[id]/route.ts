import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s || (s.user as any)?.role === 'VIEWER') return null;
  return s;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();

  // Champs éditables : statut + métadonnées géo + texte
  const data: any = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.reviewedById = (s.user as any).id;
    data.reviewedAt = new Date();
  }
  if (body.rejectionReason !== undefined) data.rejectionReason = body.rejectionReason;
  if (body.caption !== undefined) data.caption = body.caption;
  if (body.placeName !== undefined) data.placeName = body.placeName;
  if (body.placeType !== undefined) data.placeType = body.placeType || null;
  if (body.city !== undefined) data.city = body.city;
  if (body.country !== undefined) data.country = body.country;
  if (body.latitude !== undefined) data.latitude = body.latitude ? Number(body.latitude) : null;
  if (body.longitude !== undefined) data.longitude = body.longitude ? Number(body.longitude) : null;
  if (body.authorName !== undefined) data.authorName = body.authorName;

  const photo = await prisma.photo.update({ where: { id }, data });
  await prisma.auditLog.create({
    data: {
      userId: (s.user as any).id,
      action: body.status ? `photo.${body.status.toLowerCase()}` : 'photo.edit',
      target: id,
      metadata: body
    }
  });
  return NextResponse.json({ ok: true, photo });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  await prisma.photo.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { userId: (s.user as any).id, action: 'photo.delete', target: id }
  });
  return NextResponse.json({ ok: true });
}
