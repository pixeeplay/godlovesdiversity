import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/manuals/[audience]?format=html|markdown|video
 * Endpoint PUBLIC : sert la dernière version du manuel pour l'audience.
 * - html (défaut) → response HTML directe (imprimable en PDF via window.print)
 * - markdown → texte plat
 * - video → script narration
 */
export async function GET(req: NextRequest, ctx: { params: { audience: string } }) {
  const { audience } = ctx.params;
  if (!['user', 'admin', 'superadmin'].includes(audience)) {
    return NextResponse.json({ error: 'audience invalide. Use: user|admin|superadmin' }, { status: 400 });
  }

  const format = new URL(req.url).searchParams.get('format') || 'html';

  // Récupère la version la plus récente
  const manual = await prisma.manual.findFirst({
    where: { audience },
    orderBy: { createdAt: 'desc' }
  });

  if (!manual) {
    return new Response(
      `<html><body style="font-family:system-ui;padding:32px;text-align:center;">
        <h1>📚 Manuel pas encore généré</h1>
        <p>Le manuel ${audience} n'a pas encore été créé.</p>
        <p>Va dans <a href="/admin/manuals">/admin/manuals</a> pour le générer.</p>
      </body></html>`,
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
    );
  }

  if (format === 'markdown') {
    return new Response(manual.markdownContent || manual.htmlContent.replace(/<[^>]+>/g, ''), {
      headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=600' }
    });
  }
  if (format === 'video') {
    return new Response(manual.videoScript || '(script vidéo non disponible)', {
      headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=600' }
    });
  }

  return new Response(manual.htmlContent, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=1800',
      'x-manual-version': manual.version,
      'x-manual-audience': manual.audience
    }
  });
}
