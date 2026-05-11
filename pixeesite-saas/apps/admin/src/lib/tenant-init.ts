/**
 * Schéma SQL des tables tenant — exécuté soit explicitement via /api/admin/init-tenant,
 * soit automatiquement par le wizard de création de site si les tables manquent.
 *
 * Toutes les statements sont CREATE TABLE IF NOT EXISTS, donc idempotent et safe à rejouer.
 */

export const TENANT_TABLES: { name: string; sql: string }[] = [
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
  { name: 'Order', sql: `
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "externalId" TEXT,
      "email" TEXT NOT NULL,
      "firstName" TEXT, "lastName" TEXT, "phone" TEXT,
      "shipAddress" TEXT, "shipCity" TEXT, "shipPostal" TEXT, "shipCountry" TEXT,
      "subtotalCents" INTEGER NOT NULL DEFAULT 0,
      "shippingCents" INTEGER NOT NULL DEFAULT 0,
      "taxCents" INTEGER NOT NULL DEFAULT 0,
      "totalCents" INTEGER NOT NULL,
      "currency" TEXT NOT NULL DEFAULT 'EUR',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "trackingNumber" TEXT, "trackingUrl" TEXT, "carrier" TEXT,
      "shippedAt" TIMESTAMP(3), "deliveredAt" TIMESTAMP(3),
      "refundedCents" INTEGER NOT NULL DEFAULT 0,
      "refundedAt" TIMESTAMP(3),
      "dropshipProvider" TEXT, "dropshipOrderId" TEXT, "dropshipStatus" TEXT,
      "trackToken" TEXT NOT NULL,
      "notes" TEXT, "metadata" JSONB,
      "stripeSessionId" TEXT,
      "shippingAddress" JSONB, "billingAddress" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_trackToken_key" ON "Order"("trackToken");
    CREATE UNIQUE INDEX IF NOT EXISTS "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
    CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
    CREATE INDEX IF NOT EXISTS "Order_email_idx" ON "Order"("email");
  ` },
  { name: 'OrderItem', sql: `
    CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "priceCents" INTEGER NOT NULL,
      "variant" JSONB
    );
    CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
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
  { name: 'Event', sql: `
    CREATE TABLE IF NOT EXISTS "Event" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "startsAt" TIMESTAMP(3) NOT NULL,
      "endsAt" TIMESTAMP(3),
      "location" TEXT,
      "lat" DOUBLE PRECISION,
      "lng" DOUBLE PRECISION,
      "coverImage" TEXT,
      "category" TEXT,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "externalUrl" TEXT,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Event_startsAt_idx" ON "Event"("startsAt");
    CREATE INDEX IF NOT EXISTS "Event_category_idx" ON "Event"("category");
  ` },
  { name: 'Coupon', sql: `
    CREATE TABLE IF NOT EXISTS "Coupon" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "type" TEXT NOT NULL DEFAULT 'percent',
      "value" INTEGER NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'EUR',
      "minCents" INTEGER,
      "maxUses" INTEGER,
      "usedCount" INTEGER NOT NULL DEFAULT 0,
      "validFrom" TIMESTAMP(3),
      "validUntil" TIMESTAMP(3),
      "active" BOOLEAN NOT NULL DEFAULT true,
      "applicableProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Coupon_active_idx" ON "Coupon"("active");
  ` },
  { name: 'Testimonial', sql: `
    CREATE TABLE IF NOT EXISTS "Testimonial" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorName" TEXT NOT NULL,
      "authorTitle" TEXT,
      "authorAvatar" TEXT,
      "videoUrl" TEXT,
      "posterImage" TEXT,
      "quote" TEXT,
      "rating" INTEGER,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Testimonial_published_position_idx" ON "Testimonial"("published", "position");
  ` },
  { name: 'YoutubeVideo', sql: `
    CREATE TABLE IF NOT EXISTS "YoutubeVideo" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "videoId" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "thumbnail" TEXT,
      "channel" TEXT,
      "publishedAt" TIMESTAMP(3),
      "category" TEXT,
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "YoutubeVideo_position_idx" ON "YoutubeVideo"("position");
  ` },
  { name: 'Banner', sql: `
    CREATE TABLE IF NOT EXISTS "Banner" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "image" TEXT,
      "link" TEXT,
      "ctaLabel" TEXT,
      "position" TEXT NOT NULL DEFAULT 'hero',
      "priority" INTEGER NOT NULL DEFAULT 0,
      "startsAt" TIMESTAMP(3),
      "endsAt" TIMESTAMP(3),
      "active" BOOLEAN NOT NULL DEFAULT true,
      "targetPages" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Banner_active_position_idx" ON "Banner"("active", "position");
  ` },
  { name: 'MapLocation', sql: `
    CREATE TABLE IF NOT EXISTS "MapLocation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT,
      "address" TEXT,
      "lat" DOUBLE PRECISION NOT NULL,
      "lng" DOUBLE PRECISION NOT NULL,
      "country" TEXT,
      "city" TEXT,
      "description" TEXT,
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "openingHours" JSONB,
      "contact" JSONB,
      "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "MapLocation_type_idx" ON "MapLocation"("type");
    CREATE INDEX IF NOT EXISTS "MapLocation_country_city_idx" ON "MapLocation"("country", "city");
  ` },
  { name: 'ModerationItem', sql: `
    CREATE TABLE IF NOT EXISTS "ModerationItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "type" TEXT NOT NULL,
      "targetId" TEXT,
      "content" TEXT,
      "authorName" TEXT,
      "authorEmail" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "aiScore" DOUBLE PRECISION,
      "aiLabels" JSONB,
      "decidedBy" TEXT,
      "decidedAt" TIMESTAMP(3),
      "reason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ModerationItem_status_createdAt_idx" ON "ModerationItem"("status", "createdAt");
    CREATE INDEX IF NOT EXISTS "ModerationItem_type_idx" ON "ModerationItem"("type");
  ` },
  { name: 'Poster', sql: `
    CREATE TABLE IF NOT EXISTS "Poster" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "theme" TEXT,
      "content" JSONB,
      "imageUrl" TEXT,
      "sizes" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'NewsletterPlan', sql: `
    CREATE TABLE IF NOT EXISTS "NewsletterPlan" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "year" INTEGER NOT NULL,
      "month" INTEGER NOT NULL,
      "theme" TEXT,
      "subject" TEXT,
      "audiences" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "scheduledAt" TIMESTAMP(3),
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'planned',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterPlan_year_month_key" ON "NewsletterPlan"("year", "month");
  ` },
  { name: 'SocialPost', sql: `
    CREATE TABLE IF NOT EXISTS "SocialPost" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "platform" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "scheduledAt" TIMESTAMP(3),
      "publishedAt" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'draft',
      "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "externalId" TEXT,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "SocialPost_scheduledAt_idx" ON "SocialPost"("scheduledAt");
    CREATE INDEX IF NOT EXISTS "SocialPost_platform_status_idx" ON "SocialPost"("platform", "status");
  ` },
  { name: 'RichPage', sql: `
    CREATE TABLE IF NOT EXISTS "RichPage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "bodyHtml" TEXT,
      "meta" JSONB,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "position" INTEGER NOT NULL DEFAULT 0,
      "parentId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "RichPage_status_idx" ON "RichPage"("status");
    CREATE INDEX IF NOT EXISTS "RichPage_parentId_position_idx" ON "RichPage"("parentId", "position");
  ` },
  { name: 'Partner', sql: `
    CREATE TABLE IF NOT EXISTS "Partner" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "logoUrl" TEXT,
      "websiteUrl" TEXT,
      "description" TEXT,
      "category" TEXT,
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "position" INTEGER NOT NULL DEFAULT 0,
      "contactName" TEXT,
      "contactEmail" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Partner_active_position_idx" ON "Partner"("active", "position");
    CREATE INDEX IF NOT EXISTS "Partner_featured_idx" ON "Partner"("featured");
  ` },
  // ──────────────────────────────────────────────────────────────────────
  // Phase A : 11 tables pour CRM/Leads + IA core + IA avancée + Intégrations
  // ──────────────────────────────────────────────────────────────────────
  { name: 'EmailTemplate', sql: `
    CREATE TABLE IF NOT EXISTS "EmailTemplate" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "category" TEXT,
      "subject" TEXT NOT NULL,
      "bodyHtml" TEXT NOT NULL,
      "bodyText" TEXT,
      "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "audience" TEXT,
      "isSystem" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "EmailTemplate_category_idx" ON "EmailTemplate"("category");
  ` },
  { name: 'ScraperJob', sql: `
    CREATE TABLE IF NOT EXISTS "ScraperJob" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT,
      "sourceUrl" TEXT NOT NULL,
      "depth" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "leadCount" INTEGER NOT NULL DEFAULT 0,
      "errorCount" INTEGER NOT NULL DEFAULT 0,
      "config" JSONB,
      "results" JSONB,
      "startedAt" TIMESTAMP(3),
      "finishedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ScraperJob_status_idx" ON "ScraperJob"("status");
  ` },
  { name: 'AiAutopilotRule', sql: `
    CREATE TABLE IF NOT EXISTS "AiAutopilotRule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "trigger" TEXT NOT NULL,
      "triggerConfig" JSONB,
      "action" TEXT NOT NULL,
      "actionConfig" JSONB,
      "schedule" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "lastRunAt" TIMESTAMP(3),
      "lastRunStatus" TEXT,
      "runsCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AiAutopilotRule_active_idx" ON "AiAutopilotRule"("active");
  ` },
  { name: 'AiManual', sql: `
    CREATE TABLE IF NOT EXISTS "AiManual" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "audience" TEXT NOT NULL,
      "tone" TEXT,
      "language" TEXT NOT NULL DEFAULT 'fr',
      "content" TEXT NOT NULL,
      "outline" JSONB,
      "provider" TEXT,
      "model" TEXT,
      "tokensUsed" INTEGER,
      "videoScript" TEXT,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AiManual_audience_idx" ON "AiManual"("audience");
  ` },
  { name: 'RagSource', sql: `
    CREATE TABLE IF NOT EXISTS "RagSource" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "url" TEXT,
      "config" JSONB,
      "lastIndexedAt" TIMESTAMP(3),
      "chunksCount" INTEGER NOT NULL DEFAULT 0,
      "tokensCount" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'RagChunk', sql: `
    CREATE TABLE IF NOT EXISTS "RagChunk" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sourceId" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "embedding" DOUBLE PRECISION[],
      "metadata" JSONB,
      "position" INTEGER NOT NULL DEFAULT 0,
      "tokens" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "RagChunk_sourceId_idx" ON "RagChunk"("sourceId");
  ` },
  { name: 'TelegramAlert', sql: `
    CREATE TABLE IF NOT EXISTS "TelegramAlert" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "chatId" TEXT NOT NULL,
      "type" TEXT,
      "message" TEXT NOT NULL,
      "parseMode" TEXT,
      "sentAt" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'pending',
      "error" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "TelegramAlert_status_idx" ON "TelegramAlert"("status");
  ` },
  { name: 'IntegrationConfig', sql: `
    CREATE TABLE IF NOT EXISTS "IntegrationConfig" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "provider" TEXT NOT NULL UNIQUE,
      "displayName" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT false,
      "config" JSONB,
      "lastSyncAt" TIMESTAMP(3),
      "lastSyncStatus" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'Theme', sql: `
    CREATE TABLE IF NOT EXISTS "Theme" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "season" TEXT,
      "palette" JSONB NOT NULL,
      "fonts" JSONB,
      "blocks" JSONB,
      "active" BOOLEAN NOT NULL DEFAULT false,
      "scheduledFrom" TIMESTAMP(3),
      "scheduledUntil" TIMESTAMP(3),
      "previewImage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Theme_active_idx" ON "Theme"("active");
  ` },
  { name: 'FeatureFlag', sql: `
    CREATE TABLE IF NOT EXISTS "FeatureFlag" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "displayName" TEXT,
      "description" TEXT,
      "value" BOOLEAN NOT NULL DEFAULT false,
      "rollout" INTEGER NOT NULL DEFAULT 100,
      "conditions" JSONB,
      "audience" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'Translation', sql: `
    CREATE TABLE IF NOT EXISTS "Translation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "namespace" TEXT NOT NULL DEFAULT 'default',
      "key" TEXT NOT NULL,
      "lang" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "context" TEXT,
      "approved" BOOLEAN NOT NULL DEFAULT false,
      "translatedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Translation_ns_key_lang_key" ON "Translation"("namespace", "key", "lang");
    CREATE INDEX IF NOT EXISTS "Translation_lang_idx" ON "Translation"("lang");
  ` },

  // ════════════════════════════════════════════════════════════════════
  // PHASE 1 — DB FOUNDATION (iso GLD neutralisé) — 48 modèles
  // ════════════════════════════════════════════════════════════════════

  // ── IDENTITÉ & USER ────────────────────────────────────────────────
  { name: 'TenantUser', sql: `
    CREATE TABLE IF NOT EXISTS "TenantUser" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL UNIQUE,
      "name" TEXT,
      "image" TEXT,
      "role" TEXT NOT NULL DEFAULT 'VIEWER',
      "bio" TEXT,
      "publicName" TEXT,
      "identity" TEXT,
      "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "cityProfile" TEXT,
      "ghostMode" BOOLEAN NOT NULL DEFAULT false,
      "notifyDigest" BOOLEAN NOT NULL DEFAULT true,
      "notifyEvents" BOOLEAN NOT NULL DEFAULT true,
      "notifyPeerHelp" BOOLEAN NOT NULL DEFAULT true,
      "notifyMentor" BOOLEAN NOT NULL DEFAULT true,
      "notifyShop" BOOLEAN NOT NULL DEFAULT true,
      "bannerUrl" TEXT,
      "bannerPrompt" TEXT,
      "dashboardTheme" TEXT DEFAULT 'fuchsia',
      "favoriteColor" TEXT DEFAULT '#d61b80',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "TenantUser_role_idx" ON "TenantUser"("role");
  ` },
  { name: 'Bookmark', sql: `
    CREATE TABLE IF NOT EXISTS "Bookmark" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "resourceType" TEXT NOT NULL,
      "resourceId" TEXT NOT NULL,
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_user_resource_key" ON "Bookmark"("userId", "resourceType", "resourceId");
    CREATE INDEX IF NOT EXISTS "Bookmark_userId_resourceType_idx" ON "Bookmark"("userId", "resourceType");
  ` },
  { name: 'JournalEntry', sql: `
    CREATE TABLE IF NOT EXISTS "JournalEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "title" TEXT,
      "content" TEXT NOT NULL,
      "encrypted" BOOLEAN NOT NULL DEFAULT false,
      "mood" TEXT,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "JournalEntry_userId_createdAt_idx" ON "JournalEntry"("userId", "createdAt");
  ` },
  { name: 'FutureLetter', sql: `
    CREATE TABLE IF NOT EXISTS "FutureLetter" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "subject" TEXT,
      "content" TEXT NOT NULL,
      "deliveryDate" TIMESTAMP(3) NOT NULL,
      "delivered" BOOLEAN NOT NULL DEFAULT false,
      "deliveredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "FutureLetter_deliveryDate_delivered_idx" ON "FutureLetter"("deliveryDate", "delivered");
  ` },
  { name: 'AIConversation', sql: `
    CREATE TABLE IF NOT EXISTS "AIConversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "tool" TEXT NOT NULL,
      "title" TEXT,
      "messages" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AIConversation_userId_tool_createdAt_idx" ON "AIConversation"("userId", "tool", "createdAt");
  ` },
  { name: 'UserActivityLog', sql: `
    CREATE TABLE IF NOT EXISTS "UserActivityLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "resourceType" TEXT,
      "resourceId" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "UserActivityLog_userId_createdAt_idx" ON "UserActivityLog"("userId", "createdAt");
  ` },
  { name: 'UserMenuOverride', sql: `
    CREATE TABLE IF NOT EXISTS "UserMenuOverride" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "hidden" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "visible" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "notes" TEXT,
      "updatedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'VocalEntry', sql: `
    CREATE TABLE IF NOT EXISTS "VocalEntry" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "storageKey" TEXT NOT NULL,
      "audioMime" TEXT NOT NULL DEFAULT 'audio/webm',
      "durationSec" INTEGER,
      "fileSizeBytes" INTEGER,
      "language" TEXT NOT NULL DEFAULT 'fr',
      "transcription" TEXT,
      "title" TEXT,
      "mood" TEXT,
      "category" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PROCESSING',
      "errorMessage" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT false,
      "transcribedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "VocalEntry_userId_createdAt_idx" ON "VocalEntry"("userId", "createdAt");
    CREATE INDEX IF NOT EXISTS "VocalEntry_status_idx" ON "VocalEntry"("status");
  ` },
  { name: 'UserMfa', sql: `
    CREATE TABLE IF NOT EXISTS "UserMfa" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "totpSecret" TEXT NOT NULL,
      "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "enabledAt" TIMESTAMP(3),
      "verifiedAt" TIMESTAMP(3),
      "smsPhone" TEXT,
      "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
      "recoveryEmail" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'SmsCode', sql: `
    CREATE TABLE IF NOT EXISTS "SmsCode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "phoneE164" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "purpose" TEXT NOT NULL,
      "consumedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "SmsCode_userId_purpose_consumedAt_idx" ON "SmsCode"("userId", "purpose", "consumedAt");
  ` },
  { name: 'LoginAttempt', sql: `
    CREATE TABLE IF NOT EXISTS "LoginAttempt" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "ip" TEXT,
      "ua" TEXT,
      "succeeded" BOOLEAN NOT NULL DEFAULT false,
      "reason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");
    CREATE INDEX IF NOT EXISTS "LoginAttempt_ip_createdAt_idx" ON "LoginAttempt"("ip", "createdAt");
  ` },

  // ── CMS & PAGES ────────────────────────────────────────────────────
  { name: 'Page', sql: `
    CREATE TABLE IF NOT EXISTS "Page" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL,
      "locale" TEXT NOT NULL DEFAULT 'fr',
      "title" TEXT NOT NULL,
      "content" JSONB NOT NULL,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "meta" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Page_slug_locale_key" ON "Page"("slug", "locale");
    CREATE INDEX IF NOT EXISTS "Page_published_idx" ON "Page"("published");
  ` },
  { name: 'Section', sql: `
    CREATE TABLE IF NOT EXISTS "Section" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pageSlug" TEXT NOT NULL,
      "locale" TEXT NOT NULL DEFAULT 'fr',
      "title" TEXT,
      "subtitle" TEXT,
      "body" TEXT,
      "mediaUrl" TEXT,
      "mediaType" TEXT,
      "layout" TEXT NOT NULL DEFAULT 'text-image',
      "accentColor" TEXT,
      "ctaText" TEXT,
      "ctaUrl" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Section_pageSlug_locale_order_idx" ON "Section"("pageSlug", "locale", "order");
  ` },
  { name: 'MenuItem', sql: `
    CREATE TABLE IF NOT EXISTS "MenuItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "locale" TEXT NOT NULL DEFAULT 'fr',
      "label" TEXT NOT NULL,
      "href" TEXT NOT NULL,
      "external" BOOLEAN NOT NULL DEFAULT false,
      "parentId" TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "MenuItem_locale_parentId_order_idx" ON "MenuItem"("locale", "parentId", "order");
  ` },
  { name: 'PageBlock', sql: `
    CREATE TABLE IF NOT EXISTS "PageBlock" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "pageSlug" TEXT NOT NULL,
      "position" INTEGER NOT NULL DEFAULT 0,
      "width" TEXT NOT NULL DEFAULT 'full',
      "height" TEXT NOT NULL DEFAULT 'auto',
      "type" TEXT NOT NULL,
      "data" JSONB NOT NULL,
      "effect" TEXT,
      "effectDelay" INTEGER,
      "visible" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "PageBlock_pageSlug_position_idx" ON "PageBlock"("pageSlug", "position");
    CREATE INDEX IF NOT EXISTS "PageBlock_visible_idx" ON "PageBlock"("visible");
  ` },
  { name: 'Setting', sql: `
    CREATE TABLE IF NOT EXISTS "Setting" (
      "key" TEXT NOT NULL PRIMARY KEY,
      "value" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },

  // ── TESTIMONIAL EXTENSION (déjà créée, ALTER pour ajouter les colonnes) ─
  { name: 'TestimonialExt', sql: `
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "thumbnailUrl" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'fr';
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "transcription" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "subtitlesFr" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "subtitlesEn" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "subtitlesEs" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "subtitlesDe" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "subtitlesIt" TEXT;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Testimonial" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0;
  ` },

  // ── E-COMMERCE AVANCÉ ──────────────────────────────────────────────
  { name: 'PhotoComment', sql: `
    CREATE TABLE IF NOT EXISTS "PhotoComment" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "photoId" TEXT NOT NULL,
      "authorName" TEXT NOT NULL,
      "authorEmail" TEXT,
      "content" TEXT NOT NULL,
      "approved" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "PhotoComment_photoId_createdAt_idx" ON "PhotoComment"("photoId", "createdAt");
  ` },
  { name: 'ProductReview', sql: `
    CREATE TABLE IF NOT EXISTS "ProductReview" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "authorId" TEXT,
      "rating" INTEGER NOT NULL,
      "title" TEXT,
      "content" TEXT,
      "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ProductReview_productId_status_idx" ON "ProductReview"("productId", "status");
    CREATE INDEX IF NOT EXISTS "ProductReview_authorId_idx" ON "ProductReview"("authorId");
  ` },
  { name: 'Wishlist', sql: `
    CREATE TABLE IF NOT EXISTS "Wishlist" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "Wishlist_userId_productId_key" ON "Wishlist"("userId", "productId");
    CREATE INDEX IF NOT EXISTS "Wishlist_userId_idx" ON "Wishlist"("userId");
  ` },
  { name: 'StockAlert', sql: `
    CREATE TABLE IF NOT EXISTS "StockAlert" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "email" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "variantOpts" JSONB,
      "notifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "StockAlert_productId_notifiedAt_idx" ON "StockAlert"("productId", "notifiedAt");
  ` },
  { name: 'LoyaltyAccount', sql: `
    CREATE TABLE IF NOT EXISTS "LoyaltyAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "points" INTEGER NOT NULL DEFAULT 0,
      "tier" TEXT NOT NULL DEFAULT 'bronze',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'LoyaltyLedger', sql: `
    CREATE TABLE IF NOT EXISTS "LoyaltyLedger" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "delta" INTEGER NOT NULL,
      "reason" TEXT NOT NULL,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "LoyaltyLedger_accountId_createdAt_idx" ON "LoyaltyLedger"("accountId", "createdAt");
  ` },
  { name: 'ProductVariant', sql: `
    CREATE TABLE IF NOT EXISTS "ProductVariant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "productId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "sku" TEXT,
      "options" JSONB NOT NULL,
      "priceCents" INTEGER,
      "stock" INTEGER,
      "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "order" INTEGER NOT NULL DEFAULT 0,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ProductVariant_productId_order_idx" ON "ProductVariant"("productId", "order");
  ` },
  { name: 'ReferralCode', sql: `
    CREATE TABLE IF NOT EXISTS "ReferralCode" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "ownerId" TEXT,
      "uses" INTEGER NOT NULL DEFAULT 0,
      "rewardKind" TEXT NOT NULL DEFAULT 'discount',
      "rewardValue" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },
  { name: 'Referral', sql: `
    CREATE TABLE IF NOT EXISTS "Referral" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "codeId" TEXT NOT NULL,
      "referredEmail" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "convertedAt" TIMESTAMP(3),
      "rewardGivenAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Referral_codeId_status_idx" ON "Referral"("codeId", "status");
  ` },
  { name: 'ModerationDecision', sql: `
    CREATE TABLE IF NOT EXISTS "ModerationDecision" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "targetType" TEXT NOT NULL,
      "targetId" TEXT NOT NULL,
      "score" DOUBLE PRECISION NOT NULL,
      "category" TEXT,
      "reason" TEXT,
      "action" TEXT NOT NULL,
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ModerationDecision_targetType_targetId_idx" ON "ModerationDecision"("targetType", "targetId");
    CREATE INDEX IF NOT EXISTS "ModerationDecision_action_createdAt_idx" ON "ModerationDecision"("action", "createdAt");
  ` },

  // ── CONNECT (réseau social interne, neutre) ──────────────────────
  { name: 'ConnectProfile', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "handle" TEXT NOT NULL UNIQUE,
      "displayName" TEXT NOT NULL,
      "birthYear" INTEGER,
      "city" TEXT,
      "country" TEXT DEFAULT 'FR',
      "bio" TEXT,
      "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "verifiedAt" TIMESTAMP(3),
      "showInWall" BOOLEAN NOT NULL DEFAULT true,
      "showInDating" BOOLEAN NOT NULL DEFAULT false,
      "showInPro" BOOLEAN NOT NULL DEFAULT false,
      "intentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "quote" TEXT,
      "maxDistanceKm" INTEGER NOT NULL DEFAULT 50,
      "ageRangeMin" INTEGER NOT NULL DEFAULT 18,
      "ageRangeMax" INTEGER NOT NULL DEFAULT 99,
      "showOnlyVerified" BOOLEAN NOT NULL DEFAULT true,
      "jobTitle" TEXT,
      "proCategory" TEXT,
      "proPitch" TEXT,
      "proAvailable" BOOLEAN NOT NULL DEFAULT false,
      "proRate" TEXT,
      "identity" TEXT,
      "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "lat" DOUBLE PRECISION,
      "lng" DOUBLE PRECISION,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ConnectProfile_showInDating_country_idx" ON "ConnectProfile"("showInDating", "country");
    CREATE INDEX IF NOT EXISTS "ConnectProfile_showInPro_proCategory_idx" ON "ConnectProfile"("showInPro", "proCategory");
  ` },
  { name: 'ConnectSwipe', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectSwipe" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "fromId" TEXT NOT NULL,
      "toId" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "intentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ConnectSwipe_fromId_toId_key" ON "ConnectSwipe"("fromId", "toId");
    CREATE INDEX IF NOT EXISTS "ConnectSwipe_toId_action_idx" ON "ConnectSwipe"("toId", "action");
  ` },
  { name: 'ConnectMatch', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectMatch" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user1Id" TEXT NOT NULL,
      "user2Id" TEXT NOT NULL,
      "intentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ConnectMatch_user1Id_user2Id_key" ON "ConnectMatch"("user1Id", "user2Id");
    CREATE INDEX IF NOT EXISTS "ConnectMatch_user1Id_idx" ON "ConnectMatch"("user1Id");
    CREATE INDEX IF NOT EXISTS "ConnectMatch_user2Id_idx" ON "ConnectMatch"("user2Id");
  ` },
  { name: 'ConnectConnection', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectConnection" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "fromId" TEXT NOT NULL,
      "toId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "message" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "acceptedAt" TIMESTAMP(3)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ConnectConnection_fromId_toId_key" ON "ConnectConnection"("fromId", "toId");
    CREATE INDEX IF NOT EXISTS "ConnectConnection_toId_status_idx" ON "ConnectConnection"("toId", "status");
  ` },
  { name: 'ConnectPost', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectPost" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorId" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'post',
      "text" TEXT NOT NULL,
      "imageUrl" TEXT,
      "videoUrl" TEXT,
      "circleSlug" TEXT,
      "visibility" TEXT NOT NULL DEFAULT 'public',
      "moderationStatus" TEXT NOT NULL DEFAULT 'pending',
      "moderationNotes" TEXT,
      "commentsCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ConnectPost_authorId_createdAt_idx" ON "ConnectPost"("authorId", "createdAt");
    CREATE INDEX IF NOT EXISTS "ConnectPost_visibility_moderationStatus_createdAt_idx" ON "ConnectPost"("visibility", "moderationStatus", "createdAt");
  ` },
  { name: 'ConnectReaction', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectReaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "postId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ConnectReaction_postId_userId_type_key" ON "ConnectReaction"("postId", "userId", "type");
    CREATE INDEX IF NOT EXISTS "ConnectReaction_postId_idx" ON "ConnectReaction"("postId");
  ` },
  { name: 'ConnectConversation', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectConversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "user1Id" TEXT NOT NULL,
      "user2Id" TEXT NOT NULL,
      "origin" TEXT NOT NULL DEFAULT 'connect',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ConnectConversation_user1Id_user2Id_key" ON "ConnectConversation"("user1Id", "user2Id");
    CREATE INDEX IF NOT EXISTS "ConnectConversation_user1Id_idx" ON "ConnectConversation"("user1Id");
    CREATE INDEX IF NOT EXISTS "ConnectConversation_user2Id_idx" ON "ConnectConversation"("user2Id");
  ` },
  { name: 'ConnectMessage', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "text" TEXT NOT NULL,
      "imageUrl" TEXT,
      "audioUrl" TEXT,
      "readAt" TIMESTAMP(3),
      "moderationStatus" TEXT NOT NULL DEFAULT 'approved',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ConnectMessage_conversationId_createdAt_idx" ON "ConnectMessage"("conversationId", "createdAt");
  ` },
  { name: 'ConnectReport', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectReport" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "reporterId" TEXT NOT NULL,
      "reportedId" TEXT NOT NULL,
      "contentType" TEXT,
      "contentId" TEXT,
      "reason" TEXT NOT NULL,
      "details" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "adminNotes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" TIMESTAMP(3)
    );
    CREATE INDEX IF NOT EXISTS "ConnectReport_status_createdAt_idx" ON "ConnectReport"("status", "createdAt");
  ` },
  { name: 'ConnectBlock', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectBlock" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "blockerId" TEXT NOT NULL,
      "blockedId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "ConnectBlock_blockerId_blockedId_key" ON "ConnectBlock"("blockerId", "blockedId");
  ` },
  { name: 'ConnectPremium', sql: `
    CREATE TABLE IF NOT EXISTS "ConnectPremium" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE,
      "stripeCustomerId" TEXT,
      "stripeSubId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'none',
      "trialEndsAt" TIMESTAMP(3),
      "currentPeriodEnd" TIMESTAMP(3),
      "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  ` },

  // ── MAPLOCATION EXTENSION ──────────────────────────────────────────
  { name: 'MapLocationExt', sql: `
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "slug" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "category" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "region" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "shortDescription" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "coverImage" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "logo" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "videos" TEXT[] DEFAULT ARRAY[]::TEXT[];
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "facebook" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "social" JSONB;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "facebookPageId" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "facebookPageToken" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "autoPublishFbEvents" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "fbSyncedAt" TIMESTAMP(3);
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "ownerEmail" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "rating" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "enrichedAt" TIMESTAMP(3);
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "enrichmentConfidence" DOUBLE PRECISION;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "enrichmentSources" JSONB;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "enrichmentNotes" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "upcomingEventsHint" JSONB;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "freshnessScore" DOUBLE PRECISION;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "freshnessCheckedAt" TIMESTAMP(3);
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "phone" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "email" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "website" TEXT;
    ALTER TABLE "MapLocation" ADD COLUMN IF NOT EXISTS "bookingUrl" TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS "MapLocation_slug_key" ON "MapLocation"("slug");
    CREATE INDEX IF NOT EXISTS "MapLocation_category_idx" ON "MapLocation"("category");
    CREATE INDEX IF NOT EXISTS "MapLocation_rating_published_idx" ON "MapLocation"("rating", "published");
    CREATE INDEX IF NOT EXISTS "MapLocation_featured_published_idx" ON "MapLocation"("featured", "published");
    CREATE INDEX IF NOT EXISTS "MapLocation_lat_lng_idx" ON "MapLocation"("lat", "lng");
    CREATE INDEX IF NOT EXISTS "MapLocation_enrichedAt_idx" ON "MapLocation"("enrichedAt");
  ` },
  { name: 'LocationCoupon', sql: `
    CREATE TABLE IF NOT EXISTS "LocationCoupon" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "locationId" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "discountKind" TEXT NOT NULL DEFAULT 'percent',
      "discountValue" INTEGER NOT NULL DEFAULT 0,
      "maxUses" INTEGER,
      "uses" INTEGER NOT NULL DEFAULT 0,
      "validFrom" TIMESTAMP(3),
      "validUntil" TIMESTAMP(3),
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "LocationCoupon_locationId_active_idx" ON "LocationCoupon"("locationId", "active");
  ` },
  { name: 'LocationEventParticipation', sql: `
    CREATE TABLE IF NOT EXISTS "LocationEventParticipation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "locationId" TEXT NOT NULL,
      "occasionId" TEXT NOT NULL,
      "startsAt" TIMESTAMP(3) NOT NULL,
      "endsAt" TIMESTAMP(3),
      "livestreamUrl" TEXT,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "LocationEventParticipation_locationId_occasionId_key" ON "LocationEventParticipation"("locationId", "occasionId");
    CREATE INDEX IF NOT EXISTS "LocationEventParticipation_startsAt_idx" ON "LocationEventParticipation"("startsAt");
  ` },

  // ── CALENDRIER (NEUTRE) ────────────────────────────────────────────
  { name: 'CalendarOccasion', sql: `
    CREATE TABLE IF NOT EXISTS "CalendarOccasion" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "dateMode" TEXT NOT NULL DEFAULT 'fixed',
      "computeRule" TEXT,
      "startsAt" TIMESTAMP(3) NOT NULL,
      "endsAt" TIMESTAMP(3),
      "duration" INTEGER NOT NULL DEFAULT 1,
      "description" TEXT,
      "audienceNote" TEXT,
      "emoji" TEXT,
      "color" TEXT,
      "externalUrl" TEXT,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "CalendarOccasion_category_startsAt_idx" ON "CalendarOccasion"("category", "startsAt");
    CREATE INDEX IF NOT EXISTS "CalendarOccasion_startsAt_published_idx" ON "CalendarOccasion"("startsAt", "published");
  ` },

  // ── CERCLES / GESTES COMMUNAUTAIRES ────────────────────────────────
  { name: 'CircleMessage', sql: `
    CREATE TABLE IF NOT EXISTS "CircleMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "circle" TEXT NOT NULL,
      "authorName" TEXT,
      "authorId" TEXT,
      "message" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "CircleMessage_circle_createdAt_idx" ON "CircleMessage"("circle", "createdAt");
  ` },
  { name: 'CommunityGesture', sql: `
    CREATE TABLE IF NOT EXISTS "CommunityGesture" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userHash" TEXT,
      "intention" TEXT,
      "category" TEXT,
      "lat" DOUBLE PRECISION NOT NULL,
      "lng" DOUBLE PRECISION NOT NULL,
      "city" TEXT,
      "country" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "CommunityGesture_expiresAt_status_idx" ON "CommunityGesture"("expiresAt", "status");
    CREATE INDEX IF NOT EXISTS "CommunityGesture_lat_lng_idx" ON "CommunityGesture"("lat", "lng");
  ` },
  { name: 'CommunityIntention', sql: `
    CREATE TABLE IF NOT EXISTS "CommunityIntention" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorHash" TEXT,
      "authorName" TEXT,
      "category" TEXT,
      "circle" TEXT,
      "text" TEXT NOT NULL,
      "supportCount" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'approved',
      "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "CommunityIntention_circle_createdAt_idx" ON "CommunityIntention"("circle", "createdAt");
    CREATE INDEX IF NOT EXISTS "CommunityIntention_status_createdAt_idx" ON "CommunityIntention"("status", "createdAt");
  ` },
  { name: 'CirclePresence', sql: `
    CREATE TABLE IF NOT EXISTS "CirclePresence" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionToken" TEXT NOT NULL UNIQUE,
      "circle" TEXT NOT NULL,
      "category" TEXT,
      "city" TEXT,
      "country" TEXT,
      "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "CirclePresence_circle_lastSeenAt_idx" ON "CirclePresence"("circle", "lastSeenAt");
  ` },
  { name: 'CollectiveJourney', sql: `
    CREATE TABLE IF NOT EXISTS "CollectiveJourney" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "totalUnits" INTEGER NOT NULL,
      "unit" TEXT NOT NULL DEFAULT 'step',
      "description" TEXT,
      "emoji" TEXT,
      "color" TEXT,
      "startLabel" TEXT,
      "endLabel" TEXT,
      "coverImage" TEXT,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "CollectiveJourney_status_idx" ON "CollectiveJourney"("status");
  ` },
  { name: 'JourneyStep', sql: `
    CREATE TABLE IF NOT EXISTS "JourneyStep" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "journeyId" TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      "name" TEXT NOT NULL,
      "unitsFromStart" INTEGER NOT NULL,
      "description" TEXT,
      "quote" TEXT,
      "imageUrl" TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "JourneyStep_journeyId_order_key" ON "JourneyStep"("journeyId", "order");
    CREATE INDEX IF NOT EXISTS "JourneyStep_journeyId_unitsFromStart_idx" ON "JourneyStep"("journeyId", "unitsFromStart");
  ` },
  { name: 'JourneyContribution', sql: `
    CREATE TABLE IF NOT EXISTS "JourneyContribution" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "journeyId" TEXT NOT NULL,
      "userHash" TEXT,
      "source" TEXT NOT NULL,
      "units" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "JourneyContribution_journeyId_createdAt_idx" ON "JourneyContribution"("journeyId", "createdAt");
  ` },
  { name: 'DocumentAnnotation', sql: `
    CREATE TABLE IF NOT EXISTS "DocumentAnnotation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "document" TEXT NOT NULL,
      "reference" TEXT NOT NULL,
      "passageText" TEXT,
      "annotation" TEXT NOT NULL,
      "authorName" TEXT,
      "authorRole" TEXT,
      "category" TEXT,
      "perspective" TEXT NOT NULL DEFAULT 'COMMUNITY',
      "upvotes" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'approved',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "DocumentAnnotation_document_reference_idx" ON "DocumentAnnotation"("document", "reference");
    CREATE INDEX IF NOT EXISTS "DocumentAnnotation_category_status_createdAt_idx" ON "DocumentAnnotation"("category", "status", "createdAt");
  ` },
  { name: 'Professional', sql: `
    CREATE TABLE IF NOT EXISTS "Professional" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL DEFAULT 'OTHER',
      "customCategory" TEXT,
      "role" TEXT,
      "affiliations" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "city" TEXT,
      "country" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "website" TEXT,
      "bio" TEXT,
      "servicesOffered" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "verified" BOOLEAN NOT NULL DEFAULT false,
      "published" BOOLEAN NOT NULL DEFAULT true,
      "avatarUrl" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Professional_category_country_city_idx" ON "Professional"("category", "country", "city");
  ` },
  { name: 'ProfessionalBooking', sql: `
    CREATE TABLE IF NOT EXISTS "ProfessionalBooking" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "professionalId" TEXT NOT NULL,
      "requesterName" TEXT NOT NULL,
      "requesterEmail" TEXT NOT NULL,
      "serviceType" TEXT NOT NULL,
      "proposedDate" TIMESTAMP(3),
      "city" TEXT,
      "message" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ProfessionalBooking_professionalId_status_idx" ON "ProfessionalBooking"("professionalId", "status");
  ` },

  // ── PHOTOS UGC ─────────────────────────────────────────────────────
  { name: 'UserPhoto', sql: `
    CREATE TABLE IF NOT EXISTS "UserPhoto" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "storageKey" TEXT NOT NULL,
      "thumbnailKey" TEXT,
      "caption" TEXT,
      "authorName" TEXT,
      "authorEmail" TEXT,
      "locale" TEXT NOT NULL DEFAULT 'fr',
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "rejectionReason" TEXT,
      "latitude" DOUBLE PRECISION,
      "longitude" DOUBLE PRECISION,
      "city" TEXT,
      "country" TEXT,
      "placeName" TEXT,
      "placeCategory" TEXT,
      "uploadedById" TEXT,
      "reviewedById" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "aiModerationScore" DOUBLE PRECISION,
      "aiModerationFlags" JSONB,
      "likes" INTEGER NOT NULL DEFAULT 0,
      "source" TEXT NOT NULL DEFAULT 'WEB',
      "ipHash" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "UserPhoto_status_createdAt_idx" ON "UserPhoto"("status", "createdAt");
    CREATE INDEX IF NOT EXISTS "UserPhoto_country_idx" ON "UserPhoto"("country");
    CREATE INDEX IF NOT EXISTS "UserPhoto_placeCategory_idx" ON "UserPhoto"("placeCategory");
  ` },

  // ── IA / RAG / AVATAR ──────────────────────────────────────────────
  { name: 'KnowledgeDoc', sql: `
    CREATE TABLE IF NOT EXISTS "KnowledgeDoc" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "source" TEXT,
      "sourceType" TEXT NOT NULL DEFAULT 'text',
      "author" TEXT,
      "content" TEXT NOT NULL,
      "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "locale" TEXT NOT NULL DEFAULT 'fr',
      "enabled" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "KnowledgeDoc_enabled_locale_idx" ON "KnowledgeDoc"("enabled", "locale");
  ` },
  { name: 'KnowledgeChunk', sql: `
    CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "docId" TEXT NOT NULL,
      "position" INTEGER NOT NULL,
      "text" TEXT NOT NULL,
      "embedding" JSONB NOT NULL,
      "tokens" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "KnowledgeChunk_docId_idx" ON "KnowledgeChunk"("docId");
  ` },
  { name: 'UnansweredQuery', sql: `
    CREATE TABLE IF NOT EXISTS "UnansweredQuery" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "question" TEXT NOT NULL,
      "locale" TEXT NOT NULL DEFAULT 'fr',
      "topScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "adminAnswer" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "UnansweredQuery_status_createdAt_idx" ON "UnansweredQuery"("status", "createdAt");
  ` },
  { name: 'SiteJournal', sql: `
    CREATE TABLE IF NOT EXISTS "SiteJournal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "date" TIMESTAMP(3) NOT NULL UNIQUE,
      "mood" TEXT NOT NULL,
      "moodScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
      "body" TEXT NOT NULL,
      "bodyShort" TEXT,
      "stats" JSONB,
      "generatedBy" TEXT NOT NULL DEFAULT 'gemini',
      "approved" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "SiteJournal_date_idx" ON "SiteJournal"("date");
    CREATE INDEX IF NOT EXISTS "SiteJournal_mood_idx" ON "SiteJournal"("mood");
  ` },
  { name: 'Avatar', sql: `
    CREATE TABLE IF NOT EXISTS "Avatar" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "persona" TEXT,
      "provider" TEXT NOT NULL,
      "externalId" TEXT NOT NULL,
      "thumbnailUrl" TEXT,
      "previewVideoUrl" TEXT,
      "status" TEXT NOT NULL DEFAULT 'training',
      "trainingError" TEXT,
      "voiceId" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "Avatar_persona_status_idx" ON "Avatar"("persona", "status");
  ` },
  { name: 'AvatarGeneration', sql: `
    CREATE TABLE IF NOT EXISTS "AvatarGeneration" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "avatarId" TEXT NOT NULL,
      "scriptText" TEXT NOT NULL,
      "videoUrl" TEXT,
      "durationSec" INTEGER,
      "outfit" TEXT,
      "setting" TEXT,
      "language" TEXT NOT NULL DEFAULT 'fr',
      "externalJobId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "errorMessage" TEXT,
      "costCents" INTEGER,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "finishedAt" TIMESTAMP(3)
    );
    CREATE INDEX IF NOT EXISTS "AvatarGeneration_avatarId_status_idx" ON "AvatarGeneration"("avatarId", "status");
    CREATE INDEX IF NOT EXISTS "AvatarGeneration_status_createdAt_idx" ON "AvatarGeneration"("status", "createdAt");
  ` },
  { name: 'LiveStream', sql: `
    CREATE TABLE IF NOT EXISTS "LiveStream" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "slug" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "city" TEXT,
      "country" TEXT,
      "category" TEXT,
      "emoji" TEXT,
      "description" TEXT,
      "source" TEXT NOT NULL DEFAULT 'YOUTUBE',
      "channelId" TEXT,
      "videoId" TEXT,
      "externalUrl" TEXT,
      "schedule" TEXT,
      "featured" BOOLEAN NOT NULL DEFAULT false,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "lastVerifiedAt" TIMESTAMP(3),
      "lastLive" BOOLEAN NOT NULL DEFAULT false,
      "lastVideoId" TEXT,
      "discoveredBy" TEXT NOT NULL DEFAULT 'manual',
      "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "liveCount" INTEGER NOT NULL DEFAULT 0,
      "failCount" INTEGER NOT NULL DEFAULT 0,
      "reportedDeadAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "LiveStream_active_category_idx" ON "LiveStream"("active", "category");
    CREATE INDEX IF NOT EXISTS "LiveStream_lastVerifiedAt_idx" ON "LiveStream"("lastVerifiedAt");
  ` },

  // ── PLATEFORME / DEVOPS ────────────────────────────────────────────
  { name: 'AdminInvitation', sql: `
    CREATE TABLE IF NOT EXISTS "AdminInvitation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "email" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'ADMIN',
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "usedByIp" TEXT,
      "usedByUa" TEXT,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AdminInvitation_email_usedAt_idx" ON "AdminInvitation"("email", "usedAt");
    CREATE INDEX IF NOT EXISTS "AdminInvitation_expiresAt_idx" ON "AdminInvitation"("expiresAt");
  ` },
  { name: 'ClaudeSession', sql: `
    CREATE TABLE IF NOT EXISTS "ClaudeSession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "prompt" TEXT NOT NULL,
      "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5',
      "workingDir" TEXT,
      "permissionMode" TEXT NOT NULL DEFAULT 'bypassPermissions',
      "status" TEXT NOT NULL DEFAULT 'running',
      "durationMs" INTEGER,
      "totalInputTokens" INTEGER,
      "totalOutputTokens" INTEGER,
      "errorMessage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "finishedAt" TIMESTAMP(3)
    );
    CREATE INDEX IF NOT EXISTS "ClaudeSession_userId_createdAt_idx" ON "ClaudeSession"("userId", "createdAt");
    CREATE INDEX IF NOT EXISTS "ClaudeSession_status_idx" ON "ClaudeSession"("status");
  ` },
  { name: 'ClaudeMessage', sql: `
    CREATE TABLE IF NOT EXISTS "ClaudeMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "index" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ClaudeMessage_sessionId_index_idx" ON "ClaudeMessage"("sessionId", "index");
  ` },
  { name: 'ClaudeApproval', sql: `
    CREATE TABLE IF NOT EXISTS "ClaudeApproval" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT,
      "action" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "context" JSONB,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "telegramMessageId" TEXT,
      "decidedBy" TEXT,
      "decidedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ClaudeApproval_status_expiresAt_idx" ON "ClaudeApproval"("status", "expiresAt");
    CREATE INDEX IF NOT EXISTS "ClaudeApproval_sessionId_idx" ON "ClaudeApproval"("sessionId");
  ` },
  { name: 'EmailLog', sql: `
    CREATE TABLE IF NOT EXISTS "EmailLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "to" TEXT NOT NULL,
      "fromAddr" TEXT NOT NULL,
      "subject" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'transactional',
      "provider" TEXT NOT NULL DEFAULT 'resend',
      "status" TEXT NOT NULL DEFAULT 'pending',
      "providerId" TEXT,
      "errorMessage" TEXT,
      "campaignId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
    CREATE INDEX IF NOT EXISTS "EmailLog_to_createdAt_idx" ON "EmailLog"("to", "createdAt");
    CREATE INDEX IF NOT EXISTS "EmailLog_type_status_createdAt_idx" ON "EmailLog"("type", "status", "createdAt");
  ` },
  { name: 'TelegramMessage', sql: `
    CREATE TABLE IF NOT EXISTS "TelegramMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "direction" TEXT NOT NULL,
      "chatId" TEXT NOT NULL,
      "userId" TEXT,
      "username" TEXT,
      "firstName" TEXT,
      "text" TEXT,
      "command" TEXT,
      "aiInterpreted" BOOLEAN NOT NULL DEFAULT false,
      "imageUrl" TEXT,
      "callbackData" TEXT,
      "status" TEXT NOT NULL DEFAULT 'delivered',
      "errorMessage" TEXT,
      "raw" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "TelegramMessage_chatId_createdAt_idx" ON "TelegramMessage"("chatId", "createdAt");
    CREATE INDEX IF NOT EXISTS "TelegramMessage_direction_createdAt_idx" ON "TelegramMessage"("direction", "createdAt");
  ` },
  { name: 'AuditLog', sql: `
    CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT,
      "action" TEXT NOT NULL,
      "target" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
    CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON "AuditLog"("userId");
  ` },
  { name: 'PageView', sql: `
    CREATE TABLE IF NOT EXISTS "PageView" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "path" TEXT NOT NULL,
      "visitorHash" TEXT NOT NULL,
      "referrer" TEXT,
      "country" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE UNIQUE INDEX IF NOT EXISTS "PageView_path_visitorHash_createdAt_key" ON "PageView"("path", "visitorHash", "createdAt");
    CREATE INDEX IF NOT EXISTS "PageView_path_createdAt_idx" ON "PageView"("path", "createdAt");
    CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt");
  ` },
  { name: 'ScheduledPost', sql: `
    CREATE TABLE IF NOT EXISTS "ScheduledPost" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT,
      "content" TEXT NOT NULL,
      "mediaKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "scheduledAt" TIMESTAMP(3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "publishedAt" TIMESTAMP(3),
      "results" JSONB,
      "createdById" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "ScheduledPost_scheduledAt_status_idx" ON "ScheduledPost"("scheduledAt", "status");
  ` },

  // ── SUBMISSIONS / PEER HELP ────────────────────────────────────────
  { name: 'PeerHelp', sql: `
    CREATE TABLE IF NOT EXISTS "PeerHelp" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "authorName" TEXT,
      "authorEmail" TEXT,
      "country" TEXT,
      "topic" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "urgent" BOOLEAN NOT NULL DEFAULT false,
      "status" TEXT NOT NULL DEFAULT 'active',
      "supportCount" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "PeerHelp_status_createdAt_idx" ON "PeerHelp"("status", "createdAt");
    CREATE INDEX IF NOT EXISTS "PeerHelp_topic_status_idx" ON "PeerHelp"("topic", "status");
  ` },
  { name: 'PeerHelpResponse', sql: `
    CREATE TABLE IF NOT EXISTS "PeerHelpResponse" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "peerHelpId" TEXT NOT NULL,
      "authorName" TEXT,
      "message" TEXT NOT NULL,
      "approved" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "PeerHelpResponse_peerHelpId_approved_idx" ON "PeerHelpResponse"("peerHelpId", "approved");
  ` },

  // ── THEME EXTENSION (étendu pour auto-activation + holiday + music) ─
  { name: 'ThemeExt', sql: `
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'aesthetic';
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "description" TEXT;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "colors" JSONB;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "decorations" JSONB;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "customCss" TEXT;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "musicUrl" TEXT;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "musicVolume" DOUBLE PRECISION DEFAULT 0.3;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "mood" TEXT;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "autoActivate" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "autoStartMonth" INTEGER;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "autoStartDay" INTEGER;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "autoEndMonth" INTEGER;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "autoEndDay" INTEGER;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "daysBefore" INTEGER NOT NULL DEFAULT 7;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "durationDays" INTEGER NOT NULL DEFAULT 7;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "holidaySlug" TEXT;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "geographicScope" TEXT;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Theme" ADD COLUMN IF NOT EXISTS "preview" TEXT;
    CREATE INDEX IF NOT EXISTS "Theme_autoActivate_idx" ON "Theme"("autoActivate");
    CREATE INDEX IF NOT EXISTS "Theme_category_idx" ON "Theme"("category");
  ` },
];

/**
 * Crée toutes les tables tenant (idempotent). Retourne un log par table.
 */
export async function ensureTenantTables(db: any): Promise<{ name: string; ok: boolean; detail?: string }[]> {
  const log: { name: string; ok: boolean; detail?: string }[] = [];
  for (const t of TENANT_TABLES) {
    try {
      for (const stmt of t.sql.split(';').map((s) => s.trim()).filter(Boolean)) {
        await db.$executeRawUnsafe(stmt);
      }
      log.push({ name: t.name, ok: true });
    } catch (e: any) {
      log.push({ name: t.name, ok: false, detail: e?.message?.slice(0, 200) });
    }
  }
  return log;
}
