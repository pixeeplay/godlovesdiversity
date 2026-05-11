'use client';
/**
 * OrgEmailTemplatesClient — CRUD email templates avec preview + variables substitution + test send.
 * Utilise la table EmailTemplate du tenant (id, name, type, subject, body, variables, active).
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Loader2, Trash2, X, Mail, Send, Eye, Sparkles, CheckCircle2 } from 'lucide-react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients, radii, shadows } from '@/lib/design-tokens';

type Template = {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

const TYPE_OPTIONS = [
  { id: 'welcome', label: 'Welcome', emoji: '👋' },
  { id: 'newsletter', label: 'Newsletter', emoji: '📰' },
  { id: 'reset', label: 'Reset password', emoji: '🔑' },
  { id: 'b2b-email', label: 'Cold email B2B', emoji: '🎯' },
  { id: 'b2c-dm-insta', label: 'DM Instagram B2C', emoji: '💬' },
  { id: 'transactional', label: 'Transactionnel', emoji: '📦' },
  { id: 'drip', label: 'Drip campaign', emoji: '💧' },
  { id: 'custom', label: 'Custom', emoji: '🛠️' },
];

export function OrgEmailTemplatesClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [seedBusy, setSeedBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set('type', filterType);
    const r = await fetch(`/api/orgs/${orgSlug}/email-templates?${params}`, { cache: 'no-store' });
    const j = await r.json();
    setItems(j.templates || []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterType]);

  async function seed() {
    setSeedBusy(true);
    await fetch(`/api/orgs/${orgSlug}/email-templates/seed`, { method: 'POST' });
    setSeedBusy(false);
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="📧"
      title="Templates emails"
      desc={`Cold mail, transactionnels, drip campaigns. Variables {{firstName}} substituées au send.`}
      actions={
        <>
          <button onClick={seed} disabled={seedBusy} style={{ ...btnSecondary, opacity: seedBusy ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {seedBusy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />} Seed templates
          </button>
          <button onClick={() => setCreating(true)} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={12} /> Nouveau
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...input, width: 'auto', fontSize: 12 }}>
          <option value="">Tous types</option>
          {TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 36, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Chargement…
        </div>
      ) : items.length === 0 ? (
        <div style={{ ...card, padding: 48, textAlign: 'center' }}>
          <Mail size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, marginBottom: 6 }}>Aucun template</p>
          <p style={{ fontSize: 11, opacity: 0.55, marginBottom: 14 }}>Crée-en un ou utilise les templates préfaits.</p>
          <button onClick={seed} disabled={seedBusy} style={{ ...btnPrimary, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={14} /> Seed 5 templates
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {items.map((t) => {
            const typeMeta = TYPE_OPTIONS.find((x) => x.id === t.type);
            return (
              <article
                key={t.id}
                onClick={() => setEditing(t)}
                style={{
                  background: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.lg,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'border-color .15s, transform .15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    {t.subject && (
                      <div style={{ fontSize: 11, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>↳ {t.subject}</div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: t.active ? 'rgba(16,185,129,0.15)' : 'rgba(82,82,91,0.4)',
                      color: t.active ? '#6ee7b7' : '#a1a1aa',
                    }}
                  >
                    {t.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: 10, opacity: 0.55, marginBottom: 8 }}>
                  {typeMeta && <span>{typeMeta.emoji} {typeMeta.label}</span>}
                </div>
                <p
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                    margin: '0 0 8px',
                    whiteSpace: 'pre-line',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {t.body.slice(0, 200)}
                </p>
                {t.variables && t.variables.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {t.variables.slice(0, 5).map((v) => (
                      <span key={v} style={{ fontSize: 9, background: 'rgba(196,181,253,0.15)', color: '#c4b5fd', padding: '2px 6px', borderRadius: 999 }}>
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <TemplateEditor
          orgSlug={orgSlug}
          template={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </SimpleOrgPage>
  );
}

function TemplateEditor({ orgSlug, template, onClose, onSaved }: {
  orgSlug: string; template: Template | null; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [type, setType] = useState(template?.type || 'b2b-email');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [active, setActive] = useState(template?.active !== false);
  const [tab, setTab] = useState<'edit' | 'preview' | 'test'>('edit');
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);

  const detectedVars = useMemo(() => {
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const set = new Set<string>();
    for (const src of [subject, body]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(src || ''))) set.add(m[1]);
    }
    return Array.from(set);
  }, [subject, body]);

  function substitute(text: string): string {
    return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, name) => previewVars[name] || `{{${name}}}`);
  }

  async function save() {
    setBusy(true);
    const variables = detectedVars;
    if (template) {
      await fetch(`/api/orgs/${orgSlug}/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, subject, body, variables, active }),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/email-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, subject, body, variables, active }),
      });
    }
    setBusy(false);
    onSaved();
  }

  async function remove() {
    if (!template || !confirm('Supprimer ce template ?')) return;
    await fetch(`/api/orgs/${orgSlug}/email-templates/${template.id}`, { method: 'DELETE' });
    onSaved();
  }

  async function sendTest() {
    if (!testTo) return;
    setBusy(true);
    setTestResult(null);
    const r = await fetch(`/api/orgs/${orgSlug}/email-templates/test-send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: testTo, subject: substitute(subject), body: substitute(body) }),
    });
    const j = await r.json();
    setTestResult(r.ok ? 'Envoyé ✓' : (j.error || 'Erreur'));
    setBusy(false);
  }

  const tabBtn = (active: boolean): React.CSSProperties => ({
    background: 'transparent',
    border: 0,
    color: active ? colors.primary : colors.textMuted,
    fontWeight: 700,
    fontSize: 12,
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: active ? `2px solid ${colors.primary}` : '2px solid transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radii.lg, maxWidth: 760, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 20, boxShadow: shadows.lg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{template ? 'Éditer template' : 'Nouveau template'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', opacity: 0.55 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14, borderBottom: `1px solid ${colors.border}` }}>
          <button onClick={() => setTab('edit')} style={tabBtn(tab === 'edit')}>Éditer</button>
          <button onClick={() => setTab('preview')} style={tabBtn(tab === 'preview')}><Eye size={11} /> Preview</button>
          <button onClick={() => setTab('test')} style={tabBtn(tab === 'test')}><Send size={11} /> Test send</button>
        </div>

        {tab === 'edit' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du template" style={input} />
              <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
                {TYPE_OPTIONS.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
              </select>
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet (peut contenir {{variable}})" style={input} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="Body — utilise {{firstName}}, {{company}}, {{unsubscribeUrl}}, …"
              style={{ ...input, fontFamily: 'JetBrains Mono, Menlo, monospace', lineHeight: 1.5 }}
            />
            {detectedVars.length > 0 && (
              <div style={{ fontSize: 11, opacity: 0.8 }}>
                <span style={{ fontWeight: 700 }}>Variables détectées :</span>{' '}
                {detectedVars.map((v) => (
                  <span key={v} style={{ display: 'inline-block', marginRight: 4, background: 'rgba(196,181,253,0.15)', color: '#c4b5fd', padding: '2px 6px', borderRadius: 4 }}>
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, cursor: 'pointer' }}>
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ accentColor: colors.success }} />
              Template actif (utilisable dans les campagnes / sends)
            </label>
          </div>
        )}

        {tab === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>Renseigne des valeurs de test pour les variables pour voir le rendu.</p>
            {detectedVars.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {detectedVars.map((v) => (
                  <label key={v} style={{ display: 'block' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>{v}</div>
                    <input value={previewVars[v] || ''} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })} style={input} />
                  </label>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 11, opacity: 0.55 }}>Aucune variable détectée dans le template.</p>
            )}

            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Rendu</div>
              <div style={{ background: '#0a0a0f', border: `1px solid ${colors.border}`, borderRadius: radii.md, padding: 12 }}>
                {subject && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Sujet : {substitute(subject)}</div>}
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, fontFamily: 'inherit', margin: 0, opacity: 0.85 }}>{substitute(body)}</pre>
              </div>
            </div>
          </div>
        )}

        {tab === 'test' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 11, opacity: 0.7, margin: 0 }}>Envoie ce template à une adresse pour vérifier le rendu réel (via Resend).</p>
            <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="destinataire@example.com" style={input} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {detectedVars.map((v) => (
                <label key={v} style={{ display: 'block' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.7, marginBottom: 4 }}>{v}</div>
                  <input value={previewVars[v] || ''} onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })} style={input} />
                </label>
              ))}
            </div>
            {testResult && (
              <div
                style={{
                  fontSize: 11,
                  borderRadius: 6,
                  padding: 8,
                  background: testResult.includes('✓') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: testResult.includes('✓') ? '#6ee7b7' : '#fca5a5',
                  border: `1px solid ${testResult.includes('✓') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                {testResult}
              </div>
            )}
            <button
              onClick={sendTest}
              disabled={busy || !testTo}
              style={{ ...btnPrimary, alignSelf: 'flex-start', opacity: (busy || !testTo) ? 0.4 : 1, cursor: (busy || !testTo) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />} Envoyer test
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 14, borderTop: `1px solid ${colors.border}` }}>
          {template ? (
            <button onClick={remove} style={{ background: 'transparent', border: 0, color: '#fca5a5', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={11} /> Supprimer
            </button>
          ) : <span />}
          <button
            onClick={save}
            disabled={busy || !name || !body}
            style={{ ...btnPrimary, opacity: (busy || !name || !body) ? 0.4 : 1, cursor: (busy || !name || !body) ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
