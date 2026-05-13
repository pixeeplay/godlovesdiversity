'use client';
import { useState, useEffect } from 'react';
import { Globe, Sparkles, Newspaper, Play, Loader2, CheckCircle2, AlertTriangle, RefreshCw, ExternalLink, Zap, Trash2, RotateCcw } from 'lucide-react';

type BoostKey = 'regions' | 'rewrite' | 'top10' | 'import' | 'run-all' | 'reset-articles' | 'reset-rewrites' | 'reset-all';

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

const EMPTY_KEYS: BoostKey[] = ['import', 'regions', 'rewrite', 'top10', 'run-all', 'reset-articles', 'reset-rewrites', 'reset-all'];

export default function SeoBoostsClient({ isProd = false, host = '' }: { isProd?: boolean; host?: string } = {}) {
  const [status, setStatus] = useState<Record<BoostKey, BoostStatus>>(
    Object.fromEntries(EMPTY_KEYS.map((k) => [k, 'idle'])) as Record<BoostKey, BoostStatus>
  );
  const [logs, setLogs] = useState<Record<BoostKey, string[]>>(
    Object.fromEntries(EMPTY_KEYS.map((k) => [k, []])) as Record<BoostKey, string[]>
  );
  const [stats, setStats] = useState<any>(null);

  // Fetch current SEO stats
  useEffect(() => {
    fetch('/api/admin/seo/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  async function runBoost(key: BoostKey, label?: string) {
    // Confirmation pour les actions destructives
    if (key === 'reset-all') {
      if (!confirm('⚠️ Reset complet : supprime TOUS les listings + articles + descriptions, puis relance import + rewrite + top10.\n\nCette action est IRRÉVERSIBLE. Continuer ?')) return;
      if (!confirm('Vraiment sûr ? Toute la BDD SEO sera vidée et regénérée (~15-20 min).')) return;
    } else if (key === 'reset-articles') {
      if (!confirm('Supprimer les 25 articles SEO auto-générés (top-10-*) ? Ils pourront être regénérés avec "Top 10".')) return;
    } else if (key === 'reset-rewrites') {
      if (!confirm('Réinitialiser les descriptions France réécrites par Gemini ? Tu pourras relancer "Anti-duplicate" pour les regénérer.')) return;
    }

    setStatus(s => ({ ...s, [key]: 'running' }));
    setLogs(l => ({ ...l, [key]: [`▶ Démarrage ${label || BOOSTS.find(b => b.key === key)?.title || key}...`] }));
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
        setLogs(l => ({ ...l, [key]: acc.slice(-60) }));
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
      {/* Banner environnement */}
      {!isProd ? (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
          <div className="text-sm">
            <strong className="text-amber-300">Environnement de staging</strong> <span className="text-zinc-400">({host || 'inconnu'})</span>
            <span className="text-zinc-400"> — toutes les actions sont OK ici, mais <strong>ne soumets pas le sitemap à Google Search Console</strong> tant que tu n'es pas sur les domaines prod (parislgbt.com / lgbtfrance.fr).</span>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 flex items-center gap-3">
          <CheckCircle2 size={18} className="text-emerald-400 flex-shrink-0" />
          <div className="text-sm">
            <strong className="text-emerald-300">Environnement de PROD</strong> <span className="text-zinc-400">({host})</span>
            <span className="text-zinc-400"> — vérifie deux fois avant tout reset. Après les boosts, n'oublie pas de soumettre le sitemap à GSC.</span>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-display font-black mb-2">SEO Boosts</h1>
        <p className="text-zinc-400">Pilote les modules d'amplification SEO pour parislgbt.com et lgbtfrance.fr.</p>
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

      {/* === ORCHESTRATION GLOBALE (migration prod, regénération) === */}
      <div className="mt-10 rounded-2xl border-2 border-pink-500/40 bg-gradient-to-br from-pink-500/10 via-violet-500/5 to-transparent p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-pink-500/20 text-pink-400">
            <Zap size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black mb-1">Orchestration globale</h2>
            <p className="text-sm text-zinc-400">À utiliser lors du passage en prod ou pour regénérer toute la BDD SEO d'un coup.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Run all 3 in order */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Play size={16} className="text-emerald-400" />
              <h3 className="font-bold">Tout lancer dans l'ordre</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              Enchaîne <strong>import → rewrite → top10</strong> dans l'ordre recommandé. Idempotent : si tout est déjà fait, ça ne casse rien. ~15-20 min.
            </p>
            <button
              onClick={() => runBoost('run-all', 'Run all 3 boosts')}
              disabled={status['run-all'] === 'running'}
              className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {status['run-all'] === 'running' ? <Loader2 size={16} className="animate-spin" /> : status['run-all'] === 'success' ? <CheckCircle2 size={16} /> : <Play size={16} />}
              {status['run-all'] === 'running' ? 'Chaîne en cours…' : status['run-all'] === 'success' ? '✓ Terminé — relancer' : 'Tout lancer'}
            </button>
            {logs['run-all'].length > 0 && (
              <div className="mt-3 bg-black/60 rounded-lg p-3 text-[10px] font-mono text-zinc-300 max-h-48 overflow-y-auto">
                {logs['run-all'].map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>

          {/* Reset & re-run all (DANGER) */}
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw size={16} className="text-red-400" />
              <h3 className="font-bold">Reset complet + tout regénérer</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              <strong className="text-red-400">⚠️ Destructif :</strong> supprime <strong>tous</strong> les listings + articles, puis relance import + rewrite + top10. À utiliser <strong>uniquement</strong> sur la prod fraîche.
            </p>
            <button
              onClick={() => runBoost('reset-all', 'Reset & re-run')}
              disabled={status['reset-all'] === 'running'}
              className="w-full py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {status['reset-all'] === 'running' ? <Loader2 size={16} className="animate-spin" /> : status['reset-all'] === 'success' ? <CheckCircle2 size={16} /> : <RotateCcw size={16} />}
              {status['reset-all'] === 'running' ? 'Reset + regénération…' : status['reset-all'] === 'success' ? '✓ Terminé' : 'Reset & regénérer tout'}
            </button>
            {logs['reset-all'].length > 0 && (
              <div className="mt-3 bg-black/60 rounded-lg p-3 text-[10px] font-mono text-zinc-300 max-h-48 overflow-y-auto">
                {logs['reset-all'].map((line, i) => <div key={i}>{line}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* Resets ciblés */}
        <details className="mt-4 group">
          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-white transition flex items-center gap-1">
            <Trash2 size={12} /> Resets ciblés (avancé)
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => runBoost('reset-articles', 'Reset articles')}
              disabled={status['reset-articles'] === 'running'}
              className="text-xs py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-amber-500/50 hover:bg-amber-500/5 transition disabled:opacity-50 flex items-center gap-2"
            >
              {status['reset-articles'] === 'running' ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Supprimer les 25 articles Top 10
            </button>
            <button
              onClick={() => runBoost('reset-rewrites', 'Reset rewrites')}
              disabled={status['reset-rewrites'] === 'running'}
              className="text-xs py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-900 hover:border-amber-500/50 hover:bg-amber-500/5 transition disabled:opacity-50 flex items-center gap-2"
            >
              {status['reset-rewrites'] === 'running' ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Réinitialiser les descriptions Gemini
            </button>
          </div>
          {(logs['reset-articles'].length > 0 || logs['reset-rewrites'].length > 0) && (
            <div className="mt-3 bg-black/60 rounded-lg p-3 text-[10px] font-mono text-zinc-300 max-h-32 overflow-y-auto">
              {[...logs['reset-articles'], ...logs['reset-rewrites']].map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </details>
      </div>

      <div className="mt-6 p-5 rounded-2xl border border-amber-500/30 bg-amber-500/5">
        <h3 className="font-bold mb-2 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-400" /> Bonnes pratiques SEO</h3>
        <ul className="text-sm space-y-1 text-zinc-300">
          <li>• <strong className="text-emerald-400">Migration prod :</strong> utilise <strong>"Tout lancer dans l'ordre"</strong> (ou <strong>"Reset &amp; regénérer"</strong> si BDD vide)</li>
          <li>• Sinon manuel : Import → Pages régionales (statiques) → Anti-duplicate → Top 10</li>
          <li>• Vérifie le sitemap après : <a href="/sitemap.xml" target="_blank" className="text-pink-400 hover:underline">/sitemap.xml <ExternalLink size={11} className="inline" /></a></li>
          <li>• <strong>Une fois en prod uniquement :</strong> soumets le sitemap dans <a href="https://search.google.com/search-console" target="_blank" rel="noopener" className="text-pink-400 hover:underline">Google Search Console</a> pour chaque domaine</li>
          <li>• <strong>Tant que tu es sur le staging</strong> (lgbt.pixeeplay.com) : ne soumets <em>pas</em> à GSC — ça polluerait l'indexation de la vraie prod</li>
        </ul>
      </div>
    </div>
  );
}
