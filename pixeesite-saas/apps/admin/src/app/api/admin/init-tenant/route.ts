import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma, ensureTenantDb } from '@pixeesite/database';
import { requireSuperAdmin } from '@/lib/super-admin';
import { TENANT_TABLES, ensureTenantTables } from '@/lib/tenant-init';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;

/**
 * POST /api/admin/init-tenant?org=nono
 *
 * 1. Crée les tables tenant manquantes via SQL raw (CREATE TABLE IF NOT EXISTS)
 * 2. Pour chaque site sans page, recrée les pages depuis le template (en platform.Site.templateId)
 *
 * Retourne un log step-by-step.
 */
export async function POST(req: NextRequest) {
  let auth;
  try { auth = await requireSuperAdmin(); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const url = new URL(req.url);
  const orgSlug = url.searchParams.get('org');
  if (!orgSlug) return NextResponse.json({ error: 'org required' }, { status: 400 });

  const org = await platformDb.org.findUnique({ where: { slug: orgSlug } });
  if (!org) return NextResponse.json({ error: 'org not found' }, { status: 404 });

  const log: { step: string; ok: boolean; detail?: any }[] = [];

  // STEP 0 : CREATE DATABASE si la DB tenant n'existe pas encore
  try {
    const res = await ensureTenantDb(orgSlug);
    log.push({ step: 'ensure-db', ok: true, detail: res.created ? `DB "${res.dbName}" créée` : `DB "${res.dbName}" déjà présente` });
  } catch (e: any) {
    log.push({ step: 'ensure-db', ok: false, detail: e?.message?.slice(0, 300) });
    return NextResponse.json({ log }, { status: 500 });
  }

  const db = await getTenantPrisma(orgSlug).catch((e) => {
    log.push({ step: 'connect-tenant', ok: false, detail: e?.message });
    return null;
  });
  if (!db) return NextResponse.json({ log }, { status: 500 });
  log.push({ step: 'connect-tenant', ok: true });

  // STEP 1 : SQL CREATE TABLE IF NOT EXISTS pour chaque modèle tenant (source : lib/tenant-init.ts)
  const tables: { name: string; sql: string }[] = TENANT_TABLES; const _UNUSED_INLINE = [
    { name: 'SitePage', sql: `
      CREATE TABLE IF NOT EXISTS "SitePage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "siteId" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "meta" JSONB,
        "blocks" JSONB NOT NULL,
        "visible" BOOLEAN NOT NULL DEFAULT true,
        "isHome" BOOLEAN NOT NULL DEFAULT false,
        "noIndex" BOOLEAN NOT NULL DEFAULT false,
        "canonical" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "SitePage_siteId_slug_key" ON "SitePage"("siteId", "slug");
      CREATE INDEX IF NOT EXISTS "SitePage_siteId_visible_idx" ON "SitePage"("siteId", "visible");
    ` },
    { name: 'Lead', sql: `
      CREATE TABLE IF NOT EXISTS "Lead" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT UNIQUE,
        "firstName" TEXT, "lastName" TEXT, "phone" TEXT, "company" TEXT,
        "jobTitle" TEXT, "city" TEXT, "country" TEXT,
        "source" TEXT NOT NULL DEFAULT 'manual', "sourceDetail" TEXT,
        "status" TEXT NOT NULL DEFAULT 'new',
        "score" INTEGER NOT NULL DEFAULT 0,
        "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "segments" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "notes" TEXT, "customFields" JSONB,
        "lastContactedAt" TIMESTAMP(3),
        "contactCount" INTEGER NOT NULL DEFAULT 0,
        "newsletterOptIn" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'FormConfig', sql: `
      CREATE TABLE IF NOT EXISTS "FormConfig" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "slug" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "fields" JSONB NOT NULL,
        "notifyEmail" TEXT,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'Article', sql: `
      CREATE TABLE IF NOT EXISTS "Article" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "slug" TEXT NOT NULL UNIQUE,
        "title" TEXT NOT NULL,
        "excerpt" TEXT, "bodyHtml" TEXT, "coverImage" TEXT,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "publishedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'Newsletter', sql: `
      CREATE TABLE IF NOT EXISTS "Newsletter" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "subject" TEXT NOT NULL, "bodyHtml" TEXT,
        "status" TEXT NOT NULL DEFAULT 'draft',
        "scheduledAt" TIMESTAMP(3), "sentAt" TIMESTAMP(3),
        "opensCount" INTEGER NOT NULL DEFAULT 0, "clicksCount" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'Task', sql: `
      CREATE TABLE IF NOT EXISTS "Task" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL, "description" TEXT,
        "status" TEXT NOT NULL DEFAULT 'todo',
        "priority" TEXT NOT NULL DEFAULT 'normal',
        "assignee" TEXT, "dueDate" TIMESTAMP(3),
        "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "position" INTEGER NOT NULL DEFAULT 0, "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'ForumThread', sql: `
      CREATE TABLE IF NOT EXISTS "ForumThread" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "categoryId" TEXT, "title" TEXT NOT NULL, "slug" TEXT NOT NULL UNIQUE,
        "body" TEXT, "authorEmail" TEXT, "authorName" TEXT,
        "pinned" BOOLEAN NOT NULL DEFAULT false,
        "locked" BOOLEAN NOT NULL DEFAULT false,
        "views" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'ForumPost', sql: `
      CREATE TABLE IF NOT EXISTS "ForumPost" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "threadId" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "authorEmail" TEXT, "authorName" TEXT, "parentId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'Product', sql: `
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "slug" TEXT NOT NULL UNIQUE, "name" TEXT NOT NULL, "description" TEXT,
        "priceCents" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'EUR',
        "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
        "inventory" INTEGER NOT NULL DEFAULT 0,
        "category" TEXT, "variants" JSONB,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
    { name: 'SitemapEntry', sql: `
      CREATE TABLE IF NOT EXISTS "SitemapEntry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "path" TEXT NOT NULL UNIQUE, "label" TEXT NOT NULL,
        "parentId" TEXT, "position" INTEGER NOT NULL DEFAULT 0,
        "visibleNav" BOOLEAN NOT NULL DEFAULT true,
        "visibleSEO" BOOLEAN NOT NULL DEFAULT true,
        "changefreq" TEXT, "priority" DOUBLE PRECISION,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    ` },
  ];

  for (const t of tables) {
    try {
      // Split on ";" pour exécuter statement par statement
      for (const stmt of t.sql.split(';').map((s) => s.trim()).filter(Boolean)) {
        await (db as any).$executeRawUnsafe(stmt);
      }
      log.push({ step: `create-table-${t.name}`, ok: true });
    } catch (e: any) {
      log.push({ step: `create-table-${t.name}`, ok: false, detail: e?.message?.slice(0, 200) });
    }
  }

  // STEP 2 : Recréer les pages depuis les templates pour les sites existants
  const sites = await platformDb.site.findMany({
    where: { orgId: org.id, templateId: { not: null } },
    select: { id: true, slug: true, name: true, templateId: true, pageCount: true },
  });

  for (const site of sites) {
    if (site.pageCount > 0) {
      log.push({ step: `site-${site.slug}-skip`, ok: true, detail: `${site.pageCount} pages existent` });
      continue;
    }
    try {
      const template = await platformDb.template.findUnique({ where: { id: site.templateId! } });
      if (!template) {
        log.push({ step: `site-${site.slug}-no-template`, ok: false });
        continue;
      }
      const blocksSeed = template.blocksSeed as any;
      const pages = blocksSeed?.pages || [];
      let created = 0;
      for (const p of pages) {
        await (db as any).sitePage.create({
          data: {
            siteId: site.id,
            slug: p.slug || '/',
            title: p.title || site.name,
            blocks: p.blocks || [],
            isHome: p.isHome || p.slug === '/',
            visible: true,
            meta: p.meta || null,
          },
        }).catch(() => {});
        created++;
      }
      await platformDb.site.update({ where: { id: site.id }, data: { pageCount: created } });
      log.push({ step: `site-${site.slug}-pages`, ok: true, detail: `${created} pages créées` });
    } catch (e: any) {
      log.push({ step: `site-${site.slug}-error`, ok: false, detail: e?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({
    ok: true,
    org: orgSlug,
    tablesOk: log.filter((l) => l.step.startsWith('create-table-') && l.ok).length,
    sitesProcessed: sites.length,
    log,
  });
}
