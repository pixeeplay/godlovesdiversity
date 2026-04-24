import { NextResponse } from 'next/server';
import { aiVerseOfTheDay } from '@/lib/ai';

// Public endpoint (utilisable depuis le site et l'app mobile)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const theme = searchParams.get('theme') || undefined;
  const out = await aiVerseOfTheDay(theme);
  return NextResponse.json(out);
}
