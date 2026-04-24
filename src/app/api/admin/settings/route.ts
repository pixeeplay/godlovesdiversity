import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role && !['ADMIN', 'EDITOR'].includes((s.user as any).role)) return null;
  return s;
}

export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const rows = await prisma.setting.findMany();
  return NextResponse.json({
    settings: Object.fromEntries(rows.map((r) => [r.key, r.value]))
  });
}

export async function PUT(req: Request) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const ops: Promise<unknown>[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (typeof value !== 'string') continue;
    if (value === '__keep__') continue; // sentinelle pour ne pas écraser une valeur masquée non modifiée
    ops.push(
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    );
  }
  await Promise.all(ops);

  await prisma.auditLog.create({
    data: {
      userId: (s.user as any).id,
      action: 'settings.update',
      metadata: { keys: Object.keys(body) }
    }
  });

  return NextResponse.json({ ok: true, count: ops.length });
}

export async function DELETE(req: Request) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 });
  await prisma.setting.delete({ where: { key } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
