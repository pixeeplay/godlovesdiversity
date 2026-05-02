'use client';
import { useState } from 'react';
import { Send, Slack, Webhook, Bot, MessageSquare, Mail, Save, Check, ExternalLink, Loader2, Power, PowerOff, X, ChevronRight, Github, Calendar, Cloud, Zap, Database, FileText, Video, CreditCard, BookOpen, Globe } from 'lucide-react';

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
  },
  {
    id: 'brevo',
    name: 'Brevo (ex-Sendinblue)',
    description: 'Email marketing français RGPD-friendly, alternative Mailchimp. Free 300 emails/jour.',
    icon: Mail,
    color: 'from-blue-500 to-cyan-500',
    docsUrl: 'https://developers.brevo.com',
    externalUrl: 'https://app.brevo.com/settings/keys/api',
    externalLabel: 'Brevo API',
    setupInstructions: [
      'Va sur app.brevo.com → SMTP & API → API Keys → Generate a new API key.',
      'Crée ou sélectionne une liste d\'abonnés et note son ID.'
    ],
    fields: [
      { key: 'integrations.brevo.apiKey', label: 'API Key', type: 'password', placeholder: 'xkeysib-…' },
      { key: 'integrations.brevo.listId', label: 'List ID', placeholder: '5' }
    ]
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Crée des issues automatiquement (bug report, feedback) ou push des données dans un repo.',
    icon: Github,
    color: 'from-zinc-700 to-zinc-900',
    docsUrl: 'https://docs.github.com/en/rest',
    externalUrl: 'https://github.com/settings/tokens',
    externalLabel: 'Personal access tokens',
    setupInstructions: [
      'Va sur github.com/settings/tokens → Generate new token (classic).',
      'Coche le scope `repo`.',
      'Copie le token (commence par `ghp_…`).',
      'Renseigne owner/repo de la forme `pixeeplay/godlovesdiversity`.'
    ],
    fields: [
      { key: 'integrations.github.token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_…' },
      { key: 'integrations.github.repo', label: 'Repository (owner/repo)', placeholder: 'pixeeplay/godlovesdiversity' }
    ]
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Push automatiquement les nouvelles photos / témoignages / commandes dans une base Notion.',
    icon: FileText,
    color: 'from-zinc-600 to-zinc-800',
    docsUrl: 'https://developers.notion.com',
    externalUrl: 'https://www.notion.so/my-integrations',
    externalLabel: 'Notion integrations',
    setupInstructions: [
      'Crée une intégration sur notion.so/my-integrations → Internal integration.',
      'Copie le secret (`secret_…`).',
      'Sur ta base Notion : Share → Connect to → ton intégration.',
      'Copie l\'ID de la base (URL : notion.so/workspace/{DATABASE_ID}?v=…).'
    ],
    fields: [
      { key: 'integrations.notion.token', label: 'Internal Integration Secret', type: 'password', placeholder: 'secret_…' },
      { key: 'integrations.notion.databaseId', label: 'Database ID', placeholder: '32 caractères hex' }
    ]
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Sync les commandes / abonnés newsletter / témoignages vers une base Airtable.',
    icon: Database,
    color: 'from-yellow-400 to-amber-500',
    docsUrl: 'https://airtable.com/developers/web/api/introduction',
    externalUrl: 'https://airtable.com/create/tokens',
    externalLabel: 'Airtable tokens',
    setupInstructions: [
      'Va sur airtable.com/create/tokens → Create new token.',
      'Sélectionne les scopes `data.records:write` et `schema.bases:read`.',
      'Choisis ta base, copie le token (`pat…`) et l\'ID de la base.'
    ],
    fields: [
      { key: 'integrations.airtable.token', label: 'Personal Access Token', type: 'password', placeholder: 'pat…' },
      { key: 'integrations.airtable.baseId', label: 'Base ID', placeholder: 'app…' },
      { key: 'integrations.airtable.tableName', label: 'Table name', placeholder: 'Commandes' }
    ]
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Ajoute automatiquement chaque commande / abonné dans une feuille Google.',
    icon: Cloud,
    color: 'from-green-500 to-emerald-500',
    docsUrl: 'https://developers.google.com/sheets/api',
    externalUrl: 'https://console.cloud.google.com/apis/credentials',
    externalLabel: 'Google Cloud Console',
    setupInstructions: [
      'Crée un projet sur Google Cloud Console.',
      'Active "Google Sheets API".',
      'Crée un compte de service → télécharge la clé JSON.',
      'Partage ta feuille avec l\'email du compte de service (Edit access).',
      'Colle l\'ID de la feuille (depuis l\'URL) et le JSON complet.'
    ],
    fields: [
      { key: 'integrations.gsheets.spreadsheetId', label: 'Spreadsheet ID', placeholder: '1AbCdEf…' },
      { key: 'integrations.gsheets.serviceAccountJson', label: 'Service Account JSON', type: 'textarea', placeholder: '{"type":"service_account",…}' }
    ]
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connecte le site à 6000+ apps (CRM, Trello, Notion, Gmail…) via webhook Zapier.',
    icon: Zap,
    color: 'from-orange-500 to-amber-500',
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
    externalUrl: 'https://zapier.com/app/zaps',
    externalLabel: 'Zapier dashboard',
    setupInstructions: [
      'Sur Zapier, crée un nouveau Zap.',
      'Trigger → Webhooks by Zapier → Catch Hook.',
      'Copie l\'URL générée.',
      'Configure ton action (Notion, Trello, Gmail, etc.).'
    ],
    fields: [
      { key: 'integrations.zapier.url', label: 'Webhook URL Zapier', type: 'url', placeholder: 'https://hooks.zapier.com/…' }
    ]
  },
  {
    id: 'make',
    name: 'Make (ex-Integromat)',
    description: 'Alternative européenne à Zapier, plus puissante. Webhook-based.',
    icon: Zap,
    color: 'from-purple-500 to-fuchsia-500',
    docsUrl: 'https://www.make.com/en/help/tools/webhooks',
    externalUrl: 'https://www.make.com/en/scenarios',
    externalLabel: 'Make scenarios',
    setupInstructions: [
      'Sur make.com, crée un scénario.',
      'Trigger → Webhooks → Custom webhook.',
      'Copie l\'URL.',
      'Configure les modules suivants (Slack, Notion, Sheets, etc.).'
    ],
    fields: [
      { key: 'integrations.make.url', label: 'Webhook URL Make', type: 'url', placeholder: 'https://hook.eu1.make.com/…' }
    ]
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Affiche un bouton de prise de RDV pour discuter avec l\'équipe (via embed).',
    icon: Calendar,
    color: 'from-blue-600 to-indigo-600',
    docsUrl: 'https://developer.calendly.com',
    externalUrl: 'https://calendly.com/event_types/user/me',
    externalLabel: 'Mes Event Types',
    setupInstructions: [
      'Crée un event type sur calendly.com.',
      'Copie l\'URL publique (calendly.com/your-name/30min).'
    ],
    fields: [
      { key: 'integrations.calendly.eventUrl', label: 'URL Calendly publique', type: 'url', placeholder: 'https://calendly.com/your-name/30min' }
    ]
  },
  {
    id: 'youtube-api',
    name: 'YouTube Data API',
    description: 'Importe automatiquement les vidéos d\'une chaîne YouTube dans le carrousel home.',
    icon: Video,
    color: 'from-red-500 to-rose-500',
    docsUrl: 'https://developers.google.com/youtube/v3',
    externalUrl: 'https://console.cloud.google.com/apis/credentials',
    externalLabel: 'Google Cloud Console',
    setupInstructions: [
      'Crée une clé API sur console.cloud.google.com.',
      'Active "YouTube Data API v3".',
      'Récupère l\'ID de ta chaîne (URL youtube.com/channel/UC…).'
    ],
    fields: [
      { key: 'integrations.youtube.apiKey', label: 'API Key', type: 'password', placeholder: 'AIza…' },
      { key: 'integrations.youtube.channelId', label: 'Channel ID', placeholder: 'UC…' }
    ]
  },
  {
    id: 'stripe-webhook',
    name: 'Stripe Webhooks',
    description: 'Reçoit les events Stripe (paiement réussi, remboursement, échec) → marque automatiquement les commandes payées.',
    icon: CreditCard,
    color: 'from-violet-500 to-indigo-500',
    docsUrl: 'https://stripe.com/docs/webhooks',
    externalUrl: 'https://dashboard.stripe.com/webhooks',
    externalLabel: 'Stripe Dashboard',
    setupInstructions: [
      'Sur dashboard.stripe.com → Developers → Webhooks → Add endpoint.',
      'URL : https://gld.pixeeplay.com/api/webhooks/stripe',
      'Events : `checkout.session.completed`, `payment_intent.succeeded`.',
      'Copie le Signing secret (`whsec_…`).'
    ],
    fields: [
      { key: 'integrations.stripe.webhookSecret', label: 'Webhook Signing Secret', type: 'password', placeholder: 'whsec_…' }
    ]
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Cross-poste automatiquement les articles du blog vers Medium.',
    icon: BookOpen,
    color: 'from-zinc-800 to-black',
    docsUrl: 'https://github.com/Medium/medium-api-docs',
    externalUrl: 'https://medium.com/me/settings/security',
    externalLabel: 'Medium settings',
    setupInstructions: [
      'Va sur medium.com → Settings → Security → Integration tokens.',
      'Crée un nouveau token.'
    ],
    fields: [
      { key: 'integrations.medium.token', label: 'Integration Token', type: 'password', placeholder: '2…' },
      { key: 'integrations.medium.userId', label: 'Medium User ID', placeholder: '1abc…' }
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
