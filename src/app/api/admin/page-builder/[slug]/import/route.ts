import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/admin/page-builder/[slug]/import
 * Body: { locale?: 'fr', mode?: 'replace' | 'append', dryRun?: boolean }
 *
 * Fetch la page live `/<locale>/<slug>` rendue par Next, parse son HTML
 * pour extraire le contenu principal (h1/h2/h3/p/img/iframe/sections),
 * convertit en blocs PageBlock et les sauvegarde.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const locale = (body.locale as string) || 'fr';
  const mode = (body.mode as string) || 'replace';
  const dryRun = body.dryRun === true;

  // Détermine l'URL de la page live (essaye sans locale d'abord, puis avec)
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const candidates = [
    `${proto}://${host}/${locale}/${slug}`,
    `${proto}://${host}/${slug}`
  ];

  let html: string | null = null;
  let usedUrl: string | null = null;
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'GLD-PageBuilder-Import/1.0', 'Accept': 'text/html' },
        cache: 'no-store',
        redirect: 'follow'
      });
      if (r.ok) {
        html = await r.text();
        usedUrl = url;
        break;
      }
    } catch {}
  }
  if (!html) {
    return NextResponse.json({ error: 'fetch-failed', tried: candidates }, { status: 502 });
  }

  // Parse HTML → extract main content
  const blocks = htmlToBlocks(html);

  if (dryRun) {
    return NextResponse.json({ ok: true, sourceUrl: usedUrl, blocksPreview: blocks });
  }

  // Sauvegarde en DB
  if (mode === 'replace') {
    await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: slug } });
  }
  const existing = await (prisma as any).pageBlock.count({ where: { pageSlug: slug } });
  let created = 0;
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
    created++;
  }

  return NextResponse.json({ ok: true, sourceUrl: usedUrl, mode, blocksCount: created });
}

interface ExtractedBlock {
  type: string;
  data: any;
  width: string;
  effect?: string | null;
  effectDelay?: number | null;
}

/**
 * Très basique parser HTML → blocs. Cherche le main contenu de la page
 * (le <main>) et identifie hero, headings, paragraphs, images, embeds.
 */
function htmlToBlocks(html: string): ExtractedBlock[] {
  const blocks: ExtractedBlock[] = [];

  // Extraction de <main>...</main>
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = mainMatch ? mainMatch[1] : html;

  // Nettoyage : retire script/style/comments
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 1. Cherche le PREMIER h1 → block hero
  const h1Match = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const title = stripTags(h1Match[1]).trim();
    // Cherche le 1er <p> qui suit le h1
    const afterH1 = body.slice(body.indexOf(h1Match[0]) + h1Match[0].length);
    const subMatch = afterH1.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const subtitle = subMatch ? stripTags(subMatch[1]).trim() : '';
    blocks.push({
      type: 'hero',
      width: 'full',
      data: { title, subtitle, cta: { label: '', href: '' }, bgImage: '' },
      effect: 'fade-up',
      effectDelay: 0
    });
  }

  // 2. Itère ensuite sur les sections principales du body (top-level children)
  // On split sur les balises de structure pour trouver des blocs simples
  let workBody = body;
  if (h1Match) {
    workBody = body.slice(body.indexOf(h1Match[0]) + h1Match[0].length);
    // Skip le 1er <p> déjà mis comme subtitle
    workBody = workBody.replace(/<p\b[^>]*>([\s\S]*?)<\/p>/i, '');
  }

  // Heuristique : on splitte par sections/articles/h2 pour produire des blocs
  const sections = splitBySections(workBody);
  let position = 0;
  for (const section of sections) {
    const blocksFromSection = extractBlocksFromHtml(section, position);
    blocks.push(...blocksFromSection);
    position += blocksFromSection.length;
  }

  // Si aucun bloc trouvé, on met un bloc texte avec tout le contenu
  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'hero')) {
    const cleaned = cleanContentHtml(body);
    if (cleaned.trim().length > 50) {
      blocks.push({
        type: 'text',
        width: 'full',
        data: { html: cleaned },
        effect: 'fade-up',
        effectDelay: blocks.length * 100
      });
    }
  }

  return blocks;
}

function splitBySections(html: string): string[] {
  // Split top-level par <section>, <article>, ou par <h2>
  const out: string[] = [];

  // Strategy 1: si on trouve des <section> ou <article>, on split dessus
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

  // Strategy 2: split sur <h2>
  const parts = html.split(/(?=<h2\b)/i).filter((p) => p.trim());
  if (parts.length > 1) return parts;

  return [html];
}

function extractBlocksFromHtml(html: string, baseIdx: number): ExtractedBlock[] {
  const out: ExtractedBlock[] = [];

  // Cherche images significatives (>100px probablement, ou avec alt)
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

  // Cherche iframes (vidéos YouTube, embeds)
  const iframes: string[] = [];
  const iframeRegex = /<iframe\b[^>]*\bsrc=["']([^"']+)["'][^>]*>[\s\S]*?<\/iframe>/gi;
  while ((m = iframeRegex.exec(html)) !== null) iframes.push(m[1]);

  // Texte principal nettoyé
  const cleaned = cleanContentHtml(html);
  const textChars = stripTags(cleaned).trim().length;

  if (textChars > 30) {
    out.push({
      type: 'text',
      width: 'full',
      data: { html: cleaned },
      effect: 'fade-up',
      effectDelay: baseIdx * 80
    });
  }

  for (const img of images.slice(0, 4)) {
    out.push({
      type: 'image',
      width: '1/2',
      data: { src: img.src, alt: img.alt },
      effect: 'zoom-in',
      effectDelay: (baseIdx + out.length) * 80
    });
  }

  for (const ifr of iframes.slice(0, 2)) {
    out.push({
      type: 'video',
      width: 'full',
      data: { src: ifr },
      effect: 'fade-in',
      effectDelay: (baseIdx + out.length) * 80
    });
  }

  return out;
}

/** Nettoyage : garde structure h2/h3/p/ul/ol/li/strong/em/a, retire div/span/className/etc. */
function cleanContentHtml(html: string): string {
  return html
    // Retire les attributs sauf href/src/alt
    .replace(/<(\/?)([a-zA-Z0-9]+)([^>]*?)>/g, (_match, slash, tag, attrs) => {
      const tagLower = tag.toLowerCase();
      // Ne garde que les tags utiles
      const allowed = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br', 'hr', 'blockquote', 'code', 'pre', 'mark'];
      if (!allowed.includes(tagLower)) {
        return ''; // strip
      }
      let kept = '';
      if (tagLower === 'a') {
        const hrefMatch = (attrs as string).match(/href=["']([^"']+)["']/i);
        if (hrefMatch) kept = ` href="${hrefMatch[1]}"`;
      }
      return `<${slash}${tagLower}${kept}>`;
    })
    // Retire les whitespaces multiples
    .replace(/\s+/g, ' ')
    // Retire les paragraphes vides
    .replace(/<p>\s*<\/p>/g, '')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
