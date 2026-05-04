import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Extraction texte d'un PDF avec pdfjs-dist (Mozilla, propre, fonctionne dans Next).
 *
 * Body: FormData avec un champ 'file' = le PDF, OU JSON { url } pour un PDF distant.
 * Réponse: { text, pages, charCount }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let buffer: ArrayBuffer | null = null;

  const ct = req.headers.get('content-type') || '';

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

    // Import dynamique pour éviter de charger pdfjs au build des autres routes
    // pdfjs-dist 4.x est ESM — on prend la build legacy qui supporte node sans worker
    const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Désactive le worker (on tourne en serverless Node)
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = false;
    }

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      // pdfjs sait gérer les fonts manquantes côté serveur si on désactive le rendering
      isEvalSupported: false,
      disableFontFace: true
    });
    const doc = await loadingTask.promise;

    const numPages = doc.numPages || 0;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      // textContent.items = [{ str, transform, ... }, ...]
      const pageText = (textContent.items || [])
        .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) fullText += `\n\n--- Page ${i} ---\n${pageText}`;
    }

    fullText = fullText.trim();

    return NextResponse.json({
      ok: true,
      text: fullText,
      pages: numPages,
      charCount: fullText.length
    });
  } catch (e: any) {
    return NextResponse.json({
      error: 'Échec extraction PDF',
      detail: e?.message || String(e)
    }, { status: 500 });
  }
}
