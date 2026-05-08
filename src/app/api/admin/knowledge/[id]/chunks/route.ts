import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/knowledge/[id]/chunks
 * Renvoie tous les chunks d'un doc avec un aperçu de leur embedding (256 premières dims).
 * On ne renvoie pas tout le vecteur 768 dim pour économiser la bande passante : la viz
 * affiche une heatmap du début du vecteur, c'est suffisant pour visualiser.
 */
export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const doc = await prisma.knowledgeDoc.findUnique({
    where: { id: ctx.params.id },
    include: { _count: { select: { chunks: true } } },
  });
  if (!doc) return NextResponse.json({ error: 'doc introuvable' }, { status: 404 });

  const chunks = await prisma.knowledgeChunk.findMany({
    where: { docId: ctx.params.id },
    orderBy: { position: 'asc' },
  });

  const enrichedChunks = chunks.map((c) => {
    const emb = (c.embedding as unknown as number[]) || [];
    const dim = emb.length;
    let norm = 0;
    for (const v of emb) norm += v * v;
    norm = Math.sqrt(norm);
    return {
      id: c.id,
      position: c.position,
      text: c.text,
      tokens: c.tokens,
      embeddingDim: dim,
      embeddingNorm: Number(norm.toFixed(4)),
      embeddingPreview: emb.slice(0, 256), // Viz heatmap (256 premières dims)
      embeddingStart: emb.slice(0, 8).map((v) => Number(v.toFixed(4))),
      embeddingEnd: emb.slice(-8).map((v) => Number(v.toFixed(4))),
      createdAt: c.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    doc: {
      id: doc.id,
      title: doc.title,
      source: doc.source,
      sourceType: doc.sourceType,
      author: doc.author,
      tags: doc.tags,
      locale: doc.locale,
      enabled: doc.enabled,
      contentLength: doc.content.length,
      contentPreview: doc.content.slice(0, 2000),
      createdAt: doc.createdAt.toISOString(),
      chunkCount: doc._count.chunks,
    },
    chunks: enrichedChunks,
  });
}
