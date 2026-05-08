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
  ftp:    { emoji: '📁', color: 'amber',   hint: 'Fichier sur serveur FTP (pull manuel pour V1)' },
  sftp:   { emoji: '🔐', color: 'amber',   hint: 'Fichier sur serveur SFTP (pull manuel pour V1)' },
  http:   { emoji: '🌐', color: 'emerald', hint: 'URL CSV/JSON public ou avec basic auth' },
  manual: { emoji: '✋', color: 'violet',  hint: 'Upload manuel uniquement par l\'admin' },
};

export function TariffsAdmin() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form create
  const [name, setName] = useState('');
  const [type, setType] = useState<'manual' | 'mail' | 'http'>('manual');
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
            <button
              onClick={() => setShowForm(!showForm)}
              className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500"
            >{showForm ? 'Annuler' : '+ Nouvelle source'}</button>
          </div>
        </header>

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
