import { NextRequest, NextResponse } from 'next/server';
import { ask as ragAsk } from '@/lib/rag';
import { ttsSpeak } from '@/lib/elevenlabs';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Mode Live LOCAL (gratuit, sans HeyGen) :
 *  1. Reçoit transcription voix du visiteur
 *  2. RAG → réponse
 *  3. ElevenLabs → audio MP3
 *  4. Renvoie audio + transcript au browser, qui anime un avatar SVG
 *     synchronisé sur l'amplitude audio
 *
 * POST { question, locale? } → { answer, audioBase64, contentType, sources }
 */
export async function POST(req: NextRequest) {
  try {
    const { question, locale } = await req.json();
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'question requise' }, { status: 400 });
    }

    // 1. RAG → texte
    const result = await ragAsk(question, { locale });

    // 2. ElevenLabs → audio
    const audio = await ttsSpeak(result.answer);

    return NextResponse.json({
      answer: result.answer,
      sources: result.sources,
      offTopic: result.offTopic,
      audioBase64: audio.audioBase64,
      contentType: audio.contentType,
      estimatedDurationMs: audio.estimatedDurationMs
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 });
  }
}
