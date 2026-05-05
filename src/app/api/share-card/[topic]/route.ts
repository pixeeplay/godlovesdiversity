import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/share-card/[topic]?text=...&author=...&country=...
 * Génère une image SVG carrée 1080x1080 prête à partager (Insta/TikTok/X stories).
 * Retournée en image/svg+xml — peut être convertie en PNG côté client si besoin.
 *
 * Topics : "testimony" | "verse" | "venue" | "event" | "pride"
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') || 'Dieu aime la diversité').slice(0, 220);
  const author = (sp.get('author') || '').slice(0, 40);
  const country = (sp.get('country') || '').slice(0, 4).toUpperCase();
  const flag = country ? toFlagEmoji(country) : '🌈';

  const palettes: Record<string, [string, string, string]> = {
    testimony: ['#d61b80', '#7c3aed', '#06b6d4'],
    verse:     ['#fbbf24', '#dc2626', '#7c3aed'],
    venue:     ['#ec4899', '#a855f7', '#06b6d4'],
    event:     ['#f97316', '#ec4899', '#a855f7'],
    pride:     ['#e40303', '#ff8c00', '#ffed00']
  };
  const [c1, c2, c3] = palettes[topic] || palettes.testimony;

  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedAuthor = author.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Wrap text en lignes de ~28 chars max
  const lines = wrap(escaped, 28).slice(0, 6);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="50%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="overlay">
      <stop offset="0%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.5)"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <rect width="1080" height="1080" fill="url(#overlay)"/>

  <!-- Cœur néon stylisé -->
  <g transform="translate(540,180)">
    <text x="0" y="20" font-size="140" text-anchor="middle" fill="white" opacity="0.9">${flag}</text>
  </g>

  <!-- Texte principal -->
  ${lines.map((line, i) => `
    <text x="540" y="${440 + i * 80}" font-family="Georgia,serif" font-size="58" font-weight="bold"
          text-anchor="middle" fill="white" stroke="rgba(0,0,0,0.3)" stroke-width="1">${line}</text>
  `).join('')}

  <!-- Auteur -->
  ${author ? `<text x="540" y="${440 + lines.length * 80 + 70}" font-family="Georgia,serif" font-style="italic" font-size="36"
                    text-anchor="middle" fill="white" opacity="0.9">— ${escapedAuthor}</text>` : ''}

  <!-- Watermark GLD -->
  <text x="540" y="1020" font-family="Inter,sans-serif" font-size="28" font-weight="bold"
        text-anchor="middle" fill="white" opacity="0.85" letter-spacing="4">GOD LOVES DIVERSITY</text>
  <text x="540" y="1050" font-family="Inter,sans-serif" font-size="20"
        text-anchor="middle" fill="white" opacity="0.65">gld.pixeeplay.com</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400'
    }
  });
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + ' ' + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

function toFlagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌈';
  return String.fromCodePoint(...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
