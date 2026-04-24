/**
 * Outils image côté serveur :
 * - perceptualHash() : empreinte 64-bit pour détection de doublons
 * - blurFaces() : flou pixelisé sur les zones rectangulaires détectées
 *
 * sharp est utilisé partout (perf + simplicité).
 */
import sharp from 'sharp';
import { gemini } from './ai';

/** Hash perceptuel rapide (DCT 8x8 simplifié → 64 bits hex) */
export async function perceptualHash(buf: Buffer): Promise<string> {
  // Resize 32x32 grayscale, then average
  const small = await sharp(buf)
    .grayscale()
    .resize(32, 32, { fit: 'fill' })
    .raw()
    .toBuffer();
  const pixels: number[] = Array.from(small as unknown as Uint8Array) as number[];
  const avg = pixels.reduce((a: number, b: number) => a + b, 0) / pixels.length;
  // 64 bits = 8x8 grid average
  let bits = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const sum = (() => {
        let s = 0;
        for (let dy = 0; dy < 4; dy++)
          for (let dx = 0; dx < 4; dx++)
            s += pixels[(y * 4 + dy) * 32 + (x * 4 + dx)];
        return s / 16;
      })();
      bits += sum > avg ? '1' : '0';
    }
  }
  return parseInt(bits, 2).toString(16).padStart(16, '0');
}

/** Distance de Hamming entre deux hashs hex de 16 chars */
export function hammingDistance(a: string, b: string): number {
  let bin1 = BigInt('0x' + a);
  let bin2 = BigInt('0x' + b);
  let xor = bin1 ^ bin2;
  let count = 0;
  while (xor) {
    count += Number(xor & 1n);
    xor >>= 1n;
  }
  return count;
}

/**
 * Demande à Gemini Vision d'identifier les visages et renvoie leurs bounding boxes.
 * Format Gemini : [ymin, xmin, ymax, xmax] sur 0-1000.
 */
export async function detectFaces(buf: Buffer, mime = 'image/jpeg'): Promise<{ box: [number, number, number, number] }[]> {
  const out = await gemini({
    prompt: `Détecte tous les visages humains visibles. Renvoie un JSON valide :
{ "faces": [ { "box": [ymin, xmin, ymax, xmax] }, ... ] }
Coordonnées normalisées 0-1000. Renvoie une liste vide si aucun visage.`,
    images: [{ mimeType: mime, data: buf.toString('base64') }],
    json: true,
    temperature: 0
  });
  try {
    const j = JSON.parse(out.text || '{}');
    return j.faces || [];
  } catch { return []; }
}

/** Floute les visages détectés par Gemini avec sharp */
export async function blurFaces(buf: Buffer, mime = 'image/jpeg'): Promise<Buffer> {
  const meta = await sharp(buf).metadata();
  const W = meta.width || 1; const H = meta.height || 1;
  const faces = await detectFaces(buf, mime);
  if (!faces.length) return buf;

  // Composite : version floutée + masque rectangulaire par visage
  const blurred = await sharp(buf).blur(30).toBuffer();

  let composite: sharp.OverlayOptions[] = [];
  for (const f of faces) {
    const [ymin, xmin, ymax, xmax] = f.box;
    const x = Math.max(0, Math.round((xmin / 1000) * W));
    const y = Math.max(0, Math.round((ymin / 1000) * H));
    const w = Math.min(W - x, Math.round(((xmax - xmin) / 1000) * W));
    const h = Math.min(H - y, Math.round(((ymax - ymin) / 1000) * H));
    if (w <= 0 || h <= 0) continue;
    const crop = await sharp(blurred).extract({ left: x, top: y, width: w, height: h }).toBuffer();
    composite.push({ input: crop, left: x, top: y });
  }
  return sharp(buf).composite(composite).toBuffer();
}
