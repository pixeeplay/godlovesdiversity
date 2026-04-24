'use client';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';

type Network = {
  v: string;
  name: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  cost: 'Gratuit' | 'Freemium' | 'Payant';
  time: string;
  keys: string[];
  doc: string;
  steps: string[];
};

const NETWORKS: Network[] = [
  {
    v: 'YOUTUBE',
    name: 'YouTube Shorts',
    difficulty: 'Facile',
    cost: 'Gratuit',
    time: '1 à 2 jours',
    keys: ['integrations.youtube.apiKey', 'integrations.youtube.channelId'],
    doc: 'https://developers.google.com/youtube/v3/getting-started',
    steps: [
      'Crée un projet sur https://console.cloud.google.com',
      'Active "YouTube Data API v3"',
      'Crée une clé API + un OAuth2 client ID',
      'Colle dans Paramètres → YouTube'
    ]
  },
  {
    v: 'TELEGRAM',
    name: 'Telegram (canal)',
    difficulty: 'Facile',
    cost: 'Gratuit',
    time: '10 minutes',
    keys: ['integrations.telegram.botToken', 'integrations.telegram.chatId'],
    doc: 'https://core.telegram.org/bots#how-do-i-create-a-bot',
    steps: [
      'Sur Telegram, écris à @BotFather → /newbot',
      'Note le token donné',
      'Ajoute ton bot comme admin de ton canal',
      'Récupère le chat_id (https://api.telegram.org/bot<TOKEN>/getUpdates)',
      'Colle dans Paramètres → Telegram'
    ]
  },
  {
    v: 'RESEND',
    name: 'Newsletter (Resend)',
    difficulty: 'Facile',
    cost: 'Freemium',
    time: '30 minutes',
    keys: ['integrations.resend.apiKey', 'integrations.resend.from'],
    doc: 'https://resend.com/docs/send-with-nodejs',
    steps: [
      'Crée un compte sur https://resend.com',
      'Vérifie ton domaine (DNS DKIM/SPF) — ~15 min',
      'Génère une clé API',
      'Colle dans Paramètres → Resend'
    ]
  },
  {
    v: 'X',
    name: 'X (ex-Twitter)',
    difficulty: 'Moyen',
    cost: 'Payant',
    time: '1 à 3 jours',
    keys: ['integrations.x.apiKey', 'integrations.x.apiSecret', 'integrations.x.accessToken', 'integrations.x.accessTokenSecret'],
    doc: 'https://developer.x.com/en/portal/dashboard',
    steps: [
      'Souscris X API Basic ($100/mois minimum)',
      'Crée une App dans le portal',
      'Génère API Keys + Access Tokens (Read & Write)',
      'Colle les 4 clés dans Paramètres → X'
    ]
  },
  {
    v: 'LINKEDIN',
    name: 'LinkedIn',
    difficulty: 'Moyen',
    cost: 'Gratuit',
    time: '1 à 2 semaines',
    keys: ['integrations.linkedin.clientId', 'integrations.linkedin.clientSecret'],
    doc: 'https://www.linkedin.com/developers/apps',
    steps: [
      'Crée une App sur https://www.linkedin.com/developers',
      'Demande l\'accès "Share on LinkedIn" (peut prendre quelques jours)',
      'Configure OAuth2 (callback URL)',
      'Colle Client ID + Secret dans Paramètres → LinkedIn'
    ]
  },
  {
    v: 'META',
    name: 'Instagram + Facebook',
    difficulty: 'Difficile',
    cost: 'Gratuit',
    time: '2 à 6 semaines (validation Meta)',
    keys: ['integrations.meta.appId', 'integrations.meta.appSecret', 'integrations.meta.pageAccessToken', 'integrations.meta.instagramBusinessId'],
    doc: 'https://developers.facebook.com/docs/instagram-api/getting-started',
    steps: [
      'Convertis ton compte Insta en compte Business',
      'Lie-le à une Page Facebook',
      'Crée une App Meta sur https://developers.facebook.com',
      'Demande les permissions instagram_content_publish + pages_manage_posts',
      'Soumets l\'app à validation Meta (peut prendre 4-6 semaines)',
      'Colle les tokens dans Paramètres → Meta'
    ]
  },
  {
    v: 'TIKTOK',
    name: 'TikTok',
    difficulty: 'Difficile',
    cost: 'Gratuit',
    time: '2 à 8 semaines (très restrictif)',
    keys: ['integrations.tiktok.clientKey', 'integrations.tiktok.clientSecret'],
    doc: 'https://developers.tiktok.com/doc/login-kit-web',
    steps: [
      'Crée un compte développeur sur https://developers.tiktok.com',
      'Crée une App + demande l\'API Content Posting',
      'Validation TikTok (très sélectif, surtout pour les associations)',
      'Configure OAuth2',
      'Colle dans Paramètres → TikTok'
    ]
  }
];

const COLORS: Record<string, { bg: string; text: string }> = {
  Facile: { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  Moyen: { bg: 'bg-amber-500/15', text: 'text-amber-300' },
  Difficile: { bg: 'bg-red-500/15', text: 'text-red-300' },
  Gratuit: { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
  Freemium: { bg: 'bg-blue-500/15', text: 'text-blue-300' },
  Payant: { bg: 'bg-amber-500/15', text: 'text-amber-300' }
};

export function ConnectionsPanel() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings').then((r) => r.json()).then((j) => {
      setSettings(j.settings || {});
      setLoading(false);
    });
  }, []);

  function isConnected(n: Network) {
    return n.keys.every((k) => !!settings[k]);
  }

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold mb-2">Connecte tes réseaux pour la publication automatique</h3>
        <p className="text-sm text-zinc-400">
          Aujourd'hui le Studio fonctionne en <strong className="text-white">semi-automatique</strong> :
          tu crées le post (IA + média), et le bouton <em className="text-brand-pink">« Partager »</em>
          {' '}t'amène sur le composer du réseau en 1 clic.
          Pour passer en <strong className="text-white">100% automatique</strong> (le post part tout seul à l'heure prévue),
          suis les étapes ci-dessous réseau par réseau.
        </p>
        <p className="mt-3 text-xs text-emerald-300">
          ✅ Recommandé pour commencer : <strong>Telegram + Newsletter Resend</strong> (gratuit, ~40 min total)
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center py-10"><Loader2 className="animate-spin inline" /> Chargement…</p>
      ) : (
        NETWORKS.map((n) => {
          const ok = isConnected(n);
          const isOpen = open === n.v;
          return (
            <div key={n.v} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : n.v)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-zinc-950 transition"
              >
                <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                     style={{ background: ok ? 'rgba(16,185,129,.2)' : 'rgba(63,63,70,.5)' }}>
                  {ok
                    ? <CheckCircle2 className="text-emerald-400" size={18} />
                    : <AlertCircle className="text-zinc-500" size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold uppercase tracking-wider text-sm">{n.name}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Pill bg={COLORS[n.difficulty].bg} text={COLORS[n.difficulty].text}>{n.difficulty}</Pill>
                    <Pill bg={COLORS[n.cost].bg} text={COLORS[n.cost].text}>{n.cost}</Pill>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{n.time}</span>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-400'}`}>
                  {ok ? 'CONNECTÉ' : 'À CONFIGURER'}
                </span>
              </button>
              {isOpen && (
                <div className="border-t border-zinc-800 p-4 space-y-3">
                  <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
                    {n.steps.map((step, i) => <li key={i}>{step}</li>)}
                  </ol>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <a href={n.doc} target="_blank" rel="noreferrer" className="btn-ghost text-xs">
                      <ExternalLink size={12} /> Documentation officielle
                    </a>
                    <a href="/admin/settings" className="btn-primary text-xs">
                      Aller dans Paramètres →
                    </a>
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-2">
                    Clés requises : <code>{n.keys.join(', ')}</code>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-2xl p-5 mt-6">
        <p className="text-sm">
          💡 <strong>À retenir</strong> : tu n'as pas besoin de tout connecter.
          Commence par <strong>Telegram</strong> (10 min, gratuit) et la <strong>Newsletter Resend</strong> (30 min).
          Les autres réseaux peuvent attendre que tu aies un compte Business validé.
        </p>
        <p className="text-xs text-zinc-400 mt-2">
          Le mode <em>semi-automatique</em> reste actif sur tous les réseaux non connectés — tu publies en 1 clic via le bouton « Partager ».
        </p>
      </div>
    </div>
  );
}

function Pill({ bg, text, children }: { bg: string; text: string; children: React.ReactNode }) {
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${bg} ${text}`}>{children}</span>;
}
