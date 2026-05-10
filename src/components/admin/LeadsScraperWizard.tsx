'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Heart, Briefcase, Settings, ChevronRight, ChevronLeft, Check, Loader2,
  Globe, Plus, X, AlertTriangle, Sparkles, Play
} from 'lucide-react';
import Link from 'next/link';

type Target = 'b2c' | 'b2b' | 'custom';

interface WizardState {
  target: Target | null;
  // B2C
  b2cRegion: string;
  b2cPeriod: string;
  b2cStyle: string;
  // B2B
  b2bSalon: string;
  b2bCategory: string;
  // Common
  urls: string[];
  newUrl: string;
  volume: number;
  depth: number;
  country: string;
  tags: string[];
  newTag: string;
  legalAccepted: boolean;
}

const B2C_PERIODS = [
  { v: '6-12', label: '6-12 mois', desc: 'Mariages cet été 2026 + automne' },
  { v: '12-18', label: '12-18 mois', desc: 'Printemps-été 2027' },
  { v: '18+', label: '18 mois et +', desc: 'Long terme — souvent réservation tôt' }
];

const B2C_STYLES = [
  { v: 'champetre', label: 'Champêtre' },
  { v: 'chic', label: 'Chic / Élégant' },
  { v: 'boheme', label: 'Bohème' },
  { v: 'urbain', label: 'Urbain' },
  { v: 'any', label: 'Tous styles' }
];

const B2B_CATEGORIES = [
  { v: 'all', label: 'Tous' },
  { v: 'photographer', label: 'Photographes' },
  { v: 'planner', label: 'Wedding planners' },
  { v: 'caterer', label: 'Traiteurs' },
  { v: 'florist', label: 'Fleuristes' },
  { v: 'dj', label: 'DJ / animateurs' },
  { v: 'venue', label: 'Salles' },
  { v: 'dress', label: 'Robes / costumes' },
  { v: 'beauty', label: 'Maquilleuses / coiffeuses' },
  { v: 'video', label: 'Vidéastes' }
];

const SUGGESTED_URLS_B2C = [
  'https://www.mariages.net/recherche.php',
  'https://www.zankyou.fr/',
  'https://www.weddingplanner.fr/'
];
const SUGGESTED_URLS_B2B = [
  'https://www.salondumariage.fr/exposants',
  'https://www.mariages.net/photographes-paris',
  'https://www.zankyou.fr/p/photographes'
];

export function LeadsScraperWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(false);
  const [state, setState] = useState<WizardState>({
    target: null,
    b2cRegion: 'France',
    b2cPeriod: '6-12',
    b2cStyle: 'any',
    b2bSalon: 'Salon Mariage Paris',
    b2bCategory: 'all',
    urls: [],
    newUrl: '',
    volume: 300,
    depth: 1,
    country: 'FR',
    tags: [],
    newTag: '',
    legalAccepted: false
  });

  function update(patch: Partial<WizardState>) {
    setState((p) => ({ ...p, ...patch }));
  }

  function addUrl() {
    if (!state.newUrl.trim()) return;
    try {
      new URL(state.newUrl);
      update({ urls: [...state.urls, state.newUrl.trim()], newUrl: '' });
    } catch {
      alert('URL invalide');
    }
  }
  function addTag() {
    if (!state.newTag.trim()) return;
    update({ tags: [...state.tags, state.newTag.trim()], newTag: '' });
  }
  function useSuggested() {
    if (state.target === 'b2c') update({ urls: [...state.urls, ...SUGGESTED_URLS_B2C] });
    else if (state.target === 'b2b') update({ urls: [...state.urls, ...SUGGESTED_URLS_B2B] });
  }

  async function launch() {
    if (state.target === 'b2c' && !state.legalAccepted) {
      alert('Tu dois accepter le disclaimer RGPD pour le B2C');
      return;
    }
    setRunning(true);
    const tags = state.tags.length > 0 ? state.tags : (
      state.target === 'b2c'
        ? [`b2c-mariage-${state.b2cPeriod}`, state.b2cStyle, state.b2cRegion.toLowerCase().replace(/\s+/g, '-')]
        : [`b2b-pros-${state.b2bSalon.toLowerCase().replace(/\s+/g, '-')}`, state.b2bCategory]
    );
    const name = state.target === 'b2c'
      ? `B2C — Mariages ${state.b2cPeriod} mois (${state.b2cRegion})`
      : state.target === 'b2b'
      ? `B2B — ${state.b2bCategory === 'all' ? 'Tous pros' : B2B_CATEGORIES.find((c) => c.v === state.b2bCategory)?.label} (${state.b2bSalon})`
      : `Scrape custom ${new Date().toLocaleDateString('fr-FR')}`;

    const r = await fetch('/api/admin/leads/scraper/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        source: 'website',
        config: {
          urls: state.urls,
          depth: state.depth,
          country: state.country,
          target: state.target,
          tags,
          volume: state.volume
        }
      })
    });
    const j = await r.json();
    if (j.ok) {
      router.push('/admin/leads/scraper');
    } else {
      alert('Erreur : ' + (j.error || 'unknown'));
      setRunning(false);
    }
  }

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <Link href="/admin/leads/scraper" className="text-xs text-zinc-400 hover:text-white">← Scraper</Link>
        <h1 className="font-display font-black text-xl text-white tracking-tight">Nouveau scrape</h1>
        <span className="ml-auto text-xs text-zinc-500">Étape {step}/4</span>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className={`flex-1 h-1 rounded-full transition-colors ${n <= step ? 'bg-fuchsia-500' : 'bg-zinc-800'}`} />
        ))}
      </div>

      {/* STEP 1 — Target type */}
      {step === 1 && (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold mb-1 flex items-center gap-2"><Sparkles size={14} className="text-fuchsia-400" /> 1. Choisis ta cible</h2>
          <p className="text-xs text-zinc-400 mb-4">Le wizard adapte ensuite les sources et les options selon ton choix.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TargetCard
              icon={Heart}
              color="rose"
              title="Futurs mariés (B2C)"
              tagline="Couples qui se marient dans 6-18 mois"
              tags={['Mariages.net', 'Zankyou', 'Insta hashtags', 'sites perso']}
              selected={state.target === 'b2c'}
              onClick={() => update({ target: 'b2c' })}
              warning="⚠️ Cold mail = pas légal en France pour particuliers"
            />
            <TargetCard
              icon={Briefcase}
              color="cyan"
              title="Pros salon mariage (B2B)"
              tagline="Exposants + photographes + planners"
              tags={['Apollo', 'Google Maps', 'liste exposants']}
              selected={state.target === 'b2b'}
              onClick={() => update({ target: 'b2b' })}
              info="✅ Cold email LCEN OK pour adresses pro"
            />
            <TargetCard
              icon={Settings}
              color="violet"
              title="Custom (avancé)"
              tagline="URLs manuelles + tags libres"
              tags={['liberté totale', 'tu fournis les sources']}
              selected={state.target === 'custom'}
              onClick={() => update({ target: 'custom' })}
            />
          </div>
        </div>
      )}

      {/* STEP 2 — Précisions */}
      {step === 2 && (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-2">2. Précise tes critères</h2>

          {state.target === 'b2c' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Région / villes</label>
                <input value={state.b2cRegion} onChange={(e) => update({ b2cRegion: e.target.value })} placeholder="France entière, Paris, Lyon, Côte d'Azur..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Période du mariage</label>
                <div className="grid grid-cols-3 gap-2">
                  {B2C_PERIODS.map((p) => (
                    <button key={p.v} onClick={() => update({ b2cPeriod: p.v })} className={`p-3 rounded-xl border text-left transition ${state.b2cPeriod === p.v ? 'border-rose-500 bg-rose-500/10' : 'border-zinc-800 bg-zinc-950 hover:border-rose-500/40'}`}>
                      <p className="text-xs font-bold text-white">{p.label}</p>
                      <p className="text-[10px] text-zinc-500">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Style recherché</label>
                <div className="flex flex-wrap gap-1.5">
                  {B2C_STYLES.map((s) => (
                    <button key={s.v} onClick={() => update({ b2cStyle: s.v })} className={`text-xs px-3 py-1.5 rounded-full transition ${state.b2cStyle === s.v ? 'bg-rose-500 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-rose-500'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {state.target === 'b2b' && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Salon ciblé</label>
                <input value={state.b2bSalon} onChange={(e) => update({ b2bSalon: e.target.value })} placeholder="Salon du Mariage Paris janv 2026" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Catégorie pros</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {B2B_CATEGORIES.map((c) => (
                    <button key={c.v} onClick={() => update({ b2bCategory: c.v })} className={`text-xs px-3 py-2 rounded-lg transition ${state.b2bCategory === c.v ? 'bg-cyan-500 text-white' : 'bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-cyan-500'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {state.target === 'custom' && (
            <p className="text-xs text-zinc-400 italic">Mode avancé : passe directement à l'étape 3 pour fournir tes URLs.</p>
          )}
        </div>
      )}

      {/* STEP 3 — URLs + options */}
      {step === 3 && (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold mb-2">3. Sources à scraper</h2>
          <div className="flex items-center gap-2">
            <input
              value={state.newUrl}
              onChange={(e) => update({ newUrl: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && addUrl()}
              placeholder="https://example.com/page-contacts"
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono"
            />
            <button onClick={addUrl} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Plus size={11} /> Ajouter</button>
          </div>
          {(state.target === 'b2c' || state.target === 'b2b') && (
            <button onClick={useSuggested} className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
              <Sparkles size={11} /> Utiliser les sources suggérées ({state.target === 'b2c' ? SUGGESTED_URLS_B2C.length : SUGGESTED_URLS_B2B.length})
            </button>
          )}
          {state.urls.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center bg-zinc-950 rounded-lg p-4">Aucune URL ajoutée</p>
          ) : (
            <ul className="space-y-1">
              {state.urls.map((u, i) => (
                <li key={i} className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2">
                  <Globe size={11} className="text-fuchsia-400 flex-shrink-0" />
                  <code className="text-[11px] text-zinc-300 truncate flex-1">{u}</code>
                  <button onClick={() => update({ urls: state.urls.filter((_, j) => j !== i) })} className="text-rose-400 hover:text-rose-300"><X size={12} /></button>
                </li>
              ))}
            </ul>
          )}

          <hr className="border-zinc-800" />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Profondeur</label>
              <select value={state.depth} onChange={(e) => update({ depth: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs">
                <option value={0}>0 — page seule</option>
                <option value={1}>1 — + sous-pages</option>
                <option value={2}>2 — crawl profond</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Pays défaut</label>
              <select value={state.country} onChange={(e) => update({ country: e.target.value })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs">
                <option value="FR">FR · France</option>
                <option value="BE">BE · Belgique</option>
                <option value="CH">CH · Suisse</option>
                <option value="LU">LU · Luxembourg</option>
                <option value="CA">CA · Canada</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Volume cible</label>
              <select value={state.volume} onChange={(e) => update({ volume: Number(e.target.value) })} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs">
                <option value={50}>50 leads</option>
                <option value={100}>100 leads</option>
                <option value={300}>300 leads</option>
                <option value={500}>500 leads</option>
                <option value={1000}>1000 leads</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-1">Tags appliqués aux leads</label>
            <div className="flex items-center gap-2">
              <input
                value={state.newTag}
                onChange={(e) => update({ newTag: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="ex: salon-paris-2026"
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs"
              />
              <button onClick={addTag} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1"><Plus size={11} /></button>
            </div>
            {state.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {state.tags.map((t, i) => (
                  <span key={i} className="text-[10px] bg-fuchsia-500/15 text-fuchsia-300 px-2 py-1 rounded-full flex items-center gap-1">
                    {t}
                    <button onClick={() => update({ tags: state.tags.filter((_, j) => j !== i) })} className="text-fuchsia-400 hover:text-fuchsia-200"><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-[10px] text-zinc-500 mt-1">Si vide, des tags par défaut seront créés selon ton choix.</p>
          </div>
        </div>
      )}

      {/* STEP 4 — Résumé + lancement */}
      {step === 4 && (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold mb-2">4. Vérifie et lance</h2>

          {state.target === 'b2c' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mb-1.5"><AlertTriangle size={11} /> Disclaimer RGPD — B2C</p>
              <p className="text-[11px] text-amber-200/90 leading-relaxed mb-2">
                La prospection email/SMS vers des particuliers nécessite leur <strong>consentement préalable</strong>.
                Tu peux récupérer leurs contacts pour analyse, mais pour les contacter, privilégie : DM Insta, Meta Ads Custom Audience, ou réponse à leurs questions publiques.
              </p>
              <label className="flex items-center gap-2 text-xs text-amber-100">
                <input type="checkbox" checked={state.legalAccepted} onChange={(e) => update({ legalAccepted: e.target.checked })} />
                J'ai compris, c'est pour analyse uniquement.
                <Link href="/admin/leads/legal" className="text-amber-300 hover:text-amber-200 ml-auto underline">Voir le guide légal complet</Link>
              </label>
            </div>
          )}

          <SummaryRow label="Cible" value={
            state.target === 'b2c' ? `Futurs mariés (${state.b2cRegion}, ${state.b2cPeriod} mois, ${state.b2cStyle})` :
            state.target === 'b2b' ? `Pros salon (${state.b2bSalon}, ${state.b2bCategory})` :
            'Custom'
          } />
          <SummaryRow label="Sources" value={`${state.urls.length} URL${state.urls.length > 1 ? 's' : ''}`} />
          <SummaryRow label="Profondeur" value={`${state.depth} (${state.depth === 0 ? 'page seule' : state.depth === 1 ? '+ sous-pages' : 'crawl profond'})`} />
          <SummaryRow label="Volume cible" value={`${state.volume} leads`} />
          <SummaryRow label="Tags par défaut" value={state.tags.length > 0 ? state.tags.join(', ') : '(auto)'} />

          {state.urls.length === 0 && (
            <p className="text-xs text-rose-400 bg-rose-500/10 rounded p-2 flex items-center gap-1.5"><AlertTriangle size={11} /> Aucune URL — retourne à l'étape 3</p>
          )}
        </div>
      )}

      {/* Footer nav */}
      <div className="mt-4 flex items-center gap-2">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5">
            <ChevronLeft size={12} /> Précédent
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && !state.target)}
            className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2 rounded-full flex items-center gap-1.5"
          >
            Suivant <ChevronRight size={12} />
          </button>
        ) : (
          <button
            onClick={launch}
            disabled={running || state.urls.length === 0 || (state.target === 'b2c' && !state.legalAccepted)}
            className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-6 py-2.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-fuchsia-500/30"
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? 'Lancement…' : 'Lancer le scrape'}
          </button>
        )}
      </div>
    </div>
  );
}

function TargetCard({ icon: Icon, color, title, tagline, tags, selected, onClick, warning, info }: {
  icon: any; color: string; title: string; tagline: string; tags: string[]; selected: boolean; onClick: () => void; warning?: string; info?: string;
}) {
  const bg: Record<string, string> = {
    rose:   'from-rose-500/15 to-rose-500/5 ring-rose-500/40 hover:ring-rose-500',
    cyan:   'from-cyan-500/15 to-cyan-500/5 ring-cyan-500/40 hover:ring-cyan-500',
    violet: 'from-violet-500/15 to-violet-500/5 ring-violet-500/40 hover:ring-violet-500'
  };
  const txt: Record<string, string> = { rose: 'text-rose-400', cyan: 'text-cyan-400', violet: 'text-violet-400' };
  return (
    <button onClick={onClick} className={`bg-gradient-to-br ring-1 rounded-2xl p-4 text-left transition ${bg[color]} ${selected ? 'ring-2 scale-[1.02]' : ''}`}>
      <div className={`w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center mb-2 ${txt[color]}`}>
        <Icon size={18} />
      </div>
      <h3 className="font-bold text-sm text-white">{title}</h3>
      <p className="text-[11px] text-zinc-400 mt-0.5">{tagline}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map((t) => <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded bg-zinc-950 ${txt[color]}`}>{t}</span>)}
      </div>
      {warning && <p className="text-[10px] text-amber-300 mt-2">{warning}</p>}
      {info && <p className="text-[10px] text-emerald-300 mt-2">{info}</p>}
      {selected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white flex items-center justify-center"><Check size={12} className="text-fuchsia-600" /></div>}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-xs bg-zinc-950 rounded-lg px-3 py-2">
      <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold w-24">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
