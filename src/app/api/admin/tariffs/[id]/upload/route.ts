import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ingestTariffFile } from '@/lib/tariff-ingestor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/** POST /api/admin/tariffs/[id]/upload — upload manuel d'un fichier (multipart/form-data). */
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type') || '';
  let fileName = 'upload.csv';
  let fileContent = '';

  if (ct.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'fichier manquant' }, { status: 400 });
    fileName = file.name;
    fileContent = await file.text();
  } else if (ct.includes('application/json')) {
    const body = await req.json();
    fileName = body.fileName || fileName;
    fileContent = body.fileContent || '';
  } else {
    fileContent = await req.text();
  }

  if (!fileContent || fileContent.length < 10) {
    return NextResponse.json({ error: 'fichier vide' }, { status: 400 });
  }

  try {
    const result = await ingestTariffFile({
      sourceId: ctx.params.id,
      fileName,
      fileContent,
      trigger: 'manual',
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'ingestion KO' }, { status: 500 });
  }
}
