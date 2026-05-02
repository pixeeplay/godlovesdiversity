'use client';
import { useState } from 'react';
import {
  Truck, CheckCircle2, AlertCircle, ExternalLink, Loader2, Eye, EyeOff,
  ChevronDown, ChevronRight, Save, Zap
} from 'lucide-react';

type ProviderId = 'gelato' | 'tpop' | 'printful';

type Provider = {
  id: ProviderId;
  name: string;
  emoji: string;
  tagline: string;
  country: string;
  pricing: string;
  delivery: string;
  pros: string[];
  cons: string[];
  signupUrl: string;
  apiDocsUrl: string;
  apiKeyPath: string;          // Settings key name
  apiKeyPlaceholder: string;
  apiKeyHelpUrl: string;
  apiKeyHelp: string;
  extraField?: { key: string; label: string; placeholder: string; help: string; helpUrl: string };
  steps: string[];
  // Classes Tailwind STATIQUES (sinon non compilées)
  gradient: string;
  borderConnected: string;       // ex 'border-emerald-500/40'
  stepNum: string;               // ex 'bg-emerald-500/20 text-emerald-300'
  signupBtn: string;             // bouton signup complet
  productCountIconCls?: string;
};

const PROVIDERS: Provider[] = [
  {
    id: 'gelato',
    name: 'Gelato',
    emoji: '🌍',
    tagline: 'Réseau mondial — recommandé pour l\'Europe',
    country: 'Norvège · 130+ usines · 32 pays',
    pricing: 'Gratuit (paie à la commande)',
    delivery: '2-5 jours en EU · carbon-neutral',
    pros: [
      'Le plus rapide en Europe (production locale)',
      'Très large catalogue (textile, mug, poster, livre, packaging)',
      'Carbon-neutral par défaut',
      'Pas d\'abonnement, marges fines'
    ],
    cons: [
      'Interface en anglais',
      'Pas de mockup auto via API (à faire à la main)'
    ],
    signupUrl: 'https://www.gelato.com/sign-up',
    apiDocsUrl: 'https://dashboard.gelato.com/docs/',
    apiKeyPath: 'integrations.gelato.apiKey',
    apiKeyPlaceholder: 'gel_xxxxxxxxxxxxxxxxxxxx',
    apiKeyHelpUrl: 'https://dashboard.gelato.com/keys',
    apiKeyHelp: 'Dashboard → Developers → API Keys → Create new key',
    steps: [
      'Crée ton compte gratuit sur gelato.com',
      'Choisis tes produits dans le catalogue (T-shirt bio, mug, poster…)',
      'Crée tes designs avec leur outil ou importe nos visuels GLD',
      'Récupère le « Product UID » de chaque variant (ex: « apparel_product_unisex_t-shirt_size_l_color_white »)',
      'Génère ta clé API : Dashboard → Developers → API Keys',
      'Colle la clé ci-dessous, teste la connexion',
      'Dans chaque produit GLD : choisis « Gelato » + colle le Product UID + ton coût d\'achat'
    ],
    gradient: 'from-emerald-500 to-green-600',
    borderConnected: 'border-emerald-500/40',
    stepNum: 'bg-emerald-500/20 text-emerald-300',
    signupBtn: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
  },
  {
    id: 'tpop',
    name: 'TPOP',
    emoji: '🌱',
    tagline: 'Éthique français — aligné valeurs GLD',
    country: 'France · 100% bio/vegan/recyclé',
    pricing: 'Gratuit (paie à la commande)',
    delivery: '3-7 jours · packaging carton 100% recyclé',
    pros: [
      'Made in France/Pays-Bas',
      'Coton bio GOTS, encres écolo, packaging zéro plastique',
      'Aligné parfait avec le message GLD ❤️',
      'Pas d\'abonnement'
    ],
    cons: [
      'Catalogue plus restreint que Gelato',
      'API GraphQL (un poil plus technique)',
      'Marges légèrement plus fines'
    ],
    signupUrl: 'https://www.tpop.com/fr/inscription',
    apiDocsUrl: 'https://www.tpop.com/fr/api',
    apiKeyPath: 'integrations.tpop.apiKey',
    apiKeyPlaceholder: 'tpop_xxxxxxxxxxxxxxxxxxxx',
    apiKeyHelpUrl: 'https://www.tpop.com/fr/mon-compte/api',
    apiKeyHelp: 'Mon compte → Paramètres → API → Générer une clé',
    steps: [
      'Inscris-toi sur tpop.com (compte créateur)',
      'Choisis tes produits dans leur catalogue éthique',
      'Crée tes designs et publie tes produits dans ton compte TPOP',
      'Note l\'ID variant de chaque produit (visible dans l\'admin TPOP)',
      'Demande ta clé API : Mon compte → Paramètres → API',
      'Colle la clé ci-dessous, teste la connexion',
      'Dans chaque produit GLD : choisis « TPOP » + colle l\'ID variant + ton coût d\'achat'
    ],
    gradient: 'from-violet-500 to-purple-600',
    borderConnected: 'border-violet-500/40',
    stepNum: 'bg-violet-500/20 text-violet-300',
    signupBtn: 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/30'
  },
  {
    id: 'printful',
    name: 'Printful',
    emoji: '🇺🇸',
    tagline: 'Le standard mondial — fallback robuste',
    country: 'US · Entrepôts EU à Riga + Madrid',
    pricing: 'Gratuit (paie à la commande)',
    delivery: '3-6 jours en EU · solide partout',
    pros: [
      'Le + utilisé au monde, ultra-fiable',
      'Catalogue énorme (250+ produits)',
      'Mockups automatiques très propres',
      'Intégrations e-commerce natives'
    ],
    cons: [
      'Souvent plus cher que Gelato en EU',
      'Production parfois aux US (livraison + lente)',
      'Moins éthique que TPOP'
    ],
    signupUrl: 'https://www.printful.com/auth/register',
    apiDocsUrl: 'https://developers.printful.com/docs/',
    apiKeyPath: 'integrations.printful.apiKey',
    apiKeyPlaceholder: 'pf_xxxxxxxxxxxxxxxxxxxx',
    apiKeyHelpUrl: 'https://www.printful.com/dashboard/api',
    apiKeyHelp: 'Dashboard → Account → API → Create new token',
    extraField: {
      key: 'integrations.printful.storeId',
      label: 'Store ID (si plusieurs boutiques)',
      placeholder: '12345678',
      help: 'Dashboard → Stores → URL de ton store',
      helpUrl: 'https://www.printful.com/dashboard/store'
    },
    steps: [
      'Inscris-toi sur printful.com',
      'Crée une « store » (Manual Order Platform si tu n\'utilises pas Shopify/Etsy)',
      'Ajoute des produits, uploade tes designs',
      'Note le « sync_variant_id » de chaque variant',
      'Génère ton token : Account → API → Create new token',
      'Si plusieurs stores, note ton Store ID',
      'Colle le token ci-dessous, teste la connexion',
      'Dans chaque produit GLD : choisis « Printful » + sync_variant_id + ton coût d\'achat'
    ],
    gradient: 'from-blue-500 to-indigo-600',
    borderConnected: 'border-blue-500/40',
    stepNum: 'bg-blue-500/20 text-blue-300',
    signupBtn: 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30'
  }
];

type Props = {
  status: Record<ProviderId, boolean>;
  printfulStoreConfigured: boolean;
  productsByProvider: Record<ProviderId, number>;
};

export function DropshippingProviderCards({ status, printfulStoreConfigured, productsByProvider }: Props) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {PROVIDERS.map((p) => (
        <ProviderCard
          key={p.id}
          provider={p}
          configured={status[p.id]}
          productCount={productsByProvider[p.id]}
          extraConfigured={p.id === 'printful' ? printfulStoreConfigured : true}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  provider, configured, productCount, extraConfigured
}: {
  provider: Provider; configured: boolean; productCount: number; extraConfigured: boolean;
}) {
  const [showSteps, setShowSteps] = useState(!configured);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [extraValue, setExtraValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function save() {
    if (!apiKey.trim()) return;
    setSaving(true);
    setTestResult(null);
    try {
      // Sauve la clé via l'API Settings
      const updates: Record<string, string> = { [provider.apiKeyPath]: apiKey.trim() };
      if (provider.extraField && extraValue.trim()) {
        updates[provider.extraField.key] = extraValue.trim();
      }
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      // Test la connexion juste après
      await test();
      // Recharge pour rafraîchir le statut serveur
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Erreur sauvegarde' });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await fetch('/api/admin/dropshipping/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: provider.id })
      });
      const j = await r.json();
      setTestResult({ ok: !!j.ok, message: j.message || (j.ok ? 'OK' : 'Erreur') });
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message || 'Erreur réseau' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className={`bg-zinc-900 border-2 rounded-2xl overflow-hidden transition
      ${configured ? provider.borderConnected : 'border-zinc-800'}`}>
      {/* HEADER avec gradient */}
      <div className={`bg-gradient-to-br ${provider.gradient} p-5 text-white`}>
        <div className="flex items-start justify-between mb-2">
          <div className="text-4xl">{provider.emoji}</div>
          {configured ? (
            <span className="bg-white/20 backdrop-blur rounded-full px-2.5 py-1 text-[10px] font-bold uppercase flex items-center gap-1">
              <CheckCircle2 size={12} /> Connecté
            </span>
          ) : (
            <span className="bg-black/30 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase flex items-center gap-1">
              <AlertCircle size={12} /> Non configuré
            </span>
          )}
        </div>
        <h3 className="font-display font-bold text-2xl">{provider.name}</h3>
        <p className="text-sm opacity-90">{provider.tagline}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* INFOS RAPIDES */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <div className="text-zinc-500 uppercase">Origine</div>
            <div className="text-white font-semibold">{provider.country}</div>
          </div>
          <div>
            <div className="text-zinc-500 uppercase">Tarif</div>
            <div className="text-white font-semibold">{provider.pricing}</div>
          </div>
          <div className="col-span-2">
            <div className="text-zinc-500 uppercase">Livraison</div>
            <div className="text-white font-semibold">{provider.delivery}</div>
          </div>
        </div>

        {/* PROS / CONS */}
        <div className="space-y-2">
          {provider.pros.map((pro) => (
            <div key={pro} className="flex gap-2 text-xs">
              <span className="text-emerald-400 shrink-0">✓</span>
              <span className="text-zinc-300">{pro}</span>
            </div>
          ))}
          {provider.cons.map((con) => (
            <div key={con} className="flex gap-2 text-xs">
              <span className="text-amber-400 shrink-0">−</span>
              <span className="text-zinc-500">{con}</span>
            </div>
          ))}
        </div>

        {/* BOUTONS LIENS */}
        <div className="flex gap-2">
          <a href={provider.signupUrl} target="_blank" rel="noopener noreferrer"
            className={`flex-1 ${provider.signupBtn} px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1`}>
            S'inscrire <ExternalLink size={11} />
          </a>
          <a href={provider.apiDocsUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
            Doc API <ExternalLink size={11} />
          </a>
        </div>

        {/* STEP-BY-STEP */}
        <div>
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white py-1"
          >
            <span>📋 Guide pas à pas ({provider.steps.length} étapes)</span>
            {showSteps ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {showSteps && (
            <ol className="mt-2 space-y-1.5 pl-1">
              {provider.steps.map((step, i) => (
                <li key={i} className="flex gap-2 text-xs">
                  <span className={`${provider.stepNum} w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>
                    {i + 1}
                  </span>
                  <span className="text-zinc-400">{step}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* FORMULAIRE CLÉ API */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
          <label className="block">
            <div className="text-[11px] uppercase font-bold text-zinc-400 mb-1">Clé API</div>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={configured ? '••••••••••••' : provider.apiKeyPlaceholder}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 pr-10 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <a href={provider.apiKeyHelpUrl} target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-zinc-500 hover:text-brand-pink mt-1 flex items-center gap-1">
              {provider.apiKeyHelp} <ExternalLink size={9} />
            </a>
          </label>

          {provider.extraField && (
            <label className="block">
              <div className="text-[11px] uppercase font-bold text-zinc-400 mb-1">{provider.extraField.label}</div>
              <input
                type="text"
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
                placeholder={provider.extraField.placeholder}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono"
              />
              <a href={provider.extraField.helpUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-zinc-500 hover:text-brand-pink mt-1 flex items-center gap-1">
                {provider.extraField.help} <ExternalLink size={9} />
              </a>
            </label>
          )}

          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!apiKey.trim() || saving}
              className="flex-1 bg-brand-pink hover:bg-pink-600 disabled:bg-zinc-700 disabled:opacity-50 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {configured ? 'Mettre à jour' : 'Sauver & connecter'}
            </button>
            {configured && (
              <button
                onClick={test}
                disabled={testing}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                {testing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                Tester
              </button>
            )}
          </div>

          {testResult && (
            <div className={`rounded-lg p-2 text-xs flex items-start gap-2
              ${testResult.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
              {testResult.ok ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>

        {/* COMPTEUR PRODUITS */}
        {productCount > 0 && (
          <div className="text-center text-xs text-zinc-500 pt-1">
            <Truck size={12} className="inline mr-1 -mt-0.5" />
            <strong className="text-white">{productCount}</strong> produit{productCount > 1 ? 's' : ''} GLD utilise{productCount > 1 ? 'nt' : ''} ce fournisseur
          </div>
        )}
      </div>
    </div>
  );
}
