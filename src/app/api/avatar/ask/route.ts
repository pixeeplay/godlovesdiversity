import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';
import { ask as ragAsk } from '@/lib/rag';
import { generateVideo } from '@/lib/heygen';

/**
 * Endpoint public — orchestration RAG + HeyGen.
 * POST { question, locale? }
 *  → { answer, sources, video_id, offTopic }
 *
 * Le client poll ensuite /api/avatar/status?id=video_id jusqu'à completed.
 */
export async function POST(req: NextRequest) {
  try {
    const { question, locale } = await req.json();
    if (!question || typeof question !== 'string' || question.length < 2) {
      return NextResponse.json({ error: 'question vide' }, { status: 400 });
    }
    if (question.length > 500) {
      return NextResponse.json({ error: 'question trop longue' }, { status: 400 });
    }

    const cfg = await getSettings([
      'avatar.enabled',
      'avatar.heygen.avatarId',
      'avatar.heygen.voiceId',
      'avatar.heygen.bgColor'
    ]);

    // L'admin peut toujours tester l'avatar même s'il n'est pas activé publiquement.
    // Les visiteurs publics doivent attendre que avatar.enabled = '1'.
    const session = await getServerSession(authOptions);
    const isAdmin = !!session;
    if (cfg['avatar.enabled'] !== '1' && !isAdmin) {
      return NextResponse.json({ error: 'avatar désactivé' }, { status: 403 });
    }

    const avatarId = cfg['avatar.heygen.avatarId'];
    const voiceId = cfg['avatar.heygen.voiceId'];
    if (!avatarId || !voiceId) {
      return NextResponse.json({
        error: 'avatar non configuré : choisis un avatar et une voix dans /admin/ai/avatar puis clique « Sauvegarder la configuration » avant de tester'
      }, { status: 400 });
    }

    // 1. RAG → réponse texte + sources
    const ragResult = await ragAsk(question, { locale });

    // 2. HeyGen → génération vidéo asynchrone
    const { video_id } = await generateVideo({
      text: ragResult.answer,
      avatarId,
      voiceId,
      bgColor: cfg['avatar.heygen.bgColor'] || '#FBEAF0',
      ratio: '9:16'
    });

    return NextResponse.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      offTopic: ragResult.offTopic,
      video_id
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur serveur' }, { status: 500 });
  }
}
