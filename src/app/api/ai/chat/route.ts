import { NextResponse } from 'next/server';
import { aiInclusiveChat } from '@/lib/ai';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

// Public endpoint (utilisé par le widget chat sur le site)
export async function POST(req: Request) {
  // Anti-abus IA : max 15 messages / IP / 5 min (limite le coût Gemini)
  const rl = rateLimit(req, { key: 'ai-chat', max: 15, windowMs: 5 * 60_000 });
  if (!rl.ok) return rateLimitResponse(rl.resetAt);

  const { question, history } = await req.json();
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'question required' }, { status: 400 });
  }
  // Limite la taille du prompt pour éviter le coût excessif
  const cleanQuestion = question.slice(0, 1500);
  const cleanHistory = Array.isArray(history) ? history.slice(-10) : [];
  const out = await aiInclusiveChat(cleanQuestion, cleanHistory);
  return NextResponse.json(out);
}
