'use client';
/**
 * Manuels auto IA — 3 audiences (B2B, B2C, internal) + email + script vidéo HeyGen.
 * Port faithful de godlovedirect/src/app/admin/manuals/ManualsAdminClient.tsx.
 */
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

interface Manual {
  id: string;
  slug: string;
  title: string;
  audience: string;
  tone?: string | null;
  language: string;
  content: string;
  outline?: any;
  provider?: string | null;
  model?: string | null;
  tokensUsed?: number | null;
  videoScript?: string | null;
  createdAt: string;
}

const AUDIENCES = [
  { id: 'b2c',      label: 'B2C / Grand public', emoji: '👤', desc: 'Ton chaleureux, vocabulaire simple' },
  { id: 'b2b',      label: 'B2B / Pros',          emoji: '💼', desc: 'Use-cases business, ROI' },
  { id: 'internal', label: 'Interne / Équipes',  emoji: '🛠️', desc: 'Onboarding, process, technique' },
];

const TONES = ['pédagogue, chaleureux, sans jargon', 'professionnel, direct, factuel', 'amical et inspirant', 'technique, exhaustif', 'storytelling'];

export function ManualsClient({ orgSlug }: { orgSlug: string }) {
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [audience, setAudience] = useState<'b2b' | 'b2c' | 'internal'>('b2c');
  const [tone, setTone] = useState(TONES[0]);
  const [productContext, setProductContext] = useState('');
  const [language, setLanguage] = useState('fr');
  const [withVideoScript, setWithVideoScript] = useState(false);
  const [title, setTitle] = useState('');
  const [opened, setOpened] = useState<Manual | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailing, setEmailing] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [generateResult, setGenerateResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/manuals`);
      const j = await r.json();
      setManuals(j.items || []);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgSlug]);

  async function generate() {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/manuals/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience, tone, productContext, language, withVideoScript,
          title: title || undefined,
        }),
      });
      const j = await r.json();
      setGenerating(false);
      if (r.ok && j.ok) {
        setGenerateResult({ ok: true, msg: `✓ Manuel créé : ${j.item.title} (${j.wordCount} mots · ${j.sectionCount} sections)` });
        load();
      } else {
        setGenerateResult({ ok: false, msg: `⚠ ${j.error || 'erreur'}` });
      }
    } catch (e: any) {
      setGenerating(false);
      setGenerateResult({ ok: false, msg: `⚠ ${e.message}` });
    }
    setTimeout(() => setGenerateResult(null), 8000);
  }

  async function del(m: Manual) {
    if (!confirm(`Supprimer "${m.title}" ?`)) return;
    await fetch(`/api/orgs/${orgSlug}/manuals/${m.id}`, { method: 'DELETE' });
    load();
    if (opened?.id === m.id) setOpened(null);
  }

  async function sendEmail() {
    if (!opened || !emailTo.includes('@')) { alert('Email invalide'); return; }
    setEmailing(true);
    setEmailResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/manuals/${opened.id}/email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo }),
      });
      const j = await r.json();
      setEmailResult({ ok: !!j.ok, msg: j.ok ? `✓ Envoyé à ${j.to}` : `⚠ ${j.error || 'erreur'}` });
    } catch (e: any) { setEmailResult({ ok: false, msg: `⚠ ${e.message}` }); }
    setEmailing(false);
    setTimeout(() => setEmailResult(null), 6000);
  }

  function getLatest(aud: string) { return manuals.find((m) => m.audience === aud); }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="📗" title="Manuels auto IA"
      desc="Génère des manuels d'utilisation pour 3 audiences (B2B, B2C, interne) — option script vidéo HeyGen + email"
    >
      {/* Form génération */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>🧙 Générer un nouveau manuel</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {AUDIENCES.map((a) => (
            <button key={a.id} onClick={() => setAudience(a.id as any)} style={{
              padding: 12, borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              border: `2px solid ${audience === a.id ? colors.primary : '#27272a'}`,
              background: audience === a.id ? `${colors.primary}15` : '#18181b',
              color: 'inherit',
            }}>
              <div style={{ fontSize: 22 }}>{a.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: '#a1a1aa' }}>{a.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <label>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Titre (optionnel — auto si vide)</div>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Manuel utilisateur Pixeesite — Nov 2026" />
          </label>
          <label>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Langue</div>
            <select style={input} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
          </label>
        </div>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Ton</div>
          <select style={input} value={tone} onChange={(e) => setTone(e.target.value)}>
            {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Contexte produit / service (optionnel)</div>
          <textarea rows={4} style={{ ...input, fontFamily: 'monospace', fontSize: 12 }}
            value={productContext} onChange={(e) => setProductContext(e.target.value)}
            placeholder="Décris brièvement le produit, ses features clés, ce que doit savoir l'utilisateur..."
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={withVideoScript} onChange={(e) => setWithVideoScript(e.target.checked)} />
          🎬 Générer aussi un script vidéo court (HeyGen/Synthesia friendly)
        </label>

        <button onClick={generate} disabled={generating} style={{ ...btnPrimary, opacity: generating ? 0.6 : 1, width: '100%' }}>
          {generating ? '⏳ Génération en cours… (peut prendre 30-60s)' : '🚀 Générer le manuel'}
        </button>

        {generateResult && (
          <div style={{
            marginTop: 10, fontSize: 12, padding: 10, borderRadius: 8,
            background: generateResult.ok ? '#10b98115' : '#ef444415',
            border: `1px solid ${generateResult.ok ? '#10b98155' : '#ef444455'}`,
          }}>{generateResult.msg}</div>
        )}
      </section>

      {/* Latest by audience */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 16 }}>
        {AUDIENCES.map((a) => {
          const m = getLatest(a.id);
          return (
            <article key={a.id} style={{ ...card, borderTop: `3px solid ${colors.violet}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{a.emoji}</span>
                <h3 style={{ margin: 0, fontSize: 14 }}>{a.label}</h3>
              </div>
              {m ? (
                <>
                  <p style={{ fontSize: 12, margin: '6px 0', fontWeight: 700 }}>{m.title}</p>
                  <p style={{ fontSize: 11, color: '#a1a1aa', margin: 0 }}>
                    {m.outline?.length || 0} sections · {m.content.split(/\s+/).length} mots · {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                  <button onClick={() => setOpened(m)} style={{ ...btnSecondary, marginTop: 8, padding: '6px 12px', fontSize: 12, width: '100%' }}>
                    📖 Ouvrir
                  </button>
                </>
              ) : (
                <p style={{ fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>Aucun manuel pour cette audience encore.</p>
              )}
            </article>
          );
        })}
      </div>

      {/* History */}
      <section style={{ ...card }}>
        <h3 style={{ marginTop: 0, fontSize: 14 }}>📚 Historique ({manuals.length})</h3>
        {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : manuals.length === 0 ? (
          <p style={{ fontSize: 12, color: '#71717a', fontStyle: 'italic' }}>Aucun manuel généré.</p>
        ) : (
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: '#71717a', borderBottom: '1px solid #27272a' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Date</th>
                <th style={{ textAlign: 'left' }}>Titre</th>
                <th style={{ textAlign: 'left' }}>Audience</th>
                <th style={{ textAlign: 'right' }}>Mots</th>
                <th style={{ textAlign: 'left' }}>Provider</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {manuals.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #27272a55' }}>
                  <td style={{ padding: '8px 4px', color: '#a1a1aa' }}>{new Date(m.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td>{m.title}</td>
                  <td><span style={{ background: '#27272a', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>{m.audience}</span></td>
                  <td style={{ textAlign: 'right' }}>{m.content.split(/\s+/).length}</td>
                  <td style={{ color: '#71717a', fontSize: 11 }}>{m.provider || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setOpened(m)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11, marginRight: 4 }}>Voir</button>
                    <button onClick={() => del(m)} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11, color: '#ef4444' }}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal preview */}
      {opened && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <div style={{ ...card, maxWidth: 900, width: '100%', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{opened.title}</h2>
              <button onClick={() => setOpened(null)} style={{ ...btnSecondary, padding: '4px 10px' }}>✕ Fermer</button>
            </div>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 12 }}>
              {opened.audience} · {opened.language} · {opened.provider || '—'}/{opened.model || '—'} ·
              {new Date(opened.createdAt).toLocaleString('fr-FR')}
            </div>

            <pre style={{ background: '#0a0a0f', padding: 14, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6, maxHeight: '50vh', overflowY: 'auto', border: '1px solid #27272a' }}>
              {opened.content}
            </pre>

            {opened.videoScript && (
              <details style={{ marginTop: 12 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700, color: colors.pink }}>🎬 Script vidéo généré</summary>
                <pre style={{ background: '#0a0a0f', padding: 14, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', marginTop: 8, fontFamily: 'inherit', lineHeight: 1.6, border: '1px solid #27272a' }}>
                  {opened.videoScript}
                </pre>
              </details>
            )}

            <section style={{ marginTop: 16, padding: 12, borderRadius: 10, background: `${colors.success}10`, border: `1px solid ${colors.success}33` }}>
              <h4 style={{ marginTop: 0, fontSize: 13 }}>📧 Envoyer par email</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...input, flex: 1 }} value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="destinataire@example.com" type="email" />
                <button onClick={sendEmail} disabled={emailing || !emailTo.includes('@')} style={btnPrimary}>
                  {emailing ? '⏳' : '📨 Envoyer'}
                </button>
              </div>
              {emailResult && (
                <p style={{ fontSize: 12, marginTop: 8, color: emailResult.ok ? '#10b981' : '#ef4444' }}>{emailResult.msg}</p>
              )}
              <p style={{ fontSize: 10, color: '#71717a', marginTop: 8, marginBottom: 0 }}>
                Envoi via Resend (clé RESEND_API_KEY de l'org, fallback platform).
              </p>
            </section>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
