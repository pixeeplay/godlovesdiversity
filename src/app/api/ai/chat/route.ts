import { NextResponse } from 'next/server';
import { aiInclusiveChat } from '@/lib/ai';

// Public endpoint (utilisé par le widget chat sur le site)
export async function POST(req: Request) {
  const { question, history } = await req.json();
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  const out = await aiInclusiveChat(question, history || []);
  return NextResponse.json(out);
}
