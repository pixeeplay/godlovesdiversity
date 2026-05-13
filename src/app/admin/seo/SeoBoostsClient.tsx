'use client';
import { useState, useEffect } from 'react';
import { Globe, Sparkles, Newspaper, Play, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';

type BoostKey = 'regions' | 'rewrite' | 'top10' | 'import';

type BoostStatus = 'idle' | 'running' | 'success' | 'error';

const BOOSTS: { key: BoostKey; title: string; description: string; icon: any; color: string; eta: string; cost: string; impact: string }[] = [
  {
    key: 'import',
    title: 'Import listings (scrape + CSV)',
    description: '3 379 listings importés depuis le scrape WordPress (315) + CSV France (2701) + Paris extra (363). Préserve les slugs WP pour le SEO.',
    icon: RefreshCw,
    color: '#10B981',
    eta: '~3-5 min',
    cost: 'Gratuit',
    impact: 'BASE — à lancer en premier'
  },
  {
    key: 'regions',
    title: 'Pages régionales SEO-rich',
    description: '13 régions avec contenu éditorial unique (500 mots/région) : intro, top villes, stats, histoire LGBT régionale. JSON-LD CollectionPage. +26 pages indexées.',
    icon: Globe,
    color: '#FF2BB1',
    eta: 'Instantané',
    cost: 'Gratuit',
    impact: '+26 pages SEO unique'
  },
  {
    key: 'rewrite',
    title: 'Gemini rewrite anti-duplicate',
    description: 'Réécrit via Gemini les descriptions des venues présentes sur les 2 sites (Paris + France) pour garantir 0% duplicate content détecté par Google.',
    icon: Sparkles,
    color: '#8B5CF6',
    eta: '~5-8 min',
    cost: '~0.5€ Gemini',
    impact: '363 descriptions FR différenciées'
  },
  {
    key: 'top10',
    title: 'Articles SEO "Top 10 par ville"',
    description: 'Génère 30 articles long-tail via Gemini : "Top 10 bars LGBT à Paris", "Saunas gay Lyon", "PrEP Marseille", etc. 600-800 mots chacun.',
    icon: Newspaper,
    color: '#F59E0B',
    eta: '~10-15 min',
    cost: '~1-2€ Gemini',
    impact: '+30 articles, +60 URLs (FR+EN)'
  }
];

export default function SeoBoostsClient() {
  const [status, setStatus] = useState<Record<BoostKey, BoostStatus>>({
    import: 'idle', regions: 'idle', rewrite: 'idle', top10: 'idle'
  });
  const [logs, setLogs] = useState<Record<BoostKey, string[]>>({
    import: [], regions: [], rewrite: [], top10: []
  });
  const [stats, setStats] = useState<any>(null);

  // Fetch current SEO stats
  useEffect(() => {
    fetch('/api/admin/seo/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  async function runBoost(key: BoostKey) {
    setStatus(s => ({ ...s, [key]: 'running' }));
    setLogs(l => ({ ...l, [key]: [`▶ Démarrage ${BOOSTS.find(b => b.key === key)?.title}...`] }));
    try {
      const r = await fetch(`/api/admin/seo/${key}`, { method: 'POST' });
      if (!r.body) throw new Error('No stream');
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let acc: string[] = [`▶ Démarrage...`];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        acc = [...acc, ...lines];
        setLogs(l => ({ ...l, [key]: acc.slice(-30) }));
      }
      setStatus(s => ({ ...s, [key]: 'success' }));
      // Refresh stats
      fetch('/api/admin/seo/stats').then(r => r.json()).then(setStats).catch(() => {});
    } catch (e: any) {
      setStatus(s => ({ ...s, [key]: 'error' }));
      setLogs(l => ({ ...l, [key]: [...(l[key] || []), `❌ ${e.message || 'erreur'}`] }));
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-black mb-2">SEO Boosts</h1>
        <p className="text-zinc-400">Pilote les 3 modules d'amplification SEO pour parislgbt.com et lgbtfrance.fr.</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-black">{stats.listings ?? '—'}</div>
            <div className="text-xs text-zinc-400">Listings totaux</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-black">{stats.regions ?? '—'}</div>
            <div className="text-xs text-zinc-400">Régions</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-black">{stats.articles ?? '—'}</div>
            <div className="text-xs text-zinc-400">Articles SEO</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="text-2xl font-black">{stats.sitemap_urls ?? '—'}</div>
            <div className="text-xs text-zinc-400">URLs sitemap.xml</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {BOOSTS.map(b => {
          const Icon = b.icon;
          const s = status[b.key];
          return (
            <div key={b.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${b.color}22`, color: b.color }}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold mb-1">{b.title}</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed">{b.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4 text-xs">
                <div className="rounded-lg bg-zinc-800/50 p-2">
                  <div className="text-zinc-500 mb-0.5">Durée</div>
                  <div className="font-bold">{b.eta}</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-2">
                  <div className="text-zinc-500 mb-0.5">Coût</div>
                  <div className="font-bold">{b.cost}</div>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-2">
                  <div className="text-zinc-500 mb-0.5">Impact</div>
                  <div className="font-bold text-[10px] leading-tight">{b.impact}</div>
                </div>
              </div>
              <button
                onClick={() => runBoost(b.key)}
                disabled={s === 'running'}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold transition disabled:opacity-50"
                style={{ background: b.color, color: 'white' }}
              >
                {s === 'running' ? <Loader2 size={16} className="animate-spin" /> : s === 'success' ? <CheckCircle2 size={16} /> : s === 'error' ? <AlertTriangle size={16} /> : <Play size={16} />}
                {s === 'running' ? 'En cours...' : s === 'success' ? '✓ Terminé — relancer' : s === 'error' ? 'Erreur — réessayer' : 'Lancer'}
              </button>
              {logs[b.key].length > 0 && (
                <div className="mt-3 bg-black/60 rounded-lg p-3 text-[11px] font-mono text-zinc-300 max-h-40 overflow-y-auto">
                  {logs[b.key].map((line, i) => <div key={i}>{line}</div>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <h3 className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Bonnes pratiques SEO</h3>
        <ul className="text-sm space-y-1 text-zinc-300">
          <li>• Lance <strong>Import</strong> en premier (alimente la BDD)</li>
          <li>• Puis <strong>Pages régionales</strong> (instantané, gratuit)</li>
          <li>• Puis <strong>Anti-duplicate Gemini</strong> (évite la pénalité Google)</li>
          <li>• Termine par <strong>Articles Top 10</strong> (long-tail keywords)</li>
          <li>• Vérifie le sitemap après : <a href="/sitemap.xml" target="_blank" className="text-pink-400 hover:underline">/sitemap.xml <ExternalLink size={11} className="inline" /></a></li>
          <li>• Soumets le sitemap dans <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="text-pink-400 hover:underline">Google Search Console</a> pour chaque domaine</li>
        </ul>
      </div>
    </div>
  );
}
