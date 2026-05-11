import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/themes/seed
 * Body: { wipe?: boolean }
 * Crée les thèmes par défaut (saisons + fêtes). Skip si déjà présents.
 */
const DEFAULT_THEMES = [
  {
    slug: 'noel', name: '🎄 Noël', season: 'winter',
    palette: { primary: '#dc2626', secondary: '#16a34a', accent: '#fbbf24', bg: '#0a0a14', fg: '#fafafa' },
    fonts: { heading: 'Mountains of Christmas', body: 'Inter' },
    blocks: { snow: true, lights: true },
  },
  {
    slug: 'halloween', name: '🎃 Halloween', season: 'autumn',
    palette: { primary: '#f97316', secondary: '#1f2937', accent: '#8b5cf6', bg: '#0a0a14', fg: '#fafafa' },
    fonts: { heading: 'Creepster', body: 'Inter' },
    blocks: { pumpkins: true, fog: true },
  },
  {
    slug: 'pride', name: '🌈 Pride', season: null,
    palette: { primary: '#ec4899', secondary: '#8b5cf6', accent: '#06b6d4', bg: '#0a0a14', fg: '#fafafa' },
    fonts: { heading: 'Inter', body: 'Inter' },
    blocks: { rainbow: true, hearts: true },
  },
  {
    slug: 'ete', name: '☀️ Été', season: 'summer',
    palette: { primary: '#0ea5e9', secondary: '#facc15', accent: '#f97316', bg: '#fefce8', fg: '#0c4a6e' },
    fonts: { heading: 'Pacifico', body: 'Inter' },
    blocks: { bubbles: true, sun: true },
  },
  {
    slug: 'printemps', name: '🌸 Printemps', season: 'spring',
    palette: { primary: '#fb7185', secondary: '#84cc16', accent: '#fbbf24', bg: '#fff7ed', fg: '#1c1917' },
    fonts: { heading: 'Inter', body: 'Inter' },
    blocks: { petals: true },
  },
  {
    slug: 'paques', name: '🐰 Pâques', season: 'spring',
    palette: { primary: '#fde68a', secondary: '#fb7185', accent: '#a78bfa', bg: '#fff7ed', fg: '#1c1917' },
    fonts: { heading: 'Inter', body: 'Inter' },
    blocks: { eggs: true, bunnies: true },
  },
  {
    slug: 'st-valentin', name: '💕 Saint-Valentin', season: null,
    palette: { primary: '#ec4899', secondary: '#f43f5e', accent: '#fbbf24', bg: '#fff1f2', fg: '#881337' },
    fonts: { heading: 'Inter', body: 'Inter' },
    blocks: { hearts: true },
  },
  {
    slug: 'automne', name: '🍂 Automne', season: 'autumn',
    palette: { primary: '#ea580c', secondary: '#a16207', accent: '#facc15', bg: '#1c1917', fg: '#fef3c7' },
    fonts: { heading: 'Inter', body: 'Inter' },
    blocks: { leaves: true },
  },
  {
    slug: 'cyberpunk', name: '⚡ Cyberpunk', season: null,
    palette: { primary: '#a855f7', secondary: '#06b6d4', accent: '#f43f5e', bg: '#0a0a14', fg: '#fafafa' },
    fonts: { heading: 'Orbitron', body: 'Inter' },
    blocks: { neon: true, glitch: true },
  },
  {
    slug: 'zen', name: '🌿 Zen Japonais', season: null,
    palette: { primary: '#10b981', secondary: '#fb7185', accent: '#f4f4f5', bg: '#fafafa', fg: '#27272a' },
    fonts: { heading: 'Noto Serif JP', body: 'Inter' },
    blocks: { petals: true },
  },
  {
    slug: 'galaxie', name: '🌌 Galaxie', season: null,
    palette: { primary: '#7c3aed', secondary: '#06b6d4', accent: '#facc15', bg: '#0a0a14', fg: '#fafafa' },
    fonts: { heading: 'Orbitron', body: 'Inter' },
    blocks: { stars: true, nebula: true },
  },
  {
    slug: 'minimal', name: '⬜ Minimaliste', season: null,
    palette: { primary: '#0a0a0a', secondary: '#737373', accent: '#dc2626', bg: '#fafafa', fg: '#0a0a0a' },
    fonts: { heading: 'Inter', body: 'Inter' },
    blocks: {},
  },
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  const wipe = !!body.wipe;

  const db = await getTenantPrisma(slug);
  const stats = { created: 0, kept: 0, deleted: 0 };

  try {
    if (wipe) {
      const del = await (db as any).theme.deleteMany({});
      stats.deleted = del.count || 0;
    }
    const existing = await (db as any).theme.findMany({ select: { slug: true } });
    const has = new Set(existing.map((t: any) => t.slug));
    for (const t of DEFAULT_THEMES) {
      if (has.has(t.slug)) { stats.kept++; continue; }
      await (db as any).theme.create({
        data: {
          slug: t.slug,
          name: t.name,
          season: t.season,
          palette: t.palette,
          fonts: t.fonts,
          blocks: t.blocks,
          active: false,
        },
      });
      stats.created++;
    }
    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
