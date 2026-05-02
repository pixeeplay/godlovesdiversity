'use client';
import { useState } from 'react';
import {
  Save, Loader2, CheckCircle2, Eye, EyeOff,
  Sparkles, Mail, MapPin, Globe, KeyRound, ShieldAlert, HandHeart
} from 'lucide-react';

type Field = {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'password' | 'textarea';
  help?: string;
};

type Group = { title: string; icon: any; description: string; fields: Field[] };

const GROUPS: Group[] = [
  {
    title: 'Réglages du site',
    icon: Globe,
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
    icon: Sparkles,
    description: 'Génération de texte (Gemini) et d\'image (Imagen). Récupère ta clé sur https://aistudio.google.com/apikey',
    fields: [
      { key: 'integrations.gemini.apiKey', label: 'Clé API Gemini', type: 'password', placeholder: 'AIza…', help: 'Obligatoire pour le Studio IA' },
      { key: 'integrations.gemini.textModel', label: 'Modèle texte', placeholder: 'gemini-2.5-pro' },
      { key: 'integrations.gemini.imageModel', label: 'Modèle image', placeholder: 'imagen-3.0-generate-002' }
    ]
  },
  {
    title: 'Email — Resend',
    icon: Mail,
    description: 'Envoi des newsletters et notifications admin. Récupère ta clé sur https://resend.com/api-keys',
    fields: [
      { key: 'integrations.resend.apiKey', label: 'Clé API Resend', type: 'password', placeholder: 're_…' },
      { key: 'integrations.resend.from', label: 'Adresse expéditeur', placeholder: '"God Loves Diversity" <hello@godlovesdiversity.com>' },
      { key: 'integrations.admin.email', label: 'Email admin (notifications)', placeholder: 'arnaud@gredai.com' }
    ]
  },
  {
    title: 'Mapbox (carte mondiale)',
    icon: MapPin,
    description: 'Pour afficher la carte géolocalisée des contributions. Token gratuit sur https://account.mapbox.com/access-tokens/',
    fields: [
      { key: 'integrations.mapbox.token', label: 'Token public Mapbox', placeholder: 'pk.eyJ…' }
    ]
  },
  {
    title: 'Meta — Instagram & Facebook',
    icon: KeyRound,
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
    icon: KeyRound,
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
    icon: KeyRound,
    description: 'Publication sur LinkedIn. App à créer sur https://www.linkedin.com/developers/',
    fields: [
      { key: 'integrations.linkedin.clientId', label: 'Client ID' },
      { key: 'integrations.linkedin.clientSecret', label: 'Client Secret', type: 'password' }
    ]
  },
  {
    title: 'TikTok',
    icon: KeyRound,
    description: 'Publication sur TikTok. App à créer sur https://developers.tiktok.com/',
    fields: [
      { key: 'integrations.tiktok.clientKey', label: 'Client Key' },
      { key: 'integrations.tiktok.clientSecret', label: 'Client Secret', type: 'password' }
    ]
  },
  {
    title: 'Consentement upload de photos',
    icon: ShieldAlert,
    description: 'Texte affiché dans le modal de consentement avant l\'envoi d\'une photo. Doit décrire le droit à l\'image et l\'usage promotionnel.',
    fields: [
      { key: 'upload.consentText', label: 'Texte de consentement', type: 'textarea',
        placeholder: 'En envoyant cette photo, vous certifiez…',
        help: 'Apparaît dans la pop-up. Garde le ton humain et explicite. Si vide, un texte par défaut est utilisé.' }
    ]
  },
  {
    title: 'HelloAsso (don alternatif)',
    icon: HandHeart,
    description: 'Permet de recevoir des dons via HelloAsso (associatif, sans frais). Crée ta campagne sur https://www.helloasso.com puis colle l\'URL ici.',
    fields: [
      { key: 'donate.helloAssoUrl', label: 'URL de la cagnotte HelloAsso', placeholder: 'https://www.helloasso.com/associations/.../formulaires/1' }
    ]
  }
];

export function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

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

  return (
    <div className="space-y-8">
      {GROUPS.map((g) => {
        const I = g.icon;
        return (
          <section key={g.title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-1">
              <I size={18} className="text-brand-pink" />
              <h2 className="font-bold text-lg">{g.title}</h2>
            </div>
            <p className="text-zinc-500 text-sm mb-5">{g.description}</p>

            <div className="grid sm:grid-cols-2 gap-4">
              {g.fields.map((f) => {
                const isPw = f.type === 'password';
                const shown = reveal[f.key];
                return (
                  <label key={f.key} className="grid gap-1 text-sm">
                    <span className="text-zinc-400">{f.label}</span>
                    <div className="relative">
                      <input
                        type={isPw && !shown ? 'password' : 'text'}
                        value={values[f.key] || ''}
                        onChange={(e) => setVal(f.key, e.target.value)}
                        placeholder={f.placeholder}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 outline-none focus:border-brand-pink font-mono text-xs"
                      />
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

      <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-2xl p-4">
        {saved && (
          <span className="flex items-center gap-1 text-emerald-400 text-sm">
            <CheckCircle2 size={16} /> Enregistré
          </span>
        )}
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Enregistrer tous les paramètres
        </button>
      </div>
    </div>
  );
}
