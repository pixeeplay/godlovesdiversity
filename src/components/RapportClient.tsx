'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, Users, MapPin, MessageSquare, Image as ImageIcon, ShoppingBag, Calendar, ShieldCheck, Sparkles, Download, Share2, CheckCircle2, AlertTriangle, Clock, Zap, Lock, Briefcase } from 'lucide-react';

type Stats = {
  users: number; venues: number; posts: number; photos: number;
  testimonies: number; products: number; orders: number; donations: number;
  events: number; connectProfiles: number; connectMatches: number; connectMessages: number;
};

export function RapportClient({ stats }: { stats: Stats }) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const [shareUrl] = useState(typeof window !== 'undefined' ? window.location.href : '');

  // Charge Chart.js APRÈS render initial — protégé par try/catch pour ne pas casser le reste
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.async = true;
    script.onload = () => { if (!cancelled) try { drawCharts(); } catch (e) { console.warn('Charts skipped:', e); } };
    script.onerror = () => console.warn('Chart.js CDN bloqué — graphiques non affichés');
    document.body.appendChild(script);
    return () => { cancelled = true; script.remove(); };

    function drawCharts() {
      const Chart = (window as any).Chart;
      if (!Chart) return;

      if (chartRef.current) {
        new Chart(chartRef.current, {
          type: 'bar',
          data: {
            labels: ['Mur social', 'Rencontres', 'Pro', 'Inclusif', 'Spirituel', 'IA modération', 'Multi-religieux', 'Open source', 'Premium 5€'],
            datasets: [
              { label: 'GLD Connect', data: [10, 9, 9, 10, 10, 10, 10, 8, 10], backgroundColor: '#d4537e' },
              { label: 'Facebook',    data: [10, 0, 0, 4,  2,  6,  4,  0, 0], backgroundColor: '#1877f2' },
              { label: 'Tinder',      data: [0,  10, 0, 5,  0,  6,  0,  0, 4], backgroundColor: '#fe5268' },
              { label: 'LinkedIn',    data: [6,  0,  10, 5,  0,  7,  0,  0, 8], backgroundColor: '#0a66c2' }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, max: 10, ticks: { color: '#a1a1aa' } }, x: { ticks: { color: '#a1a1aa' } } },
            plugins: { legend: { labels: { color: '#fff' } } }
          }
        });
      }

      if (radarRef.current) {
        new Chart(radarRef.current, {
          type: 'radar',
          data: {
            labels: ['Frontend', 'Backend', 'Sécurité', 'Mobile', 'IA', 'i18n', 'Modération', 'PWA', 'Paiements', 'Communauté'],
            datasets: [{ label: 'Couverture GLD', data: [95, 92, 75, 70, 90, 100, 80, 60, 85, 88], backgroundColor: 'rgba(212,83,126,0.2)', borderColor: '#d4537e', borderWidth: 2 }]
          },
          options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true, max: 100, pointLabels: { color: '#fff' }, ticks: { color: '#a1a1aa', backdropColor: 'transparent' } } }, plugins: { legend: { labels: { color: '#fff' } } } }
        });
      }
    }
  }, []);

  function downloadPDF() { window.print(); }
  function share() {
    if (navigator.share) navigator.share({ title: 'GLD — Rapport projet', url: shareUrl });
    else { navigator.clipboard.writeText(shareUrl); alert('Lien copié !'); }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#fafafa', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Inline styles inline minimum pour garantir l'affichage MEME si Tailwind ne charge pas */}
      <style>{`
        @media print { body { background: white !important; color: black !important; } .no-print { display: none !important; } .page-break { page-break-after: always; } }
        a { color: #f0abfc; }
      `}</style>

      {/* Fallback contenu si Tailwind/JS plante (visible immédiatement) */}
      <noscript style={{ display: 'block', padding: 24, color: 'white', background: '#7f1d1d' }}>
        ⚠ JavaScript désactivé — certaines parties (graphiques, partage) ne s'affichent pas.
      </noscript>

      {/* HERO */}
      <header className="relative overflow-hidden border-b border-zinc-800" style={{ borderBottom: '1px solid #27272a' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/20 via-violet-500/15 to-cyan-500/10" />
        <div className="relative max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between gap-4 flex-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between' }}>
            <div>
              <div className="text-xs uppercase tracking-widest text-fuchsia-300 font-bold mb-2" style={{ fontSize: 11, color: '#f0abfc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Rapport projet · {new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })}</div>
              <h1 className="text-4xl font-display font-black mb-2" style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>🌈 parislgbt</h1>
              <p className="text-lg text-zinc-300 max-w-2xl" style={{ fontSize: 18, color: '#d4d4d8', maxWidth: 640 }}>Le réseau social inclusif religieux LGBT+ — état du projet, fonctionnalités live, sécurité, et prochaines évolutions.</p>
            </div>
            <div className="flex gap-2 no-print">
              <button onClick={share} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2">
                <Share2 size={14} /> Partager
              </button>
              <button onClick={downloadPDF} className="bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg shadow-fuchsia-500/30">
                <Download size={14} /> Télécharger PDF
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Pill icon={CheckCircle2} color="emerald" label="EN PROD" />
            <Pill icon={Zap} color="violet" label="Next.js 14 + Prisma + Postgres" />
            <Pill icon={Lock} color="amber" label="RGPD + 2FA + Modération IA" />
            <Pill icon={ShieldCheck} color="cyan" label="153 features livrées" />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* STATS LIVE */}
        <section>
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2"><Zap className="text-amber-400" /> Statistiques live (DB prod)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Users}        label="Utilisateurs"         value={stats.users}            color="from-fuchsia-500 to-pink-500" />
            <Stat icon={MapPin}       label="Établissements"        value={stats.venues}           color="from-emerald-500 to-cyan-500" />
            <Stat icon={MessageSquare} label="Posts forum"          value={stats.posts}            color="from-violet-500 to-purple-600" />
            <Stat icon={ImageIcon}    label="Photos"                value={stats.photos}           color="from-amber-500 to-orange-500" />
            <Stat icon={ShoppingBag}  label="Produits boutique"     value={stats.products}         color="from-cyan-500 to-blue-500" />
            <Stat icon={Heart}        label="Profils Connect"       value={stats.connectProfiles} color="from-rose-500 to-fuchsia-500" />
            <Stat icon={Calendar}     label="Événements"            value={stats.events}           color="from-orange-500 to-red-500" />
            <Stat icon={Briefcase}    label="Témoignages vidéo"     value={stats.testimonies}      color="from-blue-500 to-indigo-600" />
          </div>
        </section>

        {/* COMPARAISON CHART */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-2xl font-display font-bold mb-1 flex items-center gap-2"><Sparkles className="text-fuchsia-400" /> Comparaison vs concurrents</h2>
          <p className="text-sm text-zinc-400 mb-4">GLD Connect face à Facebook · Tinder · LinkedIn — note sur 10 par fonctionnalité.</p>
          <div className="h-72"><canvas ref={chartRef} /></div>
          <p className="text-xs text-zinc-500 mt-3">💡 GLD est le seul à combiner les 3 modes (social + rencontres + pro) avec un focus inclusif religieux et une modération IA dédiée.</p>
        </section>

        {/* COUVERTURE FONCTIONNELLE */}
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h2 className="text-xl font-display font-bold mb-3">📊 Couverture fonctionnelle</h2>
            <div className="h-72"><canvas ref={radarRef} /></div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-2">
            <h2 className="text-xl font-display font-bold mb-3">✅ Modules en production</h2>
            {[
              ['Front public multi-langue (FR/EN/ES/PT)', 'done'],
              ['Back-office admin complet (avatar, contenu, RAG)', 'done'],
              ['Espace pro venues LGBT-friendly', 'done'],
              ['Annuaire 2933 établissements importés', 'done'],
              ['Boutique + Stripe/HelloAsso/Square + dropshipping', 'done'],
              ['Forum + témoignages + cercles de prière', 'done'],
              ['Bot Telegram (40+ commandes IA)', 'done'],
              ['SOS LGBT (114 / 3018 / 3020 / multi-pays)', 'done'],
              ['Mode voyage safe (88 pays hostiles)', 'done'],
              ['IA Gemini (texte + image + RAG + modération)', 'done'],
              ['Avatar vocal "Voix divine" + LiveAvatar', 'done'],
              ['Mode calculatrice (déguisement)', 'done'],
              ['Réseau social Connect (3 modes)', 'done'],
              ['Mon Espace user (30 sous-pages)', 'done'],
              ['2FA TOTP + sessions + RGPD export', 'done'],
              ['PWA installable + offline', 'partial']
            ].map(([label, status]) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                {status === 'done' ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" /> : <Clock size={14} className="text-amber-400 flex-shrink-0" />}
                <span className={status === 'done' ? 'text-zinc-200' : 'text-amber-300'}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* SÉCURITÉ */}
        <section className="page-break bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-blue-500/10 border border-emerald-500/30 rounded-3xl p-6">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2"><ShieldCheck className="text-emerald-400" /> Sécurité & conformité</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <SecurityRow icon={Lock} label="Authentification" status="done" desc="NextAuth + bcrypt + JWT, mot de passe 8+ chars obligatoire" />
            <SecurityRow icon={ShieldCheck} label="2FA TOTP" status="done" desc="Compatible Google Authenticator / Authy / 1Password" />
            <SecurityRow icon={Lock} label="Sessions" status="done" desc="Liste + révocation 1-clic + expiry tracking" />
            <SecurityRow icon={ShieldCheck} label="Rôles" status="done" desc="ADMIN / EDITOR / MODERATOR / VIEWER + middleware bloquant" />
            <SecurityRow icon={ShieldCheck} label="Modération IA" status="done" desc="Gemini auto sur 100% posts/messages (haine, doxx, harcèlement)" />
            <SecurityRow icon={Lock} label="RGPD" status="done" desc="Export complet + suppression compte (Right to be forgotten)" />
            <SecurityRow icon={ShieldCheck} label="Géo-blocage" status="done" desc="88 pays hostiles → mode rencontres masqué automatiquement" />
            <SecurityRow icon={Lock} label="HTTPS + Let's Encrypt" status="done" desc="Auto-renew via Coolify + HSTS" />
            <SecurityRow icon={ShieldCheck} label="Signalement 1-clic" status="done" desc="Sur posts, messages, profils → file modération admin" />
            <SecurityRow icon={Lock} label="Block utilisateur" status="done" desc="Mutuel, masque tous contenus + matchs" />
            <SecurityRow icon={Clock} label="DKIM/SPF/DMARC mail" status="partial" desc="À configurer chez ton registrar (guide /admin/mail-setup)" />
            <SecurityRow icon={Clock} label="Audit log complet" status="partial" desc="AuditLog en place, dashboard d'audit à finaliser" />
          </div>
        </section>

        {/* ROADMAP */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2"><Sparkles className="text-violet-400" /> Roadmap — prochaines évolutions</h2>

          <Phase color="emerald" label="🚀 Sprint 1 — 2 semaines" items={[
            'Migration prod schema Connect (10 tables) + tests E2E',
            'Stripe Premium 5€/mois activé + webhooks',
            'Migadu/Gmail mail server config + DKIM/SPF/DMARC',
            'Géocodage des 2933 venues (Nominatim, ~55 min)',
            'PWA install prompt + push notifs natives'
          ]} />

          <Phase color="violet" label="✨ Sprint 2 — 1 mois" items={[
            'Page profil public /connect/profil/[handle] avec onglets',
            'Comments threads sur posts mur',
            'Search global Connect (membres, pros, posts)',
            'Stories éphémères 24h (Instagram-like)',
            'Vidéo-call WebRTC peer-to-peer pour matchs/mentors'
          ]} />

          <Phase color="rose" label="💜 Sprint 3 — 2-3 mois" items={[
            'App mobile native iOS/Android (React Native ou wrapper Capacitor)',
            'Algo IA matching personnalisé (cosine similarity sur profils)',
            'Espace bénévoles + gestion missions terrain',
            'Crowdfunding intégré pour les associations partenaires',
            'Annuaire pros vérifiés tier-3 (avocats/thérapeutes certifiés)'
          ]} />

          <Phase color="amber" label="🌍 Sprint 4 — 6 mois" items={[
            'Plateforme événements live (streaming Pride, conférences)',
            'Marketplace artisans inclusifs (Etsy-like)',
            'Programme Ambassadeurs + parrainage gamifié',
            'Fonds de solidarité crisis (sortie famille rejet)',
            'Expansion EN/ES/PT communautés internationales'
          ]} />
        </section>

        {/* RISQUES */}
        <section className="bg-rose-500/5 border border-rose-500/30 rounded-3xl p-6">
          <h2 className="text-2xl font-display font-bold mb-4 flex items-center gap-2"><AlertTriangle className="text-rose-400" /> Risques identifiés & mitigations</h2>
          <div className="space-y-3 text-sm">
            <Risk title="Modération échelle" desc="Si 1000+ users actifs, le filtre IA seul ne suffira pas. Mitigation : équipe humaine 2-3 modérateurs payés au lance-pierre + escalade auto sur signalements répétés." />
            <Risk title="Pays hostiles → utilisateurs en danger" desc="Géo-blocage Rencontres + Mode calculatrice + SOS multi-pays + chiffrement messages bout-en-bout (à venir)." />
            <Risk title="Réputation IP envoi mail" desc="Recommandation : Migadu/Gmail Workspace plutôt que self-host. Évite blacklist." />
            <Risk title="Coûts IA croissants" desc="Cap journalier Gemini par user + cache RAG + downgrade vers Flash si quota approche." />
            <Risk title="Dépendance Coolify/OVH" desc="Backups DB toutes les 6h vers S3 externe. Migration Vercel/Render possible si besoin (1 jour)." />
          </div>
        </section>

        {/* IDENTITÉ TECH */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
          <h2 className="text-2xl font-display font-bold mb-4">🛠 Stack technique</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <Tech title="Frontend" items={['Next.js 14.2 App Router', 'React 18', 'Tailwind CSS', 'TypeScript strict']} />
            <Tech title="Backend" items={['Prisma 5 + PostgreSQL', 'NextAuth (JWT)', 'Routes API serveur', 'Edge middleware (i18n + auth)']} />
            <Tech title="Infra" items={['Coolify (Docker auto)', 'OVH VPS Paris', 'MinIO S3 + Cloudflare CDN', 'Let\'s Encrypt auto']} />
            <Tech title="IA" items={['Gemini 2.0 Flash (texte)', 'Imagen 3 (images)', 'fal.ai (Higgsfield vidéo)', 'Web Speech API (voix)']} />
            <Tech title="Paiement" items={['Stripe Subscriptions', 'HelloAsso (assoc.)', 'Square + Apple Pay', 'Webhooks vérifiés']} />
            <Tech title="Communication" items={['Resend / SMTP relay', 'Telegram Bot API', 'Web Push (futur)', 'SSE temps-réel']} />
          </div>
        </section>

        {/* FOOTER */}
        <footer className="text-center text-xs text-zinc-500 pt-8 border-t border-zinc-800">
          <p>Rapport généré le {new Date().toLocaleDateString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })} — données live depuis la base de production</p>
          <p className="mt-2">🌈 <a href="https://gld.pixeeplay.com" className="text-fuchsia-400 hover:underline">gld.pixeeplay.com</a> — parislgbt</p>
        </footer>
      </main>
    </div>
  );
}

function Pill({ icon: Icon, color, label }: any) {
  const colors: any = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    violet:  'bg-violet-500/20 text-violet-300 border-violet-400/30',
    amber:   'bg-amber-500/20 text-amber-300 border-amber-400/30',
    cyan:    'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
  };
  return <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${colors[color]}`}><Icon size={11} /> {label}</span>;
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${color} text-white shadow-lg`}>
      <Icon size={20} className="opacity-90 mb-2" />
      <div className="text-3xl font-bold leading-none mb-1">{value.toLocaleString('fr-FR')}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{label}</div>
    </div>
  );
}

function SecurityRow({ icon: Icon, label, status, desc }: any) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-start gap-2">
        <Icon size={14} className={status === 'done' ? 'text-emerald-400 mt-0.5' : 'text-amber-400 mt-0.5'} />
        <div className="flex-1">
          <div className="font-bold text-sm flex items-center gap-2">
            {label}
            {status === 'done' ? <CheckCircle2 size={11} className="text-emerald-400" /> : <Clock size={11} className="text-amber-400" />}
          </div>
          <div className="text-xs text-zinc-400">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function Phase({ color, label, items }: { color: string; label: string; items: string[] }) {
  const colors: any = {
    emerald: 'border-emerald-400/30 bg-emerald-500/5',
    violet:  'border-violet-400/30 bg-violet-500/5',
    rose:    'border-rose-400/30 bg-rose-500/5',
    amber:   'border-amber-400/30 bg-amber-500/5'
  };
  return (
    <div className={`border-l-4 pl-4 mb-5 ${colors[color]} -mx-4 px-4 py-3 rounded-r-xl`}>
      <h3 className="font-bold mb-2">{label}</h3>
      <ul className="space-y-1 text-sm text-zinc-300">{items.map((it, i) => <li key={i} className="flex items-start gap-2"><span className="text-zinc-500 mt-1">▸</span> {it}</li>)}</ul>
    </div>
  );
}

function Risk({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="bg-zinc-950/60 border border-rose-500/20 rounded-lg p-3">
      <div className="font-bold text-sm text-rose-200 mb-1">⚠ {title}</div>
      <div className="text-xs text-zinc-300">{desc}</div>
    </div>
  );
}

function Tech({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <h3 className="font-bold text-sm mb-2 text-fuchsia-300">{title}</h3>
      <ul className="text-xs text-zinc-400 space-y-1">{items.map((it, i) => <li key={i}>• {it}</li>)}</ul>
    </div>
  );
}
