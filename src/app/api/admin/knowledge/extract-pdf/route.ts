import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Extraction texte d'un PDF.
 *
 * Stratégie : on n'utilise PAS pdfjs-dist qui casse le bundling Next.js (ESM-only).
 * À la place, on tente une lecture textuelle simple : on parse le buffer PDF
 * et on extrait les chaînes entre parenthèses des objets BT...ET (text objects).
 *
 * C'est une heuristique — pour des PDFs textuels simples ça marche bien.
 * Pour des PDFs scannés ou avec embeddings de fonts custom, on renverra peu
 * de texte et l'admin devra copier-coller manuellement.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type') || '';
  let buffer: ArrayBuffer | null = null;

  try {
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof File)) return NextResponse.json({ error: 'Champ file requis' }, { status: 400 });
      if (file.size > 25 * 1024 * 1024) return NextResponse.json({ error: 'PDF trop lourd (>25 MB)' }, { status: 413 });
      buffer = await file.arrayBuffer();
    } else {
      const { url } = await req.json().catch(() => ({}));
      if (!url || typeof url !== 'string') return NextResponse.json({ error: 'url requise' }, { status: 400 });
      const r = await fetch(url);
      if (!r.ok) return NextResponse.json({ error: `Téléchargement PDF : HTTP ${r.status}` }, { status: 502 });
      buffer = await r.arrayBuffer();
    }

    if (!buffer) return NextResponse.json({ error: 'Aucun contenu' }, { status: 400 });

    const text = extractTextHeuristic(Buffer.from(buffer));

    if (text.length < 50) {
      return NextResponse.json({
        ok: false,
        text,
        charCount: text.length,
        warning: 'Très peu de texte détecté — le PDF est peut-être scanné (image), protégé, ou utilise des fonts non-extractibles. Copie-colle le contenu manuellement dans le champ Contenu.'
      });
    }

    return NextResponse.json({
      ok: true,
      text,
      charCount: text.length,
      method: 'heuristic'
    });
  } catch (e: any) {
    return NextResponse.json({
      error: 'Échec extraction PDF',
      detail: e?.message || String(e),
      hint: 'Copie-colle le texte manuellement.'
    }, { status: 500 });
  }
}

/**
 * Extracteur PDF rudimentaire en pure-JS.
 * Trouve les opérateurs Tj/TJ/' (text show) et concatène les literals entre parenthèses.
 * Décode les escapes basiques (\n, \r, \(, \), \\).
 */
function extractTextHeuristic(buf: Buffer): string {
  // Cherche les blocs BT...ET (Begin Text / End Text)
  const raw = buf.toString('latin1'); // PDFs sont byte-stream, latin1 préserve les bytes
  const out: string[] = [];

  // Match (...)Tj  ou  [...]TJ  ou  (...)'  ou  (...)"
  const regex = /\(((?:[^()\\]|\\.|\\\d{3}|\([^)]*\))*)\)\s*(Tj|TJ|'|")/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const literal = m[1];
    out.push(decodePdfString(literal));
  }

  // Match arrays [...]TJ qui contiennent souvent (mot)kerning(mot)
  const arrayRegex = /\[((?:\([^)]*\)|<[^>]*>|[^\]])*)\]\s*TJ/g;
  while ((m = arrayRegex.exec(raw)) !== null) {
    const inner = m[1];
    const litRegex = /\(((?:[^()\\]|\\.|\\\d{3})*)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = litRegex.exec(inner)) !== null) {
      out.push(decodePdfString(lm[1]));
    }
  }

  return out
    .join(' ')
    .replace(/\s+/g, ' ')
    .replace(/(.{80}\s)/g, '$1\n')
    .trim();
}

function decodePdfString(s: string): string {
  return s
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}
