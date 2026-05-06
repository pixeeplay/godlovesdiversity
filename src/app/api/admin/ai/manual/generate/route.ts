import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateManual, Audience } from '@/lib/manual-generator';
import { notify } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/admin/ai/manual/generate?audience=user|admin|superadmin&publishToTelegram=1
 *
 * Génère le manuel de l'audience spécifiée. Si pas d'audience : génère les 3.
 * Auth : admin OR cron secret.
 */
export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  const isCron = cronSecret && cronSecret === process.env.CRON_SECRET;
  if (!isCron) {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const audienceParam = url.searchParams.get('audience') as Audience | null;
  const publishToTelegram = url.searchParams.get('publishToTelegram') === '1';
  const targets: Audience[] = audienceParam ? [audienceParam] : ['user', 'admin', 'superadmin'];

  const results: any[] = [];
  for (const audience of targets) {
    try {
      const m = await generateManual(audience);
      const versionWithOrder = `${m.version}.${Date.now().toString(36).slice(-4)}`;

      const saved = await prisma.manual.create({
        data: {
          audience: m.audience,
          version: versionWithOrder,
          htmlContent: m.html,
          markdownContent: m.markdown,
          videoScript: m.videoScript,
          sectionCount: m.sectionCount,
          wordCount: m.wordCount,
          publishedAt: new Date(),
          publishedToTelegram: false,
          generatedBy: 'gemini'
        }
      });

      // Publier sur Telegram si demandé
      if (publishToTelegram) {
        const labels = { user: 'Utilisateur', admin: 'Administrateur', superadmin: 'Super-Admin' };
        const sizeKb = Math.round(m.html.length / 1024);
        await notify({
          event: 'admin.alert',
          title: `📚 Manuel ${labels[audience]} mis à jour`,
          body: `Version ${versionWithOrder}\n${m.sectionCount} sections · ${m.wordCount} mots · ${sizeKb} KB HTML\n\nLire en ligne :`,
          url: `https://gld.pixeeplay.com/api/manuals/${audience}`,
          level: 'info',
          metadata: { manualId: saved.id, audience, version: versionWithOrder }
        }).catch(() => {});
        await prisma.manual.update({ where: { id: saved.id }, data: { publishedToTelegram: true } });
      }

      results.push({
        audience: m.audience,
        version: versionWithOrder,
        manualId: saved.id,
        sectionCount: m.sectionCount,
        wordCount: m.wordCount,
        apiCalls: m.apiCalls,
        publishedToTelegram: publishToTelegram
      });
    } catch (e: any) {
      results.push({ audience, error: e?.message || 'failed' });
    }
  }

  return NextResponse.json({ ok: true, results });
}

/**
 * GET /api/admin/ai/manual/generate
 * Liste les derniers manuels générés.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const recent = await prisma.manual.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, audience: true, version: true, sectionCount: true, wordCount: true, publishedAt: true, publishedToTelegram: true, createdAt: true }
  });
  const latestByAudience = await prisma.manual.findMany({
    distinct: ['audience'],
    orderBy: { createdAt: 'desc' },
    select: { id: true, audience: true, version: true, createdAt: true, sectionCount: true, wordCount: true }
  });
  return NextResponse.json({ recent, latestByAudience });
}
