import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  ShieldAlert, Mail, Calendar, Sparkles, ShoppingBag, Eye,
  Package, Truck, Heart, Users, Image as ImageIcon, BarChart3
} from 'lucide-react';

function fmt(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    pending, approved, subs, scheduled, total,
    ordersAll, ordersPaid, ordersShipped, products,
    revenue, viewsTotal, viewsLast7d, viewsLast30d,
    topPagesRaw, topCountriesRaw, recentOrders, sparkRaw
  ] = await Promise.all([
    prisma.photo.count({ where: { status: 'PENDING' } }).catch(() => 0),
    prisma.photo.count({ where: { status: 'APPROVED' } }).catch(() => 0),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
    prisma.scheduledPost.count({ where: { status: 'PENDING', scheduledAt: { gte: now } } }).catch(() => 0),
    prisma.photo.count().catch(() => 0),
    prisma.order.count().catch(() => 0),
    prisma.order.count({ where: { status: 'PAID' } }).catch(() => 0),
    prisma.order.count({ where: { status: 'SHIPPED' } }).catch(() => 0),
    prisma.product.count({ where: { published: true } }).catch(() => 0),
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { in: ['PAID', 'SHIPPED'] } } }).catch(() => ({ _sum: { totalCents: 0 } })),
    prisma.pageView.count().catch(() => 0),
    prisma.pageView.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0),
    prisma.pageView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }).catch(() => 0),
    prisma.pageView.groupBy({
      by: ['path'], _count: { _all: true }, where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { _count: { path: 'desc' } }, take: 5
    }).catch(() => [] as any[]),
    prisma.pageView.groupBy({
      by: ['country'], _count: { _all: true }, where: { createdAt: { gte: thirtyDaysAgo }, country: { not: null } },
      orderBy: { _count: { country: 'desc' } }, take: 5
    }).catch(() => [] as any[]),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { items: true } }).catch(() => [] as any[]),
    prisma.$queryRaw<Array<{ day: Date; n: bigint }>>`
      SELECT DATE_TRUNC('day', "createdAt") AS day, COUNT(*)::bigint AS n
      FROM "PageView"
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY day ORDER BY day ASC
    `.catch(() => [] as any[])
  ]);

  const totalRevenue = (revenue as any)?._sum?.totalCents || 0;
  const sparkData: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayKey = d.toISOString().slice(0, 10);
    const found = sparkRaw.find((r: any) => new Date(r.day).toISOString().slice(0, 10) === dayKey);
    sparkData.push(found ? Number((found as any).n) : 0);
  }

  const groupVentes = [
    { label: 'Commandes total', value: ordersAll, icon: ShoppingBag, gradient: 'from-pink-500 to-rose-500', href: '/admin/shop/orders' },
    { label: 'Commandes payées', value: ordersPaid, icon: Heart, gradient: 'from-cyan-500 to-blue-500', href: '/admin/shop/orders' },
    { label: 'Commandes expédiées', value: ordersShipped, icon: Truck, gradient: 'from-violet-500 to-purple-500', href: '/admin/shop/orders' },
    { label: "Chiffre d'affaires", value: fmt(totalRevenue), icon: BarChart3, gradient: 'from-emerald-500 to-green-500', href: '/admin/shop/orders' },
    { label: 'Produits actifs', value: products, icon: Package, gradient: 'from-amber-500 to-orange-500', href: '/admin/shop' }
  ];

  const groupAudience = [
    { label: 'Vues totales', value: viewsTotal, icon: Eye, gradient: 'from-blue-500 to-indigo-500' },
    { label: 'Vues 7 jours', value: viewsLast7d, icon: BarChart3, gradient: 'from-pink-500 to-fuchsia-500' },
    { label: 'Vues 30 jours', value: viewsLast30d, icon: BarChart3, gradient: 'from-violet-500 to-pink-500' },
    { label: 'Abonnés newsletter', value: subs, icon: Mail, gradient: 'from-rose-500 to-pink-500', href: '/admin/newsletter' }
  ];

  const groupContenu = [
    { label: 'Photos en modération', value: pending, icon: ShieldAlert, gradient: 'from-amber-500 to-yellow-500', href: '/admin/moderation', badge: pending > 0 ? '!' : null },
    { label: 'Photos publiées', value: approved, icon: ImageIcon, gradient: 'from-emerald-500 to-teal-500', href: '/admin/moderation?status=APPROVED' },
    { label: 'Total contributions', value: total, icon: Users, gradient: 'from-cyan-500 to-blue-500', href: '/admin/moderation' },
    { label: 'Posts programmés', value: scheduled, icon: Calendar, gradient: 'from-violet-500 to-purple-500', href: '/admin/calendar' }
  ];

  // Check si setup incomplet (au moins 1 indispensable manquant)
  const setupSettings = await prisma.setting.findMany({
    where: { key: { in: ['integrations.gemini.apiKey', 'integrations.resend.apiKey'] } }
  }).catch(() => []);
  const hasGemini = setupSettings.some((x) => x.key === 'integrations.gemini.apiKey' && !!x.value);
  const hasResend = setupSettings.some((x) => x.key === 'integrations.resend.apiKey' && !!x.value);
  const setupIncomplete = !hasGemini || !hasResend;

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-10">
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-1">Tableau de bord</h1>
        <p className="text-zinc-400">Bienvenue, <strong>{s.user?.name || s.user?.email}</strong> · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </header>

      {/* Bandeau Assistant si config incomplète */}
      {setupIncomplete && (
        <a href="/admin/setup" className="block bg-gradient-to-r from-brand-pink via-violet-500 to-cyan-500 rounded-2xl p-5 hover:scale-[1.01] transition shadow-xl">
          <div className="flex items-center gap-4 text-white">
            <div className="bg-white/20 rounded-xl p-3"><Sparkles size={28} /></div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">🚀 Configure ton site en 5 minutes</h2>
              <p className="text-sm text-white/90">Il manque {!hasGemini && 'la clé Gemini'}{!hasGemini && !hasResend && ' et '}{!hasResend && 'Resend (email)'} pour activer toutes les fonctions. L'assistant te guide étape par étape.</p>
            </div>
            <span className="bg-white text-brand-pink font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap">Démarrer →</span>
          </div>
        </a>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-3 flex items-center gap-2"><ShoppingBag size={14} /> Boutique &amp; Ventes</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {groupVentes.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-3 flex items-center gap-2"><Eye size={14} /> Audience &amp; Visites</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {groupAudience.map((c) => <StatCard key={c.label} {...c} />)}
          </div>
          <Sparkline data={sparkData} />
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-3 flex items-center gap-2"><ImageIcon size={14} /> Photos &amp; Contenu</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {groupContenu.map((c) => <StatCard key={c.label} {...c} />)}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-brand-pink" /> Top pages (30j)</h3>
          {topPagesRaw.length === 0 ? (
            <p className="text-zinc-500 text-sm italic">Pas encore de données. Le tracking commence dès la 1re visite.</p>
          ) : (
            <ol className="space-y-2">
              {topPagesRaw.map((p: any, i: number) => (
                <li key={p.path} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-zinc-500 font-bold">{i + 1}</span>
                  <code className="flex-1 text-zinc-300 truncate">{p.path}</code>
                  <span className="font-bold text-brand-pink">{p._count?._all ?? p._count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2">🌍 Top pays (30j)</h3>
          {topCountriesRaw.length === 0 ? (
            <p className="text-zinc-500 text-sm italic">Géolocalisation visiteurs : nécessite Cloudflare/Vercel devant.</p>
          ) : (
            <ol className="space-y-2">
              {topCountriesRaw.map((c: any, i: number) => (
                <li key={c.country || i} className="flex items-center gap-3 text-sm">
                  <span className="w-6 text-zinc-500 font-bold">{i + 1}</span>
                  <span className="flex-1 text-zinc-300">{c.country || '—'}</span>
                  <span className="font-bold text-brand-pink">{c._count?._all ?? c._count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {recentOrders.length > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingBag size={16} className="text-brand-pink" /> Dernières commandes</h3>
          <div className="space-y-2">
            {recentOrders.map((o: any) => (
              <a key={o.id} href={`/admin/shop/orders/${o.id}`}
                 className="flex items-center gap-3 p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm transition">
                <span className="font-mono text-zinc-500">#{o.id.slice(0, 8)}</span>
                <span className="flex-1 truncate">{o.email}</span>
                <span className="text-xs text-zinc-400">{o.items.length} article{o.items.length > 1 ? 's' : ''}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${o.status === 'SHIPPED' ? 'bg-violet-500/20 text-violet-300' : o.status === 'PAID' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'}`}>{o.status}</span>
                <span className="font-bold text-brand-pink">{fmt(o.totalCents)}</span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-3">Raccourcis</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <Quick href="/admin/moderation" label="Modérer photos" icon={ShieldAlert} />
          <Quick href="/admin/shop" label="Boutique" icon={ShoppingBag} />
          <Quick href="/admin/shop/orders" label="Commandes" icon={Truck} />
          <Quick href="/admin/calendar" label="Calendrier social" icon={Calendar} />
          <Quick href="/admin/newsletter" label="Newsletter" icon={Mail} />
          <Quick href="/admin/ai" label="Studio IA" icon={Sparkles} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, gradient, href, badge }: any) {
  const inner = (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${gradient} text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition cursor-pointer h-full`}>
      <div className="flex items-start justify-between mb-3">
        <Icon size={22} className="opacity-90" />
        {badge && <span className="bg-white text-rose-500 rounded-full w-5 h-5 text-[10px] font-bold flex items-center justify-center animate-pulse">{badge}</span>}
      </div>
      <div className="text-2xl md:text-3xl font-bold leading-none mb-1">{value}</div>
      <div className="text-[11px] uppercase tracking-wider opacity-90 font-semibold">{label}</div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function Quick({ href, label, icon: Icon }: any) {
  return (
    <a href={href} className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-brand-pink/40 rounded-xl px-4 py-3 transition">
      <Icon size={16} className="text-brand-pink" />
      <span className="text-sm font-bold">{label}</span>
    </a>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 280, h = 100, pad = 6;
  const points = data.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1);
    const y = h - pad - ((v / max) * (h - 2 * pad));
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="bg-gradient-to-br from-brand-pink/10 to-violet-500/10 border border-brand-pink/30 rounded-2xl p-4">
      <p className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-2">Visites · 7 derniers jours</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
        <defs>
          <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FF2BB1" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF2BB1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={points} fill="none" stroke="#FF2BB1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polygon points={`${pad},${h - pad} ${points} ${w - pad},${h - pad}`} fill="url(#spark)" />
      </svg>
      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
        <span>il y a 7j</span>
        <span className="font-bold text-brand-pink">Total : {data.reduce((a, b) => a + b, 0)}</span>
        <span>aujourd&apos;hui</span>
      </div>
    </div>
  );
}
