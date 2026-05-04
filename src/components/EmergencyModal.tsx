'use client';
import { useEffect, useState } from 'react';
import {
  X, Phone, ExternalLink, MapPin, ShieldAlert, Loader2, Globe, Heart,
  Wind, Anchor, Users, MessageSquare, BookOpen, Sparkles, AlertTriangle,
  PhoneCall, Send, Check
} from 'lucide-react';

type Helpline = {
  name: string; phone?: string; whatsapp?: string; url?: string; email?: string;
  description: string; hours?: string; language?: string;
};

type CountryHelp = {
  countryCode: string; countryName: string;
  riskLevel: 'safe' | 'caution' | 'danger' | 'extreme';
  helplines: Helpline[];
};

type ApiResponse = {
  detectedCountry: string | null;
  help: CountryHelp | null;
  global: Helpline[];
  fallbackMessage: string | null;
};

type Tab = 'help' | 'whatif' | 'breathe' | 'peers' | 'safe';

export function EmergencyModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('help');
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualCountry, setManualCountry] = useState('');

  useEffect(() => { void load(); }, []);

  async function load(country?: string) {
    setLoading(true);
    try {
      const url = country ? `/api/emergency?country=${country}` : '/api/emergency';
      const r = await fetch(url);
      const j = await r.json();
      setData(j);
    } finally { setLoading(false); }
  }

  async function detectViaGPS() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const j = await r.json();
        const code = (j.address?.country_code || '').toUpperCase();
        if (code) await load(code);
        else setLoading(false);
      } catch { setLoading(false); }
    }, () => setLoading(false), { timeout: 8000 });
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur flex items-stretch sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-zinc-950 sm:border-2 border-red-500/40 sm:rounded-2xl max-w-3xl w-full sm:my-8 shadow-[0_0_60px_rgba(239,68,68,0.4)] flex flex-col max-h-screen sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 via-rose-500 to-pink-600 p-4 sm:rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={32} className="text-white animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold text-white">SOS — Tu n'es pas seul·e</h2>
              <p className="text-xs text-white/90 mt-0.5">Aides immédiates · Conseils · Communauté</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-2"><X size={26} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 overflow-x-auto bg-zinc-900/50 sticky top-0 z-10">
          <TabBtn label="Contacts" Icon={PhoneCall} active={tab === 'help'}    onClick={() => setTab('help')} />
          <TabBtn label="Que faire si"  Icon={BookOpen}  active={tab === 'whatif'}  onClick={() => setTab('whatif')} />
          <TabBtn label="Respire"   Icon={Wind}      active={tab === 'breathe'} onClick={() => setTab('breathe')} />
          <TabBtn label="Pairs"     Icon={Users}     active={tab === 'peers'}   onClick={() => setTab('peers')} />
          <TabBtn label="Refuges"   Icon={MapPin}    active={tab === 'safe'}    onClick={() => setTab('safe')} />
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {tab === 'help'    && <HelpTab data={data} loading={loading} manualCountry={manualCountry} setManualCountry={setManualCountry} onDetect={detectViaGPS} onLoad={load} />}
          {tab === 'whatif'  && <WhatIfTab />}
          {tab === 'breathe' && <BreatheTab />}
          {tab === 'peers'   && <PeersTab country={data?.detectedCountry || null} />}
          {tab === 'safe'    && <SafePlacesTab country={data?.detectedCountry || null} />}
        </div>

        {/* Footer urgence */}
        <div className="border-t border-zinc-800 p-3 bg-zinc-900/50 sm:rounded-b-2xl">
          <div className="text-[10px] text-zinc-400 text-center">
            ⚠ En danger immédiat ? <a href="tel:112" className="text-red-400 font-bold underline">📞 112 (UE)</a> · <a href="tel:911" className="text-red-400 font-bold underline">911 (US)</a> · <a href="tel:190" className="text-red-400 font-bold underline">190 (BR)</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ label, Icon, active, onClick }: { label: string; Icon: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[80px] py-3 px-2 text-[12px] font-bold flex flex-col items-center gap-1 transition border-b-2 ${
        active
          ? 'border-red-500 text-white bg-red-500/15 shadow-inner'
          : 'border-transparent text-zinc-200 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon size={18} className={active ? 'text-red-400' : 'text-zinc-300'} />
      <span>{label}</span>
    </button>
  );
}

/* ============= TAB : CONTACTS ============= */

function HelpTab({ data, loading, manualCountry, setManualCountry, onDetect, onLoad }: any) {
  const country = data?.help;
  const riskColor = country?.riskLevel === 'extreme' ? 'red' : country?.riskLevel === 'danger' ? 'red' : country?.riskLevel === 'caution' ? 'amber' : 'emerald';

  if (loading) return (
    <div className="text-center py-10">
      <Loader2 size={28} className="text-red-400 animate-spin mx-auto mb-3" />
      <p className="text-sm text-zinc-400">Localisation des aides…</p>
    </div>
  );

  // Quick-Dial : numéros d'urgence universels (toujours visibles)
  const QUICK_DIAL_INTL = [
    { phone: '112',           label: 'EU 27',         color: 'bg-blue-700',     emoji: '🇪🇺', sub: 'Europe' },
    { phone: '911',           label: 'US/CA',         color: 'bg-red-700',      emoji: '🇺🇸', sub: 'Amérique du N.' },
    { phone: '999',           label: 'UK/IE/HK',      color: 'bg-indigo-700',   emoji: '🇬🇧', sub: 'Royaume-Uni' },
    { phone: '000',           label: 'Australia',     color: 'bg-amber-700',    emoji: '🇦🇺', sub: 'Australie' },
    { phone: '190',           label: 'Brasil',        color: 'bg-emerald-700',  emoji: '🇧🇷', sub: 'Brésil' },
    { phone: '110',           label: 'Japan/CN',      color: 'bg-rose-700',     emoji: '🇯🇵', sub: 'Asie' },
    { phone: '+18664887386',  label: 'Trevor LGBT+',  color: 'bg-fuchsia-700',  emoji: '🏳️‍🌈', sub: 'Crise jeunes' },
    { phone: '+18775658860',  label: 'Trans Lifeline',color: 'bg-pink-700',     emoji: '🏳️‍⚧️', sub: 'Pair-trans' }
  ];

  // Quick-Dial : pour la France, grille des numéros essentiels
  const QUICK_DIAL_FR = [
    { phone: '17',           label: 'Police',           color: 'bg-blue-600',    emoji: '🚨' },
    { phone: '112',          label: 'Urgence UE',       color: 'bg-red-600',     emoji: '🚓' },
    { phone: '114',          label: 'Silencieux SMS',   color: 'bg-violet-600',  emoji: '🤫' },
    { phone: '3919',         label: 'Violences',        color: 'bg-pink-600',    emoji: '💔' },
    { phone: '3018',         label: 'Harcèlement',      color: 'bg-orange-600',  emoji: '🏫' },
    { phone: '3114',         label: 'Suicide',          color: 'bg-rose-700',    emoji: '🆘' },
    { phone: '0631596950',   label: 'Le Refuge',        color: 'bg-fuchsia-600', emoji: '🏳️‍🌈' },
    { phone: '0800235236',   label: 'Fil Santé Jeunes', color: 'bg-emerald-600', emoji: '🌱' }
  ];

  return (
    <>
      {country ? (
        <div className={`bg-${riskColor}-500/10 border border-${riskColor}-500/30 rounded-xl p-3 flex items-center gap-2`}>
          <MapPin size={18} className={`text-${riskColor}-400`} />
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{country.countryName}</div>
            {country.riskLevel === 'extreme' && <div className="text-[11px] text-red-300">⚠ Législation très restrictive — utilise un VPN et Tor</div>}
            {country.riskLevel === 'danger'  && <div className="text-[11px] text-red-300">⚠ Législation hostile</div>}
            {country.riskLevel === 'caution' && <div className="text-[11px] text-amber-300">Discrimination encore présente</div>}
            {country.riskLevel === 'safe'    && <div className="text-[11px] text-emerald-300">Cadre légal protecteur</div>}
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <p className="text-xs text-zinc-400 mb-2">{data?.fallbackMessage || 'Pays non détecté.'}</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onDetect} className="bg-violet-500 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <MapPin size={11} /> Géolocaliser
            </button>
            <input value={manualCountry} onChange={(e) => setManualCountry(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && manualCountry && onLoad(manualCountry)} placeholder="Code pays (FR, US, BR…)" className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs flex-1 min-w-[120px]" maxLength={2} />
            <button onClick={() => manualCountry && onLoad(manualCountry)} className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-full">OK</button>
          </div>
        </div>
      )}

      {/* Quick-Dial INTERNATIONAL : toujours visible, 8 numéros universels */}
      <div>
        <h3 className="text-xs uppercase font-bold text-violet-300 mb-2 flex items-center gap-1.5">
          <Globe size={11} /> Urgences internationales · 1 tap
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          {QUICK_DIAL_INTL.map(q => (
            <a
              key={q.phone + q.label}
              href={`tel:${q.phone}`}
              className={`${q.color} hover:opacity-90 text-white rounded-xl p-2 text-center transition shadow-lg flex flex-col items-center justify-center gap-0.5`}
              title={`${q.label} — ${q.phone}`}
            >
              <span className="text-xl">{q.emoji}</span>
              <span className="text-[9px] font-bold leading-tight">{q.label}</span>
              <span className="text-[8px] opacity-80 font-mono">{q.phone}</span>
            </a>
          ))}
        </div>
        <p className="text-[10px] text-zinc-400 mt-1.5">
          🌍 <strong>112</strong> = numéro européen unique. <strong>911</strong> = US/Canada. <strong>999</strong> = UK. Trevor Project + Trans Lifeline = lignes LGBT mondiales accessibles depuis n'importe où.
        </p>
      </div>

      {/* Quick-Dial pour France : 8 numéros 1-tap */}
      {country?.countryCode === 'FR' && (
        <div>
          <h3 className="text-xs uppercase font-bold text-red-300 mb-2 flex items-center gap-1.5">
            <PhoneCall size={11} /> Appel rapide France · 1 tap
          </h3>
          <div className="grid grid-cols-4 gap-1.5">
            {QUICK_DIAL_FR.map(q => (
              <a
                key={q.phone}
                href={`tel:${q.phone}`}
                className={`${q.color} hover:opacity-90 text-white rounded-xl p-2 text-center transition shadow-lg flex flex-col items-center justify-center gap-0.5`}
                title={q.label}
              >
                <span className="text-xl">{q.emoji}</span>
                <span className="text-[9px] font-bold leading-tight">{q.label}</span>
                <span className="text-[8px] opacity-80 font-mono">{q.phone}</span>
              </a>
            ))}
          </div>
          <p className="text-[10px] text-zinc-400 mt-2">
            🤫 <strong>114</strong> = appel d'urgence par SMS si tu ne peux pas parler (agression chez toi, violences en cours).
            Envoie un SMS au 114 pour alerter sans bruit.
          </p>
        </div>
      )}

      {country?.helplines && country.helplines.length > 0 && (
        <div>
          <h3 className="text-xs uppercase font-bold text-red-300 mb-2">Toutes les aides — {country.countryName}</h3>
          <div className="space-y-2">
            {country.helplines.map((h: Helpline, i: number) => <HelplineCard key={i} h={h} accent="red" />)}
          </div>
        </div>
      )}

      {data?.global && data.global.length > 0 && (
        <div>
          <h3 className="text-xs uppercase font-bold text-violet-300 mb-2 flex items-center gap-1.5"><Globe size={11} /> International</h3>
          <div className="space-y-2">
            {data.global.map((h: Helpline, i: number) => <HelplineCard key={i} h={h} accent="violet" />)}
          </div>
        </div>
      )}
    </>
  );
}

function HelplineCard({ h, accent }: { h: Helpline; accent: 'red' | 'violet' }) {
  const color = accent === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-violet-500/30 bg-violet-500/5';
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="font-bold text-sm text-white">{h.name}</div>
      <p className="text-xs text-zinc-300 mt-1">{h.description}</p>
      {(h.hours || h.language) && (
        <div className="text-[10px] text-zinc-400 mt-1">
          {h.hours && <span>🕒 {h.hours}</span>}{h.hours && h.language && ' · '}{h.language && <span>🗣 {h.language}</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {h.phone && <a href={`tel:${h.phone.replace(/\s/g, '')}`} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"><Phone size={11} /> {h.phone}</a>}
        {h.url   && <a href={h.url} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"><ExternalLink size={11} /> Site</a>}
        {h.email && <a href={`mailto:${h.email}`} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-full">✉ {h.email}</a>}
      </div>
    </div>
  );
}

/* ============= TAB : QUE FAIRE SI ============= */

const SCENARIOS = [
  { id: 'outing',    title: '🏳️‍🌈 J\'ai été outé·e contre mon gré', steps: [
    'Respire. Ce n\'est pas ta faute. Tu as le droit à ton intimité.',
    'Identifie 1-2 personnes de confiance que tu peux appeler maintenant.',
    'Si à risque (famille hostile, employeur, école) : trouve un endroit sûr immédiatement (ami, association LGBT, hôtel, refuge).',
    'Documente : sauvegarde captures d\'écran, conversations, témoins. C\'est utile en cas de procédure.',
    'Tu peux porter plainte : l\'outing est un délit en France et dans plusieurs pays.',
    'Contacte une assoc LGBT (SOS Homophobie, Le Refuge…) pour un accompagnement.'
  ]},
  { id: 'famille',   title: '🏠 Rejet de ma famille', steps: [
    'Ta valeur n\'est pas définie par leur réaction. Tu es entier·e tel·le que tu es.',
    'Sécurité d\'abord : si menaces physiques, pars. Le Refuge accueille jeunes 14-25 ans (24/7 : 06 31 59 69 50).',
    'Si tu es mineur·e : Allô Enfance en Danger 119 (anonyme, 24/7).',
    'Trouve un toit temporaire : ami·e, famille élargie acceptante, foyer LGBT, AirBnB d\'urgence.',
    'Garde une trousse de secours prête : papiers, médicaments, vêtements, chargeur, argent.',
    'La réconciliation prend parfois du temps. Tu n\'es pas pressé·e.'
  ]},
  { id: 'abus',      title: '⚠️ Je subis des violences', steps: [
    'Quitte la situation immédiatement si possible. Ta sécurité est prioritaire.',
    'En urgence : 112 (UE), 911 (US), ou commissariat le plus proche.',
    'Femmes : 3919 (France, gratuit, 24/7) — violences conjugales tous publics.',
    'Hommes/non-binaires victimes : 0 800 19 90 00 (France, France Victimes).',
    'Documente : photos blessures, certificats médicaux, captures messages.',
    'Une assoc LGBT peut t\'accompagner pour un dépôt de plainte sans jugement.'
  ]},
  { id: 'mental',    title: '😔 Pensées noires / idées suicidaires', steps: [
    'Tu mérites de l\'aide. Appelle MAINTENANT, ne reste pas seul·e :',
    '🆘 3114 (France, gratuit, 24/7, anonyme) — prévention suicide tous publics.',
    '🌈 Le Refuge 06 31 59 69 50 (jeunes LGBT 24/7) — formé·es à ces sujets.',
    '🏳️‍⚧️ Trans Lifeline 1-877-330-6366 (US/CA, par et pour les trans).',
    'Mets-toi en sécurité : éloigne objets dangereux, médicaments, va dans un lieu public.',
    'Respiration carrée (4-4-4-4) pour calmer la crise → onglet "Respire".'
  ]},
  { id: 'religion',  title: '🙏 Conflit foi / orientation', steps: [
    'Dieu t\'aime. Tu es créé·e à son image. Aucune lecture des textes ne change ça.',
    'Tu n\'es pas obligé·e de choisir entre foi et identité. Des milliers de croyant·es LGBT vivent les deux.',
    'Rejoins une communauté inclusive : Carrefour des Chrétiens Inclusifs, David & Jonathan, Beit Haverim, HM2F.',
    'Si une thérapie de conversion t\'est proposée : c\'est interdit en France et dangereux. Refuse, signale.',
    'Lis les théologies inclusives : Justin Lee, Matthew Vines, Daniel Helminiak.',
    'Notre RAG « Demandez à GLD » t\'aide aussi sur ces sujets — ouvre le widget chat.'
  ]},
  { id: 'isolement', title: '🌑 Je me sens seul·e', steps: [
    'L\'isolement est temporaire, même quand il pèse. Tu n\'es pas oublié·e.',
    'Rejoins notre forum (/forum) : témoignages et entraide pairs, modéré·es.',
    'Trouve un lieu safe près de toi : onglet "Refuges" ou /lieux LGBT-friendly.',
    'Petits gestes : une marche dehors, un café avec un·e barista, un appel à un·e ancien·ne ami·e.',
    'Évite la doomscroll réseaux : ça amplifie le sentiment de solitude.',
    'Notre AI Avatar GLD est là 24/7 pour parler — ouvre le widget chat.'
  ]},
  { id: 'discrimination', title: '🚫 Discrimination (travail/école/services)', steps: [
    'Garde ton calme — pas pour leur donner raison, mais pour collecter les preuves.',
    'Documente IMMÉDIATEMENT : capture les emails, SMS, témoins (noms + coordonnées), date/heure/lieu, mots exacts utilisés.',
    'Fais constater par un tiers : médecin (certificat de stress/préjudice moral), médiateur, syndicat, délégué élève.',
    'Signale en interne : RH, direction école, médiateur de l\'organisme. Garde une copie.',
    'France : Défenseur des Droits 09 69 39 00 00 (gratuit) ou en ligne defenseurdesdroits.fr — saisine confidentielle, accompagne dépôt de plainte.',
    'Porte plainte : commissariat ou en ligne (pré-plainte gov). Délit puni 3 ans/45 000€ (art. 225-1 Code Pénal).',
    'SOS Homophobie 01 48 06 42 41 t\'aide à formuler ta plainte sans jugement.'
  ]},
  { id: 'violences-conjugales', title: '💔 Violences conjugales (homme, femme, non-binaire)', steps: [
    'Ta sécurité passe avant tout — ce n\'est JAMAIS de ta faute. L\'amour ne fait pas mal.',
    '🚨 Danger immédiat : 🚓 17 (police) ou 📞 112 (UE).',
    '📞 3919 (France, gratuit, 24/7, confidentiel) — femmes ET hommes ET non-binaires victimes.',
    '📞 0 800 19 90 00 France Victimes (gratuit, 9h-21h).',
    'Hommes battu·es : SOS Hommes Battus 0 800 122 800 — service spécifique, le tabou ne doit pas t\'empêcher d\'appeler.',
    'Couples LGBT+ : Refuge Genre 06 31 59 69 50 (formé·es violence conjugale entre personnes LGBT+).',
    'Sécurise-toi : prépare un sac caché (papiers, médicaments, argent, clés, chargeur), code WhatsApp avec un·e proche, lieu de secours identifié.',
    'Documente : photos blessures (avec date), certificats médicaux SANS RDV (UMJ urgence), captures messages.',
    'Hébergement urgence : 115 (Samu social) ou Le Refuge si <25 ans LGBT.',
    'Ordonnance de protection au juge : pas besoin de plainte préalable, valable 6 mois renouvelable.'
  ]},
  { id: 'harcelement-scolaire', title: '🏫 Harcèlement scolaire ou cyberharcèlement', steps: [
    'Tu n\'es pas seul·e. Ce n\'est PAS de ta faute. Ça arrive à 1 jeune sur 10 — beaucoup s\'en sortent.',
    '📞 3018 (Net Écoute, 9h-23h, 7j/7, gratuit, anonyme) — spécialisé harcèlement scolaire et en ligne, conseils + tchat.',
    '📞 3020 (Non au harcèlement, gouv) — accompagnement par académie, peut intervenir en classe.',
    'Documente : capture écrans, sauvegarde messages, dates, témoins. C\'est ESSENTIEL pour toute action.',
    'Parle à 1 adulte de confiance : parent, prof référent·e, infirmière scolaire, CPE. Si l\'établissement minimise, contacte le rectorat.',
    'Sur les réseaux : signale les contenus (Insta, TikTok, Snap ont des boutons), bloque, ne réponds pas aux insultes.',
    'En droit français : harcèlement = délit puni 3 ans/45 000€ (10 ans si suicide). Tu peux porter plainte.',
    'Ressources LGBT+ : SOS Homophobie 01 48 06 42 41 si LGBTphobie scolaire.',
    'Tu peux changer d\'établissement (carte scolaire dérogation pour motif harcèlement) — ne reste pas dans la souffrance.'
  ]},
  { id: 'attentat', title: '⚠️ Attentat / attaque en cours', steps: [
    '1️⃣ ÉCHAPPER : éloigne-toi du danger, par tous les moyens. Cours en zigzag.',
    '2️⃣ SE CACHER si fuite impossible : verrouille porte, éteins lumière, mets téléphone en silencieux, écarte-toi des fenêtres, allonge-toi.',
    '3️⃣ ALERTER : 🚨 17 (police), 📞 112 (urgence UE), seulement quand tu es en sécurité.',
    'Si tu fuis, lève les mains visibles pour que la police ne te confonde pas avec un assaillant.',
    'Suis les consignes de la police/secours à la lettre. N\'utilise PAS ton téléphone jusqu\'à autorisation.',
    'Apporte ton aide UNIQUEMENT si tu es en sécurité : compresser une plaie avec un tissu, parler aux blessés.',
    '📱 SAIP (l\'app gouvernement français) envoie alertes attentat — installe-la avant.',
    'Mode "Safety Check" Facebook + signaler "Je suis en sécurité" pour rassurer tes proches.',
    'Après : ne diffuse PAS images/vidéos sans autorisation police. CUMP (cellule médico-psychologique) : numéro vert sera communiqué.'
  ]}
];

function WhatIfTab() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400 mb-2">Choisis ta situation pour des conseils précis.</p>
      {SCENARIOS.map(s => (
        <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <button onClick={() => setOpen(open === s.id ? null : s.id)} className="w-full text-left px-3 py-2.5 hover:bg-zinc-800/50 flex items-center justify-between">
            <span className="font-bold text-sm">{s.title}</span>
            <span className="text-zinc-400 text-xs">{open === s.id ? '▼' : '▸'}</span>
          </button>
          {open === s.id && (
            <ol className="px-3 pb-3 space-y-1.5 text-xs text-zinc-300 list-decimal list-inside">
              {s.steps.map((step, i) => <li key={i} className="leading-relaxed">{step}</li>)}
            </ol>
          )}
        </div>
      ))}
    </div>
  );
}

/* ============= TAB : RESPIRE (techniques de calme) ============= */

function BreatheTab() {
  const [exercise, setExercise] = useState<'square' | '478' | 'ground'>('square');
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">Quand l'angoisse monte, ces techniques aident à se recentrer en 1-3 minutes.</p>
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setExercise('square')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${exercise === 'square' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>Carrée 4-4-4-4</button>
        <button onClick={() => setExercise('478')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${exercise === '478' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>4-7-8 (sommeil)</button>
        <button onClick={() => setExercise('ground')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${exercise === 'ground' ? 'bg-cyan-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>Ancrage 5-4-3-2-1</button>
      </div>
      {exercise === 'square' && <BreathingAnimation pattern={[4, 4, 4, 4]} labels={['Inspire', 'Retiens', 'Expire', 'Retiens']} />}
      {exercise === '478'    && <BreathingAnimation pattern={[4, 7, 8, 0]} labels={['Inspire (4)', 'Retiens (7)', 'Expire (8)', '']} />}
      {exercise === 'ground' && <GroundingExercise />}
    </div>
  );
}

function BreathingAnimation({ pattern, labels }: { pattern: number[]; labels: string[] }) {
  const [phase, setPhase] = useState(0);
  const [seconds, setSeconds] = useState(pattern[0]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setSeconds(s => {
        if (s > 1) return s - 1;
        const nextPhase = (phase + 1) % pattern.length;
        setPhase(nextPhase);
        return pattern[nextPhase] || 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, pattern, running]);

  const sizes = ['scale-90', 'scale-110', 'scale-90', 'scale-100'];

  return (
    <div className="text-center py-6">
      <div className={`mx-auto w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center transition-transform duration-1000 ${sizes[phase]}`}>
        <div className="text-center">
          <div className="text-4xl font-bold text-white">{seconds}</div>
          <div className="text-xs text-white/80 mt-1">{labels[phase]}</div>
        </div>
      </div>
      <button onClick={() => { setRunning(!running); if (!running) { setPhase(0); setSeconds(pattern[0]); } }} className="mt-4 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-bold px-5 py-2 rounded-full">
        {running ? 'Pause' : 'Démarrer'}
      </button>
      <p className="text-[10px] text-zinc-400 mt-3">Suis le rythme du cercle. 5 cycles = 1 minute environ.</p>
    </div>
  );
}

function GroundingExercise() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2 text-sm">
      <p className="text-zinc-300">Regarde autour de toi et nomme :</p>
      <ul className="space-y-1.5 text-zinc-300">
        <li><strong className="text-cyan-400">5</strong> choses que tu <strong>VOIS</strong> 👁</li>
        <li><strong className="text-cyan-400">4</strong> choses que tu peux <strong>TOUCHER</strong> ✋</li>
        <li><strong className="text-cyan-400">3</strong> choses que tu <strong>ENTENDS</strong> 👂</li>
        <li><strong className="text-cyan-400">2</strong> choses que tu peux <strong>SENTIR</strong> 👃</li>
        <li><strong className="text-cyan-400">1</strong> chose que tu peux <strong>GOÛTER</strong> 👅</li>
      </ul>
      <p className="text-[11px] text-zinc-400 mt-2">Cette technique d'ancrage sensoriel ramène ton cerveau dans le présent et coupe la spirale anxieuse.</p>
    </div>
  );
}

/* ============= TAB : ENTRAIDE PAIRS ============= */

function PeersTab({ country }: { country: string | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'feed' | 'compose'>('feed');
  const [supported, setSupported] = useState<Set<string>>(new Set());

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/peer-help');
      const j = await r.json();
      setItems(j.items || []);
    } finally { setLoading(false); }
  }

  async function support(id: string) {
    if (supported.has(id)) return;
    setSupported(new Set([...supported, id]));
    await fetch(`/api/peer-help/${id}/support`, { method: 'POST' }).catch(() => null);
    setItems(items.map(it => it.id === id ? { ...it, supportCount: (it.supportCount || 0) + 1 } : it));
  }

  if (view === 'compose') return <ComposePeerHelp country={country} onPosted={() => { setView('feed'); load(); }} onCancel={() => setView('feed')} />;

  return (
    <div className="space-y-3">
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-sm font-bold">Entraide entre nous</h3>
        </div>
        <p className="text-[11px] text-violet-200/90">Partage anonymement ce que tu vis. La communauté GLD t'enverra du soutien (sans jugement, modéré).</p>
        <button onClick={() => setView('compose')} className="mt-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
          <Send size={11} /> Demander de l'aide
        </button>
      </div>

      {loading ? (
        <div className="text-center py-6"><Loader2 size={20} className="animate-spin text-violet-400 mx-auto" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-zinc-400 text-xs py-6">Pas encore de message. Sois le·la premier·e à oser.</p>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <article key={it.id} className={`bg-zinc-900 border rounded-xl p-3 ${it.urgent ? 'border-red-500/30' : 'border-zinc-800'}`}>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <div className="flex items-center gap-1.5 text-[11px]">
                  {it.urgent && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-bold">URGENT</span>}
                  <span className="text-zinc-400">{it.authorName || '🕊 Anonyme'}</span>
                  {it.country && <span className="text-zinc-500">· {it.country}</span>}
                  <span className="text-violet-400">· #{it.topic}</span>
                </div>
                <span className="text-[10px] text-zinc-500">{new Date(it.createdAt).toLocaleDateString('fr-FR')}</span>
              </div>
              <p className="text-xs text-zinc-200 whitespace-pre-wrap">{it.message}</p>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                <button onClick={() => support(it.id)} disabled={supported.has(it.id)} className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${supported.has(it.id) ? 'bg-pink-500/30 text-pink-200' : 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-300'}`}>
                  {supported.has(it.id) ? <Check size={10} /> : <Heart size={10} />} Je suis là pour toi
                </button>
                <span className="text-[10px] text-zinc-400">{it.supportCount || 0} ❤</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposePeerHelp({ country, onPosted, onCancel }: { country: string | null; onPosted: () => void; onCancel: () => void }) {
  const [topic, setTopic] = useState('autre');
  const [message, setMessage] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (message.length < 10) { alert('Écris au moins 10 caractères'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/peer-help', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message, authorName: authorName || null, country, urgent })
      });
      if (r.ok) onPosted();
      else { const j = await r.json(); alert(`Erreur : ${j.error}`); }
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Pseudo (laisse vide pour anonyme)</label>
        <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="ex: Lou·" maxLength={20} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Sujet</label>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
          <option value="coming-out">Coming-out</option>
          <option value="famille">Famille / proches</option>
          <option value="couple">Couple / relations</option>
          <option value="travail">Travail / études</option>
          <option value="religion">Foi / religion</option>
          <option value="abus">Violences / discriminations</option>
          <option value="sante-mentale">Santé mentale</option>
          <option value="isolement">Isolement</option>
          <option value="autre">Autre</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Ton message ({message.length}/2000)</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 2000))} rows={6} placeholder="Raconte ce que tu vis. Aucun jugement. Tout est confidentiel et modéré." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </div>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
        <span className="text-red-300">⚠ Message urgent (mis en haut)</span>
      </label>
      <div className="flex gap-2">
        <button onClick={send} disabled={busy || message.length < 10} className="bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full inline-flex items-center gap-1.5">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publier
        </button>
        <button onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 text-white text-sm px-4 py-2 rounded-full">Annuler</button>
      </div>
      <p className="text-[10px] text-zinc-400">⚠ Si tu es en danger immédiat, utilise plutôt l'onglet "Contacts" ou le 112.</p>
    </div>
  );
}

/* ============= TAB : LIEUX REFUGES ============= */

function SafePlacesTab({ country }: { country: string | null }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">Lieux LGBT-friendly où tu peux te poser, parler, te sentir safe.</p>
      <a href="/lieux" className="block bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3 transition">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">🏳️‍🌈 Annuaire complet GLD</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Restaurants, bars, cafés, lieux de culte inclusifs, centres communautaires…</div>
          </div>
          <ExternalLink size={14} className="text-fuchsia-400" />
        </div>
      </a>
      <a href="/carte" className="block bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl p-3 transition">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">🗺️ Carte mondiale interactive</div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Tous les lieux + statut juridique LGBT par pays</div>
          </div>
          <ExternalLink size={14} className="text-fuchsia-400" />
        </div>
      </a>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-[11px] text-amber-200">
        💡 Si tu es jeune (14-25 ans) et sans toit : <strong>Le Refuge</strong> 06 31 59 69 50 t'accueille en urgence dans toute la France.
      </div>
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 text-[11px] text-violet-200">
        💡 Pour un dialogue immédiat avec un·e bénévole formé·e LGBT : <strong>SOS Homophobie</strong> 01 48 06 42 41 (lun-ven 18h-22h, sam 14h-16h, dim 18h-22h).
      </div>
    </div>
  );
}
