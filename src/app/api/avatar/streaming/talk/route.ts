import { NextRequest, NextResponse } from 'next/server';
import { ask as ragAsk } from '@/lib/rag';
import { sendStreamingTask } from '@/lib/heygen-streaming';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Reçoit la transcription du visiteur, demande la réponse au RAG,
 * puis envoie le texte à HeyGen pour que l'avatar le prononce.
 *
 * POST { session_id, question, locale? }
 * → { answer, sources, offTopic }
 */
export async function POST(req: NextRequest) {
  try {
    const { session_id, question, locale } = await req.json();
    if (!session_id) return NextResponse.json({ error: 'session_id requis' }, { status: 400 });
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question requise' }, { status: 400 });
    }

    // 1. RAG → réponse
    const result = await ragAsk(question, { locale });

    // 2. Envoie le texte à HeyGen pour que l'avatar le prononce en streaming
    await sendStreamingTask(session_id, result.answer, 'repeat');

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      offTopic: result.offTopic
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur streaming' }, { status: 500 });
  }
}
