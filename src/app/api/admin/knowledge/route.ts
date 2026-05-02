import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ingestDocument } from '@/lib/rag';

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const docs = await prisma.knowledgeDoc.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, title: true, source: true, sourceType: true, author: true,
      tags: true, locale: true, enabled: true, createdAt: true,
      _count: { select: { chunks: true } }
    }
  });
  const stats = {
    docCount: docs.length,
    chunkCount: docs.reduce((sum, d) => sum + d._count.chunks, 0),
    enabledCount: docs.filter((d) => d.enabled).length
  };
  return NextResponse.json({ docs, stats });
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  if (!body.title || !body.content) {
    return NextResponse.json({ error: 'title et content requis' }, { status: 400 });
  }
  try {
    const result = await ingestDocument({
      title: body.title,
      content: body.content,
      source: body.source,
      sourceType: body.sourceType,
      author: body.author,
      tags: Array.isArray(body.tags) ? body.tags : [],
      locale: body.locale || 'fr'
    });
    return NextResponse.json({
      ok: true,
      docId: result.doc.id,
      chunkCount: result.chunkCount
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur ingestion' }, { status: 500 });
  }
}
