import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const items = await prisma.partner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await req.json();
  const created = await prisma.partner.create({
    data: {
      name: data.name,
      url: data.url,
      logoUrl: data.logoUrl || null,
      description: data.description || null,
      category: data.category || null,
      order: typeof data.order === 'number' ? data.order : 0,
      published: data.published !== false
    }
  });
  return NextResponse.json(created);
}
