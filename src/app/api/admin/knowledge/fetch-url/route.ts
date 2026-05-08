import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeUrlForRag } from '@/lib/jina-scraper';

/**
 * GET /api/admin/knowledge/fetch-url?url=...&summarize=1
 *
 * Récupère le contenu propre d'une URL pour ingestion dans le RAG « Demandez à GLD ».
 * Pipeline : Jina Reader (markdown rendu) → fallback fetch direct → enrichissement Gemini optionnel.
 *
 * Réponse :
 *   { title, content, url, source: 'jina' | 'fetch', lang?, tags?, summary?, bytes, warning? }
 */
export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url manquante' }, { status: 400 });

  const summarize = ['1', 'true', 'yes'].includes(
    (req.nextUrl.searchParams.get('summarize') || '').toLowerCase()
  );

  try {
    const result = await scrapeUrlForRag(url, { summarize });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fetch impossible' }, { status: 500 });
  }
}
