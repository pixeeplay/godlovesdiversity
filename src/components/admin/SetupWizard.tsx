'use client';
import { useMemo, useState } from 'react';
import {
  Sparkles, Mail, ShoppingBag, Truck, HandHeart, MessageCircle, BarChart3,
  Share2, Globe, Music, ScanFace, Loader2, Save, Check, X, ExternalLink,
  ChevronRight, ChevronLeft, ArrowRight, AlertCircle, Zap, Hash
} from 'lucide-react';

type Field = {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'url' | 'textarea';
  placeholder?: string;
  help?: string;
};

type Step = {
  id: string;
  category: 'essential' | 'shop' | 'notify' | 'growth' | 'social' | 'advanced';
  icon: any;
  title: string;
  why: string;       // pourquoi en avoir besoin (1 phrase claire)
  cost: 'free' | 'freemium' | 'paid';
  difficulty: 1 | 2 | 3;
  timeMinutes: number;
  externalUrl: string;
  externalLabel: string;
  steps: string[];   // instructions step-by-step
  fields: Field[];
};

const COST_LABEL = { free: 'Gratuit', freemium: 'Freemium', paid: 'Payant' };
const COST_COLOR = { free: 'bg-emerald-500', freemium: 'bg-amber-500', paid: 'bg-rose-500' };

const STEPS: Step[] = [
  // ─── INDISPENSABLE ───
  {
    id: 'gemini', category: 'essential', icon: Sparkles, title: 'Gemini IA',
    why: 'Sans cette clé, le chat IA, la modération, la génération de textes/images ne fonctionnent pas.',
    cost: 'freemium', difficulty: 1, timeMinutes: 3,
    externalUrl: 'https://aistudio.google.com/apikey', externalLabel: 'Récupérer ma clé Gemini',
    steps: [
      'Connecte-toi avec ton compte Google.',
      'Clique sur "Create API key" en haut à droite.',
      'Sélectionne un projet ou crée-en un nouveau.',
      'Copie la clé (commence par AIza…).'
    ],
    fields: [
      { key: 'integrations.gemini.apiKey', label: 'Clé API Gemini', type: 'password', placeholder: 'AIza…' }
    ]
  },
  {
    id: 'resend', category: 'essential', icon: Mail, title: 'Email — Resend',
    why: 'Pour envoyer les newsletters, confirmations de commande, et notifications.',
    cost: 'freemium', difficulty: 1, timeMinutes: 5,
    externalUrl: 'https://resend.com/api-keys', externalLabel: 'Créer une clé Resend',
    steps: [
      'Crée un compte gratuit sur resend.com (3000 emails/mois free).',
      'Onglet "API Keys" → Create API Key.',
      'Configure ton domaine d\'envoi (DNS DKIM/SPF), ou utilise resend.dev pour tester.'
    ],
    fields: [
      { key: 'integrations.resend.apiKey', label: 'Clé API Resend', type: 'password', placeholder: 're_…' },
      { key: 'integrations.resend.from', label: 'Email expéditeur', placeholder: '"GLD" <hello@godlovesdiversity.com>' }
    ]
  },

  // ─── BOUTIQUE ───
  {
    id: 'stripe', category: 'shop', icon: ShoppingBag, title: 'Stripe (paiement CB)',
    why: 'Acceptez les paiements par carte bancaire dans la boutique.',
    cost: 'paid', difficulty: 2, timeMinutes: 10,
    externalUrl: 'https://dashboard.stripe.com/apikeys', externalLabel: 'Stripe Dashboard',
    steps: [
      'Crée un compte sur stripe.com (gratuit, frais par transaction 1.4% + 0.25€ en zone EU).',
      'Active ton compte (vérification d\'identité + RIB).',
      'Onglet "Developers" → "API keys" → copie la clé secrète (sk_live_…).'
    ],
    fields: [
      { key: 'integrations.stripe.secretKey', label: 'Clé secrète', type: 'password', placeholder: 'sk_live_…' },
      { key: 'integrations.stripe.publicKey', label: 'Clé publique', placeholder: 'pk_live_…' }
    ]
  },
  {
    id: 'helloasso', category: 'shop', icon: HandHeart, title: 'HelloAsso (dons sans frais)',
    why: 'Recevoir des dons défiscalisables sans frais (financé par le pourboire optionnel des donateurs).',
    cost: 'free', difficulty: 1, timeMinutes: 5,
    externalUrl: 'https://www.helloasso.com', externalLabel: 'Créer un compte HelloAsso',
    steps: [
      'Inscris ton association sur helloasso.com (réservé aux assos françaises).',
      'Crée une "Cagnotte" ou un "Formulaire de don".',
      'Copie l\'URL publique du formulaire.'
    ],
    fields: [
      { key: 'donate.helloAssoUrl', label: 'URL formulaire HelloAsso', type: 'url', placeholder: 'https://www.helloasso.com/associations/.../formulaires/1' }
    ]
  },
  {
    id: 'sendcloud', category: 'shop', icon: Truck, title: 'Sendcloud (étiquettes officielles)',
    why: 'Génère les vraies étiquettes Colissimo / Mondial Relay / Chronopost en 1 clic.',
    cost: 'freemium', difficulty: 2, timeMinutes: 10,
    externalUrl: 'https://app.sendcloud.com', externalLabel: 'Créer un compte Sendcloud',
    steps: [
      'Crée un compte gratuit sur sendcloud.com (jusqu\'à 100 colis/mois sans abonnement).',
      'Configure ton adresse expéditeur (Settings → Addresses).',
      'Activez les transporteurs souhaités (Colissimo, Mondial Relay, Chronopost).',
      'Settings → API → Generate API key.'
    ],
    fields: [
      { key: 'integrations.sendcloud.publicKey', label: 'Clé publique', type: 'password', placeholder: 'xxxx-xxxx' },
      { key: 'integrations.sendcloud.secretKey', label: 'Clé secrète', type: 'password' },
      { key: 'integrations.sendcloud.senderAddressId', label: 'ID adresse expéditeur', placeholder: '12345' }
    ]
  },
  {
    id: 'twilio', category: 'shop', icon: MessageCircle, title: 'Twilio SMS (notifications expédition)',
    why: 'Notifie les clients par SMS quand leur commande est expédiée.',
    cost: 'paid', difficulty: 2, timeMinutes: 10,
    externalUrl: 'https://www.twilio.com', externalLabel: 'Créer un compte Twilio',
    steps: [
      'Crée un compte sur twilio.com (15$ d\'essai gratuit).',
      'Achète un numéro de téléphone (~1$/mois).',
      'Récupère Account SID + Auth Token sur le Dashboard.'
    ],
    fields: [
      { key: 'integrations.twilio.accountSid', label: 'Account SID', type: 'password', placeholder: 'AC…' },
      { key: 'integrations.twilio.authToken', label: 'Auth Token', type: 'password' },
      { key: 'integrations.twilio.fromNumber', label: 'Numéro expéditeur', placeholder: '+33756123456' }
    ]
  },

  // ─── NOTIFICATIONS ───
  {
    id: 'telegram', category: 'notify', icon: Hash, title: 'Telegram Bot (alertes admin)',
    why: 'Reçois une notification Telegram à chaque commande / nouvelle photo / don.',
    cost: 'free', difficulty: 1, timeMinutes: 3,
    externalUrl: 'https://t.me/BotFather', externalLabel: 'Ouvrir BotFather',
    steps: [
      'Sur Telegram, cherche @BotFather.',
      'Envoie /newbot et suis les étapes (nom + username terminant par "bot").',
      'Copie le token (ex: 1234567890:ABCdef…).',
      'Ouvre @userinfobot pour récupérer ton chat_id personnel, OU envoie /start à ton bot puis va sur https://api.telegram.org/bot<TOKEN>/getUpdates pour voir le chat_id.'
    ],
    fields: [
      { key: 'integrations.telegram.botToken', label: 'Bot Token', type: 'password' },
      { key: 'integrations.telegram.chatId', label: 'Chat ID destinataire', placeholder: 'Ton ID ou un ID de groupe' }
    ]
  },
  {
    id: 'slack', category: 'notify', icon: Hash, title: 'Slack Webhook',
    why: 'Notifications dans un channel Slack de l\'équipe.',
    cost: 'free', difficulty: 1, timeMinutes: 3,
    externalUrl: 'https://api.slack.com/apps', externalLabel: 'Slack API',
    steps: [
      'Crée une app Slack sur api.slack.com/apps.',
      'Active "Incoming Webhooks".',
      'Crée un webhook pour ton channel et copie l\'URL.'
    ],
    fields: [
      { key: 'integrations.slack.webhookUrl', label: 'Webhook URL', type: 'password', placeholder: 'https://hooks.slack.com/services/…' }
    ]
  },
  {
    id: 'discord', category: 'notify', icon: Hash, title: 'Discord Webhook',
    why: 'Notifications dans un canal Discord.',
    cost: 'free', difficulty: 1, timeMinutes: 2,
    externalUrl: 'https://discord.com', externalLabel: 'Discord',
    steps: [
      'Dans ton serveur Discord → Paramètres → Intégrations → Webhooks.',
      'Crée un webhook pour le canal cible et copie l\'URL.'
    ],
    fields: [
      { key: 'integrations.discord.webhookUrl', label: 'Webhook URL', type: 'password' }
    ]
  },

  // ─── CROISSANCE ───
  {
    id: 'mailchimp', category: 'growth', icon: Mail, title: 'Mailchimp (audiences)',
    why: 'Sync les abonnés newsletter avec une audience Mailchimp pour campagnes avancées.',
    cost: 'freemium', difficulty: 2, timeMinutes: 7,
    externalUrl: 'https://mailchimp.com', externalLabel: 'Mailchimp',
    steps: [
      'Crée une audience Mailchimp.',
      'Account → Extras → API keys → Create A Key.',
      'Note l\'ID de ton audience (Audience → Settings).'
    ],
    fields: [
      { key: 'integrations.mailchimp.apiKey', label: 'API Key', type: 'password' },
      { key: 'integrations.mailchimp.audienceId', label: 'Audience ID' }
    ]
  },
  {
    id: 'gemini-imagen', category: 'growth', icon: ScanFace, title: 'Génération images IA (Imagen / Nano Banana)',
    why: 'Crée des visuels Hero et des images produits photoréalistes via IA.',
    cost: 'freemium', difficulty: 1, timeMinutes: 1,
    externalUrl: 'https://aistudio.google.com', externalLabel: 'AI Studio',
    steps: [
      'Aucune action nécessaire si Gemini est déjà configuré.',
      'Le modèle par défaut est gemini-2.5-flash-image (Nano Banana).',
      'Tu peux changer le modèle dans Paramètres → Gemini IA.'
    ],
    fields: [
      { key: 'integrations.gemini.imageModel', label: 'Modèle image', placeholder: 'gemini-2.5-flash-image' }
    ]
  },
  {
    id: 'elevenlabs', category: 'growth', icon: Music, title: 'ElevenLabs (musique IA ambient)',
    why: 'Génère de la musique d\'ambiance (prière, méditation, cathédrale) pour le lecteur audio du site.',
    cost: 'freemium', difficulty: 1, timeMinutes: 3,
    externalUrl: 'https://elevenlabs.io', externalLabel: 'Créer un compte ElevenLabs',
    steps: [
      'Crée un compte gratuit sur elevenlabs.io.',
      'Settings → Profile → API key.'
    ],
    fields: [
      { key: 'integrations.elevenlabs.apiKey', label: 'API Key', type: 'password', placeholder: 'sk_…' }
    ]
  },

  // ─── SEO & ANALYTICS ───
  {
    id: 'google-search', category: 'growth', icon: Globe, title: 'Google Search Console (SEO)',
    why: 'Vérifie ton site sur Google pour suivre l\'indexation et le ranking.',
    cost: 'free', difficulty: 2, timeMinutes: 5,
    externalUrl: 'https://search.google.com/search-console', externalLabel: 'Search Console',
    steps: [
      'Ajoute ton domaine sur search.google.com/search-console.',
      'Méthode "HTML tag" → copie la valeur du `content` du meta tag.',
      'Soumets ton sitemap https://gld.pixeeplay.com/sitemap.xml.'
    ],
    fields: [
      { key: 'seo.googleVerification', label: 'Code de vérification', placeholder: 'abc123…' }
    ]
  },
  {
    id: 'google-analytics', category: 'growth', icon: BarChart3, title: 'Google Analytics 4',
    why: 'Suivi du trafic, conversions, sources de visiteurs (en plus de l\'analytics interne).',
    cost: 'free', difficulty: 2, timeMinutes: 5,
    externalUrl: 'https://analytics.google.com', externalLabel: 'Google Analytics',
    steps: [
      'Crée une propriété GA4 sur analytics.google.com.',
      'Copie l\'ID de mesure (G-XXXXXXX).'
    ],
    fields: [
      { key: 'seo.googleAnalyticsId', label: 'Measurement ID', placeholder: 'G-XXXXXXX' }
    ]
  },

  // ─── RÉSEAUX SOCIAUX ───
  {
    id: 'meta', category: 'social', icon: Share2, title: 'Meta — Instagram & Facebook',
    why: 'Publication automatique sur ta page Facebook et compte Instagram Business.',
    cost: 'free', difficulty: 3, timeMinutes: 30,
    externalUrl: 'https://developers.facebook.com', externalLabel: 'Meta for Developers',
    steps: [
      'Crée une App sur developers.facebook.com.',
      'Active "Facebook Login" et "Instagram Graph API".',
      'Lie ta page Facebook + compte Instagram Business.',
      'Génère un Page Access Token long-life.'
    ],
    fields: [
      { key: 'integrations.meta.appId', label: 'App ID' },
      { key: 'integrations.meta.appSecret', label: 'App Secret', type: 'password' },
      { key: 'integrations.meta.pageAccessToken', label: 'Page Access Token', type: 'password' },
      { key: 'integrations.meta.instagramBusinessId', label: 'Instagram Business ID' }
    ]
  },

  // ─── AVANCÉ ───
  {
    id: 'webhook', category: 'advanced', icon: Zap, title: 'Webhook (Zapier / Make / n8n)',
    why: 'Connecte ton site à 6000+ apps via Zapier ou Make en webhook.',
    cost: 'freemium', difficulty: 2, timeMinutes: 5,
    externalUrl: 'https://zapier.com/apps/webhook', externalLabel: 'Zapier Webhooks',
    steps: [
      'Sur Zapier ou Make, crée un nouveau Zap/Scenario.',
      'Trigger : "Webhooks" → "Catch Hook".',
      'Copie l\'URL générée et colle ci-dessous.',
      'Tous les events du site seront POST en JSON.'
    ],
    fields: [
      { key: 'integrations.webhook.url', label: 'Webhook URL', type: 'url' },
      { key: 'integrations.webhook.secret', label: 'Secret partagé (optionnel)', type: 'password' }
    ]
  }
];

const CATEGORIES = [
  { id: 'essential', label: '🚨 Indispensable', desc: 'À configurer en premier pour que le site fonctionne.', color: 'border-rose-500 from-rose-500/10 to-rose-500/0' },
  { id: 'shop',      label: '🛍 Boutique & paiement', desc: 'Si tu veux vendre des produits ou recevoir des dons.', color: 'border-pink-500 from-pink-500/10 to-pink-500/0' },
  { id: 'notify',    label: '🔔 Notifications', desc: 'Pour être alerté en temps réel sur ton téléphone.', color: 'border-cyan-500 from-cyan-500/10 to-cyan-500/0' },
  { id: 'growth',    label: '🚀 Croissance', desc: 'Email marketing, SEO, analytics, IA enrichie.', color: 'border-emerald-500 from-emerald-500/10 to-emerald-500/0' },
  { id: 'social',    label: '📱 Réseaux sociaux', desc: 'Publication automatique multi-plateformes.', color: 'border-violet-500 from-violet-500/10 to-violet-500/0' },
  { id: 'advanced',  label: '⚡ Avancé', desc: 'Pour les power users — webhooks, automatisations.', color: 'border-amber-500 from-amber-500/10 to-amber-500/0' }
] as const;

export function SetupWizard({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [openStep, setOpenStep] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'configured'>('all');
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  function isConfigured(step: Step): boolean {
    return !!values[step.fields[0].key];
  }

  const stats = useMemo(() => {
    const total = STEPS.length;
    const configured = STEPS.filter(isConfigured).length;
    const essentialDone = STEPS.filter((s) => s.category === 'essential' && isConfigured(s)).length;
    const essentialTotal = STEPS.filter((s) => s.category === 'essential').length;
    return { total, configured, essentialDone, essentialTotal, percent: Math.round((configured / total) * 100) };
  }, [values]);

  const visibleSteps = STEPS.filter((s) => {
    if (filter === 'pending') return !isConfigured(s);
    if (filter === 'configured') return isConfigured(s);
    return true;
  });

  async function save(step: Step) {
    setSaving(true);
    const patch: Record<string, string> = {};
    for (const f of step.fields) patch[f.key] = values[f.key] || '';
    await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
    // Auto-fermer le step après save réussi
    setTimeout(() => setOpenStep(null), 1500);
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header>
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">
          🚀 Assistant de configuration
        </h1>
        <p className="text-zinc-400 max-w-3xl">
          Configure pas-à-pas toutes les fonctions du site. Suis l'ordre proposé pour ne rien oublier.
          Tu peux skipper et revenir plus tard — tout est sauvegardable individuellement.
        </p>
      </header>

      {/* PROGRESS */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-white">{stats.configured}/{stats.total} services configurés</p>
            <p className="text-sm text-zinc-400 mt-1">
              Indispensable : <span className={stats.essentialDone === stats.essentialTotal ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{stats.essentialDone}/{stats.essentialTotal}</span>
              {stats.essentialDone < stats.essentialTotal && <span className="text-amber-400 ml-2 inline-flex items-center gap-1"><AlertCircle size={14}/> à compléter en priorité</span>}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold bg-gradient-to-r from-brand-pink to-violet-500 bg-clip-text text-transparent">{stats.percent}%</p>
            <p className="text-xs text-zinc-500">complété</p>
          </div>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-pink via-violet-500 to-cyan-500 transition-all" style={{ width: `${stats.percent}%` }} />
        </div>
      </div>

      {/* FILTRES */}
      <div className="flex gap-2 flex-wrap">
        {[
          { v: 'all', l: `Tous (${stats.total})` },
          { v: 'pending', l: `À configurer (${stats.total - stats.configured})` },
          { v: 'configured', l: `✓ Configurés (${stats.configured})` }
        ].map((f) => (
          <button key={f.v} onClick={() => setFilter(f.v as any)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition ${filter === f.v ? 'bg-brand-pink text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* SECTIONS PAR CATÉGORIE */}
      {CATEGORIES.map((cat) => {
        const stepsInCat = visibleSteps.filter((s) => s.category === cat.id);
        if (stepsInCat.length === 0) return null;
        return (
          <section key={cat.id}>
            <div className={`bg-gradient-to-r ${cat.color} border-l-4 ${cat.color.split(' ')[0]} rounded-r-xl px-4 py-3 mb-4`}>
              <h2 className="font-bold text-lg text-white">{cat.label}</h2>
              <p className="text-sm text-zinc-300">{cat.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stepsInCat.map((step) => {
                const Icon = step.icon;
                const configured = isConfigured(step);
                const opened = openStep === step.id;
                return (
                  <div key={step.id} className={`rounded-2xl border transition ${configured ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-zinc-800 bg-zinc-900 hover:border-brand-pink/40'}`}>
                    {/* Header card */}
                    <button onClick={() => setOpenStep(opened ? null : step.id)} className="w-full text-left p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${configured ? 'bg-emerald-500' : 'bg-zinc-800'}`}>
                          {configured ? <Check size={20} className="text-white" /> : <Icon size={20} className="text-brand-pink" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white truncate">{step.title}</h3>
                            {configured && <span className="text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">Actif</span>}
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-2">{step.why}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${COST_COLOR[step.cost]}`}>{COST_LABEL[step.cost]}</span>
                            <span className="text-[10px] text-zinc-500" title="Difficulté">{'⭐'.repeat(step.difficulty)}</span>
                            <span className="text-[10px] text-zinc-500">~{step.timeMinutes} min</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className={`text-zinc-500 shrink-0 transition ${opened ? 'rotate-90' : ''}`} />
                      </div>
                    </button>

                    {/* Drawer ouvert */}
                    {opened && (
                      <div className="border-t border-zinc-800 p-4 space-y-4 bg-zinc-950/50">
                        {/* External link */}
                        <a href={step.externalUrl} target="_blank" rel="noopener noreferrer"
                           className="inline-flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm">
                          <ExternalLink size={14} /> {step.externalLabel}
                        </a>

                        {/* Instructions */}
                        <div>
                          <h4 className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-2">Étapes</h4>
                          <ol className="space-y-2">
                            {step.steps.map((s, i) => (
                              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                                <span className="bg-brand-pink/20 text-brand-pink font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs">{i + 1}</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Fields */}
                        <div className="space-y-2">
                          {step.fields.map((f) => (
                            <label key={f.key} className="block">
                              <span className="text-xs text-zinc-400 font-bold">{f.label}</span>
                              {f.type === 'textarea' ? (
                                <textarea rows={3}
                                          value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                                          placeholder={f.placeholder}
                                          className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
                              ) : (
                                <input type={f.type === 'password' ? 'password' : 'text'}
                                       value={values[f.key] || ''} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                                       placeholder={f.placeholder}
                                       className="w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" />
                              )}
                              {f.help && <span className="block mt-1 text-[11px] text-zinc-500">{f.help}</span>}
                            </label>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2">
                          <button onClick={() => setOpenStep(null)} className="px-4 py-2 text-sm rounded-full bg-zinc-800 hover:bg-zinc-700 text-white">
                            Plus tard
                          </button>
                          <button onClick={() => save(step)} disabled={saving}
                                  className="px-5 py-2 text-sm rounded-full bg-brand-pink hover:bg-pink-600 text-white font-bold flex items-center gap-2 disabled:opacity-50">
                            {saving ? <Loader2 size={14} className="animate-spin" /> : (savedFlash ? <Check size={14} /> : <Save size={14} />)}
                            {savedFlash ? 'Sauvegardé !' : 'Activer'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ALL DONE */}
      {stats.configured === stats.total && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h3 className="text-xl font-bold text-white mb-2">Tout est configuré !</h3>
          <p className="text-zinc-300">Tu peux revenir ici à tout moment pour ajouter d'autres intégrations ou modifier les clés.</p>
        </div>
      )}
    </div>
  );
}
