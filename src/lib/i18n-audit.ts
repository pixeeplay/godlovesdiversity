import { prisma } from './prisma';

/** Locales supportées par GLD */
export const SUPPORTED_LOCALES = ['fr', 'en', 'es', 'pt'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

/** Résultat d'audit pour une entité (slug ou title) — quelle(s) locale(s) manquent */
export type AuditEntity = {
  model: string;
  key: string;            // identifiant lisible (slug ou title)
  id: string;             // id du row source
  presentLocales: SupportedLocale[];
  missingLocales: SupportedLocale[];
};

export type AuditReport = {
  generatedAt: string;
  totalIssues: number;
  byModel: Record<string, { totalEntities: number; entitiesWithMissing: number; missingTotal: number }>;
  entities: AuditEntity[];
};

/**
 * Audite l'état des traductions sur tout le contenu i18n du site.
 * Pour chaque slug (ou clé naturelle), on vérifie que les 4 locales existent.
 */
export async function runI18nAudit(): Promise<AuditReport> {
  const entities: AuditEntity[] = [];
  const byModel: AuditReport['byModel'] = {};

  // ===== Pages (clé : slug) =====
  const pages = await prisma.page.findMany({ select: { id: true, slug: true, locale: true } }).catch(() => []);
  groupAndCheck(pages, 'slug', 'Page', entities, byModel);

  // ===== Articles (clé : slug) =====
  const articles = await prisma.article.findMany({ select: { id: true, slug: true, locale: true } }).catch(() => []);
  groupAndCheck(articles, 'slug', 'Article', entities, byModel);

  // ===== Banners (clé : title — pas de slug) =====
  const banners = await prisma.banner.findMany({ select: { id: true, title: true, locale: true } }).catch(() => []);
  groupAndCheck(banners.map((b) => ({ id: b.id, slug: b.title, locale: b.locale })), 'slug', 'Banner', entities, byModel);

  // ===== MenuItems (clé : href — un href doit exister dans toutes les langues) =====
  const menuItems = await prisma.menuItem.findMany({ select: { id: true, href: true, locale: true } }).catch(() => []);
  groupAndCheck(menuItems.map((m) => ({ id: m.id, slug: m.href, locale: m.locale })), 'slug', 'MenuItem', entities, byModel);

  // ===== PageSections (clé : pageSlug + position) — composé =====
  try {
    const sections = await prisma.pageSection.findMany({ select: { id: true, pageSlug: true, locale: true, order: true } });
    groupAndCheck(
      sections.map((s) => ({ id: s.id, slug: `${s.pageSlug}#${s.order}`, locale: s.locale })),
      'slug', 'PageSection', entities, byModel
    );
  } catch { /* model peut-être absent */ }

  const totalIssues = entities.reduce((s, e) => s + e.missingLocales.length, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalIssues,
    byModel,
    entities: entities.sort((a, b) => b.missingLocales.length - a.missingLocales.length)
  };
}

function groupAndCheck(
  rows: Array<{ id: string; slug?: string | null; locale: string | null }>,
  keyField: string,
  modelName: string,
  out: AuditEntity[],
  stats: AuditReport['byModel']
) {
  // Groupe par clé naturelle
  const byKey = new Map<string, { id: string; locales: Set<string> }>();
  for (const r of rows) {
    const k = (r as any)[keyField] as string | null | undefined;
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, { id: r.id, locales: new Set() });
    if (r.locale) byKey.get(k)!.locales.add(r.locale);
  }

  let entitiesWithMissing = 0;
  let missingTotal = 0;
  for (const [key, data] of byKey.entries()) {
    const present = SUPPORTED_LOCALES.filter((l) => data.locales.has(l));
    const missing = SUPPORTED_LOCALES.filter((l) => !data.locales.has(l));
    if (missing.length > 0) {
      entitiesWithMissing++;
      missingTotal += missing.length;
      out.push({
        model: modelName,
        key,
        id: data.id,
        presentLocales: present,
        missingLocales: missing
      });
    }
  }

  stats[modelName] = {
    totalEntities: byKey.size,
    entitiesWithMissing,
    missingTotal
  };
}
