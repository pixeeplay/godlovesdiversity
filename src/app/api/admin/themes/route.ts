import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const themes = await prisma.theme.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
    return NextResponse.json({ themes });
  } catch (e: any) {
    return NextResponse.json({ themes: [], error: e?.message });
  }
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const slug = body.slug || `custom-${Date.now().toString(36)}`;
    const theme = await prisma.theme.create({
      data: {
        slug,
        name: body.name || 'Thème sans nom',
        description: body.description || null,
        category: body.category || 'aesthetic',
        colors: body.colors || { primary: '#d61b80', secondary: '#7c3aed', accent: '#06b6d4', bg: '#0a0a14', fg: '#ffffff' },
        fonts: body.fonts || null,
        decorations: body.decorations || null,
        customCss: body.customCss || null,
        autoActivate: !!body.autoActivate,
        autoStartMonth: body.autoStartMonth ?? null,
        autoStartDay: body.autoStartDay ?? null,
        daysBefore: body.daysBefore ?? 7,
        durationDays: body.durationDays ?? 7,
        holidaySlug: body.holidaySlug || null,
        geographicScope: body.geographicScope || null,
        active: !!body.active,
        priority: body.priority ?? 0
      }
    });
    return NextResponse.json({ theme });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
