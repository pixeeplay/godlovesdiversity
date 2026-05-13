/**
 * markdown.ts — Renderer Markdown léger sans dépendance externe.
 *
 * Supporte :
 * - Headings H1/H2/H3
 * - Bold **text** et italic *text*
 * - Liens [text](url)
 * - Listes à puces (- ou * en début de ligne)
 * - Listes numérotées (1. , 2. , ...)
 * - Paragraphes séparés par lignes vides
 * - Code inline `code`
 * - Citations > ...
 *
 * Suffisant pour les articles SEO Gemini et la description manuelle.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function inline(text: string): string {
  return text
    // Code inline (avant les autres parsings)
    .replace(/`([^`]+)`/g, '<code class="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded text-sm">$1</code>')
    // Bold + italic combined ***
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold **text**
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
    // Italic *text*
    .replace(/(?<![*\w])\*([^*\n]+)\*(?![\w*])/g, '<em>$1</em>')
    // Underline-like __text__
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-brand-pink underline hover:text-pink-300 transition">$1</a>');
}

export function markdownToHtml(md: string): string {
  if (!md) return '';
  // Escape HTML d'abord (on perd la possibilité d'avoir du HTML inline mais c'est sûr)
  const escaped = escapeHtml(md);
  const lines = escaped.split('\n');
  const out: string[] = [];

  let inUl = false;
  let inOl = false;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const content = inline(paragraphBuffer.join(' ').trim());
      if (content) out.push(`<p class="mb-4 leading-relaxed">${content}</p>`);
      paragraphBuffer = [];
    }
  };

  const closeUl = () => { if (inUl) { out.push('</ul>'); inUl = false; } };
  const closeOl = () => { if (inOl) { out.push('</ol>'); inOl = false; } };

  for (const raw of lines) {
    const line = raw.trim();

    // Ligne vide → flush
    if (!line) {
      flushParagraph();
      closeUl();
      closeOl();
      continue;
    }

    // Headings
    if (/^###\s+/.test(line)) {
      flushParagraph(); closeUl(); closeOl();
      out.push(`<h3 class="font-display font-bold text-xl mt-8 mb-3 text-white">${inline(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flushParagraph(); closeUl(); closeOl();
      out.push(`<h2 class="font-display font-black text-2xl md:text-3xl mt-10 mb-4 text-brand-pink">${inline(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^#\s+/.test(line)) {
      flushParagraph(); closeUl(); closeOl();
      out.push(`<h1 class="font-display font-black text-3xl md:text-4xl mt-12 mb-6 gradient-text">${inline(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }

    // Citation
    if (/^>\s*/.test(line)) {
      flushParagraph(); closeUl(); closeOl();
      out.push(`<blockquote class="border-l-4 border-pink-500 pl-4 my-4 italic text-white/70">${inline(line.replace(/^>\s*/, ''))}</blockquote>`);
      continue;
    }

    // Liste numérotée 1. 2. ...
    const olMatch = /^(\d+)\.\s+(.+)$/.exec(line);
    if (olMatch) {
      flushParagraph(); closeUl();
      if (!inOl) { out.push('<ol class="list-decimal pl-6 space-y-2 my-4 text-white/90">'); inOl = true; }
      out.push(`<li class="leading-relaxed">${inline(olMatch[2])}</li>`);
      continue;
    }

    // Liste à puces - ou *
    if (/^[-*]\s+/.test(line)) {
      flushParagraph(); closeOl();
      if (!inUl) { out.push('<ul class="list-disc pl-6 space-y-2 my-4 text-white/90">'); inUl = true; }
      out.push(`<li class="leading-relaxed">${inline(line.replace(/^[-*]\s+/, ''))}</li>`);
      continue;
    }

    // Sinon : ligne de paragraphe
    closeUl(); closeOl();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  closeUl();
  closeOl();

  return out.join('\n');
}

/**
 * Fuzzy-match les noms de venues dans un markdown article.
 * Cherche les segments **bold**, puis pour chaque nom on regarde s'il match (case-insensitive,
 * sans accents) un nom de Listing.
 */
export function extractBoldNames(md: string): string[] {
  const names = new Set<string>();
  // Pattern : **Nom du Lieu** ou *Nom* ou ## Nom (titre H2 souvent utilisé par Gemini)
  const patterns = [
    /\*\*([^*\n]{3,80})\*\*/g,
    /^##\s+(.+)$/gm,
    /^###\s+(.+)$/gm
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(md)) !== null) {
      let n = m[1].trim();
      // Strip "1. " préfixe numérique
      n = n.replace(/^\d+[.)]\s*/, '');
      // Strip "—" et tout ce qui suit
      n = n.split(/[—–-]/)[0].trim();
      if (n.length > 2 && n.length < 60) names.add(n);
    }
  }
  return Array.from(names);
}

/**
 * Normalise pour fuzzy matching : minuscules, sans accents, sans ponctuation.
 */
export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy match : un nom du markdown matche un nom de Listing si
 * - normalisé identique
 * - OU le nom Listing est inclus dans le nom markdown (ou inverse)
 * - OU 80%+ des mots du nom Listing apparaissent dans le markdown
 */
export function fuzzyMatchVenue(mdName: string, listingName: string): boolean {
  const a = normalizeForMatch(mdName);
  const b = normalizeForMatch(listingName);
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  // Word overlap
  const aw = new Set(a.split(' ').filter((w) => w.length > 2));
  const bw = new Set(b.split(' ').filter((w) => w.length > 2));
  if (bw.size === 0) return false;
  let overlap = 0;
  for (const w of bw) if (aw.has(w)) overlap++;
  return overlap / bw.size >= 0.8;
}
