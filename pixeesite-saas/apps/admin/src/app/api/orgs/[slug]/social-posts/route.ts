import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const url = new URL(req.url);
  const platform = url.searchParams.get('platform') || '';
  const status = url.searchParams.get('status') || '';
  const where: any = {};
  if (platform) where.platform = platform;
  if (status) where.status = status;
  const db = await getTenantPrisma(slug);
  const items = await (db as any).socialPost?.findMany({
    where, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }], take: 200,
  }).catch(() => []) ?? [];
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const b = await req.json();
  if (!b.platform || !b.content) return NextResponse.json({ error: 'platform & content required' }, { status: 400 });
  const db = await getTenantPrisma(slug);
  const item = await (db as any).socialPost.create({
    data: {
      platform: b.platform,
      content: b.content,
      mediaUrls: Array.isArray(b.mediaUrls) ? b.mediaUrls : [],
      hashtags: Array.isArray(b.hashtags) ? b.hashtags : [],
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : null,
      status: b.status || (b.scheduledAt ? 'scheduled' : 'draft'),
    },
  });
  return NextResponse.json({ ok: true, item });
}
