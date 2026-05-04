import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';
import { SUPPORTED_LOCALES, type SupportedLocale } from '@/lib/i18n-audit';

export const dynamic = 'force-dynamic';

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  fr: 'français',
  en: 'anglais',
  es: 'espagnol',
  pt: 'portugais (du Brésil)'
};

/**
 * POST /api/admin/i18n/translate
 * Body : { model: 'Page'|'Article'|'Banner'|'MenuItem'|'PageSection',
 *          sourceId: string,
 *          targetLocales?: SupportedLocale[]   // par défaut toutes les manquantes
 *        }
 *
 * Lit le row source, demande à Gemini de traduire les champs textuels vers
 * chaque locale cible, et upserte les rows correspondants.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Auth requise' }, { status: 401 });

  try {
    const { model, sourceId, targetLocales } = await req.json();
    if (!model || !sourceId) return NextResponse.json({ error: 'model + sourceId requis' }, { status: 400 });

    const m = String(model);
    let source: any = null;
    if (m === 'Page') source = await prisma.page.findUnique({ where: { id: sourceId } });
    else if (m === 'Article') source = await prisma.article.findUnique({ where: { id: sourceId } });
    else if (m === 'Banner') source = await prisma.banner.findUnique({ where: { id: sourceId } });
    else if (m === 'MenuItem') source = await prisma.menuItem.findUnique({ where: { id: sourceId } });
    else if (m === 'PageSection') source = (await (prisma as any).pageSection?.findUnique({ where: { id: sourceId } })) || null;

    if (!source) return NextResponse.json({ error: 'Source introuvable' }, { status: 404 });

    const sourceLocale = source.locale as SupportedLocale;
    const targets: SupportedLocale[] = (targetLocales && Array.isArray(targetLocales) ? targetLocales : SUPPORTED_LOCALES.filter((l) => l !== sourceLocale)) as SupportedLocale[];

    const results: Array<{ locale: SupportedLocale; ok: boolean; reason?: string }> = [];

    for (const target of targets) {
      try {
        const translated = await translateRecord(m, source, sourceLocale, target);
        await upsertTranslation(m, translated, target);
        results.push({ locale: target, ok: true });
      } catch (e: any) {
        results.push({ locale: target, ok: false, reason: e?.message || 'erreur' });
      }
    }

    return NextResponse.json({ ok: true, model: m, sourceLocale, results });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur traduction' }, { status: 500 });
  }
}

/** Champs textuels à traduire pour chaque modèle */
const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  Page: ['title', 'content'],
  Article: ['title', 'excerpt', 'content'],
  Banner: ['eyebrow', 'title', 'subtitle', 'cta1Text', 'cta2Text'],
  MenuItem: ['label'],
  PageSection: ['title', 'subtitle', 'body', 'ctaText']
};

async function translateRecord(model: string, source: any, fromLocale: SupportedLocale, toLocale: SupportedLocale): Promise<any> {
  const fields = TRANSLATABLE_FIELDS[model] || [];
  const out: Record<string, any> = { ...source };
  delete out.id;
  delete out.createdAt;
  delete out.updatedAt;

  for (const f of fields) {
    const v = source[f];
    if (v == null || v === '') continue;
    if (typeof v === 'string') {
      out[f] = await translateString(v, fromLocale, toLocale);
    } else if (typeof v === 'object') {
      // JSON content (Page.content / Article.content) — on le sérialise puis on parse
      const txt = JSON.stringify(v);
      const tr = await translateString(txt, fromLocale, toLocale, true);
      try { out[f] = JSON.parse(tr); } catch { out[f] = v; }
    }
  }

  out.locale = toLocale;
  return out;
}

async function translateString(text: string, from: SupportedLocale, to: SupportedLocale, preserveJson: boolean = false): Promise<string> {
  const fromName = LOCALE_NAMES[from];
  const toName = LOCALE_NAMES[to];
  const sys = `Tu es un traducteur professionnel pour le site « God Loves Diversity » (mouvement interreligieux et inclusif).
Traduis du ${fromName} vers le ${toName}.
${preserveJson
    ? 'Le texte est un JSON valide. Traduis UNIQUEMENT les valeurs textuelles, conserve la structure et les clés intactes. Renvoie un JSON valide.'
    : 'Renvoie UNIQUEMENT la traduction, sans guillemets ni explication.'}
Garde le ton chaleureux, accueillant, et fidèle au sens original. Préserve les noms propres et termes techniques.`;
  const { text: out } = await generateText(text, sys);
  return out.trim();
}

async function upsertTranslation(model: string, data: any, locale: SupportedLocale) {
  if (model === 'Page') {
    await prisma.page.upsert({
      where: { slug_locale: { slug: data.slug, locale } },
      update: { title: data.title, content: data.content, published: data.published },
      create: { slug: data.slug, locale, title: data.title, content: data.content, published: data.published }
    });
  } else if (model === 'Article') {
    await prisma.article.upsert({
      where: { slug_locale: { slug: data.slug, locale } },
      update: { title: data.title, excerpt: data.excerpt, content: data.content, coverImage: data.coverImage, coverVideo: data.coverVideo, tags: data.tags || [], published: data.published, publishedAt: data.publishedAt, authorId: data.authorId },
      create: { slug: data.slug, locale, title: data.title, excerpt: data.excerpt, content: data.content, coverImage: data.coverImage, coverVideo: data.coverVideo, tags: data.tags || [], published: data.published, publishedAt: data.publishedAt, authorId: data.authorId }
    });
  } else if (model === 'Banner') {
    await prisma.banner.create({ data: { ...data, locale } });
  } else if (model === 'MenuItem') {
    await prisma.menuItem.create({ data: { ...data, locale } });
  } else if (model === 'PageSection' && (prisma as any).pageSection) {
    await (prisma as any).pageSection.create({ data: { ...data, locale } });
  }
}
