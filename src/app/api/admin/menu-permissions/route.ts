import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  // Seul ADMIN peut modifier la visibilité du menu
  if ((s.user as any)?.role && (s.user as any).role !== 'ADMIN') return null;
  return s;
}

export async function PUT(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden — admin only' }, { status: 403 });
  const { hidden, editorHidden } = await req.json();

  const ops = [
    prisma.setting.upsert({
      where: { key: 'menu.hidden' },
      update: { value: JSON.stringify(Array.isArray(hidden) ? hidden : []) },
      create: { key: 'menu.hidden', value: JSON.stringify(Array.isArray(hidden) ? hidden : []) }
    }),
    prisma.setting.upsert({
      where: { key: 'menu.editorHidden' },
      update: { value: JSON.stringify(Array.isArray(editorHidden) ? editorHidden : []) },
      create: { key: 'menu.editorHidden', value: JSON.stringify(Array.isArray(editorHidden) ? editorHidden : []) }
    })
  ];
  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}
