import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listGeminiModels } from '@/lib/rag';

/**
 * Liste les modèles Gemini disponibles pour la clé API configurée.
 * Diagnostic pour comprendre pourquoi un modèle n'est pas accessible.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const models = await listGeminiModels();
    return NextResponse.json({
      total: models.length,
      models,
      embedding: models.filter((m) => m.includes('embed')),
      generation: models.filter((m) => m.includes('gemini') && !m.includes('embed'))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'erreur' }, { status: 500 });
  }
}
