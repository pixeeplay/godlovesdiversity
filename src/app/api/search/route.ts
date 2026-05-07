import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/search?q=foo&scope=all|admin|public
 * Mega search bar : retourne pages, articles, venues, events, users matchant.
 * Auto-prediction (results par catégorie pour dropdown).
 */

// Pages statiques connues du site (pour suggestions sans hit DB)
const STATIC_PAGES_PUBLIC = [
  { title: 'Accueil', href: '/', tags: 'home accueil', category: 'page' },
  { title: 'Argumentaire', href: '/argumentaire', tags: 'foi religion lgbt argument', category: 'page' },
  { title: 'Message', href: '/message', tags: 'message inclusif', category: 'page' },
  { title: 'Lieux LGBT-friendly', href: '/lieux', tags: 'venues annuaire bar restaurant', category: 'page' },
  { title: 'Agenda événements', href: '/agenda', tags: 'events calendrier', category: 'page' },
  { title: 'Forum', href: '/forum', tags: 'discussion communauté', category: 'page' },
  { title: 'Témoignages vidéo', href: '/temoignages', tags: 'videos coming-out', category: 'page' },
  { title: 'Boutique', href: '/boutique', tags: 'shop t-shirt mug', category: 'page' },
  { title: 'Connect (réseau social)', href: '/connect', tags: 'feed match rencontres pro', category: 'page' },
  { title: 'Mon espace', href: '/mon-espace', tags: 'profil compte settings', category: 'page' },
  { title: 'Crée ta carte à partager', href: '/partager', tags: 'partage instagram tiktok qr code', category: 'page' },
  { title: 'SOS urgence', href: '/urgence', tags: 'helpline aide soutien crisis', category: 'page' },
  { title: 'Membre+ Premium', href: '/membre-plus', tags: 'abonnement premium', category: 'page' },
  { title: 'Newsletters archive', href: '/newsletters', tags: 'archive emails', category: 'page' },
  { title: 'Rapport projet (live)', href: '/rapport', tags: 'stats statistiques chiffres', category: 'page' }
];

const STATIC_PAGES_ADMIN = [
  { title: 'Tableau de bord admin', href: '/admin', tags: 'dashboard admin home', category: 'admin' },
  { title: 'Établissements LGBT', href: '/admin/establishments', tags: 'venues import csv enrich', category: 'admin' },
  { title: 'Lieux (CRUD venue)', href: '/admin/venues', tags: 'edit venues', category: 'admin' },
  { title: 'Événements', href: '/admin/events', tags: 'calendrier events', category: 'admin' },
  { title: 'Forum (modération)', href: '/admin/forum', tags: 'modération posts', category: 'admin' },
  { title: 'Témoignages vidéo', href: '/admin/temoignages', tags: 'videos approve', category: 'admin' },
  { title: 'Newsletter', href: '/admin/newsletter', tags: 'mailing campagne', category: 'admin' },
  { title: 'Plan newsletter annuel', href: '/admin/newsletter/plan', tags: 'planning calendrier IA', category: 'admin' },
  { title: 'Boutique admin', href: '/admin/shop', tags: 'produits stock', category: 'admin' },
  { title: 'Commandes', href: '/admin/shop/orders', tags: 'orders ventes', category: 'admin' },
  { title: 'Studio IA', href: '/admin/ai', tags: 'gemini imagen génération', category: 'admin' },
  { title: 'AI Autopilot', href: '/admin/ai-autopilot', tags: 'mood modération newsletter quota', category: 'admin' },
  { title: 'Manuels auto IA', href: '/admin/manuals', tags: 'docs user admin video script', category: 'admin' },
  { title: 'Cerveau IA (RAG)', href: '/admin/ai/knowledge', tags: 'connaissance', category: 'admin' },
  { title: 'Live avatar IA', href: '/admin/ai/avatar', tags: 'avatar streaming', category: 'admin' },
  { title: 'Bot Telegram', href: '/admin/integrations/telegram', tags: 'bot commandes', category: 'admin' },
  { title: 'Intégrations', href: '/admin/integrations', tags: 'slack discord webhook', category: 'admin' },
  { title: 'Carte mondiale', href: '/admin/map', tags: 'géocodage map', category: 'admin' },
  { title: 'Affiches PDF', href: '/admin/posters', tags: 'pdf miniatures', category: 'admin' },
  { title: 'Actualités', href: '/admin/news', tags: 'articles news', category: 'admin' },
  { title: 'Pages riches', href: '/admin/pages', tags: 'cms pages', category: 'admin' },
  { title: 'Pages & blog', href: '/admin/content', tags: 'content articles', category: 'admin' },
  { title: 'Partenaires', href: '/admin/partners', tags: 'logos partenaires', category: 'admin' },
  { title: 'Dons', href: '/admin/donate', tags: 'donations stripe', category: 'admin' },
  { title: 'Connect dashboard', href: '/admin/connect', tags: 'connect réseau social', category: 'admin' },
  { title: 'Modération Connect', href: '/admin/connect/moderation', tags: 'posts hidden', category: 'admin' },
  { title: 'Utilisateurs', href: '/admin/users', tags: 'rôles users permissions', category: 'admin' },
  { title: 'Permissions menu', href: '/admin/menu-permissions', tags: 'rbac', category: 'admin' },
  { title: 'Setup mail (Gmail/DNS)', href: '/admin/mail-setup', tags: 'smtp gmail', category: 'admin' },
  { title: 'Thèmes saisonniers', href: '/admin/themes', tags: 'pride noel theme', category: 'admin' },
  { title: 'Feature flags', href: '/admin/features', tags: 'feature toggle', category: 'admin' },
  { title: 'Settings techniques', href: '/admin/settings', tags: 'api keys gemini stripe', category: 'admin' },
  { title: 'Dropshipping', href: '/admin/shop/dropshipping', tags: 'printful gelato', category: 'admin' },
  { title: 'Coupons & promos', href: '/admin/coupons', tags: 'coupon réduction', category: 'admin' },
  { title: 'Bannières hero', href: '/admin/banners', tags: 'hero carousel', category: 'admin' },
  { title: 'Vidéos YouTube', href: '/admin/videos', tags: 'youtube embed', category: 'admin' },
  { title: 'Espace pro', href: '/admin/pro', tags: 'venue owners', category: 'admin' }
];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim().toLowerCase();
  const scope = sp.get('scope') || 'all'; // all | admin | public

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], q });
  }

  // Vérifie si admin pour scope=admin
  let isAdmin = false;
  if (scope !== 'public') {
    const session = await getServerSession(authOptions);
    isAdmin = !!session?.user && ['ADMIN', 'EDITOR'].includes((session.user as any).role);
  }

  const results: Array<{ title: string; href: string; category: string; subtitle?: string }> = [];

  // 1. Pages statiques
  const staticPool = isAdmin ? [...STATIC_PAGES_ADMIN, ...STATIC_PAGES_PUBLIC] : STATIC_PAGES_PUBLIC;
  for (const p of staticPool) {
    const haystack = `${p.title} ${p.tags} ${p.href}`.toLowerCase();
    if (haystack.includes(q)) {
      results.push({ title: p.title, href: p.href, category: p.category });
    }
  }

  // 2. Venues (DB)
  if (results.length < 30) {
    try {
      const venues = await prisma.venue.findMany({
        where: {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { city: { contains: q, mode: 'insensitive' } }
          ],
          published: true
        },
        select: { name: true, slug: true, city: true, country: true, type: true },
        take: 8
      });
      for (const v of venues) {
        results.push({
          title: v.name,
          href: `/lieux/${v.slug}`,
          category: 'venue',
          subtitle: `${v.type} · ${v.city || '?'} · ${v.country || ''}`
        });
      }
    } catch {}
  }

  // 3. Posts forum (recherche dans content)
  if (results.length < 40) {
    try {
      const threads = await prisma.forumThread.findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } }
          ],
          status: 'active'
        },
        select: { title: true, slug: true, category: { select: { slug: true, name: true } } },
        take: 5
      });
      for (const t of threads) {
        results.push({
          title: t.title,
          href: `/forum/sujet/${t.slug}`,
          category: 'forum',
          subtitle: t.category?.name
        });
      }
    } catch {}
  }

  // 4. Événements à venir
  if (results.length < 50) {
    try {
      const events = await prisma.event.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          published: true,
          startsAt: { gte: new Date() }
        },
        select: { title: true, slug: true, startsAt: true, city: true },
        take: 5
      });
      for (const e of events) {
        results.push({
          title: e.title,
          href: `/agenda/${e.slug || e.title}`,
          category: 'event',
          subtitle: `${new Date(e.startsAt).toLocaleDateString('fr-FR')}${e.city ? ' · ' + e.city : ''}`
        });
      }
    } catch {}
  }

  return NextResponse.json({
    results: results.slice(0, 50),
    q,
    isAdmin
  });
}
