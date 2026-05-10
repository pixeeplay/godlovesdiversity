'use client';
import { useEffect, useState } from 'react';
import {
  Loader2, Plus, RefreshCw, Heart, Briefcase, TrendingUp, Target,
  Globe, Tag, Activity, CheckCircle2, AlertTriangle, Clock, Play
} from 'lucide-react';
import Link from 'next/link';

interface Stats {
  total: number;
  monthCount: number;
  last30Count: number;
  sparkline: number[];
  b2c: { count: number; goal: number; percent: number };
  b2b: { count: number; goal: number; percent: number };
  topSources: [string, number][];
  topTags: [string, number][];
  statusMap: Record<string, number>;
  avgScore: number;
}

interface Job {
  id: string;
  name: string;
  source: string;
  status: string;
  progress: number;
  totalLeads: number;
  lastRunAt: string | null;
  lastRunCount: number | null;
  result: any;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_META: Record<string, { color: string; label: string; icon: any }> = {
  idle:    { color: 'zinc',    label: 'Idle',     icon: Clock },
  queued:  { color: 'amber',   label: 'En file', icon: Clock },
  running: { color: 'sky',     label: 'En cours', icon: Loader2 },
  done:    { color: 'emerald', label: 'Terminé',  icon: CheckCircle2 },
  error:   { color: 'rose',    label: 'Erreur',   icon: AlertTriangle }
};

export function LeadsScraperDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [s, j] = await Promise.all([
      fetch('/api/admin/leads/stats', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/admin/leads/scraper/jobs', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ jobs: [] }))
    ]);
    setStats(s);
    setJobs(j.jobs || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-fuchsia-600 via-violet-600 to-cyan-600 rounded-2xl p-5 mb-4 relative overflow-hidden ring-1 ring-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,.2),transparent)]" />
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl">🕷️</div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-black text-white tracking-tight">Scraper Leads</h1>
            <p className="text-white/85 text-sm mt-0.5">
              Agent contacts pour photographe de mariage — cible 1000 leads/mois
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/admin/leads/scraper/new" className="bg-white hover:bg-zinc-100 text-fuchsia-600 font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl">
              <Plus size={13} /> Nouveau scrape
            </Link>
            <button onClick={load} className="bg-white/15 hover:bg-white/25 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Link href="/admin/leads" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">🎯</div>
          <p className="text-xs font-bold text-white">Leads</p>
          <p className="text-[10px] text-zinc-500">CRM</p>
        </Link>
        <Link href="/admin/leads/scraper" className="bg-fuchsia-500/10 ring-1 ring-fuchsia-500/40 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">🕷️</div>
          <p className="text-xs font-bold text-fuchsia-300">Scraper</p>
          <p className="text-[10px] text-fuchsia-400/70">Dashboard</p>
        </Link>
        <Link href="/admin/leads/scraper/new" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">✨</div>
          <p className="text-xs font-bold text-white">Wizard</p>
          <p className="text-[10px] text-zinc-500">Nouveau</p>
        </Link>
        <Link href="/admin/leads/templates" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">📧</div>
          <p className="text-xs font-bold text-white">Templates</p>
          <p className="text-[10px] text-zinc-500">B2B / DM</p>
        </Link>
        <Link href="/admin/leads/legal" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-amber-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">⚖️</div>
          <p className="text-xs font-bold text-white">Légal</p>
          <p className="text-[10px] text-zinc-500">RGPD</p>
        </Link>
      </div>

      {/* Stats cards B2C/B2B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <GoalCard
          icon={Heart}
          color="rose"
          title="B2C — Futurs mariés"
          tagline="DM Insta + Meta Custom Audience"
          count={stats?.b2c.count || 0}
          goal={stats?.b2c.goal || 600}
          percent={stats?.b2c.percent || 0}
        />
        <GoalCard
          icon={Briefcase}
          color="cyan"
          title="B2B — Pros salon mariage"
          tagline="Cold email LCEN + LinkedIn Apollo"
          count={stats?.b2b.count || 0}
          goal={stats?.b2b.goal || 400}
          percent={stats?.b2b.percent || 0}
        />
      </div>

      {/* KPIs row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Kpi label="Total leads" value={stats?.total ?? '—'} icon={Target} color="fuchsia" />
        <Kpi label="Ce mois" value={stats?.monthCount ?? '—'} icon={TrendingUp} color="violet" />
        <Kpi label="30 derniers jours" value={stats?.last30Count ?? '—'} icon={Activity} color="cyan" />
        <Kpi label="Score moyen" value={stats?.avgScore != null ? `${stats.avgScore}/100` : '—'} icon={CheckCircle2} color="emerald" />
      </div>

      {/* Sparkline 30 days */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 mb-4">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><Activity size={14} /> Activité 30 derniers jours</h2>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest">leads / jour</span>
        </header>
        <Sparkline data={stats?.sparkline || []} />
      </div>

      {/* Jobs en cours */}
      <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 mb-4">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Loader2 size={14} className={jobs.some((j) => j.status === 'running') ? 'animate-spin text-sky-400' : 'text-zinc-500'} />
            Jobs récents ({jobs.length})
          </h2>
          <Link href="/admin/leads/scraper/new" className="text-xs text-fuchsia-400 hover:text-fuchsia-300 flex items-center gap-1">
            <Plus size={11} /> Nouveau
          </Link>
        </header>
        {loading && jobs.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={12} className="animate-spin" /> Chargement…</p>
        ) : jobs.length === 0 ? (
          <div className="text-center py-8 bg-zinc-950 rounded-xl">
            <Globe size={28} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-300 font-bold mb-1">Aucun job pour l'instant</p>
            <p className="text-xs text-zinc-500 mb-3">Crée ton premier scrape pour récupérer des contacts</p>
            <Link href="/admin/leads/scraper/new" className="inline-flex items-center gap-1.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold text-xs px-4 py-2 rounded-full">
              <Plus size={11} /> Créer un scrape
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((j) => <JobRow key={j.id} job={j} onUpdate={load} />)}
          </div>
        )}
      </section>

      {/* Top sources + tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2"><Globe size={13} /> Top sources</h2>
          {stats?.topSources?.length ? (
            <ul className="space-y-1.5">
              {stats.topSources.map(([src, count]) => (
                <li key={src} className="flex items-center justify-between text-xs">
                  <code className="text-zinc-300">{src}</code>
                  <span className="font-bold text-fuchsia-400">{count}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-zinc-500">Aucune donnée</p>}
        </div>
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
          <h2 className="text-sm font-bold mb-2 flex items-center gap-2"><Tag size={13} /> Top tags</h2>
          {stats?.topTags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {stats.topTags.map(([tag, count]) => (
                <span key={tag} className="text-[10px] bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-full text-zinc-300">
                  {tag} <span className="text-fuchsia-400 font-bold">{count}</span>
                </span>
              ))}
            </div>
          ) : <p className="text-xs text-zinc-500">Aucun tag</p>}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ icon: Icon, color, title, tagline, count, goal, percent }: {
  icon: any; color: string; title: string; tagline: string; count: number; goal: number; percent: number;
}) {
  const colors: Record<string, string> = {
    rose: 'from-rose-500/20 to-rose-500/5 ring-rose-500/30 text-rose-400',
    cyan: 'from-cyan-500/20 to-cyan-500/5 ring-cyan-500/30 text-cyan-400'
  };
  const barColors: Record<string, string> = {
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500'
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} ring-1 rounded-2xl p-4 relative overflow-hidden`}>
      <header className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center ${colors[color].split(' ').pop()}`}>
          <Icon size={18} />
        </div>
        <div>
          <h3 className="font-bold text-sm text-white">{title}</h3>
          <p className="text-[10px] text-zinc-400">{tagline}</p>
        </div>
        <span className={`ml-auto text-[10px] font-bold uppercase tracking-widest ${colors[color].split(' ').pop()}`}>
          {Math.min(percent, 100)}%
        </span>
      </header>
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-bold text-white">{count}</span>
        <span className="text-sm text-zinc-400">/ {goal} ce mois</span>
      </div>
      <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
        <div className={`h-full ${barColors[color]} transition-all`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  const colors: Record<string, string> = {
    fuchsia: 'text-fuchsia-400 bg-fuchsia-500/10',
    violet:  'text-violet-400 bg-violet-500/10',
    cyan:    'text-cyan-400 bg-cyan-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10'
  };
  return (
    <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-xl p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon size={15} /></div>
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const w = 100;
  const h = 30;
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-20">
      <defs>
        <linearGradient id="sp" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#d946ef" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#d946ef" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#sp)" />
      <polyline points={pts} fill="none" stroke="#d946ef" strokeWidth="0.6" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => v > 0 ? <circle key={i} cx={(i / (data.length - 1 || 1)) * w} cy={h - (v / max) * h} r="0.5" fill="#fff" /> : null)}
    </svg>
  );
}

function JobRow({ job, onUpdate }: { job: Job; onUpdate: () => void }) {
  const meta = STATUS_META[job.status] || STATUS_META.idle;
  const Icon = meta.icon;
  const result = job.result || {};
  return (
    <article className="bg-zinc-950 ring-1 ring-zinc-800 rounded-xl p-3">
      <header className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-${meta.color}-500/15 text-${meta.color}-400`}>
          <Icon size={12} className={job.status === 'running' ? 'animate-spin' : ''} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xs text-white truncate">{job.name}</h3>
          <p className="text-[10px] text-zinc-500">
            <code>{job.source}</code> · {new Date(job.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-${meta.color}-500/15 text-${meta.color}-400`}>
          {meta.label}
        </span>
      </header>
      {job.status === 'running' && (
        <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-1.5">
          <div className="h-full bg-sky-500 transition-all" style={{ width: `${job.progress}%` }} />
        </div>
      )}
      {job.status === 'done' && (
        <div className="grid grid-cols-3 gap-2 text-[10px] mt-1.5">
          <div className="bg-emerald-500/10 rounded px-2 py-1">
            <span className="text-emerald-400 font-bold">{result.created || 0}</span> créés
          </div>
          <div className="bg-amber-500/10 rounded px-2 py-1">
            <span className="text-amber-400 font-bold">{result.merged || 0}</span> merged
          </div>
          <div className="bg-zinc-800 rounded px-2 py-1">
            <span className="text-zinc-300 font-bold">{result.skipped || 0}</span> skip
          </div>
        </div>
      )}
      {job.errorMessage && (
        <p className="text-[10px] text-rose-400 bg-rose-500/10 rounded px-2 py-1 mt-1">⚠ {job.errorMessage}</p>
      )}
    </article>
  );
}
