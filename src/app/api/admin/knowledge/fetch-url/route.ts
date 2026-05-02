import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url manquante' }, { status: 400 });
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'GLD-Bot/1.0 (+https://gld.pixeeplay.com)' } });
    const html = await r.text();
    // Extraction simple : strip tags + récupère <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
    return NextResponse.json({ title, content: text.slice(0, 50000) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Fetch impossible' }, { status: 500 });
  }
}
