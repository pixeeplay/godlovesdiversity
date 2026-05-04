'use client';
import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronRight, Wifi, FileText, AlertCircle } from 'lucide-react';

type IntegrationLevel = 'rest-api' | 'xml-csv-api' | 'xml-csv-only';

type Supplier = {
  name: string;
  emoji: string;
  country: string;
  tagline: string;
  integration: IntegrationLevel;
  integrationLabel: string;
  endpoints?: string[];       // endpoints clés si REST/API
  feedType?: string;          // ex: 'XML pull', 'CSV'
  apiNote?: string;           // note sur l'API
  docsUrl?: string;
  signupUrl?: string;
  pros: string[];
  cons: string[];
  gradient: string;
  border: string;
  badge: string;
};

const SUPPLIERS: Supplier[] = [
  {
    name: 'BigBuy',
    emoji: '🏪',
    country: 'Espagne · EU',
    tagline: 'API REST complète — compatible JS/Node',
    integration: 'rest-api',
    integrationLabel: 'REST API JSON',
    endpoints: [
      '/rest/catalog/products.json',
      '/rest/catalog/productinformation/{id}.json',
      '/rest/order/create.json',
      '/rest/shipping/carriers.json',
    ],
    apiNote: 'Sandbox dispo — authentification par clé API Bearer token. Réponses JSON paginées.',
    docsUrl: 'https://api.bigbuy.eu/doc',
    signupUrl: 'https://www.bigbuy.eu/fr/',
    pros: [
      'Catalogue > 300 000 produits',
      'API REST en JSON avec sandbox',
      'Gestion des stocks en temps réel',
      'Livraison EU rapide depuis Espagne',
    ],
    cons: [
      'Abonnement mensuel requis (≈ 69€/mois)',
      'Stock partagé — ruptures fréquentes',
      'Délais livraison variables hors EU',
    ],
    gradient: 'from-orange-500 to-amber-600',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-300',
  },
  {
    name: 'EDC Wholesale',
    emoji: '🇳🇱',
    country: 'Pays-Bas · EU',
    tagline: 'XML/CSV feeds + API push commande',
    integration: 'xml-csv-api',
    integrationLabel: 'XML/CSV + API commande',
    feedType: 'XML ou CSV (pull quotidien recommandé)',
    apiNote: 'Feed produit en XML ou CSV à parser côté backend. Push de commande via API dédiée.',
    docsUrl: 'https://www.edc.nl/en/dropshipping/',
    signupUrl: 'https://www.edc.nl/en/become-a-reseller/',
    pros: [
      'Spécialiste lifestyle & adult EU',
      'Dropship gratuit pour revendeurs agréés',
      'Feed mis à jour quotidiennement',
      'Commande auto via API push',
    ],
    cons: [
      'Pas de REST API catalogue native',
      'Feed XML/CSV à parser manuellement',
      'Approbation compte requise',
    ],
    gradient: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300',
  },
  {
    name: 'Eropartner',
    emoji: '🌐',
    country: 'Pays-Bas · EU',
    tagline: 'XML feed pull — dropship gratuit',
    integration: 'xml-csv-only',
    integrationLabel: 'XML feed pull',
    feedType: 'XML pull (lien dédié par compte)',
    apiNote: 'Feed XML à télécharger depuis un lien dédié à ton compte. Parsing côté backend requis.',
    docsUrl: 'https://www.eropartner.com/dropshipping/',
    signupUrl: 'https://www.eropartner.com/resellers/',
    pros: [
      'Dropship 100% gratuit',
      'Large catalogue lifestyle EU',
      'Feed XML structuré et fiable',
      'Pas de minimum de commande',
    ],
    cons: [
      'Uniquement XML (pas d\'API REST)',
      'Commandes manuelles ou email/EDI',
      'Données à synchroniser régulièrement',
    ],
    gradient: 'from-purple-500 to-fuchsia-600',
    border: 'border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300',
  },
];

const CSV_XML_ONLY = [
  { name: 'Intixo',      note: 'Feed CSV, pas de REST API publique' },
  { name: 'BusyX-Pro',  note: 'XML/CSV à parser côté backend' },
  { name: 'DropiXX',    note: 'CSV uniquement, pas d\'API REST' },
  { name: 'Dbh',        note: 'XML/CSV, intégration manuelle' },
  { name: 'Banana VPC', note: 'CSV/XML, pas de REST API publique' },
];

function integrationIcon(level: IntegrationLevel) {
  if (level === 'rest-api')     return <Wifi size={12} className="text-emerald-400" />;
  if (level === 'xml-csv-api')  return <Wifi size={12} className="text-amber-400" />;
  return <FileText size={12} className="text-zinc-400" />;
}

function SupplierCard({ s }: { s: Supplier }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`bg-zinc-900 border rounded-2xl overflow-hidden ${s.border}`}>
      {/* Header */}
      <div className={`bg-gradient-to-br ${s.gradient} p-4 text-white`}>
        <div className="flex items-start justify-between mb-1">
          <span className="text-3xl">{s.emoji}</span>
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1 bg-white/20 backdrop-blur`}>
            {integrationIcon(s.integration)}
            {s.integrationLabel}
          </span>
        </div>
        <h3 className="font-bold text-xl leading-tight">{s.name}</h3>
        <p className="text-xs opacity-90 mt-0.5">{s.tagline}</p>
        <p className="text-[10px] opacity-70 mt-0.5">{s.country}</p>
      </div>

      <div className="p-4 space-y-3">
        {/* API / Feed info */}
        {(s.endpoints || s.feedType) && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
            {s.endpoints && (
              <>
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1.5">Endpoints principaux</div>
                <ul className="space-y-1">
                  {s.endpoints.map((e) => (
                    <li key={e} className="font-mono text-[10px] text-emerald-300 bg-zinc-900 px-2 py-1 rounded">
                      {e}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {s.feedType && (
              <div className="mt-2">
                <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Type de feed</div>
                <span className="font-mono text-[10px] text-amber-300">{s.feedType}</span>
              </div>
            )}
            {s.apiNote && (
              <p className="text-[10px] text-zinc-500 mt-2">{s.apiNote}</p>
            )}
          </div>
        )}

        {/* Pros / Cons toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between text-xs font-bold text-zinc-300 hover:text-white"
        >
          <span>Avantages / Limites</span>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        {open && (
          <div className="space-y-1.5">
            {s.pros.map((p) => (
              <div key={p} className="flex gap-2 text-xs">
                <span className="text-emerald-400 shrink-0">✓</span>
                <span className="text-zinc-300">{p}</span>
              </div>
            ))}
            {s.cons.map((c) => (
              <div key={c} className="flex gap-2 text-xs">
                <span className="text-amber-400 shrink-0">−</span>
                <span className="text-zinc-500">{c}</span>
              </div>
            ))}
          </div>
        )}

        {/* Liens */}
        <div className="flex gap-2 pt-1">
          {s.signupUrl && (
            <a href={s.signupUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
              Devenir revendeur <ExternalLink size={10} />
            </a>
          )}
          {s.docsUrl && (
            <a href={s.docsUrl} target="_blank" rel="noopener noreferrer"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
              Documentation <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function DropshippingWholesaleInfo() {
  return (
    <section className="space-y-5">
      {/* Titre section */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-zinc-800" />
        <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">
          Fournisseurs catalogue / Wholesale
        </h2>
        <div className="h-px flex-1 bg-zinc-800" />
      </div>

      {/* Légende intégration */}
      <div className="flex flex-wrap gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 text-zinc-400">
          <Wifi size={11} className="text-emerald-400" /> REST API JSON
        </span>
        <span className="flex items-center gap-1.5 text-zinc-400">
          <Wifi size={11} className="text-amber-400" /> XML/CSV + API commande
        </span>
        <span className="flex items-center gap-1.5 text-zinc-400">
          <FileText size={11} className="text-zinc-400" /> XML/CSV uniquement
        </span>
      </div>

      {/* Cards BigBuy, EDC, Eropartner */}
      <div className="grid lg:grid-cols-3 gap-4">
        {SUPPLIERS.map((s) => <SupplierCard key={s.name} s={s} />)}
      </div>

      {/* Tableau CSV/XML only */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={15} className="text-amber-400 shrink-0" />
          <h3 className="text-sm font-bold text-zinc-300">
            Fournisseurs CSV/XML — pas de REST API publique
          </h3>
        </div>
        <p className="text-xs text-zinc-500 mb-4">
          Ces fournisseurs ne proposent pas d'API REST. L'intégration se fait côté backend en parsant leurs feeds CSV/XML (import manuel ou cron job).
        </p>
        <div className="divide-y divide-zinc-800">
          {CSV_XML_ONLY.map((s) => (
            <div key={s.name} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-bold text-white">{s.name}</span>
              <span className="text-xs text-zinc-500 flex items-center gap-1.5">
                <FileText size={10} />
                {s.note}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-200/80">
          💡 <strong>Stratégie recommandée :</strong> mettre en place un cron job qui télécharge et parse les feeds toutes les 24h, puis importe les produits/stocks dans ta base Prisma. La transmission de commande se fait par email ou EDI selon le fournisseur.
        </div>
      </div>
    </section>
  );
}
