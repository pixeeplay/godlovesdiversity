import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateImage } from '@/lib/gemini';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { prompt } = await req.json();
  const out = await generateImage(prompt || '');
  return NextResponse.json(out);
}
