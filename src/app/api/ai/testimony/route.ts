import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiPolishTestimony } from '@/lib/ai';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { text, anonymize } = await req.json();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });
  const out = await aiPolishTestimony(text, anonymize !== false);
  return NextResponse.json(out);
}
