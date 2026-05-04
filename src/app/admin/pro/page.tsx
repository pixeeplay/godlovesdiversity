import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import {
  Building2, Calendar, Tag, Star, BarChart3, Sparkles, Facebook, Eye,
  TrendingUp, Users, MessageSquare, Plus, ArrowRight, AlertTriangle, Zap
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProDashboardPage() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/admin/pro');
  const userId = (s.user as any).id;
  const userRole = (s.user as any).role;
  const isAdmin = userRole === 'ADMIN';

  let venues: any[] = [];
  let events: any[] = [];
  let coupons: any[] = [];
  let reviews: any[] = [];
  let totalViews = 0;
  let upcomingCount = 0;

  try {
    venues = await prisma.venue.findMany({
      where: isAdmin ? {} : { ownerId: userId },
      include: { _count: { select: { events: true, coupons: true } } },
      take: 50
    });
    if (venues.length > 0) {
      const venueIds = venues.map(v => v.id);
      events = await prisma.event.findMany({
        where: { venueId: { in: venueIds } },
        orderBy: { startsAt: 'asc' },
        take: 5
      });
      upcomingCount = await prisma.event.count({
        where: { venueId: { in: venueIds }, startsAt: { gte: new Date() }, published: true }
      });
      coupons = await prisma.venueCoupon.findMany({
        where: { venueId: { in: venueIds }, active: true },
        take: 10
      });
      reviews = await prisma.productReview.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).catch(() => []);
      totalViews = venues.reduce((s, v) => s + (v.views || 0), 0);
    }
  } catch { /* migration */ }

  return (
    <div className="p-6 md:p-8 max-w-[1400px] space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl p-3 shadow-lg shadow-fuchsia-500/30">
            <Building2 size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold leading-none">Espace Pro</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Gère tes lieux LGBT-friendly, événements, coupons, avis. {isAdmin && <span className="text-fuchsia-400 font-bold">· Vue super-admin</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/pro/events" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
            <Plus size={14} /> Événement
          </Link>
        </div>
      </header>

      {venues.length === 0 ? (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
          <Sparkles size={48} className="text-zinc-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Tu n'as pas encore de lieu référencé</h2>
          <p className="text-zinc-400 text-sm mb-4 max-w-2xl mx-auto">
            Tu gères un restaurant, bar, café, lieu de culte, hôtel ou boutique LGBT-friendly ?
            Soumets ton lieu : tu pourras gérer ta fiche, créer tes événements, offrir des coupons à la communauté GLD, et utiliser nos outils IA.
          </p>
          <Link href="/contact?sujet=Demande+inscription+lieu+pro" className="inline-block bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold px-5 py-2.5 rounded-full text-sm">
            Demander mon accès pro
          </Link>
        </section>
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI icon={Building2} value={venues.length}      label={isAdmin ? 'Lieux (tous)' : 'Mes lieux'}    color="violet"   href="/admin/pro/venues" />
            <KPI icon={Calendar}  value={upcomingCount}       label="Events à venir"     color="fuchsia"  href="/admin/pro/events" />
            <KPI icon={Tag}       value={coupons.length}      label="Coupons actifs"     color="pink"     href="/admin/pro/coupons" />
            <KPI icon={Eye}       value={totalViews}          label="Vues totales lieux" color="cyan"     href="/admin/pro/analytics" />
          </section>

          {/* Quick actions IA */}
          <section className="bg-gradient-to-br from-violet-500/10 via-fuchsia-500/10 to-pink-500/10 border border-fuchsia-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={16} className="text-fuchsia-400" />
              <h2 className="font-bold text-base">Studio IA Pro · Outils intelligents</h2>
              <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full">Gemini 2.0</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AIToolCard icon={Sparkles}    title="Décrire mon lieu"        desc="IA rédige description optimisée 4 langues" href="/admin/pro/ai-studio?tool=describe-venue" />
              <AIToolCard icon={Calendar}    title="Idées d'événements"      desc="Suggestions sur-mesure pour mon type de lieu" href="/admin/pro/ai-studio?tool=event-ideas" />
              <AIToolCard icon={MessageSquare} title="Répondre aux avis"     desc="Réponses personnalisées et bienveillantes" href="/admin/pro/ai-studio?tool=reply-reviews" />
              <AIToolCard icon={Tag}         title="Générer des tags"        desc="Tags optimisés SEO pour mon lieu" href="/admin/pro/ai-studio?tool=generate-tags" />
              <AIToolCard icon={Facebook}    title="Importer events Facebook" desc="Bookmarklet · email · sync feed" href="/admin/pro/import-events" />
              <AIToolCard icon={TrendingUp}  title="Analyse sentiment"       desc="Tendances avis + recommandations" href="/admin/pro/ai-studio?tool=sentiment" />
            </div>
          </section>

          {/* Mes lieux + events à venir */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Mes lieux */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm flex items-center gap-2"><Building2 size={14} className="text-violet-400" /> Mes lieux ({venues.length})</h2>
                <Link href="/admin/pro/venues" className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1">Tous <ArrowRight size={11} /></Link>
              </div>
              <div className="space-y-2">
                {venues.slice(0, 5).map(v => (
                  <Link key={v.id} href={`/admin/pro/venues#${v.id}`} className="block p-3 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-fuchsia-500/40 transition">
                    <div className="font-bold text-sm truncate">{v.name}</div>
                    <div className="flex gap-3 text-[10px] text-zinc-500 mt-1">
                      <span>📍 {v.city || '?'}</span>
                      <span>📅 {v._count?.events || 0} events</span>
                      <span>🏷 {v._count?.coupons || 0} coupons</span>
                      <span>👁 {v.views || 0} vues</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Events à venir */}
            <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm flex items-center gap-2"><Calendar size={14} className="text-fuchsia-400" /> Prochains événements</h2>
                <Link href="/admin/pro/events" className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1">Tous <ArrowRight size={11} /></Link>
              </div>
              {events.length === 0 ? (
                <div className="text-zinc-500 text-xs text-center py-6">
                  Aucun événement encore.
                  <Link href="/admin/pro/events" className="text-fuchsia-400 hover:underline ml-1">Créer le premier →</Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 5).map(e => {
                    const start = new Date(e.startsAt);
                    return (
                      <div key={e.id} className="flex items-center gap-3 p-2 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <div className="w-10 text-center bg-zinc-900 rounded-lg p-1.5 shrink-0">
                          <div className="text-base font-bold text-fuchsia-400 leading-none">{start.getDate()}</div>
                          <div className="text-[8px] text-zinc-500 uppercase">{start.toLocaleDateString('fr-FR', { month: 'short' })}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate">{e.title}</div>
                          <div className="text-[10px] text-zinc-500">{start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {e.location || e.city || '?'}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${e.published ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {e.published ? 'PUB' : 'BR'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Avis en attente */}
          {reviews.length > 0 && (
            <section className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-sm flex items-center gap-2 text-amber-200"><AlertTriangle size={14} /> {reviews.length} avis en attente de modération</h2>
                <Link href="/admin/pro/reviews" className="text-xs text-amber-300 hover:underline flex items-center gap-1">Modérer <ArrowRight size={11} /></Link>
              </div>
              <p className="text-[11px] text-amber-200/80">Approuve, réponds avec l'IA, ou rejette en 1 clic.</p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function KPI({ icon: Icon, value, label, color, href }: any) {
  return (
    <Link href={href} className={`bg-zinc-900 border border-zinc-800 hover:border-${color}-500/40 transition rounded-2xl p-4 block`}>
      <Icon size={18} className={`text-${color}-400 mb-2`} />
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </Link>
  );
}

function AIToolCard({ icon: Icon, title, desc, href }: any) {
  return (
    <Link href={href} className="bg-zinc-900/80 hover:bg-zinc-900 border border-fuchsia-500/20 hover:border-fuchsia-500/50 rounded-xl p-3 transition group">
      <div className="flex items-start gap-2.5">
        <Icon size={18} className="text-fuchsia-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="font-bold text-sm text-white group-hover:text-fuchsia-300 transition">{title}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{desc}</div>
        </div>
      </div>
    </Link>
  );
}
