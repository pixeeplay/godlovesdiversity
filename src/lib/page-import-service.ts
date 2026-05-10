/**
 * Page Import Service — utilisé par l'API import + import-all + cron agent.
 *
 * Centralise la logique : fetch HTML → parse → htmlToBlocks → upsert PageBlock.
 *
 * Bonus : paramètre `effectIntensity` (none|subtle|medium|wow) pour adapter
 * les effets appliqués automatiquement.
 *   - none   : aucun effet (perf max, simple)
 *   - subtle : juste fade-up + zoom-in léger (recommandé pour refonte)
 *   - medium : effets variés mais sobres
 *   - wow    : effets spectaculaires (parallax, glitch, etc)
 */
import { prisma } from './prisma';

export type EffectIntensity = 'none' | 'subtle' | 'medium' | 'wow';
export type ImportMode = 'replace' | 'append' | 'merge';

export interface ImportOptions {
  slug: string;
  baseUrl: string;
  locale?: string;
  mode?: ImportMode;
  effectIntensity?: EffectIntensity;
  dryRun?: boolean;
}

export interface ImportResult {
  ok: boolean;
  slug: string;
  sourceUrl?: string;
  blocksCount: number;
  blocks?: any[];
  mode?: string;
  error?: string;
}

export interface ExtractedBlock {
  type: string;
  data: any;
  width: string;
  effect?: string | null;
  effectDelay?: number | null;
}

/**
 * Mapping intensity → effet pour chaque type de bloc.
 */
const EFFECT_MAP: Record<EffectIntensity, Record<string, string | null>> = {
  none: {
    hero: null, text: null, image: null, video: null, cta: null
  },
  subtle: {
    hero: 'fade-up',
    text: 'fade-up',
    image: 'fade-in',
    video: 'fade-in',
    cta: 'fade-up'
  },
  medium: {
    hero: 'fade-up',
    text: 'fade-up',
    image: 'zoom-in',
    video: 'fade-in',
    cta: 'bounce-in'
  },
  wow: {
    hero: 'wow-arrival',
    text: 'gradient-flow',
    image: 'mask-reveal',
    video: 'blur-fade',
    cta: 'tada-in'
  }
};

/**
 * Importe une page : fetch HTML live, parse, sauvegarde en blocs.
 */
export async function importPageFromLive(opts: ImportOptions): Promise<ImportResult> {
  const slug = opts.slug;
  const locale = opts.locale || 'fr';
  const mode: ImportMode = opts.mode || 'replace';
  const intensity: EffectIntensity = opts.effectIntensity || 'subtle';

  const candidates = [
    `${opts.baseUrl}/${locale}/${slug}`,
    `${opts.baseUrl}/${slug}`
  ];
  let html: string | null = null;
  let usedUrl: string | undefined;
  for (const url of candidates) {
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'GLD-PageBuilder-Import/2.0', 'Accept': 'text/html' },
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
    return { ok: false, slug, blocksCount: 0, error: 'fetch-failed' };
  }

  const blocks = htmlToBlocks(html, intensity);

  if (opts.dryRun) {
    return { ok: true, slug, sourceUrl: usedUrl, blocksCount: blocks.length, blocks, mode };
  }

  if (mode === 'replace') {
    await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: slug } });
  }
  const existing = await (prisma as any).pageBlock.count({ where: { pageSlug: slug } });
  let created = 0;
  for (let i = 0; i < blocks.length; i++) {
    try {
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
    } catch (e) {
      // skip
    }
  }
  return { ok: true, slug, sourceUrl: usedUrl, blocksCount: created, mode };
}

/**
 * Parser HTML → blocs avec gestion d'intensity.
 */
export function htmlToBlocks(html: string, intensity: EffectIntensity = 'subtle'): ExtractedBlock[] {
  const fx = EFFECT_MAP[intensity] || EFFECT_MAP.subtle;
  const blocks: ExtractedBlock[] = [];
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body = mainMatch ? mainMatch[1] : html;
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // 1. Hero du h1
  const h1Match = body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const title = stripTags(h1Match[1]).trim();
    const afterH1 = body.slice(body.indexOf(h1Match[0]) + h1Match[0].length);
    const subMatch = afterH1.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i);
    const subtitle = subMatch ? stripTags(subMatch[1]).trim() : '';
    blocks.push({
      type: 'hero',
      width: 'full',
      data: { title, subtitle, cta: { label: '', href: '' }, bgImage: '' },
      effect: fx.hero,
      effectDelay: 0
    });
  }

  let workBody = body;
  if (h1Match) {
    workBody = body.slice(body.indexOf(h1Match[0]) + h1Match[0].length).replace(/<p\b[^>]*>([\s\S]*?)<\/p>/i, '');
  }

  const sections = splitBySections(workBody);
  let position = 0;
  for (const section of sections) {
    const fromSection = extractBlocksFromHtml(section, position, fx);
    blocks.push(...fromSection);
    position += fromSection.length;
  }

  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'hero')) {
    const cleaned = cleanContentHtml(body);
    if (cleaned.trim().length > 50) {
      blocks.push({
        type: 'text',
        width: 'full',
        data: { html: cleaned },
        effect: fx.text,
        effectDelay: blocks.length * 100
      });
    }
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

function extractBlocksFromHtml(html: string, baseIdx: number, fx: Record<string, string | null>): ExtractedBlock[] {
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

  if (textChars > 30) {
    out.push({
      type: 'text',
      width: 'full',
      data: { html: cleaned },
      effect: fx.text,
      effectDelay: baseIdx * 80
    });
  }

  for (const img of images.slice(0, 4)) {
    out.push({
      type: 'image',
      width: '1/2',
      data: { src: img.src, alt: img.alt },
      effect: fx.image,
      effectDelay: (baseIdx + out.length) * 80
    });
  }

  for (const ifr of iframes.slice(0, 2)) {
    out.push({
      type: 'video',
      width: 'full',
      data: { src: ifr },
      effect: fx.video,
      effectDelay: (baseIdx + out.length) * 80
    });
  }

  return out;
}

function cleanContentHtml(html: string): string {
  return html
    .replace(/<(\/?)([a-zA-Z0-9]+)([^>]*?)>/g, (_match, slash, tag, attrs) => {
      const tagLower = tag.toLowerCase();
      const allowed = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br', 'hr', 'blockquote', 'code', 'pre', 'mark'];
      if (!allowed.includes(tagLower)) return '';
      let kept = '';
      if (tagLower === 'a') {
        const hrefMatch = (attrs as string).match(/href=["']([^"']+)["']/i);
        if (hrefMatch) kept = ` href="${hrefMatch[1]}"`;
      }
      return `<${slash}${tagLower}${kept}>`;
    })
    .replace(/\s+/g, ' ')
    .replace(/<p>\s*<\/p>/g, '')
    .trim();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}
