'use client';
import { useState, useEffect } from 'react';
import { Building2, Plus, Mail, Upload, Download, Search, ExternalLink, CheckCircle2, Loader2, FileSpreadsheet, Send, Sparkles, X } from 'lucide-react';

export function EstablishmentsAdmin({ initial }: { initial: any[] }) {
  const [venues, setVenues] = useState(initial);
  const [q, setQ] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);

  // Multi-sélection + bulk enrich
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);
  function toggle(id: string) {
    setSelected((s) => {
      const ns = new Set(s);
      if (ns.has(id)) ns.delete(id); else ns.add(id);
      return ns;
    });
  }
  function selectAllVisible(list: any[]) {
    setSelected(new Set(list.map((v) => v.id)));
  }
  function clearSelection() {
    setSelected(new Set());
  }
  async function bulkEnrich(opts: { ids?: string[]; mode?: 'stale' | 'empty' | 'all'; limit?: number; overwrite?: boolean }) {
    if (!confirm(`Lancer l'enrichissement IA${opts.ids ? ` sur ${opts.ids.length} venues` : ` (mode "${opts.mode}", max ${opts.limit || 20})`} ? Ça peut prendre plusieurs minutes.`)) return;
    setBulkRunning(true);
    setBulkResult(null);
    const r = await fetch('/api/admin/venues/enrich-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts)
    });
    const j = await r.json();
    setBulkRunning(false);
    setBulkResult(j);
    if (j.ok) clearSelection();
  }

  const filtered = venues.filter((v) => !q || v.name?.toLowerCase().includes(q.toLowerCase()) || v.city?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 grid place-items-center"><Building2 size={18} /></div>
          <div>
            <h1 className="font-display font-bold text-2xl">Établissements LGBT-friendly</h1>
            <p className="text-sm text-zinc-400">{venues.length} lieux dans l'annuaire</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={async () => {
            if (!confirm('Supprimer TOUS les venues importés en masse (sans owner) ? Cette action est irréversible.')) return;
            if (!confirm('Vraiment ? Pour ré-importer un CSV propre.')) return;
            const r = await fetch('/api/admin/establishments/wipe', { method: 'DELETE' });
            const j = await r.json();
            if (j.ok) { alert(`✓ ${j.deleted} venues supprimés`); location.reload(); }
            else alert('Erreur : ' + (j.error || 'inconnue'));
          }} className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 px-4 py-2 rounded-full text-sm flex items-center gap-2">
            🗑 Wipe importés
          </button>
          <GeocodeButton />
          <button onClick={() => setShowImport(true)} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <FileSpreadsheet size={14} /> Import CSV
          </button>
          <button onClick={() => setShowInvite(true)} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <Mail size={14} /> Inviter un établissement
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 mb-4 flex items-center gap-2">
        <Search size={14} className="text-zinc-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un établissement, une ville…" className="flex-1 bg-transparent outline-none text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-dashed border-zinc-800 rounded-2xl">
          <Building2 size={32} className="mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-400">Aucun établissement pour l'instant.</p>
          <p className="text-xs text-zinc-500 mt-1">Importe ton CSV ou invite tes premiers lieux.</p>
        </div>
      ) : (
        <>
          {/* BARRE BULK ENRICH — actions sur toute la liste filtrée */}
          <div className="flex flex-wrap items-center gap-2 mb-3 p-3 bg-fuchsia-500/5 border border-fuchsia-500/20 rounded-xl">
            <Sparkles size={16} className="text-fuchsia-300" />
            <span className="text-xs font-bold text-fuchsia-200 mr-2">Enrichissement IA</span>
            <button onClick={() => selectAllVisible(filtered)} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded">
              Tout sélectionner ({filtered.length})
            </button>
            <button onClick={() => bulkEnrich({ mode: 'empty', limit: 50 })} disabled={bulkRunning} className="text-xs bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 px-3 py-1.5 rounded font-bold disabled:opacity-50">
              ✨ Enrichir 50 venues vides
            </button>
            <button onClick={() => bulkEnrich({ mode: 'stale', limit: 50 })} disabled={bulkRunning} className="text-xs bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 px-3 py-1.5 rounded font-bold disabled:opacity-50">
              🔄 Rafraîchir 50 anciens
            </button>
            <span className="ml-auto text-[10px] text-zinc-500">~1 sec/venue · max 5 min/run</span>
          </div>

          {/* BARRE STICKY DE SÉLECTION (apparaît si selection > 0) */}
          {selected.size > 0 && (
            <div className="sticky top-2 z-30 mb-3 bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 border border-fuchsia-400/50 backdrop-blur-md rounded-xl p-3 flex flex-wrap items-center gap-2 shadow-2xl">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <CheckCircle2 size={16} className="text-fuchsia-200" />
                {selected.size} venue{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}
              </div>
              <div className="ml-auto flex gap-2 flex-wrap">
                <button onClick={() => bulkEnrich({ ids: Array.from(selected), overwrite: false })} disabled={bulkRunning} className="text-xs bg-fuchsia-500 hover:bg-fuchsia-400 text-white px-3 py-1.5 rounded font-bold flex items-center gap-1 disabled:opacity-50">
                  {bulkRunning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Enrichir IA (champs vides)
                </button>
                <button onClick={() => { if (confirm(`ÉCRASER les données existantes pour ${selected.size} venues ?`)) bulkEnrich({ ids: Array.from(selected), overwrite: true }); }} disabled={bulkRunning} className="text-xs bg-amber-500/30 hover:bg-amber-500/50 border border-amber-400/50 text-amber-100 px-3 py-1.5 rounded font-bold disabled:opacity-50">
                  ⚠️ Tout écraser
                </button>
                <button onClick={clearSelection} className="text-xs bg-zinc-800/50 hover:bg-zinc-800 text-white px-3 py-1.5 rounded flex items-center gap-1">
                  <X size={12} /> Annuler
                </button>
              </div>
            </div>
          )}

          {/* RÉSULTAT BULK */}
          {bulkResult && (
            <div className={`mb-3 p-3 rounded-xl border ${bulkResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="text-xs">
                  {bulkResult.ok ? (
                    <><b>✓ Enrichissement terminé</b> — {bulkResult.enriched}/{bulkResult.processed} venues enrichis · {bulkResult.skipped} skip · durée {Math.round((bulkResult.durationMs || 0) / 1000)}s</>
                  ) : (
                    <><b>⚠ Erreur</b> — {bulkResult.error || JSON.stringify(bulkResult)}</>
                  )}
                </div>
                <button onClick={() => setBulkResult(null)} className="text-zinc-400 hover:text-white text-xs">✕</button>
              </div>
              {bulkResult.ok && Array.isArray(bulkResult.results) && (
                <details className="mt-2">
                  <summary className="text-[10px] cursor-pointer text-zinc-400">Voir le détail par venue</summary>
                  <ul className="mt-1 max-h-40 overflow-y-auto space-y-0.5 text-[10px]">
                    {bulkResult.results.slice(0, 50).map((r: any, i: number) => (
                      <li key={i} className={r.ok ? 'text-emerald-300/80' : 'text-rose-300/80'}>
                        {r.ok ? '✓' : '✗'} <b>{r.name}</b>{r.confidence ? ` · ${Math.round(r.confidence * 100)}%` : ''}{r.fieldsApplied?.length ? ` · ${r.fieldsApplied.join(',')}` : ''}{r.error ? ` · ${r.error}` : ''}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((v) => {
              const isSel = selected.has(v.id);
              return (
                <div key={v.id} className={`relative bg-zinc-900 border rounded-2xl p-4 transition group ${isSel ? 'border-fuchsia-400 shadow-lg shadow-fuchsia-500/20' : 'border-zinc-800 hover:border-emerald-500/40'}`}>
                  {/* Checkbox de sélection (coin haut-gauche) */}
                  <label className="absolute top-3 left-3 z-10 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(v.id)}
                      className="w-4 h-4 rounded accent-fuchsia-500"
                    />
                  </label>
                  {/* Score freshness mini-pastille */}
                  {typeof v.freshnessScore === 'number' && (
                    <div className={`absolute top-3 right-3 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded ${v.freshnessScore >= 80 ? 'bg-emerald-500/20 text-emerald-300' : v.freshnessScore >= 60 ? 'bg-cyan-500/20 text-cyan-300' : v.freshnessScore >= 40 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                      {Math.round(v.freshnessScore)}%
                    </div>
                  )}
                  <a href={`/admin/venues/${v.id}`} className="block pt-4">
                    <div className="flex items-start justify-between gap-2 mb-2 pl-5">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate">{v.name}</h3>
                        <p className="text-[11px] text-zinc-400 truncate">{v.city} {v.country && `· ${v.country}`}</p>
                      </div>
                      {v.published && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                    </div>
                    {v.description && <p className="text-xs text-zinc-300 line-clamp-2 mb-2">{v.description}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
                      <span>📅 {v._count?.events || 0}</span>
                      <span>🎟 {v._count?.coupons || 0}</span>
                      {v.enrichedAt && <span title="Enrichi" className="text-fuchsia-300">✨</span>}
                      {v.owner && <span className="ml-auto truncate">{v.owner.name || v.owner.email}</span>}
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Modal Invitation */}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}

function GeocodeButton() {
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function loadStats() {
    const r = await fetch('/api/admin/venues/geocode');
    const j = await r.json();
    setStats(j);
  }
  useEffect(() => { void loadStats(); }, []);

  async function geocode() {
    if (!confirm('Géocoder 50 venues maintenant (~55 sec via OpenStreetMap) ?')) return;
    setBusy(true);
    const r = await fetch('/api/admin/venues/geocode?limit=50', { method: 'POST' });
    const j = await r.json();
    alert(`✓ ${j.geocoded} géocodés · ${j.failed} échecs · ${j.remaining} restants`);
    void loadStats();
    setBusy(false);
  }

  if (!stats) return null;
  return (
    <button onClick={geocode} disabled={busy || stats.withoutCoords === 0} className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 px-4 py-2 rounded-full text-sm flex items-center gap-2 disabled:opacity-50">
      {busy ? <Loader2 size={14} className="animate-spin" /> : '🌍'}
      Géocoder ({stats.withCoords}/{stats.total} = {stats.percentDone}%)
    </button>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('Bonjour,\n\nNous serions ravis de vous accueillir dans l\'annuaire parislgbt — un mouvement spirituel inclusif qui met en valeur les lieux LGBT-friendly.\n\nVous pouvez créer votre fiche en quelques minutes en cliquant sur le lien ci-dessous.\n\nÀ très bientôt,\nL\'équipe GLD');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    const r = await fetch('/api/admin/establishments/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, city, message })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) { setSent(true); setTimeout(onClose, 2000); }
    else alert(j.error || 'Erreur envoi');
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
        <h2 className="font-bold text-xl mb-2 flex items-center gap-2"><Mail size={18} className="text-emerald-400" /> Inviter un établissement</h2>
        <p className="text-xs text-zinc-400 mb-4">Email d'invitation envoyé via Resend avec un lien magique pour créer leur fiche.</p>

        {sent ? (
          <div className="text-center py-8">
            <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
            <p className="font-bold">Invitation envoyée !</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Field label="Email du gérant" type="email" value={email} onChange={setEmail} />
            <Field label="Nom de l'établissement" value={name} onChange={setName} />
            <Field label="Ville" value={city} onChange={setCity} />
            <label className="block">
              <span className="text-xs font-bold text-zinc-300 mb-1 block">Message personnalisé</span>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm">Annuler</button>
              <button onClick={send} disabled={!email || !name || busy} className="flex-1 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportModal({ onClose }: { onClose: () => void }) {
  const [csv, setCsv] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  async function importFromText() {
    setBusy(true);
    const r = await fetch('/api/admin/establishments/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv })
    });
    const j = await r.json();
    setResult(j);
    setBusy(false);
  }

  async function importFromFile() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/admin/establishments/import', { method: 'POST', body: fd });
    const j = await r.json();
    setResult(j);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md grid place-items-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-w-2xl w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-bold text-xl mb-2 flex items-center gap-2"><Upload size={18} className="text-cyan-400" /> Import CSV établissements</h2>
        <p className="text-xs text-zinc-400 mb-3">
          Headers acceptés (FR ou EN) : <code className="text-cyan-300">NOM ÉTABLISSEMENT, CATÉGORIES, TAGS, ADRESSE, VILLE, CP, RÉGION, Pays, Accroche, Description, COVER IMG, Logo, Web, Facebook, Instagram, Contact, Téléphone</code>
        </p>

        {/* Upload fichier */}
        <div className="bg-cyan-500/5 border border-cyan-500/30 rounded-xl p-3 mb-3">
          <div className="text-xs font-bold text-cyan-300 mb-2">📁 Option 1 : Uploader un fichier .csv</div>
          <input
            type="file" accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs"
          />
          {file && <div className="text-[10px] text-zinc-400 mt-1">{file.name} — {(file.size / 1024).toFixed(1)} KB</div>}
          <button onClick={importFromFile} disabled={!file || busy} className="mt-2 w-full bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importer le fichier
          </button>
        </div>

        {/* OU paste */}
        <div className="text-[11px] text-zinc-500 text-center my-2">— OU —</div>
        <div className="text-xs font-bold text-zinc-300 mb-2">📋 Option 2 : Coller le CSV</div>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} placeholder="Colle ton CSV ici…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />

        {result && (
          <div className={`mt-3 p-3 rounded-lg text-xs ${result.ok ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'}`}>
            {result.ok ? (
              <>
                <div className="font-bold">✓ Import terminé</div>
                <div className="mt-1">
                  Créés : <b>{result.created}</b> · Mis à jour : <b>{result.updated}</b> · Ignorés : <b>{result.skipped}</b> / {result.total}
                </div>
                {result.errorsPreview?.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-amber-300">{result.errorsPreview.length} erreur(s) — voir détails</summary>
                    <ul className="mt-1 text-[10px] list-disc pl-4">{result.errorsPreview.map((e: string, i: number) => <li key={i}>{e}</li>)}</ul>
                  </details>
                )}
              </>
            ) : (
              <div>❌ {result.error}</div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm">Fermer</button>
          {csv.trim() && (
            <button onClick={importFromText} disabled={busy} className="flex-1 bg-gradient-to-r from-cyan-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Importer le texte
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-300 mb-1 block">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
    </label>
  );
}
