'use client';
import { useState } from 'react';
import { Send, Slack, Webhook, Bot, MessageSquare, Mail, Save, Check, ExternalLink, Loader2, Power, PowerOff, X, ChevronRight } from 'lucide-react';

type Integration = {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  docsUrl?: string;
  externalUrl?: string;
  externalLabel?: string;
  setupInstructions: string[];
  fields: { key: string; label: string; type?: 'text' | 'password' | 'textarea' | 'url'; placeholder?: string; help?: string }[];
};

const INTEGRATIONS: Integration[] = [
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Reçois des notifications + envoie des messages depuis le site (modération, nouvelle commande, alerte…)',
    icon: Send,
    color: 'from-cyan-500 to-blue-500',
    docsUrl: 'https://core.telegram.org/bots',
    externalUrl: 'https://t.me/BotFather',
    externalLabel: 'Open BotFather',
    setupInstructions: [
      'Ouvre Telegram et cherche @BotFather.',
      'Démarre une conversation et envoie `/newbot`.',
      'Choisis un nom d\'affichage et un username terminant par `bot`.',
      'Copie le token du bot fourni par BotFather.',
      'Pour recevoir des notifs : envoie `/start` à ton bot, puis colle ton chat_id ci-dessous.'
    ],
    fields: [
      { key: 'integrations.telegram.botToken', label: 'Bot Token', type: 'password', placeholder: '1234567890:ABCdef…' },
      { key: 'integrations.telegram.chatId', label: 'Chat ID destinataire', placeholder: '-100123… ou ton ID perso', help: 'Trouvé via @userinfobot sur Telegram' }
    ]
  },
  {
    id: 'slack',
    name: 'Slack Webhook',
    description: 'Envoie des notifications dans un channel Slack (nouveau don, modération, commande…)',
    icon: Slack,
    color: 'from-violet-500 to-purple-500',
    docsUrl: 'https://api.slack.com/messaging/webhooks',
    externalUrl: 'https://api.slack.com/apps',
    externalLabel: 'Slack API',
    setupInstructions: [
      'Va sur api.slack.com/apps et crée une nouvelle app.',
      'Active "Incoming Webhooks" et autorise un channel.',
      'Copie l\'URL webhook (commence par https://hooks.slack.com/services/…).'
    ],
    fields: [
      { key: 'integrations.slack.webhookUrl', label: 'Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/…' }
    ]
  },
  {
    id: 'discord',
    name: 'Discord Webhook',
    description: 'Notifications dans un canal Discord (nouvelle photo à modérer, vente, etc.)',
    icon: Bot,
    color: 'from-indigo-500 to-violet-500',
    docsUrl: 'https://support.discord.com/hc/en-us/articles/228383668',
    setupInstructions: [
      'Dans Discord, va dans les Paramètres du serveur → Intégrations.',
      'Crée un Webhook, choisis le canal cible.',
      'Copie l\'URL.'
    ],
    fields: [
      { key: 'integrations.discord.webhookUrl', label: 'Webhook URL', type: 'password', placeholder: 'https://discord.com/api/webhooks/…' }
    ]
  },
  {
    id: 'webhook',
    name: 'Webhook générique',
    description: 'Envoie tous les événements du site à n\'importe quelle URL (Zapier, Make, n8n, IFTTT…)',
    icon: Webhook,
    color: 'from-emerald-500 to-teal-500',
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
    setupInstructions: [
      'Crée un Zap/Scenario sur Zapier ou Make avec déclencheur "Webhooks".',
      'Copie l\'URL générée et colle-la ci-dessous.',
      'Tous les événements (nouvelle commande, photo modérée, abonné…) seront POST en JSON.'
    ],
    fields: [
      { key: 'integrations.webhook.url', label: 'URL du Webhook', type: 'url', placeholder: 'https://hooks.zapier.com/…' },
      { key: 'integrations.webhook.secret', label: 'Secret partagé (optionnel)', type: 'password', help: 'Sera envoyé en header X-Webhook-Secret pour vérification' }
    ]
  },
  {
    id: 'whatsapp-business',
    name: 'WhatsApp Business',
    description: 'Envoie des notifications WhatsApp (commande expédiée, confirmation don) via Meta Cloud API.',
    icon: MessageSquare,
    color: 'from-green-500 to-emerald-500',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
    externalUrl: 'https://business.facebook.com',
    externalLabel: 'Meta Business',
    setupInstructions: [
      'Crée une app Meta Business et active WhatsApp.',
      'Récupère ton Phone Number ID + Access Token.',
      'Vérifie ton numéro de téléphone et configure un template approuvé.'
    ],
    fields: [
      { key: 'integrations.whatsapp.phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890' },
      { key: 'integrations.whatsapp.accessToken', label: 'Access Token', type: 'password', placeholder: 'EAAG…' }
    ]
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Synchronise automatiquement tes abonnés newsletter avec une audience Mailchimp.',
    icon: Mail,
    color: 'from-yellow-500 to-orange-500',
    docsUrl: 'https://mailchimp.com/developer/marketing/api/',
    externalUrl: 'https://us1.admin.mailchimp.com/account/api/',
    externalLabel: 'Mailchimp API',
    setupInstructions: [
      'Connecte-toi à Mailchimp → Account → Extras → API keys → Create A Key.',
      'Récupère l\'ID de ton audience (Audience → Settings → Audience name and defaults).'
    ],
    fields: [
      { key: 'integrations.mailchimp.apiKey', label: 'API Key', type: 'password', placeholder: 'xxxxx-us1' },
      { key: 'integrations.mailchimp.audienceId', label: 'Audience ID', placeholder: 'a1b2c3d4e5' }
    ]
  }
];

export function IntegrationsManager({ initial }: { initial: Record<string, string> }) {
  const [active, setActive] = useState<Integration | null>(null);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function isConfigured(it: Integration): boolean {
    // Au moins le 1er champ rempli = configurée
    return !!values[it.fields[0].key];
  }

  async function save() {
    if (!active) return;
    setSaving(true);
    const patch: Record<string, string> = {};
    for (const f of active.fields) patch[f.key] = values[f.key] || '';
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    setSaving(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2500);
  }

  async function disconnect(it: Integration) {
    if (!confirm(`Déconnecter ${it.name} ? Les données saisies seront effacées.`)) return;
    const patch: Record<string, string> = {};
    for (const f of it.fields) patch[f.key] = '';
    await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch)
    });
    setValues({ ...values, ...patch });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {INTEGRATIONS.map((it) => {
        const Icon = it.icon;
        const connected = isConfigured(it);
        return (
          <div key={it.id} className="bg-zinc-900 border border-zinc-800 hover:border-brand-pink/40 rounded-2xl p-5 transition relative">
            <div className="flex items-start gap-3 mb-3">
              <div className={`bg-gradient-to-br ${it.color} rounded-xl p-2.5 shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{it.name}</h3>
                  {connected && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">connecté</span>}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-400 mb-4 line-clamp-3">{it.description}</p>
            <div className="flex gap-2">
              <button onClick={() => setActive(it)}
                      className={`flex-1 py-2 rounded-full text-sm font-bold flex items-center justify-center gap-2 ${connected ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-brand-pink hover:bg-pink-600 text-white'}`}>
                {connected ? <>Configurer <ChevronRight size={14} /></> : <>+ Connecter</>}
              </button>
              {connected && (
                <button onClick={() => disconnect(it)} title="Déconnecter"
                        className="px-3 py-2 rounded-full bg-red-900/30 hover:bg-red-900/60 text-red-300">
                  <PowerOff size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Modal de configuration */}
      {active && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setActive(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={`bg-gradient-to-br ${active.color} p-5 rounded-t-2xl flex items-center justify-between`}>
              <div className="flex items-center gap-3 text-white">
                <div className="bg-white/20 rounded-xl p-2.5"><active.icon size={22} /></div>
                <div>
                  <h2 className="font-bold text-lg">Connecter {active.name}</h2>
                  <p className="text-xs text-white/85">{active.description}</p>
                </div>
              </div>
              <button onClick={() => setActive(null)} className="text-white/80 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-5">
              {active.docsUrl && (
                <a href={active.docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-brand-pink hover:underline">
                  <ExternalLink size={12} /> Documentation officielle
                </a>
              )}

              {/* Setup instructions */}
              <div>
                <h3 className="font-bold text-sm mb-2 text-white">Comment configurer</h3>
                <ol className="space-y-2 text-sm text-zinc-300">
                  {active.setupInstructions.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="bg-brand-pink/20 text-brand-pink font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">{i + 1}</span>
                      <span dangerouslySetInnerHTML={{ __html: step.replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-xs">$1</code>') }} />
                    </li>
                  ))}
                </ol>
              </div>

              {/* External link button */}
              {active.externalUrl && (
                <a href={active.externalUrl} target="_blank" rel="noopener noreferrer"
                   className="block w-full text-center py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm">
                  <ExternalLink size={14} className="inline mr-1" /> {active.externalLabel || 'Open external'}
                </a>
              )}

              {/* Fields */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                {active.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs text-zinc-400 font-bold">{f.label}</span>
                    {f.type === 'textarea' ? (
                      <textarea rows={3} value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                                placeholder={f.placeholder}
                                className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
                    ) : (
                      <input type={f.type === 'password' ? 'password' : (f.type === 'url' ? 'url' : 'text')}
                             value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                             placeholder={f.placeholder}
                             className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" />
                    )}
                    {f.help && <span className="block mt-1 text-[11px] text-zinc-500">{f.help}</span>}
                  </label>
                ))}
              </div>

              {/* Visibility info */}
              <div className="text-xs text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                🔐 Cette intégration n'est accessible qu'aux administrateurs du site. Les tokens sont stockés chiffrés.
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setActive(null)} className="px-4 py-2 text-sm rounded-full bg-zinc-800 hover:bg-zinc-700 text-white">Annuler</button>
                <button onClick={save} disabled={saving}
                        className="px-5 py-2 text-sm rounded-full bg-brand-pink hover:bg-pink-600 text-white font-bold flex items-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {savedAt ? <><Check size={14} /> Enregistré !</> : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
