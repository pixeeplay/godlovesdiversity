import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES = [
  { name: 'Général',                  slug: 'general',          description: 'Discussions ouvertes, présentations, bienvenue',             color: '#a78bfa', icon: '💬',     order: 0 },
  { name: 'Témoignages',              slug: 'temoignages',      description: 'Partage ton parcours, ton chemin de foi, ta libération',     color: '#f472b6', icon: '🌈',     order: 1 },
  { name: 'Foi & spiritualité',       slug: 'foi-spiritualite', description: 'Bible, théologie inclusive, prière, doutes, questions',      color: '#60a5fa', icon: '✝️',     order: 2 },
  { name: 'Vie LGBTQ+',               slug: 'vie-lgbtq',        description: 'Coming out, famille, couple, identité, vie quotidienne',     color: '#34d399', icon: '🏳️‍🌈', order: 3 },
  { name: 'Soutien & entraide',       slug: 'soutien',          description: "Quand ça va pas — la communauté est là pour toi",            color: '#fb923c', icon: '🤝',     order: 4 },
  { name: 'Événements & rencontres',  slug: 'evenements',       description: 'Cafés, marches des fiertés, retraites, rencontres locales',  color: '#f87171', icon: '📅',     order: 5 }
];

/**
 * POST /api/admin/forum/seed
 * Crée les 6 catégories GLD par défaut. Idempotent (skip si slug existe).
 */
export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const cat of CATEGORIES) {
    try {
      const existing = await prisma.forumCategory.findFirst({ where: { slug: cat.slug } });
      if (existing) { skipped++; continue; }
      await prisma.forumCategory.create({ data: cat });
      created++;
    } catch (e: any) {
      errors.push(`${cat.slug}: ${e?.message || 'KO'}`);
    }
  }

  // Liste actualisée
  const categories = await prisma.forumCategory.findMany({
    orderBy: { order: 'asc' },
    include: { _count: { select: { threads: true } } }
  });

  return NextResponse.json({
    ok: true,
    summary: { created, skipped, total: CATEGORIES.length, errors: errors.length },
    errors: errors.slice(0, 10),
    categories
  });
}
