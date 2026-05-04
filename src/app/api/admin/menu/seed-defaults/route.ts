import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/menu/seed-defaults
 *
 * Initialise (ou rétablit) le menu par défaut canonique de GLD pour la locale FR.
 * - Garde les items qui n'existent PAS dans la liste canonique (custom user-added)
 * - Crée les items canoniques manquants
 * - Supprime les doublons par href
 * - Photos / Boutique sont volontairement ABSENTS car gérés par MegaMenu dans la navbar
 *
 * Body optionnel : { wipe: true } pour nettoyer tout d'abord puis recréer.
 */

const CANONICAL = [
  // Niveau racine
  { slug: 'message',       label: 'Le message',       href: '/message',       order: 0, parent: null,        children: [] },
  { slug: 'argumentaire',  label: 'Argumentaire',     href: '/argumentaire',  order: 1, parent: null,        children: [] },
  { slug: 'affiches',      label: 'Affiches',         href: '/affiches',      order: 2, parent: null,        children: [] },
  { slug: 'communaute',    label: 'Communauté',       href: '/forum',         order: 3, parent: null,        children: [
    { slug: 'forum',         label: 'Forum',          href: '/forum',         order: 0 },
    { slug: 'temoignages',   label: 'Témoignages',    href: '/temoignages',   order: 1 },
    { slug: 'lieux',         label: 'Lieux LGBT-friendly', href: '/lieux',    order: 2 },
    { slug: 'carte',         label: 'Carte mondiale', href: '/carte',         order: 3 }
  ]},
  { slug: 'agenda',        label: 'Agenda',           href: '/agenda',        order: 4, parent: null,        children: [] },
  { slug: 'newsletters',   label: 'Newsletters',      href: '/newsletters',   order: 5, parent: null,        children: [] },
  { slug: 'a-propos',      label: 'À propos',         href: '/a-propos',      order: 6, parent: null,        children: [] },
  { slug: 'blog',          label: 'Blog',             href: '/blog',          order: 7, parent: null,        children: [] }
];

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const wipe = !!body.wipe;

  let stats = { created: 0, deduped: 0, kept: 0, deleted: 0 };

  try {
    const locale = 'fr';

    if (wipe) {
      const del = await prisma.menuItem.deleteMany({ where: { locale } });
      stats.deleted = del.count;
    }

    // 1) Dédupe : pour chaque href en doublon, on garde le plus ancien (createdAt asc)
    const all = await prisma.menuItem.findMany({ where: { locale } });
    const byHref = new Map<string, typeof all>();
    for (const it of all) {
      const arr = byHref.get(it.href) || [];
      arr.push(it);
      byHref.set(it.href, arr);
    }
    for (const [href, list] of byHref.entries()) {
      if (list.length > 1) {
        const sorted = list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const toDelete = sorted.slice(1);
        for (const d of toDelete) {
          await prisma.menuItem.delete({ where: { id: d.id } }).catch(() => null);
          stats.deduped++;
        }
      }
    }

    // 2) Création des items canoniques manquants
    const existing = await prisma.menuItem.findMany({ where: { locale } });
    const existingHrefs = new Set(existing.map(e => e.href));

    for (const root of CANONICAL) {
      let parentId: string | null = null;
      if (existingHrefs.has(root.href)) {
        const e = existing.find(x => x.href === root.href);
        parentId = e!.id;
        stats.kept++;
      } else {
        const created = await prisma.menuItem.create({
          data: {
            label: root.label, href: root.href, locale,
            order: root.order, parentId: null, external: false, published: true
          }
        });
        parentId = created.id;
        stats.created++;
      }

      // Children
      for (const child of root.children) {
        if (existingHrefs.has(child.href)) {
          stats.kept++;
          continue;
        }
        await prisma.menuItem.create({
          data: {
            label: child.label, href: child.href, locale,
            order: child.order, parentId, external: false, published: true
          }
        });
        stats.created++;
      }
    }

    return NextResponse.json({ ok: true, stats });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
