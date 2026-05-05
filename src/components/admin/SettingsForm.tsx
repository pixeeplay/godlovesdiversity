'use client';
import { useState, useMemo } from 'react';
import {
  Save, Loader2, CheckCircle2, Eye, EyeOff, Search,
  Sparkles, Mail, MapPin, Globe, KeyRound, ShieldAlert, HandHeart,
  Truck, ShoppingCart, MessageSquare, Settings as SettingsIcon, type LucideIcon
} from 'lucide-react';

type Field = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'textarea';
  help?: string;
};

type Group = {
  title: string;
  icon: LucideIcon;
  description: string;
  fields: Field[];
  category: CategoryId;
};

type CategoryId =
  | 'site' | 'ai' | 'social' | 'payment' | 'logistics' | 'dropshipping' | 'legal';

type Category = {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
};

const CATEGORIES: Category[] = [
  { id: 'site',         label: 'Site & identité',     icon: Globe,         gradient: 'from-pink-500 to-rose-500',     description: 'Nom, slogan, contact, hashtag de campagne.' },
  { id: 'ai',           label: 'IA & Contenu',         icon: Sparkles,      gradient: 'from-violet-500 to-purple-600', description: 'Gemini, musique IA, audio d\'ambiance.' },
  { id: 'social',       label: 'Réseaux sociaux',      icon: MessageSquare, gradient: 'from-cyan-500 to-blue-500',     description: 'Meta (Insta/FB), X, LinkedIn, TikTok.' },
  { id: 'payment',      label: 'Paiement & dons',      icon: HandHeart,     gradient: 'from-emerald-500 to-teal-500',  description: 'Stripe, Square, HelloAsso.' },
  { id: 'logistics',    label: 'Logistique & contact', icon: Mail,          gradient: 'from-amber-500 to-orange-500',  description: 'Email, SMS, étiquettes, carte mondiale.' },
  { id: 'dropshipping', label: 'Dropshipping',         icon: Truck,         gradient: 'from-blue-500 to-indigo-600',   description: 'Gelato, TPOP, Printful (print-on-demand).' },
  { id: 'legal',        label: 'Légal & consentement', icon: ShieldAlert,   gradient: 'from-zinc-500 to-zinc-700',     description: 'Texte de consentement à l\'upload.' }
];

const GROUPS: Group[] = [
  {
    title: 'Réglages du site',
    icon: Globe, category: 'site',
    description: 'Identité publique, slogan, hashtag de campagne.',
    fields: [
      { key: 'site.title', label: 'Nom du site', placeholder: 'God Loves Diversity' },
      { key: 'site.tagline', label: 'Slogan', placeholder: 'Dieu est amour. La foi se conjugue au pluriel.' },
      { key: 'campaign.hashtag', label: 'Hashtag de campagne', placeholder: '#GodLovesDiversity' },
      { key: 'site.contactEmail', label: 'Email de contact public', placeholder: 'hello@godlovesdiversity.com' }
    ]
  },
  {
    title: 'Gemini IA',
    icon: Sparkles, category: 'ai',
    description: 'Génération de texte (Gemini) et d\'image (Imagen). Récupère ta clé sur https://aistudio.google.com/apikey',
    fields: [
      { key: 'integrations.gemini.apiKey', label: 'Clé API Gemini', type: 'password', placeholder: 'AIza…', help: 'Obligatoire pour le Studio IA' },
      { key: 'integrations.gemini.textModel', label: 'Modèle texte', placeholder: 'gemini-2.5-pro' },
      { key: 'integrations.gemini.imageModel', label: 'Modèle image', placeholder: 'imagen-3.0-generate-002' }
    ]
  },
  {
    title: 'ElevenLabs (musique IA)',
    icon: Sparkles, category: 'ai',
    description: 'Génération de musique d\'ambiance par IA (prière, méditation, cathédrale…). Récupère ta clé sur https://elevenlabs.io',
    fields: [
      { key: 'integrations.elevenlabs.apiKey', label: 'Clé API ElevenLabs', type: 'password', placeholder: 'sk_…' }
    ]
  },
  {
    title: 'HeyGen (avatar vidéo « GLD Live »)',
    icon: Sparkles, category: 'ai',
    description: 'Avatar humain qui répond aux visiteurs en vidéo, branché sur le RAG. Compte gratuit sur https://www.heygen.com puis Settings → API → Generate token. Configure ensuite l\'avatar et la voix dans IA & Outils → GLD Live.',
    fields: [
      { key: 'integrations.heygen.apiKey', label: 'Clé API HeyGen', type: 'password', placeholder: 'NjE…' }
    ]
  },
  {
    title: 'LiveAvatar (streaming temps-réel)',
    icon: Sparkles, category: 'ai',
    description: 'Avatar streaming temps-réel — successeur de HeyGen Interactive. Compte sur https://app.liveavatar.com/developers puis API Keys → Create Key. Configure ensuite l\'avatar dans IA & Outils → GLD Live.',
    fields: [
      { key: 'integrations.liveavatar.apiKey', label: 'Clé API LiveAvatar', type: 'password', placeholder: 'la-…' }
    ]
  },
  {
    title: '✨ Voix divine — Avatar audio',
    icon: Sparkles, category: 'ai',
    description: 'Paramètres de la voix « Voix de Dieu » du chat (DivineLightAvatar). Tous les réglages sont appliqués en live à la prochaine réponse vocale.',
    fields: [
      { key: 'avatar.voice.preset', label: 'Style de voix', type: 'select', options: [
          { value: 'god', label: '⚡ Dieu majestueux (grave + reverb cathédrale)' },
          { value: 'angel', label: '👼 Ange doux (claire + harmonique)' },
          { value: 'prophet', label: '📜 Prophète (sage + ralentie)' },
          { value: 'normal', label: '🗣 Voix normale (sans effet)' }
        ], help: 'Le preset configure rate/pitch/reverb. Tu peux ajuster finement ci-dessous.' },
      { key: 'avatar.voice.lang', label: 'Langue voix', placeholder: 'fr-FR', help: 'fr-FR / en-US / es-ES / pt-PT…' },
      { key: 'avatar.voice.voiceName', label: 'Voix précise (optionnel)', placeholder: 'Google français / Thomas / Amélie', help: 'Nom partiel d\'une voix dispo dans le navigateur. Vide = auto-sélection.' },
      { key: 'avatar.voice.rate', label: 'Vitesse (0.5–1.5)', placeholder: '0.75', help: '< 1 = plus lent, > 1 = plus rapide. Voix de Dieu : 0.7-0.85' },
      { key: 'avatar.voice.pitch', label: 'Hauteur (0.1–2)', placeholder: '0.6', help: '< 1 = grave (Dieu), > 1 = aigu (ange). Voix de Dieu : 0.5-0.7' },
      { key: 'avatar.voice.volume', label: 'Volume (0–1)', placeholder: '1', help: '1 = max' },
      { key: 'avatar.voice.reverb', label: 'Reverb cathédrale (0–100)', placeholder: '60', help: 'Effet écho cathédrale via Web Audio. 0 = sec, 100 = très long écho' },
      { key: 'avatar.voice.octaveShift', label: 'Octave (-12 à +12 demi-tons)', placeholder: '-3', help: 'Pitch shift via Web Audio. -12 = octave plus grave, +12 = octave plus aigu' }
    ]
  },
  {
    title: '🎬 Higgsfield (vidéo IA bannières)',
    icon: Sparkles, category: 'ai',
    description: 'Génération de vidéos IA cinématiques (5-10s) pour les bannières hero. Récupère tes 2 clés sur https://cloud.higgsfield.ai/api-keys (API Key ID + API Key Secret). Sans ces clés, le système fait un fallback automatique sur 4 images Imagen en carrousel.',
    fields: [
      { key: 'ai.higgsfieldKeyId', label: 'API Key ID', type: 'password', placeholder: 'hf_id_…', help: 'Identifiant de la clé Higgsfield' },
      { key: 'ai.higgsfieldSecret', label: 'API Key Secret', type: 'password', placeholder: 'hf_sec_…', help: 'Secret associé — les deux sont nécessaires' }
    ]
  },
  {
    title: 'Audio d\'ambiance',
    icon: Sparkles, category: 'ai',
    description: 'Liste JSON des morceaux disponibles dans le lecteur ambiant en bas-gauche du site. Format : [{"url":"...","title":"..."}]',
    fields: [
      { key: 'audio.tracks', label: 'Tracks (JSON)', type: 'textarea', placeholder: '[{"url":"https://...","title":"Prière"}]', help: 'Vide = lecteur masqué. Génère via Studio IA → Musique IA' }
    ]
  },
  {
    title: 'Email — Resend',
    icon: Mail, category: 'logistics',
    description: 'Envoi des newsletters et notifications admin. Récupère ta clé sur https://resend.com/api-keys',
    fields: [
      { key: 'integrations.resend.apiKey', label: 'Clé API Resend', type: 'password', placeholder: 're_…' },
      { key: 'integrations.resend.from', label: 'Adresse expéditeur', placeholder: '"God Loves Diversity" <hello@godlovesdiversity.com>' },
      { key: 'integrations.admin.email', label: 'Email admin (notifications)', placeholder: 'arnaud@gredai.com' }
    ]
  },
  {
    title: 'Telegram (notifications + bot)',
    icon: Mail, category: 'logistics',
    description: 'Bot Telegram pour recevoir notifications + commandes /stats /photos /agenda. Crée ton bot via @BotFather sur Telegram (/newbot), puis configure ici. Détails complets dans IA & Outils → Bot Telegram.',
    fields: [
      { key: 'integrations.telegram.botToken', label: 'Token bot (BotFather)', type: 'password', placeholder: '12345:ABCdef…', help: '/newbot avec @BotFather puis copie le token donné' },
      { key: 'integrations.telegram.chatId', label: 'Chat ID privé (toi avec le bot)', placeholder: '123456789', help: 'Tape /whoami au bot pour le voir' },
      { key: 'integrations.telegram.groupChatId', label: 'Chat ID groupe (notifications partagées)', placeholder: '-100123456789', help: 'Si rempli, prioritaire sur le chat privé pour les broadcasts' },
      { key: 'integrations.telegram.allowedUserIds', label: 'Whitelist user_ids', placeholder: '123456789, 987654321', help: 'Séparés par virgule. Vide = tout le monde autorisé.' }
    ]
  },
  {
    title: 'Mapbox (carte mondiale)',
    icon: MapPin, category: 'logistics',
    description: 'Pour afficher la carte géolocalisée des contributions. Token gratuit sur https://account.mapbox.com/access-tokens/',
    fields: [
      { key: 'integrations.mapbox.token', label: 'Token public Mapbox', placeholder: 'pk.eyJ…' }
    ]
  },
  {
    title: 'Twilio (SMS notifications)',
    icon: Mail, category: 'logistics',
    description: 'Envoi SMS au client lors de l\'expédition. Crée un compte sur https://www.twilio.com (essai gratuit avec crédit).',
    fields: [
      { key: 'integrations.twilio.accountSid', label: 'Account SID', type: 'password', placeholder: 'ACxxxx…' },
      { key: 'integrations.twilio.authToken', label: 'Auth Token', type: 'password', placeholder: 'xxxx' },
      { key: 'integrations.twilio.fromNumber', label: 'Numéro expéditeur', placeholder: '+33756123456' }
    ]
  },
  {
    title: 'Sendcloud (étiquettes Colissimo / Mondial Relay / Chronopost)',
    icon: Truck, category: 'logistics',
    description: 'Génération automatique des vraies étiquettes prépayées + tracking number officiel. Sendcloud = agrégateur français multi-transporteurs (gratuit jusqu\'à 100 colis/mois). Compte sur https://app.sendcloud.com puis Settings → API → générer une clé.',
    fields: [
      { key: 'integrations.sendcloud.publicKey', label: 'Clé publique Sendcloud', type: 'password', placeholder: 'xxxx-xxxx' },
      { key: 'integrations.sendcloud.secretKey', label: 'Clé secrète Sendcloud', type: 'password', placeholder: 'xxxx' },
      { key: 'integrations.sendcloud.senderAddressId', label: 'ID adresse expéditeur', placeholder: 'ex: 12345', help: 'L\'ID numérique de ton adresse expéditeur dans Sendcloud' }
    ]
  },
  {
    title: 'Meta — Instagram & Facebook',
    icon: KeyRound, category: 'social',
    description: 'Publication automatique sur Instagram + Facebook Pages. Crée une App sur https://developers.facebook.com',
    fields: [
      { key: 'integrations.meta.appId', label: 'App ID', placeholder: '1234567890' },
      { key: 'integrations.meta.appSecret', label: 'App Secret', type: 'password' },
      { key: 'integrations.meta.pageAccessToken', label: 'Page Access Token', type: 'password' },
      { key: 'integrations.meta.instagramBusinessId', label: 'Instagram Business ID' }
    ]
  },
  {
    title: 'X / Twitter',
    icon: KeyRound, category: 'social',
    description: 'Publication sur X. Compte développeur requis sur https://developer.x.com',
    fields: [
      { key: 'integrations.x.apiKey', label: 'API Key', type: 'password' },
      { key: 'integrations.x.apiSecret', label: 'API Secret', type: 'password' },
      { key: 'integrations.x.accessToken', label: 'Access Token', type: 'password' },
      { key: 'integrations.x.accessTokenSecret', label: 'Access Token Secret', type: 'password' }
    ]
  },
  {
    title: 'LinkedIn',
    icon: KeyRound, category: 'social',
    description: 'Publication sur LinkedIn. App à créer sur https://www.linkedin.com/developers/',
    fields: [
      { key: 'integrations.linkedin.clientId', label: 'Client ID' },
      { key: 'integrations.linkedin.clientSecret', label: 'Client Secret', type: 'password' }
    ]
  },
  {
    title: 'TikTok',
    icon: KeyRound, category: 'social',
    description: 'Publication sur TikTok. App à créer sur https://developers.tiktok.com/',
    fields: [
      { key: 'integrations.tiktok.clientKey', label: 'Client Key' },
      { key: 'integrations.tiktok.clientSecret', label: 'Client Secret', type: 'password' }
    ]
  },
  {
    title: 'HelloAsso (don alternatif)',
    icon: HandHeart, category: 'payment',
    description: 'Permet de recevoir des dons via HelloAsso (associatif, sans frais). Crée ta campagne sur https://www.helloasso.com puis colle l\'URL ici.',
    fields: [
      { key: 'donate.helloAssoUrl', label: 'URL de la cagnotte HelloAsso', placeholder: 'https://www.helloasso.com/associations/.../formulaires/1' }
    ]
  },
  {
    title: 'Stripe (boutique CB)',
    icon: ShoppingCart, category: 'payment',
    description: 'Paiement par carte sur la boutique. Récupère tes clés sur https://dashboard.stripe.com/apikeys',
    fields: [
      { key: 'integrations.stripe.secretKey', label: 'Clé secrète Stripe', type: 'password', placeholder: 'sk_live_…' },
      { key: 'integrations.stripe.publicKey', label: 'Clé publique Stripe', placeholder: 'pk_live_…' },
      { key: 'integrations.stripe.webhookSecret', label: 'Webhook signing secret', type: 'password', placeholder: 'whsec_…', help: 'Stripe Dashboard → Developers → Webhooks → Add endpoint /api/webhooks/stripe → Copy signing secret' }
    ]
  },
  {
    title: 'Square (boutique Apple Pay)',
    icon: ShoppingCart, category: 'payment',
    description: 'Paiement Apple Pay/CB pour la boutique. Crée une App sur https://developer.squareup.com',
    fields: [
      { key: 'integrations.square.accessToken', label: 'Access Token', type: 'password', placeholder: 'EAAA…' },
      { key: 'integrations.square.locationId', label: 'Location ID', placeholder: 'L1234ABCDE' },
      { key: 'integrations.square.environment', label: 'Environnement', placeholder: 'sandbox ou production', help: 'sandbox = test, production = vrai' }
    ]
  },
  {
    title: '🌍 Gelato',
    icon: Truck, category: 'dropshipping',
    description: 'Print-on-Demand Europe : t-shirts, mugs, posters, tote bags. 130+ centres de production en Europe (le + rapide). Récupère ta clé sur https://dashboard.gelato.com/keys',
    fields: [
      { key: 'integrations.gelato.apiKey', label: 'API Key Gelato', type: 'password', placeholder: 'gel_…' }
    ]
  },
  {
    title: '🌱 TPOP',
    icon: Truck, category: 'dropshipping',
    description: 'Print-on-Demand français éthique : 100% bio, vegan, packaging recyclé — production France/Pays-Bas. Idéal positionnement éthique GLD. Compte sur https://www.tpop.com',
    fields: [
      { key: 'integrations.tpop.apiKey', label: 'API Key TPOP', type: 'password', placeholder: 'tpop_…' }
    ]
  },
  {
    title: '👕 Printful',
    icon: Truck, category: 'dropshipping',
    description: 'Print-on-Demand le + connu, catalogue 250+ produits, entrepôts EU à Riga & Madrid. Récupère ta clé sur https://www.printful.com/dashboard/develop',
    fields: [
      { key: 'integrations.printful.apiKey', label: 'API Key Printful', type: 'password', placeholder: 'pf_…' },
      { key: 'integrations.printful.storeId', label: 'Store ID (optionnel)', placeholder: '12345' }
    ]
  },
  {
    title: 'Consentement upload de photos',
    icon: ShieldAlert, category: 'legal',
    description: 'Texte affiché dans le modal de consentement avant l\'envoi d\'une photo. Doit décrire le droit à l\'image et l\'usage promotionnel.',
    fields: [
      { key: 'upload.consentText', label: 'Texte de consentement', type: 'textarea',
        placeholder: 'En envoyant cette photo, vous certifiez…',
        help: 'Apparaît dans la pop-up. Garde le ton humain et explicite. Si vide, un texte par défaut est utilisé.' }
    ]
  }
];

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('site');
  const [search, setSearch] = useState('');

  function setVal(k: string, v: string) {
    setValues((s) => ({ ...s, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setBusy(true); setSaved(false);
    const r = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values)
    });
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  // Compte les clés configurées par catégorie
  const stats = useMemo(() => {
    const out: Record<CategoryId, { configured: number; total: number }> = {} as any;
    for (const cat of CATEGORIES) {
      let configured = 0; let total = 0;
      for (const g of GROUPS) {
        if (g.category !== cat.id) continue;
        for (const f of g.fields) {
          total++;
          if ((values[f.key] || '').trim().length > 0) configured++;
        }
      }
      out[cat.id] = { configured, total };
    }
    return out;
  }, [values]);

  // Filtre global par recherche
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    let groups = search
      ? GROUPS.filter((g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.fields.some((f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q)))
      : GROUPS.filter((g) => g.category === activeCategory);
    return groups;
  }, [search, activeCategory]);

  const activeCat = CATEGORIES.find((c) => c.id === activeCategory)!;
  const ActiveIcon = activeCat.icon;

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-6">
      {/* SIDEBAR CATÉGORIES */}
      <aside className="space-y-1 lg:sticky lg:top-4 lg:self-start">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un réglage…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-brand-pink"
          />
        </div>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = !search && cat.id === activeCategory;
          const st = stats[cat.id];
          const allDone = st.total > 0 && st.configured === st.total;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition
                ${isActive
                  ? 'bg-brand-pink/15 text-white border border-brand-pink/30'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white border border-transparent'}`}
            >
              <div className={`bg-gradient-to-br ${cat.gradient} rounded-lg p-1.5 shrink-0`}>
                <Icon size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{cat.label}</div>
                <div className="text-[10px] text-zinc-500">
                  {st.configured}/{st.total} configuré{st.configured > 1 ? 's' : ''}
                </div>
              </div>
              {allDone && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
            </button>
          );
        })}
      </aside>

      {/* CONTENU */}
      <div className="space-y-5 min-w-0">
        {/* HEADER catégorie */}
        {!search && (
          <div className={`bg-gradient-to-br ${activeCat.gradient} rounded-2xl p-5 text-white shadow-lg`}>
            <div className="flex items-center gap-3 mb-1">
              <ActiveIcon size={22} />
              <h2 className="font-display font-bold text-2xl">{activeCat.label}</h2>
            </div>
            <p className="text-sm opacity-90">{activeCat.description}</p>
            <div className="text-xs opacity-80 mt-2">
              {stats[activeCategory].configured} clé(s) configurée(s) sur {stats[activeCategory].total}
            </div>
          </div>
        )}
        {search && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-sm text-zinc-300">
              <strong>{filteredGroups.length}</strong> résultat(s) pour « <strong>{search}</strong> »
              {' · '}<button onClick={() => setSearch('')} className="text-brand-pink hover:underline">Effacer</button>
            </p>
          </div>
        )}

        {filteredGroups.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            Aucun réglage pour cette recherche.
          </div>
        )}

        {filteredGroups.map((g) => {
          const I = g.icon;
          const groupConfigured = g.fields.filter((f) => (values[f.key] || '').trim().length > 0).length;
          return (
            <section key={g.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <I size={18} className="text-brand-pink" />
                  <h3 className="font-bold text-base">{g.title}</h3>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full
                  ${groupConfigured === g.fields.length
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : groupConfigured > 0
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-zinc-800 text-zinc-500'}`}>
                  {groupConfigured}/{g.fields.length}
                </span>
              </div>
              <p className="text-zinc-500 text-sm mb-5">{g.description}</p>

              <div className="grid sm:grid-cols-2 gap-4">
                {g.fields.map((f) => {
                  const isPw = f.type === 'password';
                  const isTextarea = f.type === 'textarea';
                  const shown = reveal[f.key];
                  const hasValue = (values[f.key] || '').trim().length > 0;
                  const isSelect = f.type === 'select';
                  return (
                    <label key={f.key} className={`grid gap-1 text-sm ${isTextarea ? 'sm:col-span-2' : ''}`}>
                      <span className="flex items-center gap-2 text-zinc-400">
                        {f.label}
                        {hasValue && <CheckCircle2 size={11} className="text-emerald-400" />}
                      </span>
                      <div className="relative">
                        {isTextarea ? (
                          <textarea
                            value={values[f.key] || ''}
                            onChange={(e) => setVal(f.key, e.target.value)}
                            placeholder={f.placeholder}
                            rows={5}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink font-mono text-xs"
                          />
                        ) : isSelect ? (
                          <select
                            value={values[f.key] || ''}
                            onChange={(e) => setVal(f.key, e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink text-xs"
                          >
                            <option value="">— Choisir —</option>
                            {(f.options || []).map((o: any) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={isPw && !shown ? 'password' : 'text'}
                            value={values[f.key] || ''}
                            onChange={(e) => setVal(f.key, e.target.value)}
                            placeholder={f.placeholder}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 outline-none focus:border-brand-pink font-mono text-xs"
                          />
                        )}
                        {isPw && (
                          <button
                            type="button"
                            onClick={() => setReveal((s) => ({ ...s, [f.key]: !shown }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                            aria-label={shown ? 'Masquer' : 'Afficher'}
                          >
                            {shown ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                      {f.help && <span className="text-xs text-zinc-500">{f.help}</span>}
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* SAVE BAR sticky */}
        <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-zinc-950/90 backdrop-blur border border-zinc-800 rounded-2xl p-4 shadow-2xl">
          {saved && (
            <span className="flex items-center gap-1 text-emerald-400 text-sm">
              <CheckCircle2 size={16} /> Enregistré
            </span>
          )}
          <button
            onClick={save}
            disabled={busy}
            className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2"
          >
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Enregistrer tous les paramètres
          </button>
        </div>
      </div>
    </div>
  );
}
