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
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients, radii, shadows } from '@/lib/design-tokens';

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

const STATUS_META: Record<string, { color: string; label: string; bg: string }> = {
  new:          { color: '#a1a1aa', label: 'Nouveau',     bg: 'rgba(161,161,170,0.15)' },
  qualified:    { color: '#7dd3fc', label: 'Qualifié',    bg: 'rgba(125,211,252,0.15)' },
  contacted:    { color: '#fcd34d', label: 'Contacté',    bg: 'rgba(252,211,77,0.15)'  },
  engaged:      { color: '#c4b5fd', label: 'Engagé',      bg: 'rgba(196,181,253,0.15)' },
  customer:     { color: '#6ee7b7', label: 'Client',      bg: 'rgba(110,231,183,0.15)' },
  unsubscribed: { color: '#fca5a5', label: 'Désinscrit',  bg: 'rgba(252,165,165,0.15)' },
  bounced:      { color: '#fca5a5', label: 'Bounced',     bg: 'rgba(252,165,165,0.15)' },
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: 12,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  opacity: 0.7,
};

const tdStyle: React.CSSProperties = {
  padding: 12,
  verticalAlign: 'top',
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
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="🎯"
      title="Leads CRM"
      desc="Prospects, clients, opt-ins — base de contact tenant."
      actions={
        <>
          <button onClick={() => setShowImport(true)} style={{ ...btnSecondary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <UploadCloud size={13} /> Import CSV
          </button>
          <button onClick={() => setShowCreate(true)} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Nouveau
          </button>
        </>
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Stat label="Total leads" value={totalAll} gradient={gradients.brand} icon={<Users size={14} />} />
        <Stat label="Newsletter opt-in" value={leads.filter((l) => l.newsletterOptIn).length} gradient={gradients.green} icon={<Mail size={14} />} />
        <Stat label="Qualifiés" value={stats.find((s) => s.status === 'qualified')?.count || 0} gradient={gradients.blue} />
        <Stat label="Clients" value={stats.find((s) => s.status === 'customer')?.count || 0} gradient={gradients.purple} />
      </div>

      {/* Toolbar */}
      <section style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 6, background: '#0a0a0f', border: `1px solid ${colors.borderLight}`, borderRadius: radii.md, padding: '0 12px' }}>
            <Search size={14} style={{ opacity: 0.5 }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="email, nom, entreprise…"
              style={{ flex: 1, background: 'transparent', border: 0, color: 'inherit', fontSize: 12, padding: '8px 0', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ ...input, width: 'auto', fontSize: 11 }}>
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_META).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}
          </select>
          <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} style={{ ...input, width: 'auto', fontSize: 11 }}>
            <option value="">Toutes sources</option>
            <option value="manual">Manuel</option>
            <option value="csv-import">CSV import</option>
            <option value="scrape-web">Scrape web</option>
            <option value="scrape-linkedin">LinkedIn scrape</option>
            <option value="scrape-instagram">Instagram scrape</option>
            <option value="newsletter-signup">Newsletter signup</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
            <input type="checkbox" checked={optInOnly} onChange={(e) => setOptInOnly(e.target.checked)} style={{ accentColor: colors.success }} />
            Opt-in only
          </label>
          <button onClick={load} style={{ ...btnSecondary, fontSize: 11, padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Filter size={11} /> Filtrer
          </button>
          <button onClick={() => exportCSV(leads)} style={{ ...btnSecondary, fontSize: 11, padding: '7px 12px', marginLeft: 'auto' }}>
            Export CSV
          </button>
        </div>
      </section>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 36, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Chargement…
        </div>
      ) : leads.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <Users size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, marginBottom: 6 }}>Aucun lead pour cette recherche</p>
          <p style={{ fontSize: 11, opacity: 0.55 }}>Importe un CSV, scrape un site, ou crée-en un manuellement.</p>
        </div>
      ) : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead style={{ background: '#0a0a0f', borderBottom: `1px solid ${colors.border}` }}>
                <tr>
                  <th style={thStyle}>Personne</th>
                  <th style={thStyle}>Entreprise</th>
                  <th style={thStyle}>Statut</th>
                  <th style={thStyle}>Source</th>
                  <th style={thStyle}>Score</th>
                  <th style={thStyle}>Liens</th>
                  <th style={thStyle}>Tags</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => {
                  const meta = STATUS_META[l.status] || { color: '#a1a1aa', label: l.status, bg: 'rgba(161,161,170,0.15)' };
                  const fullName = [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || '(sans nom)';
                  const social = (l.customFields?.social || {}) as { linkedin?: string; twitter?: string; instagram?: string };
                  return (
                    <tr key={l.id} style={{ borderTop: `1px solid ${colors.border}` }}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{fullName}</div>
                        {l.email && <div style={{ fontSize: 10, opacity: 0.55, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Mail size={9} /> {l.email}</div>}
                        {l.phone && <div style={{ fontSize: 10, opacity: 0.55, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Phone size={9} /> {l.phone}</div>}
                      </td>
                      <td style={tdStyle}>
                        {l.company && <div>{l.company}</div>}
                        {l.jobTitle && <div style={{ fontSize: 10, opacity: 0.55 }}>{l.jobTitle}</div>}
                        {l.city && <div style={{ fontSize: 10, opacity: 0.55 }}>{l.city}{l.country ? `, ${l.country}` : ''}</div>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4, background: meta.bg, color: meta.color }}>
                          {meta.label}
                        </span>
                        {l.newsletterOptIn && <span style={{ display: 'block', fontSize: 9, color: '#6ee7b7', marginTop: 2 }}>opt-in</span>}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 10, opacity: 0.7 }}>
                        <div>{l.source}</div>
                        {l.sourceDetail && <div style={{ opacity: 0.55, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120, whiteSpace: 'nowrap' }} title={l.sourceDetail}>{l.sourceDetail}</div>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: l.score >= 70 ? '#6ee7b7' : l.score >= 40 ? '#fcd34d' : '#a1a1aa' }}>{l.score}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {social.linkedin && <a href={social.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}><Linkedin size={11} /></a>}
                          {social.twitter && <a href={social.twitter} target="_blank" rel="noopener noreferrer" style={{ color: '#7dd3fc' }}><Twitter size={11} /></a>}
                          {social.instagram && <a href={social.instagram} target="_blank" rel="noopener noreferrer" style={{ color: '#f9a8d4' }}><Instagram size={11} /></a>}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {l.tags.slice(0, 3).map((t) => (
                            <span key={t} style={{ fontSize: 9, background: 'rgba(196,181,253,0.15)', color: '#c4b5fd', padding: '2px 6px', borderRadius: 999 }}>#{t}</span>
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
    </SimpleOrgPage>
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

function Stat({ label, value, gradient, icon }: { label: string; value: number; gradient: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: gradient, color: 'white', borderRadius: radii.lg, padding: 14, boxShadow: shadows.sm }}>
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.95, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        {icon} {label}
      </div>
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
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <UploadCloud size={16} /> Import CSV
        </h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', opacity: 0.55 }}>
          <X size={18} />
        </button>
      </div>

      {!result ? (
        <>
          <p style={{ fontSize: 11, opacity: 0.65, marginBottom: 12 }}>Upload un CSV avec colonnes : email, firstname, lastname, phone, company, linkedin… (auto-détecté). Délimiteur , ou ; auto.</p>
          <div
            style={{ border: `2px dashed ${colors.borderLight}`, borderRadius: radii.md, padding: 24, textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s' }}
            onClick={() => fileRef.current?.click()}
          >
            <UploadCloud size={30} style={{ opacity: 0.5, margin: '0 auto 10px' }} />
            <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>{file ? file.name : 'Clique pour choisir un CSV'}</p>
            {file && <p style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB</p>}
            <input ref={fileRef} type="file" accept=".csv,.txt" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, opacity: 0.7, marginBottom: 4 }}>Segments (virgules)</label>
            <input value={segments} onChange={(e) => setSegments(e.target.value)} placeholder="press, partenaires, beta-testeurs…" style={input} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginTop: 12 }}>
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} style={{ accentColor: colors.success }} />
            <span>Marquer comme opt-in newsletter (uniquement si CSV vient d&apos;un consentement vérifié — RGPD)</span>
          </label>
          {error && (
            <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: 8, fontSize: 11, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={11} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={onClose} style={{ background: 'transparent', border: 0, color: colors.textMuted, padding: '8px 14px', fontSize: 12, cursor: 'pointer' }}>Annuler</button>
            <button onClick={importCSV} disabled={busy || !file} style={{ ...btnPrimary, opacity: (busy || !file) ? 0.4 : 1, cursor: (busy || !file) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <UploadCloud size={12} />} Importer
            </button>
          </div>
        </>
      ) : (
        <div>
          <CheckCircle2 size={40} style={{ color: '#6ee7b7', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontWeight: 700, color: '#6ee7b7', textAlign: 'center', marginBottom: 12 }}>Import réussi</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, textAlign: 'center' }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: radii.md, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#6ee7b7' }}>{result.created}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Créés</div>
            </div>
            <div style={{ background: 'rgba(59,130,246,0.1)', borderRadius: radii.md, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#7dd3fc' }}>{result.merged}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Mis à jour</div>
            </div>
            <div style={{ background: colors.bgCard, borderRadius: radii.md, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.85 }}>{result.skipped}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Skipped</div>
            </div>
            <div style={{ background: 'rgba(239,68,68,0.1)', borderRadius: radii.md, padding: 12 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fca5a5' }}>{result.errors}</div>
              <div style={{ fontSize: 10, opacity: 0.55 }}>Erreurs</div>
            </div>
          </div>
          <p style={{ fontSize: 10, opacity: 0.55, marginTop: 12, textAlign: 'center' }}>Colonnes détectées : {(result.detectedColumns || []).join(', ')}</p>
          <button onClick={onDone} style={{ ...btnPrimary, width: '100%', marginTop: 12, background: gradients.green }}>
            Fermer &amp; rafraîchir
          </button>
        </div>
      )}
    </ModalShell>
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
    <ModalShell onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Nouveau lead</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', opacity: 0.55 }}>
          <X size={18} />
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input placeholder="Prénom" onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={input} />
        <input placeholder="Nom" onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={input} />
        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ ...input, gridColumn: '1 / -1' }} />
        <input placeholder="Téléphone" onChange={(e) => setForm({ ...form, phone: e.target.value })} style={input} />
        <input placeholder="Entreprise" onChange={(e) => setForm({ ...form, company: e.target.value })} style={input} />
        <input placeholder="LinkedIn URL" onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} style={{ ...input, gridColumn: '1 / -1' }} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer', marginTop: 12 }}>
        <input type="checkbox" checked={form.newsletterOptIn} onChange={(e) => setForm({ ...form, newsletterOptIn: e.target.checked })} style={{ accentColor: colors.success }} />
        Opt-in newsletter
      </label>
      <button onClick={save} disabled={busy} style={{ ...btnPrimary, width: '100%', marginTop: 14, opacity: busy ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />} Créer
      </button>
    </ModalShell>
  );
}

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radii.lg, maxWidth: 540, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 20, boxShadow: shadows.lg }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
