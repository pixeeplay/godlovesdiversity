import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateText } from '@/lib/gemini';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { prompt, system } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const out = await generateText(prompt, system);
  return NextResponse.json(out);
}
