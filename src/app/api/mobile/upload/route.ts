/**
 * Endpoint dédié à l'app mobile (iOS/Android).
 * Auth via header X-Device-Token (à générer dans le BO Settings → API Keys).
 * Body: multipart/form-data identique à /api/upload.
 */
import { NextResponse } from 'next/server';
import { POST as webUpload } from '../../upload/route';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const token = req.headers.get('x-device-token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 401 });
  const setting = await prisma.setting.findUnique({ where: { key: `device.${token}` } });
  if (!setting) return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  return webUpload(req);
}
