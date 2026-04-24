import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiTranslate, aiDetectLanguage, aiCulturalAdaptation } from '@/lib/ai';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { mode, text, target, market, context } = await req.json();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  if (mode === 'detect') return NextResponse.json(await aiDetectLanguage(text));
  if (mode === 'adapt') return NextResponse.json(await aiCulturalAdaptation(text, market || 'francophone'));
  // default = translate
  return NextResponse.json(await aiTranslate(text, target || 'en', context));
}
