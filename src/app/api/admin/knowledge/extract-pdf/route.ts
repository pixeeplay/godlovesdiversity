import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Extraction PDF temporairement désactivée — pdf-parse cassait le build Next.js.
 * Workaround utilisateur : ouvrir le PDF dans Acrobat, sélectionner tout,
 * copier-coller dans le champ « Contenu » du formulaire d'ajout.
 *
 * TODO: remplacer par pdfjs-dist (Mozilla, propre, maintenu).
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({
    error: 'Extraction PDF temporairement désactivée. Copie-colle le texte du PDF dans le champ "Contenu" pour l\'ingérer.'
  }, { status: 501 });
}
