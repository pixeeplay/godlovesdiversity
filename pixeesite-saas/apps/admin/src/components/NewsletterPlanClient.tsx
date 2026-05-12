'use client';
import { useEffect, useMemo, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiButton } from './AiButton';
import { colors } from '@/lib/design-tokens';

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

type Plan = { id?: string; year: number; month: number; theme?: string; subject?: string; audiences?: string[]; scheduledAt?: string | null; notes?: string; status?: string };

export function NewsletterPlanClient({ orgSlug }: { orgSlug: string }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/newsletter-plan?year=${year}`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [year]);

  async function save() {
    if (!editing) return;
    await fetch(`/api/orgs/${orgSlug}/newsletter-plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setEditing(null); load();
  }

  async function clearMonth(id: string) {
    if (!confirm('Effacer ce mois ?')) return;
    await fetch(`/api/orgs/${orgSlug}/newsletter-plan/${id}`, { method: 'DELETE' });
    load();
  }

  const byMonth = useMemo(() => {
    const m: Record<number, Plan | null> = {};
    for (let i = 1; i <= 12; i++) m[i] = items.find((it) => it.month === i) || null;
    return m;
  }, [items]);

  function openSlot(month: number) {
    const existing = byMonth[month];
    setEditing(existing || { year, month, theme: '', subject: '', audiences: [], notes: '', status: 'planned' });
  }

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="🗓️" title="Plan newsletter annuel"
      desc="Planifie tes 12 newsletters mensuelles — thème, sujet, audience cible."
      actions={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ ...input, width: 'auto', padding: 6 }}>
            {[year - 1, year, year + 1, year + 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      }>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
            const p = byMonth[m];
            return (
              <div key={m} onClick={() => openSlot(m)}
                style={{ ...card, cursor: 'pointer', padding: 14, minHeight: 120, position: 'relative', borderColor: p ? colors.primary : undefined }}>
                <div style={{ fontWeight: 800, fontSize: 13, opacity: 0.7 }}>{MONTHS[m - 1]} {year}</div>
                {p ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6 }}>{p.theme || '(thème vide)'}</div>
                    {p.subject && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{p.subject}</div>}
                    {p.audiences && p.audiences.length > 0 && (
                      <div style={{ fontSize: 10, opacity: 0.5, marginTop: 6 }}>{p.audiences.join(', ')}</div>
                    )}
                    <div style={{ marginTop: 8, fontSize: 10, opacity: 0.4 }}>{p.status}</div>
                  </>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.4 }}>+ Planifier</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <AiButton orgSlug={orgSlug} feature="text" label="✨ Suggérer plan annuel (IA)"
          systemPrompt={'Tu suggères un plan éditorial newsletter sur 12 mois pour une PME. Renvoie un JSON strict: {"plan":[{"month":1,"theme":"...","subject":"...","audiences":["..."]}, ...]}. 1 entrée par mois 1..12. Thèmes saisonniers et marronniers.'}
          promptBuilder={() => `Année ${year}. Tons : marketing PME, accessible. Génère 12 mois.`}
          onResult={async (text) => {
            try {
              const j = JSON.parse((text.match(/\{[\s\S]+\}/) || [text])[0]);
              const arr = (j.plan || []) as any[];
              for (const p of arr) {
                if (!p.month || p.month < 1 || p.month > 12) continue;
                await fetch(`/api/orgs/${orgSlug}/newsletter-plan`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ year, month: p.month, theme: p.theme, subject: p.subject, audiences: Array.isArray(p.audiences) ? p.audiences : [] }),
                });
              }
              load();
              alert('Plan annuel créé');
            } catch {
              alert('Réponse IA inattendue');
            }
          }} />
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{MONTHS[editing.month - 1]} {editing.year}</h3>
            <Field label="Thème"><input style={input} value={editing.theme || ''} onChange={(e) => setEditing({ ...editing, theme: e.target.value })} /></Field>
            <Field label="Sujet (proposé)"><input style={input} value={editing.subject || ''} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></Field>
            <Field label="Audiences (cible, virgule)">
              <input style={input} value={(editing.audiences || []).join(', ')}
                onChange={(e) => setEditing({ ...editing, audiences: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </Field>
            <Field label="Notes"><textarea style={{ ...input, minHeight: 80 }} value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></Field>
            <Field label="Statut">
              <select style={input} value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="planned">Planifié</option>
                <option value="ready">Prêt</option>
                <option value="sent">Envoyé</option>
              </select>
            </Field>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {editing.id && <button style={{ ...btnSecondary, color: '#ef4444' }} onClick={() => clearMonth(editing.id!)}>Effacer</button>}
              <button style={btnSecondary} onClick={() => setEditing(null)}>Annuler</button>
              <button style={btnPrimary} onClick={save}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>{children}</label>;
}
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' };
