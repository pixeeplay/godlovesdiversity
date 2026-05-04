/**
 * Stockage en mémoire des jobs de traduction batch.
 * Permet à l'UI de poll la progression sans bloquer la requête HTTP.
 */
import { prisma } from './prisma';
import { generateText } from './gemini';
import { runI18nAudit, SUPPORTED_LOCALES, type SupportedLocale } from './i18n-audit';

export type TranslateJobState = {
  id: string;
  status: 'running' | 'done' | 'failed';
  startedAt: number;
  total: number;
  processed: number;
  ok: number;
  failed: number;
  current: { model: string; key: string; targets: string[] } | null;
  results: Array<{ model: string; key: string; ok: boolean; reason?: string }>;
  error?: string;
};

const jobs = new Map<string, TranslateJobState>();

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  fr: 'français', en: 'anglais', es: 'espagnol', pt: 'portugais (du Brésil)'
};

const TRANSLATABLE_FIELDS: Record<string, string[]> = {
  Page: ['title', 'content'],
  Article: ['title', 'excerpt', 'content'],
  Banner: ['eyebrow', 'title', 'subtitle', 'cta1Text', 'cta2Text'],
  MenuItem: ['label'],
  Section: ['title', 'subtitle', 'body', 'ctaText']
};

export function getJob(id: string): TranslateJobState | undefined {
  return jobs.get(id);
}

export function startTranslateAllJob(): string {
  const id = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const state: TranslateJobState = {
    id, status: 'running', startedAt: Date.now(),
    total: 0, processed: 0, ok: 0, failed: 0, current: null, results: []
  };
  jobs.set(id, state);

  // Démarre en arrière-plan
  void runJob(id).catch((e: any) => {
    state.status = 'failed';
    state.error = e?.message || String(e);
  });

  // Garbage collect après 1h
  setTimeout(() => jobs.delete(id), 3_600_000);

  return id;
}

async function runJob(id: string): Promise<void> {
  const state = jobs.get(id);
  if (!state) return;

  try {
    const report = await runI18nAudit();
    state.total = report.entities.length;

    for (const entity of report.entities) {
      state.current = { model: entity.model, key: entity.key, targets: entity.missingLocales };

      try {
        const source = await loadSource(entity.model, entity.id);
        if (!source) {
          state.results.push({ model: entity.model, key: entity.key, ok: false, reason: 'source introuvable' });
          state.failed++;
          state.processed++;
          continue;
        }

        let allOk = true;
        for (const target of entity.missingLocales) {
          try {
            const translated = await translateRecord(entity.model, source, source.locale, target);
            await upsertTranslation(entity.model, translated, target);
          } catch (e: any) {
            allOk = false;
            console.warn(`[translate-all] ${entity.model}#${entity.key} → ${target}:`, e?.message);
          }
        }
        if (allOk) state.ok++; else state.failed++;
        state.results.push({ model: entity.model, key: entity.key, ok: allOk });
      } catch (e: any) {
        state.failed++;
        state.results.push({ model: entity.model, key: entity.key, ok: false, reason: e?.message?.slice(0, 100) });
      }
      state.processed++;
    }

    state.current = null;
    state.status = 'done';
  } catch (e: any) {
    state.status = 'failed';
    state.error = e?.message || 'Erreur inconnue';
  }
}

async function loadSource(model: string, id: string): Promise<any> {
  if (model === 'Page') return prisma.page.findUnique({ where: { id } });
  if (model === 'Article') return prisma.article.findUnique({ where: { id } });
  if (model === 'Banner') return prisma.banner.findUnique({ where: { id } });
  if (model === 'MenuItem') return prisma.menuItem.findUnique({ where: { id } });
  if (model === 'Section') return prisma.section.findUnique({ where: { id } });
  return null;
}

async function translateRecord(model: string, source: any, fromLocale: string, toLocale: string): Promise<any> {
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
      try {
        const tr = await translateString(JSON.stringify(v), fromLocale, toLocale, true);
        out[f] = JSON.parse(tr);
      } catch { out[f] = v; }
    }
  }

  out.locale = toLocale;
  return out;
}

async function translateString(text: string, from: string, to: string, preserveJson = false): Promise<string> {
  const sys = `Tu es un traducteur professionnel pour le site « God Loves Diversity » (mouvement interreligieux et inclusif).
Traduis du ${LOCALE_NAMES[from as SupportedLocale] || from} vers le ${LOCALE_NAMES[to as SupportedLocale] || to}.
${preserveJson
  ? 'Le texte est un JSON valide. Traduis UNIQUEMENT les valeurs textuelles, conserve la structure et les clés intactes. Renvoie un JSON valide.'
  : 'Renvoie UNIQUEMENT la traduction, sans guillemets ni explication.'}
Garde le ton chaleureux, accueillant, et fidèle au sens original. Préserve les noms propres et termes techniques.`;
  const { text: out, mock } = await generateText(text, sys);
  if (mock) throw new Error('Gemini non configuré');
  return out.trim();
}

async function upsertTranslation(model: string, data: any, locale: string): Promise<void> {
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
  } else if (model === 'Section') {
    await prisma.section.create({ data: { ...data, locale } });
  }
}
