import { NextRequest } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/share-card/[topic]?text=...&author=...&country=...&photo=data:...&qr=1&targetUrl=...
 * Génère une image SVG carrée 1080x1080 prête à partager.
 *
 * - photo : URL/data URI photo user en background (avec overlay foncé)
 * - qr=1 : QR code scannable (vraie lib qrcode + Reed-Solomon) en bas-droite vers targetUrl
 * - logo GLD cœur arc-en-ciel en bas-gauche
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const sp = req.nextUrl.searchParams;
  const text = (sp.get('text') || 'Dieu aime la diversité').slice(0, 220);
  const author = (sp.get('author') || '').slice(0, 40);
  const country = (sp.get('country') || '').slice(0, 4).toUpperCase();
  const photo = sp.get('photo') || '';
  const qrEnabled = sp.get('qr') === '1';
  const targetUrl = sp.get('targetUrl') || 'https://gld.pixeeplay.com';
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
  const lines = wrap(escaped, 28).slice(0, 6);

  // QR code via lib npm (vraie spec Reed-Solomon, scannable)
  let qrSvgInner = '';
  if (qrEnabled) {
    try {
      const qrFullSvg = await QRCode.toString(targetUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 180,
        color: { dark: '#000000', light: '#ffffff' }
      });
      // Extrait juste les <path>/<rect> intérieurs du SVG retourné par la lib pour les inliner
      const inner = qrFullSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
      qrSvgInner = inner ? inner[1] : '';
    } catch {}
  }

  const photoBg = photo ? `
    <pattern id="userPhoto" patternUnits="userSpaceOnUse" width="1080" height="1080">
      <image href="${escapeAttr(photo)}" width="1080" height="1080" preserveAspectRatio="xMidYMid slice" />
    </pattern>
    <rect width="1080" height="1080" fill="url(#userPhoto)" />
    <rect width="1080" height="1080" fill="rgba(0,0,0,0.55)"/>
    <rect width="1080" height="1080" fill="url(#cornerVignette)"/>
  ` : `
    <rect width="1080" height="1080" fill="url(#bg)"/>
    <rect width="1080" height="1080" fill="url(#overlay)"/>
  `;

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
    <radialGradient id="cornerVignette" cx="50%" cy="50%" r="70%">
      <stop offset="50%" stop-color="rgba(0,0,0,0)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.6)"/>
    </radialGradient>
    <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e40303"/>
      <stop offset="20%" stop-color="#ff8c00"/>
      <stop offset="40%" stop-color="#ffed00"/>
      <stop offset="60%" stop-color="#008026"/>
      <stop offset="80%" stop-color="#004dff"/>
      <stop offset="100%" stop-color="#750787"/>
    </linearGradient>
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.6)"/>
    </filter>
  </defs>

  ${photoBg}

  <!-- Drapeau / arc-en-ciel emoji en haut -->
  <g transform="translate(540,180)">
    <text x="0" y="20" font-size="140" text-anchor="middle" fill="white" opacity="0.9">${flag}</text>
  </g>

  <!-- Texte principal -->
  ${lines.map((line, i) => `
    <text x="540" y="${440 + i * 80}" font-family="Georgia,serif" font-size="58" font-weight="bold"
          text-anchor="middle" fill="white" filter="url(#textShadow)">${line}</text>
  `).join('')}

  <!-- Auteur -->
  ${author ? `<text x="540" y="${440 + lines.length * 80 + 70}" font-family="Georgia,serif" font-style="italic" font-size="36"
                    text-anchor="middle" fill="white" opacity="0.95" filter="url(#textShadow)">— ${escapedAuthor}</text>` : ''}

  <!-- LOGO GLD (cœur arc-en-ciel) — bas gauche -->
  <g transform="translate(80,940)">
    <path d="M 50,30 C 40,5 0,5 0,30 C 0,50 50,90 50,90 C 50,90 100,50 100,30 C 100,5 60,5 50,30 Z"
          fill="url(#rainbow)" stroke="white" stroke-width="3" filter="url(#textShadow)"/>
    <text x="115" y="60" font-family="Inter,sans-serif" font-size="22" font-weight="900" fill="white" filter="url(#textShadow)">GOD LOVES</text>
    <text x="115" y="85" font-family="Inter,sans-serif" font-size="22" font-weight="900" fill="white" filter="url(#textShadow)">DIVERSITY</text>
  </g>

  ${qrEnabled && qrSvgInner ? `
  <!-- QR CODE — bas droite (scannable, lib qrcode) -->
  <g transform="translate(870, 870)">
    <rect width="180" height="180" fill="white" rx="12"/>
    <g transform="translate(0,0)">
      ${qrSvgInner}
    </g>
    <text x="90" y="200" font-family="Inter,sans-serif" font-size="14" text-anchor="middle" fill="white" opacity="0.85" filter="url(#textShadow)">Scanne-moi</text>
  </g>
  ` : `
  <text x="900" y="1050" font-family="Inter,sans-serif" font-size="20" text-anchor="end" fill="white" opacity="0.75" filter="url(#textShadow)">gld.pixeeplay.com</text>
  `}
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
  return String.fromCodePoint(...code.split('').map((c) => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
