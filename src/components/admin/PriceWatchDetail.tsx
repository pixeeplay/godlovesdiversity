'use client';
/**
 * PriceWatchDetail — page détail d'un produit surveillé.
 *
 * - Header produit (image, nom, marque, EAN, SKU, prix cible)
 * - Graphique d'évolution multi-source en SVG natif (1 ligne par concurrent)
 * - Tableau des concurrents avec dernier prix, statut, lien, actions
 * - Form pour ajouter une URL concurrent
 * - Bouton refresh + bouton suppression
 */
import { useEffect, useMemo, useState } from 'react';

type Snapshot = {
  id: string;
  priceCents: number | null;
  currency: string;
  inStock: boolean | null;
  extractionMethod: string | null;
  httpStatus: number | null;
  capturedAt: string;
  error: string | null;
};

type Competitor = {
  id: string;
  domain: string;
  url: string;
  title: string | null;
  vendorSku: string | null;
  notes: string | null;
  active: boolean;
  lastFetchedAt: string | null;
  lastStatus: string | null;
  lastPriceCents: number | null;
  lastInStock: boolean | null;
  snapshots: Snapshot[];
  snapshotCount: number;
};

type Watch = {
  id: string;
  name: string;
  brand: string | null;
  ean: string | null;
  sku: string | null;
  category: string | null;
  imageUrl: string | null;
  tags: string[];
  currency: string;
  targetPriceCents: number | null;
  active: boolean;
  refreshIntervalHours: number;
  nextRefreshAt?: string;
};

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ec4899', '#a855f7', '#06b6d4', '#84cc16', '#f43f5e'];

function fmtPrice(cents: number | null, currency = 'EUR'): string {
  if (cents == null) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${(cents / 100).toFixed(2)} ${sym}`;
}

export function PriceWatchDetail({ watchId }: { watchId: string }) {
  const [watch, setWatch] = useState<Watch | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/prices/${watchId}?days=${days}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setWatch(j.watch);
      setCompetitors(j.competitors);
      setTargetInput(j.watch.targetPriceCents ? (j.watch.targetPriceCents / 100).toString() : '');
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [watchId, days]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const r = await fetch(`/api/admin/prices/${watchId}/refresh`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setRefreshMsg(`✓ ${j.success}/${j.total} sources rafraîchies (${j.failed} erreur${j.failed > 1 ? 's' : ''})`);
      await reload();
    } catch (e: any) {
      setRefreshMsg(`⚠ ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      const r = await fetch(`/api/admin/prices/${watchId}/competitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setNewUrl('');
      await reload();
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteComp = async (compId: string) => {
    if (!confirm('Supprimer ce concurrent et tout son historique ?')) return;
    await fetch(`/api/admin/prices/${watchId}/competitors?competitorId=${compId}`, { method: 'DELETE' });
    await reload();
  };

  const handleSaveTarget = async () => {
    setSavingTarget(true);
    const cents = targetInput ? Math.round(parseFloat(targetInput.replace(',', '.')) * 100) : null;
    await fetch(`/api/admin/prices/${watchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPriceCents: cents }),
    });
    setSavingTarget(false);
    await reload();
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer ce produit surveillé et tout son historique ? Action irréversible.')) return;
    await fetch(`/api/admin/prices/${watchId}`, { method: 'DELETE' });
    window.location.href = '/admin/prices';
  };

  if (loading && !watch) {
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">⏳ Chargement…</div>;
  }
  if (error || !watch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center text-zinc-300">
          <p className="text-rose-400">{error || 'Watch introuvable'}</p>
          <a href="/admin/prices" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">← Retour à la liste</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <a href="/admin/prices" className="text-xs text-zinc-500 hover:text-zinc-300">← Retour à la liste</a>

        {/* HEADER PRODUIT */}
        <header className="mt-2 grid gap-4 rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800 md:grid-cols-[180px_1fr]">
          <div className="h-44 rounded-lg bg-zinc-950 ring-1 ring-zinc-800 overflow-hidden flex items-center justify-center">
            {watch.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={watch.imageUrl} alt={watch.name} className="h-full w-full object-contain" />
            ) : (
              <span className="text-5xl text-zinc-700">📷</span>
            )}
          </div>
          <div>
            {watch.brand && <p className="text-xs uppercase tracking-wider text-zinc-500">{watch.brand}</p>}
            <h1 className="text-2xl font-bold text-white">{watch.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              {watch.category && <span className="rounded bg-zinc-800 px-2 py-0.5">{watch.category}</span>}
              {watch.ean && <span>EAN <code className="font-mono text-zinc-300">{watch.ean}</code></span>}
              {watch.sku && <span>SKU <code className="font-mono text-zinc-300">{watch.sku}</code></span>}
              {watch.tags.map((t) => (
                <span key={t} className="rounded-full bg-violet-900/40 px-2 py-0.5 text-violet-300">#{t}</span>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-zinc-500">🎯 Prix cible (alerte si min &lt; cible)</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="text" value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="ex: 199.99"
                    className="w-28 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-sm text-zinc-100"
                  />
                  <button
                    onClick={handleSaveTarget} disabled={savingTarget}
                    className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
                  >{savingTarget ? '…' : 'OK'}</button>
                </div>
              </div>

              <div className="ml-auto flex gap-2">
                <button
                  onClick={handleRefresh} disabled={refreshing}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {refreshing ? '⏳ Refresh…' : '🔄 Rafraîchir maintenant'}
                </button>
                <button
                  onClick={handleDelete}
                  className="rounded-lg bg-zinc-800 px-3 py-2 text-xs text-rose-400 hover:bg-rose-950 hover:text-rose-200"
                >🗑</button>
              </div>
            </div>
            {refreshMsg && <p className="mt-2 text-xs text-emerald-300">{refreshMsg}</p>}
          </div>
        </header>

        {/* GRAPHIQUE */}
        <section className="mt-6 rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200">📈 Évolution des prix</h2>
            <div className="flex gap-1 text-xs">
              {[7, 30, 90, 365].map((d) => (
                <button
                  key={d} onClick={() => setDays(d)}
                  className={`rounded px-2 py-1 ${days === d ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                >{d}j</button>
              ))}
            </div>
          </div>
          <PriceChart competitors={competitors} targetCents={watch.targetPriceCents} currency={watch.currency} />
        </section>

        {/* AJOUTER CONCURRENT */}
        <section className="mt-6 rounded-2xl bg-emerald-950/30 p-4 ring-1 ring-emerald-800/50">
          <h2 className="mb-2 text-sm font-bold text-emerald-200">➕ Ajouter une URL concurrent</h2>
          <div className="flex gap-2">
            <input
              type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://www.autre-site.com/produit-xyz"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
            />
            <button
              onClick={handleAdd} disabled={adding || !newUrl.trim()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
            >{adding ? '⏳' : '+ Ajouter'}</button>
          </div>
          {addError && <p className="mt-2 text-xs text-rose-400">⚠ {addError}</p>}
        </section>

        {/* TABLEAU CONCURRENTS */}
        <section className="mt-6 rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <h2 className="mb-3 text-sm font-bold text-zinc-200">🏪 Concurrents ({competitors.length})</h2>
          {competitors.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucun concurrent. Ajoute une URL ci-dessus.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="px-2 py-2 text-left font-semibold">●</th>
                    <th className="px-2 py-2 text-left font-semibold">Domaine</th>
                    <th className="px-2 py-2 text-right font-semibold">Prix actuel</th>
                    <th className="px-2 py-2 text-center font-semibold">Stock</th>
                    <th className="px-2 py-2 text-center font-semibold">Méthode</th>
                    <th className="px-2 py-2 text-center font-semibold">Snapshots</th>
                    <th className="px-2 py-2 text-right font-semibold">Dernier check</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {competitors.map((c, idx) => {
                    const lastSnap = c.snapshots[c.snapshots.length - 1];
                    const isMin = c.lastPriceCents === Math.min(...competitors.filter((x) => x.lastPriceCents != null).map((x) => x.lastPriceCents as number));
                    const isMax = c.lastPriceCents === Math.max(...competitors.filter((x) => x.lastPriceCents != null).map((x) => x.lastPriceCents as number));
                    return (
                      <tr key={c.id} className="hover:bg-zinc-800/50">
                        <td className="px-2 py-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} /></td>
                        <td className="px-2 py-2">
                          <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium text-sky-300 hover:underline">
                            {c.domain}
                          </a>
                          {c.title && <div className="text-[10px] text-zinc-500 truncate max-w-[280px]">{c.title}</div>}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          <span className={
                            isMin && competitors.length > 1 ? 'font-bold text-emerald-300' :
                            isMax && competitors.length > 1 ? 'text-rose-300' :
                            'text-zinc-200'
                          }>
                            {fmtPrice(c.lastPriceCents, watch.currency)}
                            {isMin && competitors.length > 1 && ' 🥇'}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center">
                          {c.lastInStock === true ? <span className="text-emerald-400">●</span>
                            : c.lastInStock === false ? <span className="text-rose-400">●</span>
                            : <span className="text-zinc-600">○</span>}
                        </td>
                        <td className="px-2 py-2 text-center">
                          {lastSnap?.extractionMethod && (
                            <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono ${
                              lastSnap.extractionMethod === 'json-ld' ? 'bg-emerald-950 text-emerald-300' :
                              lastSnap.extractionMethod === 'microdata' ? 'bg-sky-950 text-sky-300' :
                              lastSnap.extractionMethod === 'regex' ? 'bg-amber-950 text-amber-300' :
                              'bg-rose-950 text-rose-300'
                            }`}>
                              {lastSnap.extractionMethod}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center text-zinc-400 font-mono">{c.snapshotCount}</td>
                        <td className="px-2 py-2 text-right text-zinc-500 text-[10px]">
                          {c.lastFetchedAt ? new Date(c.lastFetchedAt).toLocaleString() : '—'}
                          {c.lastStatus && c.lastStatus !== 'ok' && (
                            <div className="text-rose-400 text-[9px]">⚠ {c.lastStatus}</div>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            onClick={() => handleDeleteComp(c.id)}
                            className="text-zinc-500 hover:text-rose-400" title="Supprimer">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ─── PRICE CHART SVG NATIF ────────────────────────────────────── */

function PriceChart({ competitors, targetCents, currency }: {
  competitors: Competitor[]; targetCents: number | null; currency: string;
}) {
  const W = 800, H = 320, PAD = { l: 50, r: 20, t: 20, b: 30 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  // Toutes les snapshots avec prix valide
  const allPoints = competitors.flatMap((c) =>
    c.snapshots
      .filter((s) => s.priceCents != null)
      .map((s) => ({ competitor: c, price: s.priceCents as number, time: new Date(s.capturedAt).getTime() }))
  );

  if (allPoints.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        Aucune donnée de prix encore. Lance un refresh pour capturer le 1er snapshot.
      </div>
    );
  }

  const minTime = Math.min(...allPoints.map((p) => p.time));
  const maxTime = Math.max(...allPoints.map((p) => p.time));
  const minPrice = Math.min(...allPoints.map((p) => p.price), targetCents ?? Infinity);
  const maxPrice = Math.max(...allPoints.map((p) => p.price), targetCents ?? -Infinity);
  const padPrice = (maxPrice - minPrice) * 0.1 || maxPrice * 0.1;
  const yMin = Math.max(0, minPrice - padPrice);
  const yMax = maxPrice + padPrice;

  const xScale = (t: number) => maxTime === minTime ? innerW / 2 : ((t - minTime) / (maxTime - minTime)) * innerW;
  const yScale = (p: number) => innerH - ((p - yMin) / (yMax - yMin)) * innerH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Grille horizontale */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.t + innerH * t;
        const price = yMax - (yMax - yMin) * t;
        return (
          <g key={t}>
            <line x1={PAD.l} y1={y} x2={PAD.l + innerW} y2={y} stroke="#27272a" strokeWidth="1" strokeDasharray="2 4" />
            <text x={PAD.l - 8} y={y + 3} textAnchor="end" fill="#71717a" fontSize="10">{fmtPrice(Math.round(price), currency)}</text>
          </g>
        );
      })}

      {/* Ligne cible */}
      {targetCents != null && targetCents >= yMin && targetCents <= yMax && (
        <g>
          <line
            x1={PAD.l} y1={PAD.t + yScale(targetCents)}
            x2={PAD.l + innerW} y2={PAD.t + yScale(targetCents)}
            stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 4"
          />
          <text x={PAD.l + innerW - 5} y={PAD.t + yScale(targetCents) - 4} textAnchor="end" fill="#10b981" fontSize="10" fontWeight="bold">
            🎯 cible {fmtPrice(targetCents, currency)}
          </text>
        </g>
      )}

      {/* Lignes par concurrent */}
      {competitors.map((c, idx) => {
        const points = c.snapshots
          .filter((s) => s.priceCents != null)
          .map((s) => ({ x: PAD.l + xScale(new Date(s.capturedAt).getTime()), y: PAD.t + yScale(s.priceCents as number) }));
        if (points.length === 0) return null;
        const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const color = COLORS[idx % COLORS.length];
        return (
          <g key={c.id}>
            <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
          </g>
        );
      })}

      {/* Axe X : labels début/fin */}
      <text x={PAD.l} y={H - 8} fill="#71717a" fontSize="10">{new Date(minTime).toLocaleDateString()}</text>
      <text x={PAD.l + innerW} y={H - 8} textAnchor="end" fill="#71717a" fontSize="10">{new Date(maxTime).toLocaleDateString()}</text>

      {/* Légende */}
      <g transform={`translate(${PAD.l}, ${PAD.t - 5})`}>
        {competitors.slice(0, 4).map((c, idx) => (
          <g key={c.id} transform={`translate(${idx * 140}, 0)`}>
            <circle cx="6" cy="0" r="4" fill={COLORS[idx % COLORS.length]} />
            <text x="14" y="3" fill="#cbd5e1" fontSize="10" fontWeight="600">{c.domain}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
