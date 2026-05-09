'use client';
/**
 * PriceWatchList — page d'index du comparateur de prix.
 *
 * Liste les produits surveillés avec : prix min/max actuels, écart, nb sources,
 * dernière update, lien détail. Form en haut pour ajouter un watch via URL.
 */
import { useEffect, useState } from 'react';

type Watch = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  tags: string[];
  currency: string;
  targetPriceCents: number | null;
  active: boolean;
  competitorCount: number;
  activeCompetitors: number;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  avgPriceCents: number | null;
  domains: string[];
  nextRefreshAt?: string;
  updatedAt: string;
};

function fmtPrice(cents: number | null, currency = 'EUR'): string {
  if (cents == null) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${(cents / 100).toFixed(2)} ${sym}`;
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'à l\'instant';
  if (diff < 3600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3600_000)}h`;
  return `il y a ${Math.floor(diff / 86_400_000)}j`;
}

export function PriceWatchList() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form add
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTags, setNewTags] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // PIM productsmanager.app sync (Phase 3)
  const [pmShow, setPmShow] = useState(false);
  const [pmTestStatus, setPmTestStatus] = useState<'idle' | 'testing' | 'ok' | 'ko'>('idle');
  const [pmTestMsg, setPmTestMsg] = useState<string>('');
  const [pmMaxItems, setPmMaxItems] = useState(500);
  const [pmCreateSnapshots, setPmCreateSnapshots] = useState(false);
  const [pmSyncing, setPmSyncing] = useState(false);
  const [pmResult, setPmResult] = useState<null | { pulled: number; created: number; updated: number; skipped: number; errors: { pmId: string; message: string }[] }>(null);
  const [pmError, setPmError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/prices');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setWatches(j.watches);
    } catch (e: any) {
      setError(e?.message || 'load KO');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    setAddError(null);
    setAddSuccess(null);
    try {
      const r = await fetch('/api/admin/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl.trim(),
          category: newCategory.trim() || undefined,
          tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'KO');
      setAddSuccess(`✓ « ${j.name} » ajouté à ${fmtPrice(j.priceCents, j.currency)} (méthode ${j.method})`);
      setNewUrl('');
      setNewCategory('');
      setNewTags('');
      await reload();
    } catch (e: any) {
      setAddError(e?.message || 'erreur');
    } finally {
      setAdding(false);
    }
  };

  /** Test de connexion à productsmanager.app — GET sur la même route. */
  const handlePmTest = async () => {
    setPmTestStatus('testing');
    setPmTestMsg('');
    try {
      const r = await fetch('/api/admin/prices/sync-pm', { cache: 'no-store' });
      const j = await r.json();
      if (j?.ok) {
        setPmTestStatus('ok');
        const sample = j.sampleProduct;
        setPmTestMsg(sample
          ? `✓ Connecté · exemple : « ${sample.name || sample.id} »${sample.brand ? ` (${sample.brand})` : ''}`
          : '✓ Connecté (aucun produit retourné — catalogue vide ?)');
      } else {
        setPmTestStatus('ko');
        setPmTestMsg(`✗ ${j?.error || 'connexion KO'}${j?.status ? ` (HTTP ${j.status})` : ''}`);
      }
    } catch (e: any) {
      setPmTestStatus('ko');
      setPmTestMsg(`✗ ${e?.message || 'erreur réseau'}`);
    }
  };

  /** Pull complet du catalogue PM → upsert PriceWatch. */
  const handlePmSync = async () => {
    if (!confirm(`Lancer un sync de ${pmMaxItems} produits depuis productsmanager.app ?\n\nLes produits déjà liés seront mis à jour, les nouveaux seront créés en tant que watches.`)) return;
    setPmSyncing(true);
    setPmError(null);
    setPmResult(null);
    try {
      const r = await fetch('/api/admin/prices/sync-pm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxItems: pmMaxItems, createSnapshots: pmCreateSnapshots }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'sync KO');
      setPmResult(j);
      // Reload watches pour voir les nouveaux apparaître
      await reload();
    } catch (e: any) {
      setPmError(e?.message || 'erreur');
    } finally {
      setPmSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6">
          <h1 className="bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 bg-clip-text text-3xl font-bold text-transparent">
            💰 Comparateur de prix multi-site
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Surveille les prix de tes produits chez les concurrents. Historique, alertes, écarts en live.
          </p>
        </header>

        {/* FORM ADD */}
        <section className="mb-6 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-zinc-900 p-5 ring-1 ring-emerald-800/50">
          <h2 className="mb-3 text-sm font-bold text-emerald-200">➕ Ajouter un produit à surveiller</h2>
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
              placeholder="URL produit (ex: https://www.panajou.fr/...)"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <input
              type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Catégorie (optionnel)"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <input
              type="text" value={newTags} onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags : sony, hybride"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newUrl.trim()}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-500 disabled:opacity-40"
            >
              {adding ? '⏳ Extraction…' : '⚡ Surveiller'}
            </button>
          </div>
          {addError && <p className="mt-2 text-xs text-rose-400">⚠ {addError}</p>}
          {addSuccess && <p className="mt-2 text-xs text-emerald-300">{addSuccess}</p>}
          <p className="mt-2 text-[11px] text-zinc-500">
            On extrait automatiquement le nom, la marque, l'EAN et le prix de la page (JSON-LD &gt; microdata &gt; regex). Ensuite tu pourras ajouter d'autres URLs concurrents pour comparer.
          </p>
        </section>

        {/* PIM — productsmanager.app sync (Phase 3) */}
        <section className="mb-6 rounded-2xl bg-gradient-to-br from-violet-950/50 to-zinc-900 ring-1 ring-violet-800/50">
          <button
            onClick={() => setPmShow(!pmShow)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 text-lg">🏷️</div>
              <div>
                <h2 className="text-sm font-bold text-violet-200">PIM productsmanager.app</h2>
                <p className="text-[11px] text-violet-300/70">
                  Sync auto de ton catalogue PIM vers les watches GLD (Phase 3)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {pmTestStatus === 'ok' && <span className="text-[10px] font-bold text-emerald-300">🟢 connecté</span>}
              {pmTestStatus === 'ko' && <span className="text-[10px] font-bold text-rose-300">🔴 KO</span>}
              {pmTestStatus === 'testing' && <span className="text-[10px] font-bold text-amber-300">⏳</span>}
              <span className="text-[10px] text-zinc-400">{pmShow ? '▲ Replier' : '▼ Déplier'}</span>
            </div>
          </button>

          {pmShow && (
            <div className="border-t border-violet-800/50 px-5 py-4 space-y-4">
              {/* Test connexion */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handlePmTest}
                  disabled={pmTestStatus === 'testing' || pmSyncing}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-600 disabled:opacity-40"
                >
                  {pmTestStatus === 'testing' ? '⏳ Test…' : '🔌 Tester la connexion'}
                </button>
                {pmTestMsg && (
                  <span className={`text-xs ${pmTestStatus === 'ok' ? 'text-emerald-300' : pmTestStatus === 'ko' ? 'text-rose-300' : 'text-zinc-400'}`}>
                    {pmTestMsg}
                  </span>
                )}
              </div>

              {/* Configuration sync */}
              <div className="grid gap-3 md:grid-cols-[140px_1fr_auto] items-end">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-violet-300 mb-1">Max items</label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={pmMaxItems}
                    onChange={(e) => setPmMaxItems(Math.max(1, Math.min(5000, Number(e.target.value) || 500)))}
                    className="w-full rounded-lg border border-violet-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-violet-100 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-violet-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pmCreateSnapshots}
                    onChange={(e) => setPmCreateSnapshots(e.target.checked)}
                    className="accent-violet-500 h-4 w-4"
                  />
                  <span>
                    Créer aussi les snapshots prix PM (CompetitorProduct synthétique{' '}
                    <code className="font-mono text-violet-300">pm:internal</code>)
                  </span>
                </label>
                <button
                  onClick={handlePmSync}
                  disabled={pmSyncing || pmTestStatus === 'ko'}
                  className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-violet-500/30 hover:opacity-90 disabled:opacity-40"
                >
                  {pmSyncing ? '⏳ Sync en cours…' : '🚀 Sync catalogue PM'}
                </button>
              </div>

              {/* Résultat */}
              {pmError && (
                <div className="rounded-lg bg-rose-950/40 ring-1 ring-rose-700/50 p-3 text-xs text-rose-200">
                  ⚠ {pmError}
                </div>
              )}
              {pmResult && (
                <div className="rounded-lg bg-zinc-950 ring-1 ring-violet-800/40 p-3 space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Pulled</div>
                      <div className="font-mono text-lg font-bold text-violet-300">{pmResult.pulled}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Créés</div>
                      <div className="font-mono text-lg font-bold text-emerald-300">{pmResult.created}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Mis à jour</div>
                      <div className="font-mono text-lg font-bold text-sky-300">{pmResult.updated}</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500">Erreurs</div>
                      <div className={`font-mono text-lg font-bold ${pmResult.errors.length > 0 ? 'text-rose-300' : 'text-zinc-500'}`}>
                        {pmResult.errors.length}
                      </div>
                    </div>
                  </div>
                  {pmResult.errors.length > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-rose-300 hover:text-rose-200">
                        Voir les {pmResult.errors.length} erreur(s)
                      </summary>
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pl-4">
                        {pmResult.errors.slice(0, 50).map((err, i) => (
                          <li key={i} className="text-rose-300/80">
                            <code className="font-mono text-[10px] text-rose-400">{err.pmId}</code>{' '}: {err.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}

              <p className="text-[11px] text-violet-300/60 leading-relaxed">
                Le sync cherche d'abord les watches existants par <code className="font-mono">pmProductId</code>, puis SKU, puis EAN. Si trouvé →
                update méta uniquement. Sinon → crée un nouveau watch avec tag <code className="font-mono">from-pm</code>. Variables requises :
                {' '}<code className="font-mono">PM_API_URL</code> + <code className="font-mono">PM_API_KEY</code>.
              </p>
            </div>
          )}
        </section>

        {/* STATS GLOBALES */}
        <section className="mb-6 grid gap-3 grid-cols-2 md:grid-cols-4">
          <StatCard
            label="Produits surveillés"
            value={watches.length}
            sub={`${watches.filter((w) => w.active).length} actifs`}
            color="emerald"
          />
          <StatCard
            label="Sources scannées"
            value={watches.reduce((s, w) => s + w.competitorCount, 0)}
            sub={`${[...new Set(watches.flatMap((w) => w.domains))].length} domaines uniques`}
            color="sky"
          />
          <StatCard
            label="En promo / sous cible"
            value={watches.filter((w) => w.targetPriceCents != null && w.minPriceCents != null && w.minPriceCents < w.targetPriceCents).length}
            sub="prix sous le seuil cible"
            color="rose"
          />
          <StatCard
            label="Prochain refresh"
            value={(() => {
              const next = watches
                .map((w) => w.nextRefreshAt ? new Date(w.nextRefreshAt).getTime() : Infinity)
                .filter((t) => t < Infinity)
                .sort((a, b) => a - b)[0];
              if (!next) return '—';
              const diff = next - Date.now();
              if (diff < 0) return 'maintenant';
              if (diff < 3600_000) return `${Math.ceil(diff / 60_000)} min`;
              return `${Math.ceil(diff / 3600_000)}h`;
            })()}
            sub="watch le plus urgent"
            color="violet"
          />
        </section>

        {/* LIST */}
        {loading ? (
          <div className="rounded-2xl bg-zinc-900 p-12 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-emerald-500" />
            Chargement…
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-950/30 p-6 text-sm text-rose-300 ring-1 ring-rose-700/50">⚠ {error}</div>
        ) : watches.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900 p-12 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
            <div className="mb-3 text-4xl">📦</div>
            Aucun produit surveillé pour l'instant. Colle une URL produit ci-dessus pour démarrer.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {watches.map((w) => <WatchCard key={w.id} watch={w} />)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── COMPOSANTS ───────────────────────────────────────────────── */

function WatchCard({ watch }: { watch: Watch }) {
  const spread = watch.minPriceCents != null && watch.maxPriceCents != null
    ? watch.maxPriceCents - watch.minPriceCents
    : null;
  const spreadPct = spread != null && watch.minPriceCents
    ? Math.round((spread / watch.minPriceCents) * 100)
    : 0;
  const underTarget = watch.targetPriceCents && watch.minPriceCents != null && watch.minPriceCents < watch.targetPriceCents;

  return (
    <a
      href={`/admin/prices/${watch.id}`}
      className={`group block overflow-hidden rounded-2xl bg-zinc-900 ring-1 transition hover:ring-emerald-500 ${
        underTarget ? 'ring-emerald-600/60 shadow-lg shadow-emerald-500/10' : 'ring-zinc-800'
      } ${!watch.active ? 'opacity-50' : ''}`}
    >
      {/* Image header */}
      <div className="relative h-32 bg-zinc-950">
        {watch.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={watch.imageUrl} alt={watch.name}
            className="h-full w-full object-contain transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl text-zinc-700">📷</div>
        )}
        {underTarget && (
          <div className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
            🎯 SOUS CIBLE
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 overflow-hidden">
            {watch.brand && <p className="text-[10px] uppercase tracking-wider text-zinc-500">{watch.brand}</p>}
            <h3 className="line-clamp-2 text-sm font-bold text-zinc-100">{watch.name}</h3>
          </div>
        </div>

        {watch.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {watch.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-violet-900/40 px-2 py-0.5 text-[9px] text-violet-300">#{t}</span>
            ))}
          </div>
        )}

        {/* Prix range */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded bg-emerald-950/40 p-2 ring-1 ring-emerald-800/40">
            <div className="text-[9px] uppercase tracking-wider text-emerald-400">MIN</div>
            <div className="font-mono font-bold text-emerald-200">{fmtPrice(watch.minPriceCents, watch.currency)}</div>
          </div>
          <div className="rounded bg-zinc-800 p-2">
            <div className="text-[9px] uppercase tracking-wider text-zinc-400">MOY</div>
            <div className="font-mono font-bold text-zinc-200">{fmtPrice(watch.avgPriceCents, watch.currency)}</div>
          </div>
          <div className="rounded bg-rose-950/40 p-2 ring-1 ring-rose-800/40">
            <div className="text-[9px] uppercase tracking-wider text-rose-400">MAX</div>
            <div className="font-mono font-bold text-rose-200">{fmtPrice(watch.maxPriceCents, watch.currency)}</div>
          </div>
        </div>

        {spread != null && spread > 0 && (
          <p className="mt-2 text-center text-[11px] text-amber-300">
            ⚡ Écart {fmtPrice(spread, watch.currency)} ({spreadPct}%)
          </p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2 text-[10px] text-zinc-500">
          <span>{watch.activeCompetitors}/{watch.competitorCount} sources</span>
          <span>MAJ {fmtDate(watch.updatedAt)}</span>
        </div>
      </div>
    </a>
  );
}

function StatCard({ label, value, sub, color }: {
  label: string; value: React.ReactNode; sub?: string;
  color: 'emerald' | 'sky' | 'rose' | 'violet' | 'amber';
}) {
  const map = {
    emerald: 'bg-emerald-950/40 ring-emerald-700/50 text-emerald-300',
    sky:     'bg-sky-950/40 ring-sky-700/50 text-sky-300',
    rose:    'bg-rose-950/40 ring-rose-700/50 text-rose-300',
    violet:  'bg-violet-950/40 ring-violet-700/50 text-violet-300',
    amber:   'bg-amber-950/40 ring-amber-700/50 text-amber-300',
  }[color];
  return (
    <div className={`rounded-xl ${map} p-4 ring-1`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] text-zinc-500">{sub}</div>}
    </div>
  );
}
