'use client';
import { useEffect, useRef, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Info = {
  hasToken: boolean;
  bot: any;
  webhook: any;
  error: string | null;
  config: { hasGroupChatId: boolean; hasChatId: boolean; hasWhitelist: boolean; whitelistCount: number; hasWebhookSecret: boolean };
};

type Alert = {
  id: string;
  chatId: string;
  type?: string | null;
  message: string;
  parseMode?: string | null;
  sentAt?: string | null;
  status: string;
  error?: string | null;
  createdAt: string;
};

const FUNCTIONS: { id: string; label: string; description: string; emoji: string }[] = [
  { id: 'ping', label: 'Test ping', description: 'Envoie « Pong » pour vérifier la liaison', emoji: '🏓' },
  { id: 'order', label: 'Notif commande', description: 'Simule une commande boutique', emoji: '🛍️' },
  { id: 'photo', label: 'Modération photo', description: 'Photo de test avec boutons ✓/✗', emoji: '🖼️' },
  { id: 'broadcast', label: 'Broadcast', description: 'Message dans le groupe (si configuré)', emoji: '📢' },
  { id: 'stats', label: 'Helper /stats', description: 'Rappel comment voir les stats live', emoji: '📊' },
];

export function TelegramBotClient({ orgSlug }: { orgSlug: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; error?: string }>>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<{ today: number; total: number } | null>(null);
  const [composeText, setComposeText] = useState('');
  const [parseMode, setParseMode] = useState<'HTML' | 'MarkdownV2' | ''>('HTML');
  const [sending, setSending] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({ chatId: '', message: '', type: 'manual', parseMode: 'HTML' });
  const chatRef = useRef<HTMLDivElement>(null);

  async function loadInfo() {
    try { const r = await fetch(`/api/orgs/${orgSlug}/telegram/info`); const j = await r.json(); setInfo(j); } catch {}
  }
  async function loadAlerts() {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/telegram/alerts?limit=80`);
      const j = await r.json();
      setAlerts(j.items || []); setStats(j.stats || null);
    } catch {}
  }

  useEffect(() => { void loadInfo(); void loadAlerts(); }, []);
  useEffect(() => { const t = setInterval(() => loadAlerts(), 5000); return () => clearInterval(t); }, []);
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [alerts.length]);

  async function setupWebhook(action: 'install' | 'uninstall' | 'rotate-secret') {
    setBusy(action);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/telegram/setup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await r.json();
      if (r.ok) alert(`✓ ${action === 'install' ? 'Webhook installé' : action === 'uninstall' ? 'Webhook désinstallé' : 'Secret renouvelé'}`);
      else alert(`Erreur : ${j.error}`);
      await loadInfo();
    } finally { setBusy(null); }
  }

  async function runFunction(fn: typeof FUNCTIONS[number]) {
    setBusy(fn.id);
    setResults((p) => ({ ...p, [fn.id]: { ok: false } }));
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/telegram/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: fn.id }),
      });
      const j = await r.json();
      setResults((p) => ({ ...p, [fn.id]: { ok: r.ok, error: r.ok ? undefined : j.error } }));
      await loadAlerts();
    } catch (e: any) {
      setResults((p) => ({ ...p, [fn.id]: { ok: false, error: e?.message } }));
    } finally { setBusy(null); }
  }

  async function sendCustom() {
    if (!composeText.trim()) return;
    setSending(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/telegram/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composeText, parseMode: parseMode || undefined }),
      });
      const j = await r.json();
      if (r.ok) { setComposeText(''); await loadAlerts(); }
      else alert(`Erreur : ${j.error}`);
    } finally { setSending(false); }
  }

  async function broadcast() {
    if (!broadcastText.trim()) return;
    if (!confirm('Envoyer ce message à tous les chatIds enregistrés ?')) return;
    setBroadcasting(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/telegram/broadcast`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: broadcastText, parseMode: parseMode || undefined }),
      });
      const j = await r.json();
      if (r.ok) { alert(`✓ ${j.sent}/${j.total} envoyés`); setBroadcastText(''); await loadAlerts(); }
      else alert(`Erreur : ${j.error}`);
    } finally { setBroadcasting(false); }
  }

  async function createAlert() {
    if (!newAlert.chatId || !newAlert.message) { alert('chatId + message requis'); return; }
    const r = await fetch(`/api/orgs/${orgSlug}/telegram/alerts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAlert),
    });
    const j = await r.json();
    if (r.ok) { setShowCreateModal(false); setNewAlert({ chatId: '', message: '', type: 'manual', parseMode: 'HTML' }); await loadAlerts(); }
    else alert(`Erreur : ${j.error}`);
  }

  async function deleteAlert(id: string) {
    if (!confirm('Supprimer cet alert ?')) return;
    await fetch(`/api/orgs/${orgSlug}/telegram/alerts/${id}`, { method: 'DELETE' });
    await loadAlerts();
  }

  const isWebhookOk = info?.webhook?.url && info.webhook.url.includes('/telegram/webhook');
  const lastError = info?.webhook?.last_error_message;
  const fullyConfigured = info?.hasToken && isWebhookOk && info?.config.hasChatId;

  const webhookBase = typeof window !== 'undefined' ? window.location.origin : '';
  const webhookUrl = `${webhookBase}/api/orgs/${orgSlug}/telegram/webhook`;

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🤳" title="Bot Telegram"
      desc="Reçois des notifications + envoie des messages depuis le site (modération, nouvelle commande, alerte…)."
      actions={<button style={btnSecondary} onClick={() => setShowCreateModal(true)}>+ Alert manuel</button>}
    >
      {/* Statut */}
      {info && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
          <Stat label="Bot" value={info.bot?.username ? `@${info.bot.username}` : '—'} color={info.hasToken ? colors.success : colors.danger} />
          <Stat label="Webhook" value={isWebhookOk ? 'Actif' : 'Inactif'} color={isWebhookOk ? colors.success : (lastError ? '#f59e0b' : colors.danger)} />
          <Stat label="Chat" value={info.config.hasGroupChatId ? 'Groupe' : info.config.hasChatId ? 'Privé' : '—'} color={info.config.hasChatId ? colors.success : colors.danger} />
          <Stat label="Aujourd'hui" value={stats?.today ?? 0} />
          <Stat label="Total" value={stats?.total ?? 0} />
        </section>
      )}

      {/* CONNEXION */}
      {!fullyConfigured && (
        <section style={{ ...card, marginBottom: 16, background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(124,58,237,0.1))', border: '2px solid rgba(14,165,233,0.4)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>🔗 Connecter Telegram Bot</h2>
          <ol style={{ fontSize: 12, opacity: 0.85, paddingLeft: 20, margin: '0 0 12px' }}>
            <li>Crée le bot via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" style={{ color: colors.primary }}>@BotFather</a> avec <code>/newbot</code>. {info?.hasToken && <span style={{ color: colors.success }}>✓ fait</span>}</li>
            <li>Ajoute le token dans <strong>Settings → Secrets</strong> sous la clé <code>TELEGRAM_BOT_TOKEN</code> {info?.hasToken && <span style={{ color: colors.success }}>✓</span>}</li>
            <li>Renseigne <code>TELEGRAM_CHAT_ID</code> dans Secrets {info?.config.hasChatId && <span style={{ color: colors.success }}>✓</span>}</li>
            <li>Clique « Installer le webhook » ci-dessous {isWebhookOk && <span style={{ color: colors.success }}>✓</span>}</li>
          </ol>
          <button onClick={() => setupWebhook('install')} disabled={!info?.hasToken || busy === 'install'} style={btnPrimary}>
            {busy === 'install' ? '…' : '🔗'} Installer le webhook maintenant
          </button>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.5 }}>URL webhook : <code>{webhookUrl}</code></div>
        </section>
      )}

      {/* GRILLE FONCTIONS */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>✨ Fonctions disponibles</h2>
        <p style={{ fontSize: 12, opacity: 0.6, marginTop: -4 }}>Cliquer un bouton envoie un message réel dans Telegram.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {FUNCTIONS.map((fn) => {
            const r = results[fn.id];
            return (
              <button
                key={fn.id}
                onClick={() => runFunction(fn)}
                disabled={!info?.hasToken || busy === fn.id}
                style={{
                  ...card, padding: 12, textAlign: 'left', cursor: 'pointer',
                  opacity: !info?.hasToken ? 0.4 : 1,
                  border: r?.ok === true ? `1px solid ${colors.success}` : r?.ok === false && r.error ? `1px solid ${colors.danger}` : `1px solid ${colors.border}`,
                  background: r?.ok === true ? 'rgba(34,197,94,0.05)' : colors.bgCard,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{fn.emoji} {fn.label}
                  {r?.ok === true && <span style={{ color: colors.success, marginLeft: 6 }}>✓</span>}
                  {r?.ok === false && r.error && <span style={{ color: colors.danger, marginLeft: 6 }}>✗</span>}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{fn.description}</div>
                {busy === fn.id && <div style={{ fontSize: 10, marginTop: 4, color: '#fbbf24' }}>Envoi…</div>}
                {r?.error && <div style={{ fontSize: 10, marginTop: 4, color: colors.danger }}>{r.error}</div>}
              </button>
            );
          })}
        </div>
      </section>

      {/* BROADCAST */}
      <section style={{ ...card, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0, fontSize: 15 }}>📢 Broadcast</h2>
        <p style={{ fontSize: 11, opacity: 0.6, marginTop: -4 }}>Envoie un message à tous les chatIds enregistrés dans le tenant.</p>
        <textarea
          value={broadcastText}
          onChange={(e) => setBroadcastText(e.target.value)}
          rows={3}
          placeholder="Message broadcast à tous les chatIds…"
          style={{ ...input, fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <select value={parseMode} onChange={(e) => setParseMode(e.target.value as any)} style={{ ...input, width: 'auto', padding: 6 }}>
            <option value="HTML">HTML</option>
            <option value="MarkdownV2">MarkdownV2</option>
            <option value="">Texte brut</option>
          </select>
          <button onClick={broadcast} disabled={!broadcastText.trim() || broadcasting || !info?.hasToken} style={btnPrimary}>
            {broadcasting ? '…' : '📣'} Envoyer à tous
          </button>
        </div>
      </section>

      {/* CHAT LIVE */}
      <section style={{ ...card, padding: 0, marginBottom: 16 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15 }}>💬 Chat live</h2>
          <button onClick={loadAlerts} style={{ ...btnSecondary, padding: '4px 10px', fontSize: 11 }}>↻ Actualiser</button>
        </div>
        <div ref={chatRef} style={{ height: 400, overflowY: 'auto', padding: 12, background: '#0a0a0f', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.5, fontSize: 12, padding: 48 }}>
              Aucun message pour le moment.<br />
              <span style={{ fontSize: 10 }}>Envoie une commande au bot pour démarrer.</span>
            </div>
          ) : alerts.map((a) => (
            <ChatBubble key={a.id} alert={a} onDelete={() => deleteAlert(a.id)} />
          ))}
        </div>
        {/* Compose */}
        <div style={{ padding: 8, borderTop: `1px solid ${colors.border}`, display: 'flex', gap: 8 }}>
          <input
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCustom(); } }}
            placeholder="Écrire un message (HTML ok : <b>gras</b>)…"
            disabled={!info?.hasToken || sending}
            style={{ ...input, flex: 1 }}
          />
          <button onClick={sendCustom} disabled={!composeText.trim() || sending || !info?.hasToken} style={btnPrimary}>
            {sending ? '…' : '→'} Envoyer
          </button>
        </div>
      </section>

      {/* SETUP / MAINTENANCE webhook */}
      {fullyConfigured && (
        <section style={{ ...card, marginBottom: 16 }}>
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: 0.7 }}>▸ Maintenance webhook (avancé)</summary>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={() => setupWebhook('install')} disabled={busy === 'install'} style={btnPrimary}>↻ Réinstaller</button>
              <button onClick={() => setupWebhook('rotate-secret')} disabled={busy === 'rotate-secret'} style={btnSecondary}>🔑 Renouveler secret</button>
              <button onClick={() => setupWebhook('uninstall')} disabled={busy === 'uninstall'} style={{ ...btnSecondary, background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }}>✗ Désinstaller</button>
              <span style={{ fontSize: 10, opacity: 0.5, alignSelf: 'center', marginLeft: 'auto' }}>URL : <code>{info?.webhook?.url || webhookUrl}</code></span>
            </div>
          </details>
        </section>
      )}

      {/* MODAL création alert manuel */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCreateModal(false)}>
          <div style={{ ...card, maxWidth: 520, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Nouvel alert manuel</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>
                <span style={{ fontSize: 11, opacity: 0.7 }}>Chat ID</span>
                <input value={newAlert.chatId} onChange={(e) => setNewAlert({ ...newAlert, chatId: e.target.value })} placeholder="123456789 ou -100…" style={input} />
              </label>
              <label>
                <span style={{ fontSize: 11, opacity: 0.7 }}>Message</span>
                <textarea value={newAlert.message} onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })} rows={3} style={{ ...input, fontFamily: 'inherit' }} />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>Type</span>
                  <input value={newAlert.type} onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value })} style={input} />
                </label>
                <label>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>Parse mode</span>
                  <select value={newAlert.parseMode} onChange={(e) => setNewAlert({ ...newAlert, parseMode: e.target.value })} style={input}>
                    <option value="HTML">HTML</option>
                    <option value="MarkdownV2">MarkdownV2</option>
                    <option value="">Aucun</option>
                  </select>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setShowCreateModal(false)}>Annuler</button>
              <button style={btnPrimary} onClick={createAlert}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div style={{ ...card, padding: 12 }}>
      <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || 'inherit' }}>{value}</div>
    </div>
  );
}

function ChatBubble({ alert: m, onDelete }: { alert: Alert; onDelete: () => void }) {
  const isOut = m.status === 'sent' || m.type?.startsWith('test:') || m.type === 'broadcast' || m.type === 'manual';
  const time = new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={{ display: 'flex', justifyContent: isOut ? 'flex-start' : 'flex-end' }}>
      <div style={{
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: 12,
        fontSize: 12,
        background: isOut ? 'rgba(124,58,237,0.15)' : 'rgba(6,182,212,0.15)',
        border: `1px solid ${isOut ? 'rgba(124,58,237,0.3)' : 'rgba(6,182,212,0.3)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase' }}>{isOut ? 'OUT' : 'IN'}</span>
          <span style={{ fontSize: 9, opacity: 0.5 }}>{m.chatId}</span>
          <span style={{ fontSize: 9, opacity: 0.5 }}>· {time}</span>
          {m.type && <span style={{ fontSize: 9, background: 'rgba(251,191,36,0.2)', color: '#fbbf24', padding: '0 6px', borderRadius: 8 }}>{m.type}</span>}
          {m.status === 'failed' && <span style={{ fontSize: 9, background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '0 6px', borderRadius: 8 }}>failed</span>}
          <button onClick={onDelete} style={{ marginLeft: 'auto', background: 'transparent', border: 0, color: 'inherit', opacity: 0.4, cursor: 'pointer', fontSize: 10 }}>✗</button>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }} dangerouslySetInnerHTML={{ __html: (m.message || '').slice(0, 1000) }} />
        {m.error && <div style={{ fontSize: 10, marginTop: 4, color: '#fca5a5' }}>⚠ {m.error}</div>}
      </div>
    </div>
  );
}
