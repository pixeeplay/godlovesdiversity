import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/share-card/qr-only?text=...&size=180
 * Renvoie un SVG contenant UNIQUEMENT le QR code (pour composition client-side).
 * Utilisé par ShareCardClient quand l'utilisateur upload une photo : on compose
 * tout en canvas localement et on récupère juste le QR depuis ce endpoint léger.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = sp.get('text') || 'https://gld.pixeeplay.com';
  const size = Math.min(parseInt(sp.get('size') || '180'), 600);

  const matrix = qrEncode(text);
  const n = matrix.length;
  const cellSize = (size - 20) / n;
  let cells = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) {
        cells += `<rect x="${10 + x * cellSize}" y="${10 + y * cellSize}" width="${cellSize + 0.5}" height="${cellSize + 0.5}" fill="black"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="white"/>
  ${cells}
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// QR encoding (version simplifiée — pour des URLs courtes < 50 chars)
function qrEncode(data: string): boolean[][] {
  const text = data.slice(0, 100);
  const version = text.length > 50 ? 4 : (text.length > 25 ? 3 : 2);
  const size = 17 + version * 4;
  const matrix: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));

  placeFinderPattern(matrix, reserved, 0, 0);
  placeFinderPattern(matrix, reserved, size - 7, 0);
  placeFinderPattern(matrix, reserved, 0, size - 7);

  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
    reserved[6][i] = true;
    reserved[i][6] = true;
  }

  matrix[size - 8][8] = true;
  reserved[size - 8][8] = true;

  const bits: number[] = [];
  bits.push(0, 1, 0, 0);
  const len = Math.min(text.length, 255);
  for (let i = 7; i >= 0; i--) bits.push((len >> i) & 1);
  for (let i = 0; i < len; i++) {
    const c = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) bits.push((c >> b) & 1);
  }
  bits.push(0, 0, 0, 0);
  while (bits.length % 8 !== 0) bits.push(0);
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  const targetBits = (version === 2 ? 28 : version === 3 ? 44 : 64) * 8;
  while (bits.length < targetBits) {
    const pb = padBytes[padIdx++ % 2];
    for (let b = 7; b >= 0; b--) bits.push((pb >> b) & 1);
  }

  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const y = upward ? size - 1 - i : i;
      for (let dx = 0; dx < 2; dx++) {
        const x = col - dx;
        if (!reserved[y][x] && bitIdx < bits.length) {
          const mask = (y + x) % 2 === 0;
          matrix[y][x] = !!bits[bitIdx] !== mask;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  const formatBits = [0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1];
  for (let i = 0; i < 6; i++) { matrix[i][8] = !!formatBits[i]; matrix[8][size - 1 - i] = !!formatBits[i]; }
  matrix[7][8] = !!formatBits[6];
  matrix[8][8] = !!formatBits[7];
  matrix[8][7] = !!formatBits[8];
  for (let i = 9; i < 15; i++) { matrix[size - 15 + i][8] = !!formatBits[i]; matrix[8][14 - i] = !!formatBits[i]; }

  return matrix;
}

function placeFinderPattern(matrix: boolean[][], reserved: boolean[][], x: number, y: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= matrix.length || ny < 0 || ny >= matrix.length) continue;
      reserved[ny][nx] = true;
      const isFinder = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
      if (!isFinder) continue;
      const inner = (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      const ring = (dx === 0 || dx === 6 || dy === 0 || dy === 6);
      matrix[ny][nx] = inner || ring;
    }
  }
}
