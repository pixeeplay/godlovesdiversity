'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type IntegrationConfig = {
  id: string;
  provider: string;
  displayName?: string | null;
  active: boolean;
  config?: any;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
};

type ProviderDef = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  docsUrl?: string;
  externalUrl?: string;
  externalLabel?: string;
  secretKeys: string[];
  setupInstructions: string[];
  fields: { key: string; label: string; type?: 'text' | 'password' | 'textarea' | 'url'; placeholder?: string; help?: string }[];
};

const PROVIDERS: ProviderDef[] = [
  {
    id: 'telegram', name: 'Telegram Bot', emoji: '✈️',
    description: 'Notifications + commandes vocales (modération, commande, alerte).',
    docsUrl: 'https://core.telegram.org/bots',
    externalUrl: 'https://t.me/BotFather', externalLabel: 'Open BotFather',
    secretKeys: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
    setupInstructions: [
      'Ouvre Telegram et cherche @BotFather.',
      'Démarre une conversation et envoie `/newbot`.',
      'Choisis un nom + un username terminant par `bot`.',
      'Copie le token et ajoute-le dans Secrets sous `TELEGRAM_BOT_TOKEN`.',
      'Envoie `/start` à ton bot et colle ton chat_id sous `TELEGRAM_CHAT_ID`.',
    ],
    fields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '1234567890:ABCdef…', help: 'Stocké dans Secrets sous TELEGRAM_BOT_TOKEN' },
      { key: 'chatId', label: 'Chat ID destinataire', placeholder: '-100123… ou ton ID', help: 'Stocké sous TELEGRAM_CHAT_ID' },
    ],
  },
  {
    id: 'slack', name: 'Slack Webhook', emoji: '💬',
    description: 'Notifications dans un channel Slack (don, modération, commande…).',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    externalUrl: 'https://api.slack.com/apps', externalLabel: 'Slack API',
    secretKeys: ['SLACK_WEBHOOK'],
    setupInstructions: [
      'Va sur api.slack.com/apps et crée une nouvelle app.',
      'Active "Incoming Webhooks" et autorise un channel.',
      'Copie l\'URL webhook (https://hooks.slack.com/services/…) sous `SLACK_WEBHOOK`.',
    ],
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/…' }],
  },
  {
    id: 'discord', name: 'Discord Webhook', emoji: '🎮',
    description: 'Notifications dans un canal Discord (photo à modérer, vente…).',
    docsUrl: 'https://support.discord.com/hc/en-us/articles/228383668',
    secretKeys: ['DISCORD_WEBHOOK'],
    setupInstructions: [
      'Paramètres serveur Discord → Intégrations → Webhooks.',
      'Crée un webhook, choisis le canal cible.',
      'Copie l\'URL sous `DISCORD_WEBHOOK`.',
    ],
    fields: [{ key: 'webhookUrl', label: 'Webhook URL', type: 'password', placeholder: 'https://discord.com/api/webhooks/…' }],
  },
  {
    id: 'zapier', name: 'Zapier', emoji: '⚡',
    description: 'Connecte 6000+ apps via webhook Zapier.',
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
    externalUrl: 'https://zapier.com/app/zaps', externalLabel: 'Zapier dashboard',
    secretKeys: ['ZAPIER_KEY'],
    setupInstructions: [
      'Sur Zapier, crée un Zap avec trigger "Webhooks by Zapier → Catch Hook".',
      'Copie l\'URL générée sous `ZAPIER_KEY`.',
    ],
    fields: [{ key: 'url', label: 'Webhook URL Zapier', type: 'url', placeholder: 'https://hooks.zapier.com/…' }],
  },
  {
    id: 'make', name: 'Make (Integromat)', emoji: '🔄',
    description: 'Alternative européenne à Zapier. Webhook-based.',
    docsUrl: 'https://www.make.com/en/help/tools/webhooks',
    externalUrl: 'https://www.make.com/en/scenarios', externalLabel: 'Make scenarios',
    secretKeys: ['MAKE_KEY'],
    setupInstructions: [
      'Sur make.com, crée un scénario avec trigger "Custom webhook".',
      'Copie l\'URL sous `MAKE_KEY`.',
    ],
    fields: [{ key: 'url', label: 'Webhook URL Make', type: 'url', placeholder: 'https://hook.eu1.make.com/…' }],
  },
  {
    id: 'hubspot', name: 'HubSpot', emoji: '🧲',
    description: 'CRM HubSpot. Sync contacts/leads.',
    docsUrl: 'https://developers.hubspot.com',
    externalUrl: 'https://app.hubspot.com/api-key', externalLabel: 'HubSpot API',
    secretKeys: ['HUBSPOT_KEY'],
    setupInstructions: [
      'Va dans HubSpot → Settings → Integrations → API key (private app).',
      'Génère un Private App Token avec scopes contacts.',
      'Stocke sous `HUBSPOT_KEY`.',
    ],
    fields: [{ key: 'apiKey', label: 'Private App Token', type: 'password', placeholder: 'pat-…' }],
  },
  {
    id: 'mailchimp', name: 'Mailchimp', emoji: '📬',
    description: 'Sync abonnés newsletter avec une audience Mailchimp.',
    docsUrl: 'https://mailchimp.com/developer/marketing/api/',
    externalUrl: 'https://us1.admin.mailchimp.com/account/api/', externalLabel: 'Mailchimp API',
    secretKeys: ['MAILCHIMP_KEY'],
    setupInstructions: [
      'Account → Extras → API keys → Create A Key.',
      'Stocke sous `MAILCHIMP_KEY` (inclut le datacenter, ex: xxx-us1).',
    ],
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'xxxxx-us1' },
      { key: 'audienceId', label: 'Audience ID', placeholder: 'a1b2c3d4e5' },
    ],
  },
  {
    id: 'pipedrive', name: 'Pipedrive', emoji: '🚀',
    description: 'CRM Pipedrive : sync deals + contacts.',
    docsUrl: 'https://developers.pipedrive.com',
    externalUrl: 'https://app.pipedrive.com/settings/personal/api', externalLabel: 'Pipedrive API',
    secretKeys: ['PIPEDRIVE_KEY'],
    setupInstructions: [
      'Settings → Personal preferences → API → Personal API token.',
      'Copie sous `PIPEDRIVE_KEY`.',
    ],
    fields: [{ key: 'apiKey', label: 'API Token', type: 'password', placeholder: 'pd_…' }],
  },
  {
    id: 'notion', name: 'Notion', emoji: '📝',
    description: 'Push photos / témoignages / commandes vers une base Notion.',
    docsUrl: 'https://developers.notion.com',
    externalUrl: 'https://www.notion.so/my-integrations', externalLabel: 'Notion integrations',
    secretKeys: ['NOTION_KEY'],
    setupInstructions: [
      'notion.so/my-integrations → Internal integration.',
      'Copie le secret sous `NOTION_KEY`.',
      'Share → Connect to → ton intégration sur ta base.',
    ],
    fields: [
      { key: 'token', label: 'Internal Integration Secret', type: 'password', placeholder: 'secret_…' },
      { key: 'databaseId', label: 'Database ID', placeholder: '32 chars hex' },
    ],
  },
  {
    id: 'airtable', name: 'Airtable', emoji: '🗃️',
    description: 'Sync commandes / abonnés / témoignages vers Airtable.',
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
    externalUrl: 'https://airtable.com/create/tokens', externalLabel: 'Airtable tokens',
    secretKeys: ['AIRTABLE_KEY'],
    setupInstructions: [
      'airtable.com/create/tokens → Create new token.',
      'Scopes : data.records:write, schema.bases:read.',
      'Stocke sous `AIRTABLE_KEY`.',
    ],
    fields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'pat…' },
      { key: 'baseId', label: 'Base ID', placeholder: 'app…' },
      { key: 'tableName', label: 'Table name', placeholder: 'Leads' },
    ],
  },
  {
    id: 'webhook', name: 'Webhook générique', emoji: '🪝',
    description: 'POST tous les événements à n\'importe quelle URL (n8n, IFTTT, etc.).',
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
    secretKeys: [],
    setupInstructions: [
      'Récupère l\'URL de ton endpoint custom.',
      'Stocke dans la config ci-dessous.',
    ],
    fields: [
      { key: 'url', label: 'URL du Webhook', type: 'url', placeholder: 'https://…' },
      { key: 'secret', label: 'Secret partagé (optionnel)', type: 'password', help: 'Envoyé en header X-Webhook-Secret' },
    ],
  },
  {
    id: 'ifttt', name: 'IFTTT', emoji: '🔀',
    description: 'Connecte aux services grand public (Sonos, smart home…).',
    docsUrl: 'https://ifttt.com/maker_webhooks',
    secretKeys: [],
    setupInstructions: [
      'Crée un applet IFTTT avec trigger Webhooks.',
      'Récupère l\'URL Maker Webhooks.',
    ],
    fields: [
      { key: 'url', label: 'Webhook URL', type: 'url', placeholder: 'https://maker.ifttt.com/trigger/...' },
    ],
  },
];

export function IntegrationsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<ProviderDef | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/integrations`);
    const j = await r.json();
    setItems(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function getConfigFor(providerId: string): IntegrationConfig | undefined {
    return items.find((i) => i.provider === providerId);
  }

  function openModal(p: ProviderDef) {
    const cfg = getConfigFor(p.id);
    setDraft({ ...(cfg?.config || {}) });
    setActive(p);
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    try {
      await fetch(`/api/orgs/${orgSlug}/integrations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: active.id, displayName: active.name, active: true, config: draft }),
      });
      setActive(null);
      await load();
    } finally { setSaving(false); }
  }

  async function disconnect(provider: ProviderDef) {
    if (!confirm(`Déconnecter ${provider.name} ?`)) return;
    const cfg = getConfigFor(provider.id);
    if (cfg) await fetch(`/api/orgs/${orgSlug}/integrations/${cfg.id}`, { method: 'DELETE' });
    await load();
  }

  async function toggleActive(c: IntegrationConfig) {
    await fetch(`/api/orgs/${orgSlug}/integrations/${c.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    });
    await load();
  }

  async function testConnection(provider: string) {
    setTesting(provider);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/integrations/${provider}/test`, { method: 'POST' });
      const j = await r.json();
      alert(j.ok ? `✓ ${provider} : connexion OK` : `✗ ${provider} : ${j.detail || j.error || 'erreur'}`);
      await load();
    } finally { setTesting(null); }
  }

  async function syncNow(provider: string) {
    setSyncing(provider);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/integrations/${provider}/sync`, { method: 'POST' });
      const j = await r.json();
      alert(j.note || (j.ok ? 'Sync OK' : 'Sync échouée'));
      await load();
    } finally { setSyncing(null); }
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🔌" title="Intégrations"
      desc="Connecte Pixeesite à tes outils (Slack/Discord/Zapier/Make/HubSpot/Mailchimp/Pipedrive/Notion/Airtable…)."
    >
      <div style={{ marginBottom: 12, padding: 12, ...card, background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.3)', fontSize: 12 }}>
        🔐 Les tokens/keys (TELEGRAM_BOT_TOKEN, SLACK_WEBHOOK, etc.) doivent être stockés dans <a href={`/dashboard/orgs/${orgSlug}/keys`} style={{ color: colors.primary }}>Secrets</a>. Cette page gère la configuration non-sensible (IDs, audiences, etc.) et l'état actif/inactif.
      </div>

      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {PROVIDERS.map((p) => {
            const cfg = getConfigFor(p.id);
            const connected = !!cfg;
            return (
              <article key={p.id} style={{ ...card, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 28 }}>{p.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h3 style={{ margin: 0, fontSize: 14 }}>{p.name}</h3>
                      {connected && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                                       background: cfg.active ? 'rgba(34,197,94,0.2)' : 'rgba(156,163,175,0.2)',
                                       color: cfg.active ? colors.success : '#9ca3af' }}>
                          {cfg.active ? 'CONNECTÉ' : 'INACTIF'}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, opacity: 0.6, margin: '4px 0 0' }}>{p.description}</p>
                  </div>
                </div>
                {cfg?.lastSyncAt && (
                  <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 8 }}>
                    Dernier sync : {new Date(cfg.lastSyncAt).toLocaleString('fr-FR')} · {cfg.lastSyncStatus || '—'}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button style={{ ...btnPrimary, padding: '6px 12px', fontSize: 12 }} onClick={() => openModal(p)}>
                    {connected ? 'Configurer' : '+ Connecter'}
                  </button>
                  {connected && (
                    <>
                      <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }} onClick={() => testConnection(p.id)} disabled={testing === p.id}>
                        {testing === p.id ? '…' : '🧪 Test'}
                      </button>
                      <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }} onClick={() => syncNow(p.id)} disabled={syncing === p.id}>
                        {syncing === p.id ? '…' : '↻ Sync'}
                      </button>
                      <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }} onClick={() => toggleActive(cfg!)}>
                        {cfg!.active ? 'Désactiver' : 'Activer'}
                      </button>
                      <button style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11, color: '#fca5a5' }} onClick={() => disconnect(p)}>
                        ✗
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal config */}
      {active && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }} onClick={() => setActive(null)}>
          <div style={{ ...card, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{active.emoji}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>Configurer {active.name}</h3>
                <p style={{ fontSize: 12, opacity: 0.6, margin: '2px 0 0' }}>{active.description}</p>
              </div>
              <button onClick={() => setActive(null)} style={{ background: 'transparent', border: 0, color: 'inherit', fontSize: 20, cursor: 'pointer', opacity: 0.5 }}>✗</button>
            </div>

            {active.docsUrl && (
              <a href={active.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: colors.primary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                🔗 Documentation officielle
              </a>
            )}

            <div style={{ ...card, padding: 12, background: '#0a0a0f', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Comment configurer</div>
              <ol style={{ fontSize: 12, opacity: 0.85, paddingLeft: 20, margin: 0 }}>
                {active.setupInstructions.map((s, i) => (
                  <li key={i} style={{ marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: s.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;">$1</code>') }} />
                ))}
              </ol>
              {active.externalUrl && (
                <a href={active.externalUrl} target="_blank" rel="noreferrer" style={{ ...btnSecondary, marginTop: 8, fontSize: 12, display: 'inline-block' }}>
                  ↗ {active.externalLabel || 'Open external'}
                </a>
              )}
            </div>

            {active.secretKeys.length > 0 && (
              <div style={{ ...card, padding: 12, background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.3)', marginBottom: 12, fontSize: 12 }}>
                🔑 Stocke ces secrets dans <a href={`/dashboard/orgs/${orgSlug}/keys`} style={{ color: colors.primary }}>Secrets</a> :
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {active.secretKeys.map((k) => (
                    <code key={k} style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{k}</code>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>Configuration non-sensible</div>
              {active.fields.map((f) => (
                <label key={f.key}>
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{f.label}</span>
                  {f.type === 'textarea' ? (
                    <textarea value={draft[f.key] || ''} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} placeholder={f.placeholder} rows={3} style={{ ...input, fontFamily: 'inherit' }} />
                  ) : (
                    <input
                      type={f.type === 'password' ? 'text' : f.type || 'text'}
                      value={draft[f.key] || ''}
                      onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      style={input}
                    />
                  )}
                  {f.help && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{f.help}</div>}
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setActive(null)}>Annuler</button>
              <button style={btnPrimary} onClick={save} disabled={saving}>
                {saving ? '…' : '💾 Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
