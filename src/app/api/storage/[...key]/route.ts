import { NextResponse } from 'next/server';
import { publicUrl } from '@/lib/storage';

/**
 * Proxy de redirection vers MinIO pour ne pas exposer la clé interne dans le HTML.
 * /api/storage/<key>  ->  redirect 302 vers l'URL MinIO publique.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const fullKey = key.join('/');
  return NextResponse.redirect(publicUrl(fullKey));
}
