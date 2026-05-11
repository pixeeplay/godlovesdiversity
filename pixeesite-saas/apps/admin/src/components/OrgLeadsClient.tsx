'use client';
/**
 * OrgLeadsClient — port faithful du LeadsClient GLD vers multi-tenant Pixeesite.
 *
 * Features :
 *  - Stats (total / opt-in / qualifiés / clients) cliquables
 *  - Filtres : search, status, source, opt-in only
 *  - Table riche : personne, entreprise, statut, source, score, social, tags
 *  - Modale Import CSV (multipart) avec résumé created/merged/skipped/errors
 *  - Modale Création manuelle (form 2 colonnes)
 *
 * Schéma tenant Lead (Prisma) : pas de linkedinUrl/twitterUrl/instagramUrl/facebookUrl/websiteUrl
 * → on stocke les liens sociaux dans `customFields` JSON (key "social").
 */
import { useEffect, useRef, useState } from 'react';
import {
  Plus, UploadCloud, Loader2, Search, Mail, Phone, Linkedin, Twitter, Instagram,
  CheckCircle2, X, AlertTriangle, Filter, Users
} from 'lucide-react';

interface Lead {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  country: string | null;
  source: string;
  sourceDetail: string | null;
  status: string;
  score: number;
  tags: string[];
  segments: string[];
  newsletterOptIn: boolean;
  notes: string | null;
  customFields?: any;
  createdAt: string;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  new:           { color: 'zinc',    label: 'Nouveau' },
  qualified:     { color: 'sky',     label: 'Qualifié' },
  contacted:     { color: 'amber',   label: 'Contacté' },
  engaged:       { color: 'violet',  label: 'Engagé' },
  customer:      { color: 'emerald', label: 'Client' },
  unsubscribed:  { color: 'rose',    label: 'Désinscrit' },
  bounced:       { color: 'rose',    label: 'Bounced' }
};

export function OrgLeadsClient({ orgSlug }: { orgSlug: string }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [optInOnly, setOptInOnly] = useState(false);
  const [stats, setStats] = useState<{ status: string; count: number }[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    if (filterSource) params.set('source', filterSource);
    if (optInOnly) params.set('optIn', '1');
    const r = await fetch(`/api/orgs/${orgSlug}/leads?${params}`, { cache: 'no-store' });
    const j = await r.json();
    if (r.ok) {
      setLeads(j.leads || []);
      setStats(j.stats || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterStatus, filterSource, optInOnly]);

  const totalAll = stats.reduce((s, x) => s + x.count, 0);

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">🎯 Leads CRM</h1>
        <p className="text-sm text-zinc-400">Prospects, clients, opt-ins — base de contact tenant.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Total leads" value={totalAll} color="zinc" icon={<Users size={14} />} />
        <Stat label="Newsletter opt-in" value={leads.filter((l) => l.newsletterOptIn).length} color="emerald" icon={<Mail size={14} />} />
        <Stat label="Qualifiés" value={stats.find((s) => s.status === 'qualified')?.count || 0} color="sky" />
        <Stat label="Clients" value={stats.find((s) => s.status === 'customer')?.count || 0} color="violet" />
      </div>

      {/* Toolbar */}
      <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3">
            <Search size={14} className="text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="email, nom, entreprise…"
              className="flex-1 bg-transparent text-sm py-2 focus:outline-none text-zinc-100"
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200">
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200">
            <option value="">Toutes sources</option>
            <option value="manual">Manuel</option>
            <option value="csv-import">CSV import</option>
            <option value="scrape-web">Scrape web</option>
            <option value="scrape-linkedin">LinkedIn scrape</option>
            <option value="scrape-instagram">Instagram scrape</option>
            <option value="newsletter-signup">Newsletter signup</option>
          </select>
          <label className="flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={optInOnly} onChange={(e) => setOptInOnly(e.target.checked)} className="accent-emerald-500" />
            Opt-in only
          </label>
          <button onClick={load} className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 px-3 py-2 rounded-lg flex items-center gap-1"><Filter size={11} /> Filtrer</button>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => exportCSV(leads)} className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 px-3 py-2 rounded-lg flex items-center gap-1.5">Export CSV</button>
            <button onClick={() => setShowImport(true)} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"><UploadCloud size={11} /> Import CSV</button>
            <button onClick={() => setShowCreate(true)} className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5"><Plus size={11} /> Nouveau</button>
          </div>
        </div>
      </section>

      {/* Liste */}
      {loading ? (
        <p className="text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</p>
      ) : leads.length === 0 ? (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-12 text-center">
          <Users size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-300 font-bold mb-1">Aucun lead pour cette recherche</p>
          <p className="text-xs text-zinc-500">Importe un CSV, scrape un site, ou crée-en un manuellement.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-950 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3">Personne</th>
                  <th className="text-left p-3">Entreprise</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Source</th>
                  <th className="text-left p-3">Score</th>
                  <th className="text-left p-3">Liens</th>
                  <th className="text-left p-3">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {leads.map((l) => {
                  const meta = STATUS_META[l.status] || { color: 'zinc', label: l.status };
                  const fullName = [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || '(sans nom)';
                  const social = (l.customFields?.social || {}) as { linkedin?: string; twitter?: string; instagram?: string };
                  return (
                    <tr key={l.id} className="hover:bg-zinc-800/30">
                      <td className="p-3">
                        <div className="font-bold text-zinc-100">{fullName}</div>
                        {l.email && <div className="text-[10px] text-zinc-500 flex items-center gap-1"><Mail size={9} /> {l.email}</div>}
                        {l.phone && <div className="text-[10px] text-zinc-500 flex items-center gap-1"><Phone size={9} /> {l.phone}</div>}
                      </td>
                      <td className="p-3">
                        {l.company && <div className="text-zinc-200">{l.company}</div>}
                        {l.jobTitle && <div className="text-[10px] text-zinc-500">{l.jobTitle}</div>}
                        {l.city && <div className="text-[10px] text-zinc-500">{l.city}{l.country ? `, ${l.country}` : ''}</div>}
                      </td>
                      <td className="p-3">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-${meta.color}-500/20 text-${meta.color}-300`}>
                          {meta.label}
                        </span>
                        {l.newsletterOptIn && <span className="block text-[9px] text-emerald-400 mt-0.5">opt-in</span>}
                      </td>
                      <td className="p-3 text-[10px] text-zinc-400">
                        <div>{l.source}</div>
                        {l.sourceDetail && <div className="text-zinc-600 truncate max-w-[120px]" title={l.sourceDetail}>{l.sourceDetail}</div>}
                      </td>
                      <td className="p-3">
                        <span className={`font-mono text-xs ${l.score >= 70 ? 'text-emerald-300' : l.score >= 40 ? 'text-amber-300' : 'text-zinc-500'}`}>{l.score}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300"><Linkedin size={11} /></a>}
                          {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300"><Twitter size={11} /></a>}
                          {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300"><Instagram size={11} /></a>}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {l.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[9px] bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded-full">#{t}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showImport && <ImportCSVModal orgSlug={orgSlug} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />}
      {showCreate && <CreateLeadModal orgSlug={orgSlug} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />}
    </div>
  );
}

function exportCSV(leads: Lead[]) {
  const headers = ['email', 'firstName', 'lastName', 'phone', 'company', 'jobTitle', 'city', 'country', 'source', 'status', 'score', 'tags', 'segments', 'newsletterOptIn'];
  const rows = leads.map((l) => headers.map((h) => {
    const v = (l as any)[h];
    if (Array.isArray(v)) return `"${v.join('|')}"`;
    if (v == null) return '';
    return `"${String(v).replace(/"/g, '""')}"`;
  }).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon?: React.ReactNode }) {
  const cls = ({
    zinc: 'bg-zinc-800 text-zinc-200',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    sky: 'bg-sky-500/15 text-sky-300',
    violet: 'bg-violet-500/15 text-violet-300'
  } as Record<string, string>)[color] || 'bg-zinc-800 text-zinc-200';
  return (
    <div className={`rounded-2xl p-3 ${cls}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold tracking-wider opacity-70 flex items-center gap-1">{icon} {label}</div>
    </div>
  );
}

function ImportCSVModal({ orgSlug, onClose, onDone }: { orgSlug: string; onClose: () => void; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [segments, setSegments] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importCSV() {
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('segments', segments);
      fd.append('newsletterOptIn', optIn ? 'true' : 'false');
      const r = await fetch(`/api/orgs/${orgSlug}/leads/import`, { method: 'POST', body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'KO');
      setResult(j.summary);
    } catch (e: any) {
      setError(e?.message);
    }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl max-w-lg w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold flex items-center gap-2 text-zinc-100"><UploadCloud size={16} /> Import CSV</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-white" /></button>
        </div>

        {!result ? (
          <>
            <p className="text-xs text-zinc-400">Upload un CSV avec colonnes : email, firstname, lastname, phone, company, linkedin… (auto-détecté). Délimiteur , ou ; auto.</p>
            <div className="border-2 border-dashed border-zinc-700 hover:border-violet-500 rounded-xl p-6 text-center cursor-pointer" onClick={() => fileRef.current?.click()}>
              <UploadCloud size={28} className="text-zinc-500 mx-auto mb-2" />
              <p className="text-xs text-zinc-400">{file ? file.name : 'Clique pour choisir un CSV'}</p>
              {file && <p className="text-[10px] text-zinc-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
              <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-1">Segments (virgules)</label>
              <input value={segments} onChange={(e) => setSegments(e.target.value)} placeholder="press, partenaires, beta-testeurs…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} className="accent-emerald-500" />
              <span>Marquer comme opt-in newsletter (uniquement si CSV vient d&apos;un consentement vérifié — RGPD)</span>
            </label>
            {error && <div className="bg-rose-500/10 border border-rose-500/30 rounded p-2 text-xs text-rose-300 flex items-center gap-1.5"><AlertTriangle size={11} /> {error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Annuler</button>
              <button onClick={importCSV} disabled={busy || !file} className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />} Importer
              </button>
            </div>
          </>
        ) : (
          <div>
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
            <p className="font-bold text-emerald-300 text-center mb-3">Import réussi</p>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-emerald-500/10 rounded-lg p-3"><div className="text-2xl font-bold text-emerald-300">{result.created}</div><div className="text-[10px] text-zinc-500">Créés</div></div>
              <div className="bg-sky-500/10 rounded-lg p-3"><div className="text-2xl font-bold text-sky-300">{result.merged}</div><div className="text-[10px] text-zinc-500">Mis à jour</div></div>
              <div className="bg-zinc-800 rounded-lg p-3"><div className="text-2xl font-bold text-zinc-300">{result.skipped}</div><div className="text-[10px] text-zinc-500">Skipped</div></div>
              <div className="bg-rose-500/10 rounded-lg p-3"><div className="text-2xl font-bold text-rose-300">{result.errors}</div><div className="text-[10px] text-zinc-500">Erreurs</div></div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-3 text-center">Colonnes détectées : {(result.detectedColumns || []).join(', ')}</p>
            <button onClick={onDone} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2 rounded-lg mt-3">Fermer & rafraîchir</button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateLeadModal({ orgSlug, onClose, onDone }: { orgSlug: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<any>({ status: 'new', score: 0, newsletterOptIn: false });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/orgs/${orgSlug}/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-zinc-100">Nouveau lead</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-white" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Prénom" onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
          <input placeholder="Nom" onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
          <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs col-span-2 text-zinc-200" />
          <input placeholder="Téléphone" onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
          <input placeholder="Entreprise" onChange={(e) => setForm({ ...form, company: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
          <input placeholder="LinkedIn URL" onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs col-span-2 text-zinc-200" />
        </div>
        <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer mt-2">
          <input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm({ ...form, newsletterOptIn: e.target.checked })} className="accent-emerald-500" />
          Opt-in newsletter
        </label>
        <button onClick={save} disabled={busy} className="w-full mt-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm py-2 rounded-lg flex items-center justify-center gap-1.5">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Créer
        </button>
      </div>
    </div>
  );
}
