import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pullSource } from '@/lib/tariff-ingestor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/admin/tariffs/[id]/pull — déclenche un pull HTTP/FTP/SFTP manuel. */
export async function POST(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const result = await pullSource(ctx.params.id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'pull KO' }, { status: 500 });
  }
}
