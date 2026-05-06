'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Trash2, Loader2, ArrowLeft, ExternalLink, MapPin, Phone, Mail, Globe, Facebook, Instagram, ShieldCheck, Eye, EyeOff, Image as ImageIcon, CheckCircle2, Sparkles, Wand2 } from 'lucide-react';

const TYPES = ['RESTAURANT', 'BAR', 'CAFE', 'CLUB', 'HOTEL', 'SHOP', 'CULTURAL', 'CHURCH', 'TEMPLE', 'COMMUNITY_CENTER', 'HEALTH', 'ASSOCIATION', 'OTHER'];
const RATINGS = ['FRIENDLY', 'WELCOMING', 'INCLUSIVE', 'SAFE'];

export function VenueEditor({ venue }: { venue: any }) {
  const router = useRouter();
  const [v, setV] = useState<any>(venue);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<'info' | 'media' | 'events' | 'coupons'>('info');

  function set(k: string, val: any) { setV({ ...v, [k]: val }); }

  async function save() {
    setBusy(true);
    setSaved(false);
    const r = await fetch(`/api/admin/venues/${v.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v)
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    else alert(j.error || 'Erreur sauvegarde');
  }

  async function del() {
    if (!confirm(`Supprimer définitivement « ${v.name} » ?`)) return;
    if (!confirm('Cette action est irréversible. Confirmer ?')) return;
    await fetch(`/api/admin/venues/${v.id}`, { method: 'DELETE' });
    router.push('/admin/establishments');
  }

  // Enrichissement IA via Gemini grounded search
  const [enriching, setEnriching] = useState(false);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [enrichMenuOpen, setEnrichMenuOpen] = useState(false);

  async function enrich(overwrite = false, dry = false) {
    setEnrichMenuOpen(false);
    setEnriching(true);
    setEnrichResult(null);
    const r = await fetch(`/api/admin/venues/${v.id}/enrich${dry ? '?dry=1' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overwrite })
    });
    const j = await r.json();
    setEnriching(false);
    setEnrichResult(j);

    if (j.ok && !dry && j.patch && Object.keys(j.patch).length > 0) {
      // Merge directement le patch dans le state local pour que le formulaire
      // affiche les nouveaux champs immédiatement (sans avoir besoin de recharger).
      // On exclut les champs meta (enrichedAt etc.) du merge utilisateur, mais on les garde
      // pour que le badge "Enrichi le X" s'affiche.
      setV((prev: any) => ({ ...prev, ...j.patch }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Refresh côté serveur en arrière-plan pour que les autres pages soient à jour
      router.refresh();
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.back()} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"><ArrowLeft size={16} /></button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-2xl truncate">{v.name}</h1>
            <p className="text-xs text-zinc-400 truncate flex items-center gap-2">
              <MapPin size={11} /> {v.city || '—'} · {v.country || 'France'} · slug: <code className="text-cyan-300">{v.slug}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a href={`/lieux/${v.slug}`} target="_blank" className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5">
            <ExternalLink size={11} /> Voir front
          </a>
          <div className="relative">
            <button
              onClick={() => setEnrichMenuOpen((o) => !o)}
              disabled={enriching}
              className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white font-bold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50"
              title="Cherche sur le web (Gemini grounded) et complète les champs vides"
            >
              {enriching ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Enrichir IA <span className="opacity-60">▾</span>
            </button>
            {enrichMenuOpen && (
              <>
                {/* Backdrop pour fermer en cliquant ailleurs */}
                <div className="fixed inset-0 z-10" onClick={() => setEnrichMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-20 w-64 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => enrich(false, true)}
                    disabled={enriching}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-zinc-800 flex items-start gap-2 border-b border-zinc-800"
                  >
                    <Wand2 size={12} className="text-cyan-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Aperçu (sans sauver)</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Voit ce que Gemini propose</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => enrich(false, false)}
                    disabled={enriching}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-zinc-800 flex items-start gap-2 border-b border-zinc-800"
                  >
                    <Sparkles size={12} className="text-fuchsia-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Compléter vides uniquement</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">Recommandé · ne touche pas l'existant</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm('Écraser TOUS les champs existants par les données IA ?')) enrich(true, false); }}
                    disabled={enriching}
                    className="w-full text-left px-3 py-2.5 text-xs hover:bg-zinc-800 flex items-start gap-2 text-amber-300"
                  >
                    <span className="flex-shrink-0">⚠️</span>
                    <div>
                      <div className="font-bold">Tout écraser</div>
                      <div className="text-[10px] text-amber-400/70 mt-0.5">Remplace même les champs déjà remplis</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          {saved && <span className="text-emerald-300 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Sauvé</span>}
          <button onClick={save} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Sauvegarder
          </button>
        </div>
      </div>

      {/* PANNEAU RÉSULTAT ENRICHISSEMENT IA */}
      {enrichResult && (
        <div className={`mb-5 rounded-lg border p-4 ${enrichResult.ok ? 'border-fuchsia-500/40 bg-fuchsia-500/10' : 'border-rose-500/40 bg-rose-500/10'}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-fuchsia-300" />
                <h3 className="font-bold text-sm">
                  {enrichResult.ok ? 'Enrichissement IA' : 'Échec enrichissement'}
                  {enrichResult.dry && <span className="ml-2 text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">PREVIEW</span>}
                </h3>
                {typeof enrichResult.confidence === 'number' && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${enrichResult.confidence >= 0.75 ? 'bg-emerald-500/20 text-emerald-300' : enrichResult.confidence >= 0.5 ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    Confiance {Math.round(enrichResult.confidence * 100)}%
                  </span>
                )}
              </div>
              {enrichResult.notes && <p className="text-xs text-zinc-300 mb-2">{enrichResult.notes}</p>}
              {enrichResult.error && <p className="text-xs text-rose-300 mb-2 font-mono">{enrichResult.error}</p>}
              {enrichResult.fieldsApplied?.length > 0 && (
                <div className="text-xs text-zinc-400 mb-2">
                  <b className="text-emerald-300">Appliqué :</b> {enrichResult.fieldsApplied.join(', ')}
                </div>
              )}
              {enrichResult.fieldsSuggested?.length > 0 && enrichResult.fieldsSuggested.length !== enrichResult.fieldsApplied?.length && (
                <div className="text-xs text-zinc-400 mb-2">
                  <b className="text-cyan-300">Suggéré :</b> {enrichResult.fieldsSuggested.join(', ')}
                </div>
              )}
              {Array.isArray(enrichResult.sources) && enrichResult.sources.length > 0 && (
                <div className="text-xs text-zinc-400">
                  <b>Sources ({enrichResult.sources.length}) :</b>
                  <ul className="mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                    {enrichResult.sources.slice(0, 8).map((src: any, i: number) => (
                      <li key={i} className="truncate">
                        <a href={src.url} target="_blank" rel="noopener" className="text-cyan-300 hover:underline">→ {src.title || src.url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => setEnrichResult(null)} className="text-zinc-500 hover:text-zinc-200 text-xs">✕</button>
          </div>
        </div>
      )}

      {/* Badge confiance permanent si enrichi récemment */}
      {v.enrichedAt && !enrichResult && (
        <div className="mb-3 inline-flex items-center gap-2 text-xs bg-zinc-800/50 border border-zinc-700 rounded-full px-3 py-1">
          <Sparkles size={11} className="text-fuchsia-300" />
          <span className="text-zinc-400">Enrichi par IA le {new Date(v.enrichedAt).toLocaleDateString('fr-FR')}</span>
          {typeof v.enrichmentConfidence === 'number' && (
            <span className={`font-bold ${v.enrichmentConfidence >= 0.75 ? 'text-emerald-300' : v.enrichmentConfidence >= 0.5 ? 'text-amber-300' : 'text-rose-300'}`}>
              {Math.round(v.enrichmentConfidence * 100)}%
            </span>
          )}
        </div>
      )}

      {/* PANNEAU FRESHNESS — score de complétude de la fiche + ce qui manque */}
      <FreshnessPanel venueId={v.id} venue={v} onSuggestEnrich={() => enrich(false, false)} />

      {/* TOGGLES rapides */}
      <div className="flex gap-2 mb-5">
        <Toggle label="Publié" icon={Eye} checked={v.published} onChange={(x) => set('published', x)} color="emerald" />
        <Toggle label="Vérifié" icon={ShieldCheck} checked={v.verified} onChange={(x) => set('verified', x)} color="cyan" />
      </div>

      {/* TABS */}
      <div className="flex gap-1 border-b border-zinc-800 mb-5">
        {[
          { id: 'info', label: 'Informations' },
          { id: 'media', label: 'Médias' },
          { id: 'events', label: `Événements (${v._count?.events || 0})` },
          { id: 'coupons', label: `Coupons (${v._count?.coupons || 0})` }
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-4 py-2 text-sm font-bold border-b-2 transition ${tab === t.id ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Section title="Identité">
            <Field label="Nom" value={v.name} onChange={(x) => set('name', x)} />
            <SelectField label="Type" value={v.type} onChange={(x) => set('type', x)} options={TYPES} />
            <SelectField label="Rating LGBT" value={v.rating} onChange={(x) => set('rating', x)} options={RATINGS} />
            <Field label="Accroche courte" value={v.shortDescription || ''} onChange={(x) => set('shortDescription', x)} />
            <Textarea label="Description complète" value={v.description || ''} onChange={(x) => set('description', x)} rows={5} />
            <Field label="Tags (CSV)" value={(v.tags || []).join(', ')} onChange={(x) => set('tags', x.split(',').map((s: string) => s.trim()).filter(Boolean))} />
          </Section>

          <Section title="Adresse & contact">
            <Field label="Adresse" value={v.address || ''} onChange={(x) => set('address', x)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Ville" value={v.city || ''} onChange={(x) => set('city', x)} />
              <Field label="Code postal" value={v.postalCode || ''} onChange={(x) => set('postalCode', x)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Région" value={v.region || ''} onChange={(x) => set('region', x)} />
              <Field label="Pays" value={v.country || ''} onChange={(x) => set('country', x)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Latitude" type="number" value={v.lat || ''} onChange={(x) => set('lat', parseFloat(x) || null)} />
              <Field label="Longitude" type="number" value={v.lng || ''} onChange={(x) => set('lng', parseFloat(x) || null)} />
            </div>
            <Field label="Téléphone" icon={Phone} value={v.phone || ''} onChange={(x) => set('phone', x)} />
            <Field label="Email" icon={Mail} value={v.email || ''} onChange={(x) => set('email', x)} />
            <Field label="Site web" icon={Globe} value={v.website || ''} onChange={(x) => set('website', x)} />
            <Field label="URL réservation" value={v.bookingUrl || ''} onChange={(x) => set('bookingUrl', x)} />
            <Field label="Facebook" icon={Facebook} value={v.facebook || ''} onChange={(x) => set('facebook', x)} />
            <Field label="Instagram" icon={Instagram} value={v.instagram || ''} onChange={(x) => set('instagram', x)} />
          </Section>
        </div>
      )}

      {tab === 'media' && (
        <Section title="Médias">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">Image cover</label>
              {v.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.coverImage} alt="" className="w-full aspect-video object-cover rounded-lg mb-2 bg-zinc-800" />
              ) : (
                <div className="w-full aspect-video bg-zinc-800 rounded-lg mb-2 grid place-items-center text-zinc-500"><ImageIcon size={24} /></div>
              )}
              <input value={v.coverImage || ''} onChange={(e) => set('coverImage', e.target.value)} placeholder="https://…" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-1 block">Logo</label>
              {v.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.logo} alt="" className="w-32 h-32 object-contain bg-zinc-800 rounded-lg mb-2 mx-auto" />
              ) : (
                <div className="w-32 h-32 bg-zinc-800 rounded-lg mb-2 mx-auto grid place-items-center text-zinc-500"><ImageIcon size={20} /></div>
              )}
              <input value={v.logo || ''} onChange={(e) => set('logo', e.target.value)} placeholder="https://…" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs" />
            </div>
          </div>
        </Section>
      )}

      {tab === 'events' && (
        <Section title={`${v.events?.length || 0} événements`}>
          {(!v.events || v.events.length === 0) ? <Empty label="Aucun événement pour ce lieu" /> : (
            <ul className="space-y-2">
              {v.events.map((e: any) => (
                <li key={e.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{e.title}</div>
                    <div className="text-[10px] text-zinc-500">{new Date(e.startsAt).toLocaleString('fr-FR')}</div>
                  </div>
                  {e.published ? <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">Publié</span> : <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Brouillon</span>}
                </li>
              ))}
            </ul>
          )}
          <a href={`/admin/events?venueId=${v.id}`} className="mt-3 inline-block text-cyan-400 hover:underline text-xs">+ Créer un événement pour ce lieu</a>
        </Section>
      )}

      {tab === 'coupons' && (
        <Section title={`${v.coupons?.length || 0} coupons`}>
          {(!v.coupons || v.coupons.length === 0) ? <Empty label="Aucun coupon pour ce lieu" /> : (
            <ul className="space-y-2">
              {v.coupons.map((c: any) => (
                <li key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <code className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded font-bold text-sm">{c.code}</code>
                    <span className="text-xs text-zinc-300 flex-1">{c.description}</span>
                    {c.expiresAt && <span className="text-[10px] text-zinc-500">expire {new Date(c.expiresAt).toLocaleDateString('fr-FR')}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* DANGER */}
      <div className="mt-8 bg-rose-500/5 border border-rose-500/30 rounded-xl p-4">
        <button onClick={del} className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2">
          <Trash2 size={14} /> Supprimer cet établissement
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      <h2 className="font-bold text-sm uppercase text-zinc-300 tracking-wider">{title}</h2>
      {children}
    </section>
  );
}
function Field({ label, value, onChange, type = 'text', icon: Icon }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-400 mb-1 flex items-center gap-1.5">{Icon && <Icon size={11} />} {label}</span>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
    </label>
  );
}
function Textarea({ label, value, onChange, rows = 4 }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-400 mb-1 block">{label}</span>
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
    </label>
  );
}
function SelectField({ label, value, onChange, options }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-400 mb-1 block">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
        {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
function Toggle({ label, icon: Icon, checked, onChange, color }: any) {
  const colors: any = { emerald: 'bg-emerald-500', cyan: 'bg-cyan-500' };
  return (
    <button onClick={() => onChange(!checked)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition ${checked ? `${colors[color]}/20 border-${color}-400/40 text-${color}-200` : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
      <Icon size={12} /> {label} {checked ? '✓' : ''}
    </button>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="text-center py-8 text-zinc-500 text-sm">{label}</div>;
}


// ─────────────────────────────────────────────
// FRESHNESS PANEL — score de complétude de la fiche
// ─────────────────────────────────────────────
function FreshnessPanel({ venueId, venue, onSuggestEnrich }: { venueId: string; venue: any; onSuggestEnrich: () => void }) {
  const [data, setData] = useState<{ score: number; parts: any[]; missing: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    const r = await fetch(`/api/admin/venues/${venueId}/freshness`).then((r) => r.json()).catch(() => null);
    setLoading(false);
    if (r?.score !== undefined) setData(r);
  }
  // Chargement initial
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [venueId]);

  if (!data) {
    return (
      <div className="mb-4 bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-500 flex items-center justify-between">
        <span>{loading ? 'Calcul fraîcheur…' : 'Calcul du score de complétude…'}</span>
        <button onClick={refresh} className="text-cyan-300 hover:underline">Calculer</button>
      </div>
    );
  }

  const color = data.score >= 80 ? 'emerald' : data.score >= 60 ? 'cyan' : data.score >= 40 ? 'amber' : 'rose';
  const colorMap: any = {
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    cyan: { bar: 'bg-cyan-500', text: 'text-cyan-300', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    rose: { bar: 'bg-rose-500', text: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
  };
  const c = colorMap[color];

  return (
    <div className={`mb-4 ${c.bg} border ${c.border} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-black ${c.text}`}>{data.score}%</div>
          <div>
            <div className="text-xs font-bold">Fraîcheur de la fiche</div>
            <div className="text-[10px] text-zinc-400">{data.score >= 80 ? '🌟 Excellente' : data.score >= 60 ? '👍 Bonne' : data.score >= 40 ? '⚡ À enrichir' : '⚠️ Très pauvre'}</div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={refresh} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700 text-xs px-2 py-1 rounded">↻</button>
          {data.score < 80 && (
            <button onClick={onSuggestEnrich} className={`text-xs px-2 py-1 rounded font-bold bg-fuchsia-500/30 text-fuchsia-200 hover:bg-fuchsia-500/40`}>
              ⚡ Enrichir IA
            </button>
          )}
        </div>
      </div>
      {/* Barre de progression */}
      <div className="bg-zinc-800 rounded h-2 overflow-hidden mb-3">
        <div className={`h-full ${c.bar} transition-all`} style={{ width: `${data.score}%` }} />
      </div>
      {/* Breakdown par champ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
        {data.parts.map((p, i) => (
          <div key={i} className={`text-[10px] flex items-center gap-1 ${p.ok ? 'text-emerald-300/70' : 'text-zinc-500'}`}>
            <span>{p.ok ? '✓' : '○'}</span>
            <span className="truncate">{p.label}</span>
            <span className="ml-auto opacity-60">{p.got}/{p.max}</span>
          </div>
        ))}
      </div>
      {data.missing.length > 0 && (
        <div className="mt-2 text-[10px] text-zinc-500">
          <b>À ajouter :</b> {data.missing.slice(0, 6).join(' · ')}
        </div>
      )}
    </div>
  );
}
