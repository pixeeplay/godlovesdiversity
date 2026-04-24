import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiTranslate } from '@/lib/ai';

const TARGETS = ['en', 'es', 'pt'] as const;

/**
 * Clone toutes les sections françaises d'une page dans les 3 autres langues,
 * en traduisant le titre/sous-titre/body via Gemini. Idempotent : si une
 * section existe déjà pour ce locale + ordre, elle est mise à jour.
 */
export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { pageSlug, sectionId } = await req.json();
  if (!pageSlug && !sectionId) return NextResponse.json({ error: 'pageSlug or sectionId required' }, { status: 400 });

  // Récupère la(les) source(s) FR
  const sources = sectionId
    ? await prisma.section.findMany({ where: { id: sectionId } })
    : await prisma.section.findMany({ where: { pageSlug, locale: 'fr' } });

  let count = 0;
  for (const src of sources) {
    for (const target of TARGETS) {
      const [tTitle, tSub, tBody, tCta] = await Promise.all([
        src.title ? aiTranslate(src.title, target) : Promise.resolve({ text: null }),
        src.subtitle ? aiTranslate(src.subtitle, target) : Promise.resolve({ text: null }),
        src.body ? aiTranslate(src.body, target) : Promise.resolve({ text: null }),
        src.ctaText ? aiTranslate(src.ctaText, target) : Promise.resolve({ text: null })
      ]);

      const existing = await prisma.section.findFirst({
        where: { pageSlug: src.pageSlug, locale: target, order: src.order }
      });

      const data = {
        pageSlug: src.pageSlug,
        locale: target,
        title: (tTitle as any).text,
        subtitle: (tSub as any).text,
        body: (tBody as any).text,
        mediaUrl: src.mediaUrl,
        mediaType: src.mediaType,
        layout: src.layout,
        accentColor: src.accentColor,
        ctaText: (tCta as any).text,
        ctaUrl: src.ctaUrl,
        order: src.order,
        published: src.published
      };

      if (existing) {
        await prisma.section.update({ where: { id: existing.id }, data });
      } else {
        await prisma.section.create({ data });
      }
      count++;
    }
  }
  return NextResponse.json({ ok: true, count, message: `${count} traductions générées` });
}
