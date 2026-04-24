import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiPostVariants } from '@/lib/ai';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { brief, network, count } = await req.json();
  if (!brief || !network) return NextResponse.json({ error: 'brief + network required' }, { status: 400 });
  const out = await aiPostVariants(brief, network, count || 5);
  let variants: any[] = [];
  try { variants = JSON.parse(out.text || '{}').variants || []; } catch {}
  return NextResponse.json({ ...out, variants });
}
