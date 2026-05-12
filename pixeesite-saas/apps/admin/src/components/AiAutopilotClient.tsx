'use client';
/**
 * AI Autopilot — règles trigger → action, CRUD + "Tester maintenant".
 * Port faithful de godlovedirect/src/app/admin/ai-autopilot/AiAutopilotClient.tsx.
 * Backed by AiAutopilotRule tenant table.
 */
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

interface Rule {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  triggerConfig?: any;
  action: string;
  actionConfig?: any;
  schedule?: string | null;
  active: boolean;
  lastRunAt?: string | null;
  lastRunStatus?: string | null;
  runsCount?: number;
  createdAt?: string;
}

const TRIGGERS = [
  { id: 'cron',    label: '⏰ Cron (schedule)',  desc: 'Exécution périodique (cron expr.)' },
  { id: 'webhook', label: '🪝 Webhook',           desc: 'POST entrant sur /webhook/[id]' },
  { id: 'event',   label: '⚡ Event interne',     desc: 'Réagir à un event (new lead, post, etc.)' },
  { id: 'manual',  label: '👆 Manuel',            desc: 'Bouton "Run" uniquement' },
];

const ACTIONS = [
  { id: 'generate-newsletter', label: '✉️ Générer newsletter',  emoji: '✉️' },
  { id: 'post-social',         label: '📱 Publier post social', emoji: '📱' },
  { id: 'send-email',          label: '📧 Envoyer email',        emoji: '📧' },
  { id: 'generate-article',    label: '📝 Générer article blog', emoji: '📝' },
  { id: 'generate-manual',     label: '📗 Générer manuel',       emoji: '📗' },
  { id: 'moderate-forum',      label: '🛡️ Modérer forum',        emoji: '🛡️' },
  { id: 'classify-leads',      label: '🏷️ Classifier leads',     emoji: '🏷️' },
  { id: 'translate-content',   label: '🌐 Traduire contenu',     emoji: '🌐' },
];

export function AiAutopilotClient({ orgSlug }: { orgSlug: string }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ ruleId: string; ok: boolean; output?: string; error?: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai-autopilot`);
      const j = await r.json();
      setRules(j.items || []);
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgSlug]);

  async function save(rule: Partial<Rule>) {
    const body = {
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      triggerConfig: rule.triggerConfig || {},
      action: rule.action,
      actionConfig: rule.actionConfig || {},
      schedule: rule.schedule || null,
      active: rule.active !== false,
    };
    if (rule.id) {
      await fetch(`/api/orgs/${orgSlug}/ai-autopilot/${rule.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      await fetch(`/api/orgs/${orgSlug}/ai-autopilot`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    setEditing(null);
    load();
  }

  async function del(id: string) {
    if (!confirm('Supprimer cette règle ?')) return;
    await fetch(`/api/orgs/${orgSlug}/ai-autopilot/${id}`, { method: 'DELETE' });
    load();
  }

  async function toggleActive(rule: Rule) {
    await fetch(`/api/orgs/${orgSlug}/ai-autopilot/${rule.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !rule.active }),
    });
    load();
  }

  async function runNow(rule: Rule) {
    setRunning(rule.id);
    setRunResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai-autopilot/${rule.id}/run`, { method: 'POST' });
      const j = await r.json();
      setRunResult({ ruleId: rule.id, ok: !!j.ok, output: j.output, error: j.error });
    } catch (e: any) {
      setRunResult({ ruleId: rule.id, ok: false, error: e.message });
    }
    setRunning(null);
    setTimeout(() => setRunResult(null), 12000);
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🚁" title="AI Autopilot"
      desc="Règles d'automation IA : trigger (cron, webhook, event) → action (générer, publier, classifier…)"
      actions={
        <button onClick={() => setEditing({ name: '', trigger: 'cron', action: 'generate-newsletter', active: true })} style={btnPrimary}>
          + Nouvelle règle
        </button>
      }
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : rules.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 32, opacity: 0.7 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚁</div>
          <h3 style={{ margin: '4px 0' }}>Aucune règle d'autopilot</h3>
          <p style={{ fontSize: 13, color: '#a1a1aa' }}>Crée ta première règle : un trigger (ex. cron quotidien) qui déclenche une action IA.</p>
          <button onClick={() => setEditing({ name: 'Newsletter mensuelle', trigger: 'cron', action: 'generate-newsletter', schedule: '0 9 1 * *', active: true })} style={btnPrimary}>
            + Créer ma 1ère règle
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {rules.map((r) => {
            const trigger = TRIGGERS.find((t) => t.id === r.trigger);
            const action = ACTIONS.find((a) => a.id === r.action);
            const last = runResult?.ruleId === r.id ? runResult : null;
            return (
              <article key={r.id} style={{ ...card, borderLeft: `4px solid ${r.active ? '#10b981' : '#71717a'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 18 }}>{action?.emoji || '⚙️'}</span>
                      <h3 style={{ margin: 0, fontSize: 15 }}>{r.name}</h3>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                        background: r.active ? '#10b98130' : '#71717a30',
                        color: r.active ? '#10b981' : '#a1a1aa',
                      }}>{r.active ? 'ACTIVE' : 'PAUSED'}</span>
                    </div>
                    {r.description && <p style={{ fontSize: 12, color: '#a1a1aa', margin: '0 0 6px' }}>{r.description}</p>}
                    <div style={{ fontSize: 11, color: '#71717a', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                      <span>🎯 <strong>{trigger?.label || r.trigger}</strong></span>
                      <span>⚡ {action?.label || r.action}</span>
                      {r.schedule && <code style={{ background: '#27272a', padding: '0 6px', borderRadius: 4 }}>{r.schedule}</code>}
                      {r.runsCount ? <span>↻ {r.runsCount} runs</span> : null}
                      {r.lastRunAt && <span>Dernier: {new Date(r.lastRunAt).toLocaleString('fr-FR')} {r.lastRunStatus === 'ok' ? '✓' : '⚠️'}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => toggleActive(r)} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }}>
                      {r.active ? '⏸ Pause' : '▶ Activer'}
                    </button>
                    <button onClick={() => runNow(r)} disabled={running === r.id} style={{ ...btnPrimary, padding: '6px 10px', fontSize: 11 }}>
                      {running === r.id ? '⏳ Run...' : '⚡ Tester'}
                    </button>
                    <button onClick={() => setEditing(r)} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }}>✏️</button>
                    <button onClick={() => del(r.id)} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11, color: '#ef4444' }}>🗑</button>
                  </div>
                </div>
                {last && (
                  <div style={{
                    marginTop: 10, fontSize: 12, padding: 10, borderRadius: 8,
                    background: last.ok ? '#10b98115' : '#ef444415',
                    border: `1px solid ${last.ok ? '#10b98155' : '#ef444455'}`,
                  }}>
                    {last.ok ? '✓ OK : ' : '⚠ Erreur : '}
                    <pre style={{ display: 'inline', whiteSpace: 'pre-wrap' }}>{(last.output || last.error || '').slice(0, 400)}</pre>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing && <RuleEditor rule={editing} onCancel={() => setEditing(null)} onSave={save} />}

      <section style={{ ...card, marginTop: 16, background: `${colors.info}10`, borderColor: `${colors.info}33`, fontSize: 12 }}>
        <h4 style={{ marginTop: 0, fontSize: 12, color: colors.info }}>⏰ Scheduler</h4>
        <p style={{ margin: '6px 0' }}>Les règles avec trigger <code>cron</code> sont exécutées par un worker externe qui POST chaque tick sur <code>/api/orgs/[slug]/ai-autopilot/[id]/run</code>.</p>
        <p style={{ margin: '6px 0', fontSize: 11, color: '#a1a1aa' }}>
          Cron Coolify recommandé :
          <code style={{ display: 'block', background: '#0a0a0f', padding: 8, borderRadius: 6, marginTop: 4 }}>
            */5 * * * * curl -s -X POST http://admin:3000/api/cron/ai-autopilot-tick
          </code>
          (route worker à brancher selon ton infra de déploiement)
        </p>
      </section>
    </SimpleOrgPage>
  );
}

function RuleEditor({ rule, onSave, onCancel }: { rule: Partial<Rule>; onSave: (r: Partial<Rule>) => void; onCancel: () => void }) {
  const [r, setR] = useState<Partial<Rule>>(rule);
  const cfgPrompt = (r.actionConfig as any)?.template || (r.actionConfig as any)?.prompt || '';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div style={{ ...card, maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginTop: 0 }}>{r.id ? '✏️ Éditer la règle' : '+ Nouvelle règle'}</h3>

        <div style={{ display: 'grid', gap: 10 }}>
          <label>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Nom</div>
            <input style={input} value={r.name || ''} onChange={(e) => setR({ ...r, name: e.target.value })} placeholder="Newsletter mensuelle B2B" />
          </label>
          <label>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Description (optionnel)</div>
            <input style={input} value={r.description || ''} onChange={(e) => setR({ ...r, description: e.target.value })} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Trigger</div>
              <select style={input} value={r.trigger || 'cron'} onChange={(e) => setR({ ...r, trigger: e.target.value })}>
                {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label>
              <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Action</div>
              <select style={input} value={r.action || 'generate-newsletter'} onChange={(e) => setR({ ...r, action: e.target.value })}>
                {ACTIONS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </label>
          </div>

          {r.trigger === 'cron' && (
            <label>
              <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Schedule (cron expression)</div>
              <input style={{ ...input, fontFamily: 'monospace' }} value={r.schedule || ''} onChange={(e) => setR({ ...r, schedule: e.target.value })} placeholder="0 9 * * 1   (lundi 9h)" />
            </label>
          )}

          <label>
            <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Prompt / template pour l'action</div>
            <textarea rows={5} style={{ ...input, fontFamily: 'monospace', fontSize: 12 }}
              value={cfgPrompt}
              onChange={(e) => setR({ ...r, actionConfig: { ...(r.actionConfig || {}), template: e.target.value } })}
              placeholder="Rédige une newsletter sur l'activité du mois, ton chaleureux, 800 mots…"
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={r.active !== false} onChange={(e) => setR({ ...r, active: e.target.checked })} />
            Activer cette règle dès maintenant
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnSecondary}>Annuler</button>
          <button onClick={() => onSave(r)} disabled={!r.name || !r.trigger || !r.action} style={btnPrimary}>
            💾 Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
