import { NextRequest } from 'next/server';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/share-card/qr-only?text=...&size=180&format=svg|png
 * Renvoie un VRAI QR code scannable (lib qrcode + Reed-Solomon).
 * Utilisé par ShareCardClient pour la composition canvas client-side.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const text = sp.get('text') || 'https://gld.pixeeplay.com';
  const size = Math.min(parseInt(sp.get('size') || '180'), 1024);
  const format = sp.get('format') || 'svg';

  if (format === 'png') {
    try {
      const buffer = await QRCode.toBuffer(text, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: size,
        color: { dark: '#000000', light: '#ffffff' }
      });
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } catch (e: any) {
      return new Response(`QR error: ${e.message}`, { status: 500 });
    }
  }

  try {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: { dark: '#000000', light: '#ffffff' }
    });
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (e: any) {
    return new Response(`QR error: ${e.message}`, { status: 500 });
  }
}
