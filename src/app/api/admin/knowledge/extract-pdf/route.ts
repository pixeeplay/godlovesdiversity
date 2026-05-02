import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Extrait le texte d'un PDF uploadé via FormData (champ "file").
 * Utilise pdf-parse (déjà installé pour les miniatures affiches).
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const fd = await req.formData();
    const file = fd.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'fichier manquant' }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    // import dynamique car pdf-parse est node-only
    const pdfParse = (await import('pdf-parse')).default as any;
    const result = await pdfParse(buf);
    return NextResponse.json({
      text: (result?.text || '').trim().slice(0, 200000),
      pages: result?.numpages || 0,
      info: result?.info || {}
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Extraction PDF impossible' }, { status: 500 });
  }
}
