import { NextResponse } from 'next/server';
import { getCurrentOrg } from '@/lib/tenant';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const org = await getCurrentOrg();
  const h = await headers();
  const host = h.get('host') || 'pixeeplay.com';
  const proto = host.includes('localhost') ? 'http' : 'https';

  // Free plan = noindex
  const noIndex = !org || org.plan === 'free';
  if (noIndex) {
    return new NextResponse(`User-agent: *
Disallow: /
`, { headers: { 'Content-Type': 'text/plain' } });
  }

  return new NextResponse(`User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${proto}://${host}/sitemap.xml
`, { headers: { 'Content-Type': 'text/plain' } });
}
