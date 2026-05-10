import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/page-builder/discover
 * Scanne src/app/[locale]/* pour trouver toutes les pages publiques
 * et croise avec les blocs PageBlock existants pour indiquer
 * lesquelles sont déjà éditées via le builder.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const cwd = process.cwd();
  const root = path.join(cwd, 'src', 'app', '[locale]');

  // Scan dirs récursifs jusqu'à 2 niveaux pour trouver page.tsx
  const found: { slug: string; depth: number }[] = [];
  async function walk(dir: string, prefix: string, depth: number) {
    if (depth > 3) return;
    let entries: any[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    const hasPage = entries.some((e) => e.isFile() && e.name === 'page.tsx');
    if (hasPage && prefix) {
      found.push({ slug: prefix, depth });
    }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('_')) {
        const subPrefix = prefix ? `${prefix}/${e.name}` : e.name;
        await walk(path.join(dir, e.name), subPrefix, depth + 1);
      }
    }
  }
  await walk(root, '', 0).catch(() => {});

  // Récupère les slugs déjà avec des blocs en DB
  const blocks = await (prisma as any).pageBlock.groupBy({
    by: ['pageSlug'],
    _count: { _all: true }
  }).catch(() => []);
  const slugsWithBlocks = new Map<string, number>();
  for (const b of blocks) slugsWithBlocks.set(b.pageSlug, b._count?._all || 0);

  // Catalogue connu (label + desc)
  const META: Record<string, { label: string; desc: string; emoji: string }> = {
    home:                  { label: 'Accueil',           desc: 'Hero, manifesto, sections principales', emoji: '🏠' },
    message:               { label: 'Le message',        desc: 'Manifeste GLD',                          emoji: '📖' },
    argumentaire:          { label: 'Argumentaire',      desc: 'Quatre vérités simples',                 emoji: '✊' },
    'membre-plus':         { label: 'Membre+',           desc: 'Page abonnement Premium',                emoji: '💎' },
    about:                 { label: 'À propos',          desc: 'Qui sommes-nous',                        emoji: '👥' },
    'cercles-priere':      { label: 'Cercles de prière', desc: 'Page spirituelle live',                  emoji: '🙏' },
    'champ-de-priere':     { label: 'Champ de prières',  desc: 'Carte mondiale',                         emoji: '🗺️' },
    camino:                { label: 'Camino virtuel',    desc: 'Pèlerinage gamifié',                     emoji: '🚶' },
    'webcams-live':        { label: 'Webcams live',      desc: 'Lieux saints en direct',                 emoji: '📹' },
    journal:               { label: 'Journal vocal',     desc: 'Prières vocales',                        emoji: '🎙️' },
    crowdfunding:          { label: 'Crowdfunding',      desc: 'Page collecte LGBT',                     emoji: '💰' },
    partager:              { label: 'Carte de partage',  desc: 'Page sharing',                           emoji: '🎁' },
    forum:                 { label: 'Forum',             desc: 'Discussions communauté',                 emoji: '💬' },
    news:                  { label: 'News',              desc: 'Actualités',                             emoji: '📰' },
    lieux:                 { label: 'Lieux',             desc: 'Annuaire LGBT-friendly',                 emoji: '📍' },
    contact:               { label: 'Contact',           desc: 'Formulaire de contact',                  emoji: '✉️' },
    parrainage:            { label: 'Parrainage',        desc: 'Page invitation amis',                   emoji: '🎉' },
    mentor:                { label: 'Mentor',            desc: 'Programme mentorat',                     emoji: '🤝' },
    'voice-coach':         { label: 'Voice coach',       desc: 'Coach vocal IA',                         emoji: '🎤' },
    'mode-calculatrice':   { label: 'Mode calculatrice', desc: 'Mode discret',                           emoji: '🔒' }
  };

  const pages = found.map((f) => {
    const meta = META[f.slug] || {
      label: f.slug.split('/').pop()?.replace(/-/g, ' ') || f.slug,
      desc: 'Page Next.js',
      emoji: '📄'
    };
    const count = slugsWithBlocks.get(f.slug) || 0;
    return {
      slug: f.slug,
      label: meta.label,
      desc: meta.desc,
      emoji: meta.emoji,
      blockCount: count,
      hasCode: true,
      // L'admin sait s'il y a déjà des blocs sauvegardés
      status: count > 0 ? 'edited' : 'codeOnly'
    };
  });

  // Ajoute les slugs qui ont des blocs mais pas de page Next (orphelins)
  for (const [slug, count] of Array.from(slugsWithBlocks.entries())) {
    if (!pages.find((p) => p.slug === slug)) {
      pages.push({
        slug,
        label: slug.replace(/-/g, ' '),
        desc: 'Slug DB sans page Next.js',
        emoji: '🟣',
        blockCount: count,
        hasCode: false,
        status: 'orphan'
      });
    }
  }

  return NextResponse.json({
    pages: pages.sort((a, b) => a.label.localeCompare(b.label)),
    summary: {
      total: pages.length,
      edited: pages.filter((p) => p.status === 'edited').length,
      codeOnly: pages.filter((p) => p.status === 'codeOnly').length,
      orphan: pages.filter((p) => p.status === 'orphan').length
    }
  });
}
