import { NextRequest, NextResponse } from 'next/server';
import { ask } from '@/lib/rag';

/**
 * Endpoint public du chat « Assistant queer » — utilise le RAG.
 * POST { question: string, locale?: string }
 * → { answer: string, sources: [...], topScore, offTopic }
 */
export async function POST(req: NextRequest) {
  try {
    const { question, locale } = await req.json();
    if (!question || typeof question !== 'string' || question.length < 2) {
      return NextResponse.json({ error: 'question vide' }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json({ error: 'question trop longue (500 caractères max)' }, { status: 400 });
    }
    const result = await ask(question, { locale });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
