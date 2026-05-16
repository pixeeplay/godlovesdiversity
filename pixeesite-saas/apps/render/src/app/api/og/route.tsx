import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/**
 * GET /api/og?title=…&subtitle=…&site=…&color=…
 * Génère une image OG 1200x630 avec titre/sous-titre + gradient brand.
 * Utilisable par n'importe quelle page : <meta property="og:image" content="/api/og?title=…">
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = (searchParams.get('title') || 'Pixeesite').slice(0, 110);
    const subtitle = (searchParams.get('subtitle') || '').slice(0, 160);
    const site = (searchParams.get('site') || '').slice(0, 80);
    const c1 = sanitizeColor(searchParams.get('c1')) || '#d946ef';
    const c2 = sanitizeColor(searchParams.get('c2')) || '#06b6d4';

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${c1} 0%, #8b5cf6 50%, ${c2} 100%)`,
            color: 'white',
            padding: 80,
            position: 'relative',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Décor : gros disque flou */}
          <div
            style={{
              position: 'absolute', top: -200, right: -200, width: 600, height: 600,
              background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 60%)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute', bottom: -200, left: -100, width: 500, height: 500,
              background: 'radial-gradient(circle, rgba(0,0,0,0.3) 0%, transparent 60%)',
              display: 'flex',
            }}
          />

          {/* Site badge */}
          {site && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                opacity: 0.85, marginBottom: 24,
              }}
            >
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                ✨
              </div>
              {site}
            </div>
          )}

          {/* Titre */}
          <div
            style={{
              fontSize: title.length > 50 ? 60 : 80,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 1000,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {title}
          </div>

          {/* Sous-titre */}
          {subtitle && (
            <div
              style={{
                fontSize: 30, fontWeight: 500, opacity: 0.9, marginTop: 28,
                maxWidth: 1000, lineHeight: 1.3,
                display: 'flex',
              }}
            >
              {subtitle}
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              position: 'absolute', bottom: 60, left: 80, right: 80,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 22, fontWeight: 600, opacity: 0.75,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, background: 'white', borderRadius: '50%', display: 'flex' }} />
              Pixeesite
            </div>
            <div style={{ display: 'flex' }}>pixeeplay.com</div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e: any) {
    return new Response(`OG generation failed: ${e?.message || 'unknown'}`, { status: 500 });
  }
}

function sanitizeColor(c: string | null): string | null {
  if (!c) return null;
  // Accepte #abc, #abcdef, ou rgb(…). On limite la longueur pour éviter abus.
  if (/^#[0-9a-fA-F]{3,8}$/.test(c)) return c;
  return null;
}
