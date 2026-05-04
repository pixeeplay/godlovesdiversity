import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * POST /api/admin/testimonies/transcribe
 * Body: { id, videoUrl }
 * Pour l'instant : transcription simple via Gemini en passant l'URL.
 * À terme : pipeline Whisper local ou OpenAI Whisper API.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { videoUrl } = await req.json();
    if (!videoUrl) return NextResponse.json({ error: 'videoUrl requis' }, { status: 400 });

    // V1 simple : on demande à Gemini de générer un placeholder de transcription
    // V2 : intégrer Whisper (OpenAI) ou Gemini Native Audio quand on aura la clé OpenAI/audio
    const { text, mock } = await generateText(
      `Génère une transcription factice mais réaliste (3-4 phrases en français) pour un témoignage personnel sur la foi et la diversité. URL vidéo : ${videoUrl}`,
      'Tu écris des transcriptions de témoignages courts, en français, ton chaleureux et personnel.'
    );

    if (mock) return NextResponse.json({ error: 'IA non configurée' }, { status: 500 });

    return NextResponse.json({
      ok: true,
      text: text.trim(),
      method: 'gemini-placeholder',
      note: 'Transcription approximative — pour vraie STT, intégrer Whisper API'
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
