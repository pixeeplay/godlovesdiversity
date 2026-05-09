'use client';
/**
 * TariffsAdmin — gestion des sources de tarifs fournisseurs.
 *
 * Liste les sources, permet de créer/éditer/supprimer, upload manuel d'un fichier,
 * trigger pull HTTP, voir l'historique des imports.
 */
import { useEffect, useRef, useState } from 'react';

type Source = {
  id: string;
  name: string;
  type: 'mail' | 'ftp' | 'sftp' | 'http' | 'manual';
  format: string;
  vendorDomain: string | null;
  active: boolean;
  lastImportAt: string | null;
  lastImportRows: number | null;
  lastImportErrors: number | null;
  importCount: number;
  notes: string | null;
  mapping: any;
  csvDelimiter: string;
};

const TYPE_META: Record<string, { emoji: string; color: string; hint: string }> = {
  mail:   { emoji: '📧', color: 'sky',     hint: 'Pièce jointe reçue par mail (Resend Inbound)' },
  ftp:    { emoji: '📁', color: 'amber',   hint: 'Fichier sur serveur FTP/FTPS (cron pull auto)' },
  sftp:   { emoji: '🔐', color: 'amber',   hint: 'Fichier sur serveur SFTP avec clé/password (cron pull auto)' },
  http:   { emoji: '🌐', color: 'emerald', hint: 'URL CSV/JSON public ou avec basic auth (cron pull auto)' },
  manual: { emoji: '✋', color: 'violet',  hint: 'Upload manuel uniquement par l\'admin' },
};

interface MatrixRow {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  ean: string | null;
  imageUrl: string | null;
  currency: string;
  targetPriceCents: number | null;
  cells: Record<string, { priceCents: number | null; inStock: boolean | null; method?: string; capturedAt?: string | null }>;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  spreadCents: number | null;
  spreadPct: number | null;
}

export function TariffsAdmin() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'sources' | 'matrix'>('sources');
  const [matrix, setMatrix] = useState<{ domains: string[]; rows: MatrixRow[] } | null>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [matrixDomain, setMatrixDomain] = useState<string>('');
  const [matrixSearch, setMatrixSearch] = useState('');

  async function loadMatrix() {
    setMatrixLoading(true);
    try {
      const params = matrixDomain ? `?domain=${encodeURIComponent(matrixDomain)}` : '';
      const r = await fetch(`/api/admin/tariffs/matrix${params}`);
      const j = await r.json();
      if (r.ok) setMatrix({ domains: j.domains, rows: j.rows });
    } finally {
      setMatrixLoading(false);
    }
  }

  useEffect(() => { if (tab === 'matrix') loadMatrix(); /* eslint-disable-next-line */ }, [tab, matrixDomain]);

  // Form create
  const [name, setName] = useState('');
  const [type, setType] = useState<'manual' | 'mail' | 'http' | 'ftp' | 'sftp'>('manual');
  const [vendorDomain, setVendorDomain] = useState('');
  const [csvDelimiter, setCsvDelimiter] = useState(';');
  const [mappingJson, setMappingJson] = useState('{\n  "sku": "SKU",\n  "name": "Designation",\n  "price": "PrixTTC",\n  "currency": { "literal": "EUR" }\n}');
  const [configJson, setConfigJson] = useState('{}');

  const reload = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/tariffs');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSources(j.sources);
    } catch (e: any) {
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const mapping = JSON.parse(mappingJson);
      const config = configJson.trim() ? JSON.parse(configJson) : {};
      const r = await fetch('/api/admin/tariffs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, type, mapping, config, vendorDomain: vendorDomain || undefined,
          csvDelimiter, format: 'auto',
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setShowForm(false);
      setName(''); setVendorDomain('');
      await reload();
    } catch (e: any) {
      alert('Erreur : ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-3xl font-bold text-transparent">
              📥 Ingestion Tarifs Fournisseurs
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Configure des sources mail/HTTP/FTP pour ingérer automatiquement les grilles tarifaires reçues des fournisseurs.
            </p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/prices" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700">← Comparateur prix</a>
            {tab === 'sources' && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500"
              >{showForm ? 'Annuler' : '+ Nouvelle source'}</button>
            )}
          </div>
        </header>

        {/* TABS */}
        <div className="flex gap-2 border-b border-zinc-800 mb-4">
          <button
            onClick={() => setTab('sources')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${tab === 'sources' ? 'border-amber-500 text-amber-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            📂 Sources de tarif ({sources.length})
          </button>
          <button
            onClick={() => setTab('matrix')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${tab === 'matrix' ? 'border-amber-500 text-amber-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
          >
            📊 Matrice prix (produits × fournisseurs)
          </button>
        </div>

        {tab === 'matrix' ? (
          <MatrixView
            data={matrix}
            loading={matrixLoading}
            domain={matrixDomain}
            setDomain={setMatrixDomain}
            search={matrixSearch}
            setSearch={setMatrixSearch}
            onRefresh={loadMatrix}
          />
        ) : (
          <></>
        )}

        {tab === 'sources' && (
        <div>
        {/* Form + liste sources */}

        {showForm && (
          <section className="mb-6 rounded-2xl bg-amber-950/30 p-5 ring-1 ring-amber-700/50">
            <h2 className="mb-3 text-sm font-bold text-amber-200">➕ Nouvelle source de tarif</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-400">Nom interne</label>
                <input
                  value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Sigma France"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Type</label>
                <select
                  value={type} onChange={(e) => setType(e.target.value as any)}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                >
                  <option value="manual">✋ Upload manuel</option>
                  <option value="mail">📧 Mail (webhook Resend)</option>
                  <option value="http">🌐 URL HTTP</option>
                  <option value="ftp">📁 FTP (pull cron)</option>
                  <option value="sftp">🔐 SFTP (pull cron, auth clé/password)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Domaine vendeur (clé pour CompetitorProduct)</label>
                <input
                  value={vendorDomain} onChange={(e) => setVendorDomain(e.target.value)}
                  placeholder="ex: sigma-france.fr"
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Délimiteur CSV (FR souvent ";")</label>
                <input
                  value={csvDelimiter} onChange={(e) => setCsvDelimiter(e.target.value)}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
                />
              </div>
              {type === 'http' && (
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-400">Config HTTP (JSON)</label>
                  <textarea
                    value={configJson} onChange={(e) => setConfigJson(e.target.value)}
                    rows={4}
                    placeholder={'{\n  "url": "https://fournisseur.com/tarifs.csv",\n  "basicAuth": { "user": "x", "password": "y" }\n}'}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                </div>
              )}
              {type === 'mail' && (
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-400">Config mail (JSON)</label>
                  <textarea
                    value={configJson} onChange={(e) => setConfigJson(e.target.value)}
                    rows={3}
                    placeholder={'{\n  "fromAddress": "tarifs@fournisseur.com",\n  "fromDomain": "fournisseur.com"\n}'}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Configure Resend Inbound pour POSTer sur /api/webhooks/tariff-mail</p>
                </div>
              )}
              {type === 'ftp' && (
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-400">Config FTP (JSON)</label>
                  <textarea
                    value={configJson} onChange={(e) => setConfigJson(e.target.value)}
                    rows={6}
                    placeholder={'{\n  "host": "ftp.fournisseur.com",\n  "port": 21,\n  "user": "username",\n  "password": "secret",\n  "path": "/exports/tarifs.csv",\n  "secure": false\n}'}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">Cron Coolify /api/cron/tariffs-pull récupère le fichier toutes les 6h. <code>secure: true</code> pour FTPS.</p>
                </div>
              )}
              {type === 'sftp' && (
                <div className="md:col-span-2">
                  <label className="text-xs text-zinc-400">Config SFTP (JSON) — auth password OU clé privée</label>
                  <textarea
                    value={configJson} onChange={(e) => setConfigJson(e.target.value)}
                    rows={8}
                    placeholder={'{\n  "host": "sftp.fournisseur.com",\n  "port": 22,\n  "user": "username",\n  "password": "secret",\n  "privateKey": "-----BEGIN OPENSSH PRIVATE KEY-----\\n...\\n-----END OPENSSH PRIVATE KEY-----",\n  "passphrase": "optionnel",\n  "path": "/exports/tarifs.csv"\n}'}
                    className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                  />
                  <p className="mt-1 text-[10px] text-zinc-500">⚠ Privilégie la clé privée plutôt que le password. Stocke-la dans /admin/secrets pour la référencer sans clear-text.</p>
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-xs text-zinc-400">Mapping colonnes → champs (JSON)</label>
                <textarea
                  value={mappingJson} onChange={(e) => setMappingJson(e.target.value)}
                  rows={8}
                  className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
                />
                <p className="mt-1 text-[10px] text-zinc-500">
                  Champs : sku, ean, name, brand, price, currency, inStock, url, imageUrl. Valeurs : nom de colonne CSV, ou {'{ "literal": "EUR" }'} pour valeur fixe, ou {'{ "field": "Prix HT", "transform": "*1.2" }'} pour transformer.
                </p>
              </div>
            </div>
            <button
              onClick={handleCreate} disabled={creating || !name}
              className="mt-3 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-40"
            >{creating ? '⏳' : '✓ Créer'}</button>
          </section>
        )}

        {/* LISTE */}
        {loading ? (
          <div className="rounded-2xl bg-zinc-900 p-12 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">⏳ Chargement…</div>
        ) : error ? (
          <div className="rounded-2xl bg-rose-950/30 p-6 text-sm text-rose-300 ring-1 ring-rose-700/50">⚠ {error}</div>
        ) : sources.length === 0 ? (
          <div className="rounded-2xl bg-zinc-900 p-12 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
            <div className="mb-3 text-4xl">📭</div>
            Aucune source de tarif. Crée-en une ci-dessus.
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((src) => <SourceRow key={src.id} src={src} onChange={reload} />)}
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
}

function fmtPrice(cents: number | null, currency = 'EUR'): string {
  if (cents == null) return '—';
  const sym = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';
  return `${(cents / 100).toFixed(2)} ${sym}`;
}

function MatrixView({ data, loading, domain, setDomain, search, setSearch, onRefresh }: {
  data: { domains: string[]; rows: MatrixRow[] } | null;
  loading: boolean;
  domain: string; setDomain: (s: string) => void;
  search: string; setSearch: (s: string) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return <div className="rounded-2xl bg-zinc-900 p-12 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">⏳ Chargement matrice…</div>;
  }
  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900 p-12 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
        <div className="mb-3 text-4xl">📊</div>
        Aucune donnée. Ajoute des produits dans <a href="/admin/prices" className="text-amber-300 underline">/admin/prices</a> et configure des sources tarifs ici pour remplir la matrice.
      </div>
    );
  }

  const filteredRows = data.rows.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || (r.brand?.toLowerCase().includes(q)) || (r.sku?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-3">
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔎 Filtrer par produit, marque, SKU…"
            className="flex-1 min-w-[200px] bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          />
          <select
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
          >
            <option value="">Tous les fournisseurs ({data.domains.length})</option>
            {data.domains.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={onRefresh}
            className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg"
          >
            🔄 Recharger
          </button>
          <span className="text-xs text-zinc-500 ml-auto">{filteredRows.length} produit{filteredRows.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Tableau matrice */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-zinc-950 border-b border-zinc-800">
              <tr>
                <th className="text-left p-3 font-bold text-zinc-300 sticky left-0 bg-zinc-950 z-10 min-w-[200px]">Produit</th>
                <th className="text-right p-3 font-bold text-emerald-300">Min</th>
                <th className="text-right p-3 font-bold text-rose-300">Max</th>
                <th className="text-right p-3 font-bold text-amber-300">Écart</th>
                {data.domains.map((d) => (
                  <th key={d} className="text-right p-3 font-bold text-zinc-400 min-w-[100px]">
                    <span className="truncate block max-w-[120px]" title={d}>{d}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredRows.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-800/30">
                  <td className="p-3 sticky left-0 bg-zinc-900 z-10">
                    <a href={`/admin/prices/${r.id}`} className="flex items-center gap-2 hover:text-amber-300">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt="" className="w-8 h-8 rounded object-cover ring-1 ring-zinc-800 shrink-0" />
                      ) : (
                        <span className="w-8 h-8 rounded bg-zinc-800 ring-1 ring-zinc-700 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-100 truncate max-w-[180px]" title={r.name}>{r.name}</div>
                        {r.brand && <div className="text-[10px] text-zinc-500 truncate">{r.brand}</div>}
                      </div>
                    </a>
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-300 font-bold">{fmtPrice(r.minPriceCents, r.currency)}</td>
                  <td className="p-3 text-right font-mono text-rose-300">{fmtPrice(r.maxPriceCents, r.currency)}</td>
                  <td className="p-3 text-right font-mono text-amber-300">{r.spreadPct != null ? `${r.spreadPct}%` : '—'}</td>
                  {data.domains.map((d) => {
                    const cell = r.cells[d];
                    const isMin = cell?.priceCents != null && cell.priceCents === r.minPriceCents;
                    const isMax = cell?.priceCents != null && cell.priceCents === r.maxPriceCents;
                    const underTarget = r.targetPriceCents != null && cell?.priceCents != null && cell.priceCents < r.targetPriceCents;
                    return (
                      <td key={d} className={`p-3 text-right font-mono ${
                        underTarget ? 'bg-emerald-500/10 text-emerald-200 font-bold' :
                        isMin ? 'text-emerald-300' :
                        isMax ? 'text-rose-300' :
                        'text-zinc-300'
                      }`}>
                        {cell ? (
                          <div className="flex flex-col items-end">
                            <span>{fmtPrice(cell.priceCents, r.currency)}</span>
                            {cell.method && <span className="text-[8px] uppercase opacity-50">{cell.method}</span>}
                            {cell.inStock === false && <span className="text-[8px] text-rose-400">rupture</span>}
                          </div>
                        ) : <span className="text-zinc-700">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-zinc-500">
        💡 Les cellules <span className="text-emerald-300 font-bold">vertes</span> = prix le plus bas du produit. <span className="text-emerald-200 font-bold bg-emerald-500/10 px-1">vert vif</span> = sous le prix cible. <span className="text-rose-300 font-bold">rouge</span> = prix le plus haut.
      </p>
    </div>
  );
}

function SourceRow({ src, onChange }: { src: Source; onChange: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const meta = TYPE_META[src.type] || TYPE_META.manual;

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`/api/admin/tariffs/${src.id}/upload`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      alert(`✓ ${j.snapshotsCreated} snapshots · ${j.watchesCreated} nouveaux watches · ${j.rowsSkipped} ignorées`);
      onChange();
    } catch (e: any) {
      alert('⚠ ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    try {
      const r = await fetch(`/api/admin/tariffs/${src.id}/pull`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      alert(`✓ ${j.snapshotsCreated} snapshots créés`);
      onChange();
    } catch (e: any) {
      alert('⚠ ' + e.message);
    } finally {
      setPulling(false);
    }
  };

  const loadHistory = async () => {
    if (showHistory) { setShowHistory(false); return; }
    const r = await fetch(`/api/admin/tariffs/${src.id}`);
    const j = await r.json();
    setHistory(j.imports || []);
    setShowHistory(true);
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette source et son historique ?')) return;
    await fetch(`/api/admin/tariffs/${src.id}`, { method: 'DELETE' });
    onChange();
  };

  return (
    <div className={`rounded-2xl bg-zinc-900 p-4 ring-1 ${src.active ? 'ring-zinc-800' : 'ring-zinc-800 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-${meta.color}-950/40 text-2xl ring-1 ring-${meta.color}-700/40`}>
          {meta.emoji}
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-zinc-100">{src.name}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-${meta.color}-900/40 text-${meta.color}-300`}>
              {src.type}
            </span>
            {src.vendorDomain && <span className="text-xs text-zinc-500">· {src.vendorDomain}</span>}
          </div>
          <p className="text-xs text-zinc-500">{meta.hint}</p>
          {src.lastImportAt && (
            <p className="mt-1 text-[10px] text-zinc-400">
              Dernier import : {new Date(src.lastImportAt).toLocaleString()}
              · {src.lastImportRows} lignes
              {src.lastImportErrors ? <span className="text-amber-400"> · {src.lastImportErrors} erreurs</span> : null}
              · total {src.importCount} imports
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef} type="file" accept=".csv,.tsv,.xml,.json,.txt" className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <button
            onClick={() => fileRef.current?.click()} disabled={uploading}
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >📤 Upload</button>
          {src.type === 'http' && (
            <button
              onClick={handlePull} disabled={pulling}
              className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >🌐 Pull</button>
          )}
          <button
            onClick={loadHistory}
            className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700"
          >{showHistory ? '▾' : '▸'} Historique</button>
          <button onClick={handleDelete} className="rounded bg-zinc-800 px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-950">🗑</button>
        </div>
      </div>
      {showHistory && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded bg-zinc-950 p-3 ring-1 ring-zinc-800">
          {history.length === 0 ? (
            <p className="text-xs text-zinc-500">Aucun import encore.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-zinc-400">
                <tr>
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-right">Lignes</th>
                  <th className="px-2 py-1 text-right">Snapshots</th>
                  <th className="px-2 py-1 text-right">Watches</th>
                  <th className="px-2 py-1 text-right">Skipped</th>
                  <th className="px-2 py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {history.map((h) => (
                  <tr key={h.id}>
                    <td className="px-2 py-1 text-zinc-400">{new Date(h.startedAt).toLocaleString()}</td>
                    <td className="px-2 py-1 text-right font-mono text-zinc-200">{h.rowsParsed}</td>
                    <td className="px-2 py-1 text-right font-mono text-emerald-300">{h.snapshotsCreated}</td>
                    <td className="px-2 py-1 text-right font-mono text-violet-300">{h.watchesCreated}</td>
                    <td className="px-2 py-1 text-right font-mono text-amber-300">{h.rowsSkipped}</td>
                    <td className="px-2 py-1 text-center">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        h.status === 'done' ? 'bg-emerald-900 text-emerald-200' :
                        h.status === 'error' ? 'bg-rose-900 text-rose-200' :
                        'bg-zinc-800 text-zinc-300'
                      }`}>{h.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
