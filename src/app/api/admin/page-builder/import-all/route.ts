import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * POST /api/admin/page-builder/import-all
 * Body: { onlyCodeOnly?: true, mode?: 'replace'|'append', locale?: 'fr', concurrency?: 3 }
 *
 * Boucle sur toutes les pages discovered et importe le contenu live de
 * chaque page en blocs PageBlock. Renvoie un summary avec le détail.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const onlyCodeOnly = body.onlyCodeOnly !== false;
  const mode = (body.mode as string) || 'replace';
  const locale = (body.locale as string) || 'fr';
  const concurrency = Math.min(5, Math.max(1, body.concurrency || 3));

  // 1. Découvre les pages
  const cwd = process.cwd();
  const root = path.join(cwd, 'src', 'app', '[locale]');
  const found: string[] = [];
  async function walk(dir: string, prefix: string, depth: number) {
    if (depth > 3) return;
    let entries: any[] = [];
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    if (entries.some((e) => e.isFile() && e.name === 'page.tsx') && prefix) found.push(prefix);
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_')) {
        await walk(path.join(dir, e.name), prefix ? `${prefix}/${e.name}` : e.name, depth + 1);
      }
    }
  }
  await walk(root, '', 0).catch(() => {});

  // 2. Filtre les slugs : si onlyCodeOnly, exclut ceux qui ont déjà des blocs
  let slugs = found;
  if (onlyCodeOnly) {
    const existingBlocks = await (prisma as any).pageBlock.groupBy({
      by: ['pageSlug'],
      _count: { _all: true }
    }).catch(() => []);
    const slugsWithBlocks = new Set(existingBlocks.map((b: any) => b.pageSlug));
    slugs = found.filter((s) => !slugsWithBlocks.has(s));
  }

  // Pages problématiques à exclure (admin, login, etc)
  const exclude = ['admin', 'admin/login', 'connect', 'mon-espace'];
  slugs = slugs.filter((s) => !exclude.some((e) => s.startsWith(e)));

  // 3. Construit l'URL de base
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const base = `${proto}://${host}`;

  const results: { slug: string; ok: boolean; blocks: number; error?: string }[] = [];

  // Process avec une concurrency limitée
  async function processSlug(slug: string) {
    try {
      const url = `${base}/${locale}/${slug}`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'GLD-PageBuilder-ImportAll/1.0', 'Accept': 'text/html' },
        cache: 'no-store',
        redirect: 'follow'
      });
      if (!r.ok) {
        results.push({ slug, ok: false, blocks: 0, error: `HTTP ${r.status}` });
        return;
      }
      const html = await r.text();
      const blocks = htmlToBlocks(html);
      if (blocks.length === 0) {
        results.push({ slug, ok: false, blocks: 0, error: 'no-content' });
        return;
      }
      if (mode === 'replace') {
        await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: slug } });
      }
      const existing = await (prisma as any).pageBlock.count({ where: { pageSlug: slug } });
      for (let i = 0; i < blocks.length; i++) {
        await (prisma as any).pageBlock.create({
          data: {
            pageSlug: slug,
            position: existing + i,
            width: blocks[i].width,
            height: 'auto',
            type: blocks[i].type,
            data: blocks[i].data,
            effect: blocks[i].effect || null,
            effectDelay: blocks[i].effectDelay ?? null,
            visible: true
          }
        });
      }
      results.push({ slug, ok: true, blocks: blocks.length });
    } catch (e: any) {
      results.push({ slug, ok: false, blocks: 0, error: e?.message?.slice(0, 200) || 'unknown' });
    }
  }

  // Process par batches de `concurrency`
  for (let i = 0; i < slugs.length; i += concurrency) {
    const batch = slugs.slice(i, i + concurrency);
    await Promise.all(batch.map(processSlug));
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total: slugs.length,
      success: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      totalBlocks: results.reduce((sum, r) => sum + r.blocks, 0)
    },
    results
  });
}

// ─── HTML → blocks (copy minimaliste depuis import/route.ts) ──

interface ExtractedBlock { type: string; data: any; width: string; effect?: string | null; effectDelay?: number | null; }

function htmlToBlocks(html: string): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = mainMatch ? mainMatch[1] : html;
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const h1Match = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const title = stripTags(h1Match[1]).trim();
    const afterH1 = body.slice(body.indexOf(h1Match[0]) + h1Match[0].length);
    const subMatch = afterH1.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const subtitle = subMatch ? stripTags(subMatch[1]).trim() : '';
    blocks.push({ type: 'hero', width: 'full', data: { title, subtitle, cta: { label: '', href: '' }, bgImage: '' }, effect: 'fade-up', effectDelay: 0 });
  }
  let workBody = body;
  if (h1Match) {
    workBody = body.slice(body.indexOf(h1Match[0]) + h1Match[0].length).replace(/<p\b[^>]*>([\s\S]*?)<\/p>/i, '');
  }
  const sections = splitBySections(workBody);
  let position = 0;
  for (const section of sections) {
    const fromSection = extractBlocksFromHtml(section, position);
    blocks.push(...fromSection);
    position += fromSection.length;
  }
  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'hero')) {
    const cleaned = cleanContentHtml(body);
    if (cleaned.trim().length > 50) blocks.push({ type: 'text', width: 'full', data: { html: cleaned }, effect: 'fade-up', effectDelay: blocks.length * 100 });
  }
  return blocks;
}

function splitBySections(html: string): string[] {
  const out: string[] = [];
  const sectionRegex = /<(section|article)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let foundSections = false;
  while ((m = sectionRegex.exec(html)) !== null) {
    foundSections = true;
    if (m.index > lastIdx) {
      const before = html.slice(lastIdx, m.index).trim();
      if (before) out.push(before);
    }
    out.push(m[2]);
    lastIdx = m.index + m[0].length;
  }
  if (foundSections) {
    if (lastIdx < html.length) {
      const tail = html.slice(lastIdx).trim();
      if (tail) out.push(tail);
    }
    return out;
  }
  const parts = html.split(/(?=<h2\b)/i).filter((p) => p.trim());
  if (parts.length > 1) return parts;
  return [html];
}

function extractBlocksFromHtml(html: string, baseIdx: number): ExtractedBlock[] {
  const out: ExtractedBlock[] = [];
  const imgRegex = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const images: { src: string; alt: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = imgRegex.exec(html)) !== null) {
    const src = m[1];
    const altMatch = m[0].match(/alt=["']([^"']*)["']/i);
    if (!src.startsWith('data:') && !src.includes('logo') && !src.includes('icon')) {
      images.push({ src, alt: altMatch?.[1] || '' });
    }
  }
  const iframes: string[] = [];
  const iframeRegex = /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>/gi;
  while ((m = iframeRegex.exec(html)) !== null) iframes.push(m[1]);
  const cleaned = cleanContentHtml(html);
  const textChars = stripTags(cleaned).trim().length;
  if (textChars > 30) out.push({ type: 'text', width: 'full', data: { html: cleaned }, effect: 'fade-up', effectDelay: baseIdx * 80 });
  for (const img of images.slice(0, 4)) out.push({ type: 'image', width: '1/2', data: { src: img.src, alt: img.alt }, effect: 'zoom-in', effectDelay: (baseIdx + out.length) * 80 });
  for (const ifr of iframes.slice(0, 2)) out.push({ type: 'video', width: 'full', data: { src: ifr }, effect: 'fade-in', effectDelay: (baseIdx + out.length) * 80 });
  return out;
}

function cleanContentHtml(html: string): string {
  return html.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*?)>/g, (_match, slash, tag, attrs) => {
    const tagLower = tag.toLowerCase();
    const allowed = ['h1','h2','h3','h4','p','ul','ol','li','strong','em','b','i','a','br','hr','blockquote','code','pre','mark'];
    if (!allowed.includes(tagLower)) return '';
    let kept = '';
    if (tagLower === 'a') {
      const hrefMatch = (attrs as string).match(/href=["']([^"']+)["']/i);
      if (hrefMatch) kept = ` href="${hrefMatch[1]}"`;
    }
    return `<${slash}${tagLower}${kept}>`;
  }).replace(/\s+/g, ' ').replace(/<p>\s*<\/p>/g, '').trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
