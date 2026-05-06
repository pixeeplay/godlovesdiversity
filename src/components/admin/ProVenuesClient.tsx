'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Building2, Plus, Loader2, MapPin, Calendar, Tag, Eye, Sparkles, Star,
  Search, Trash2, Save, X, Pencil, ExternalLink, Camera,
  CheckSquare, Square, AlertTriangle, Globe, Phone, Mail, Heart
} from 'lucide-react';
import { AiTextHelper } from '@/components/AiTextHelper';

const TYPES = ['RESTAURANT','BAR','CAFE','CLUB','HOTEL','SHOP','CULTURAL','CHURCH','TEMPLE','COMMUNITY_CENTER','HEALTH','ASSOCIATION','OTHER'];
const RATINGS = [
  { v: 'RAINBOW',  label: '🏳️‍🌈 100% LGBT', color: 'fuchsia' },
  { v: 'FRIENDLY', label: '✨ Friendly',     color: 'violet'  },
  { v: 'NEUTRAL',  label: '⚪ Neutral',      color: 'zinc'    },
  { v: 'CAUTION',  label: '⚠️ À vérifier',   color: 'amber'   }
];

const empty = (): any => ({
  type: 'RESTAURANT', rating: 'FRIENDLY', name: '', shortDescription: '', description: '',
  address: '', city: '', country: 'FR', lat: '', lng: '', phone: '', email: '', website: '',
  coverImage: '', tags: [], instagram: '', facebook: '', published: true, featured: false, verified: false
});

function freshnessColor(score: number | null | undefined) {
  if (score == null) return 'zinc';
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'cyan';
  if (score >= 40) return 'amber';
  return 'rose';
}

// Static class maps (Tailwind JIT doit voir les classes en littéral)
const FRESH_PILL: Record<string, string> = {
  emerald: 'bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40',
  cyan:    'bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/40',
  amber:   'bg-amber-500/30 text-amber-200 hover:bg-amber-500/40',
  rose:    'bg-rose-500/30 text-rose-200 hover:bg-rose-500/40',
  zinc:    'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-700/70'
};

const STAT_BORDER: Record<string, string> = {
  violet:  'hover:border-violet-500/40',
  fuchsia: 'hover:border-fuchsia-500/40',
  emerald: 'hover:border-emerald-500/40',
  amber:   'hover:border-amber-500/40',
  cyan:    'hover:border-cyan-500/40',
  pink:    'hover:border-pink-500/40',
  rose:    'hover:border-rose-500/40',
  zinc:    'hover:border-zinc-600'
};
const STAT_ICON: Record<string, string> = {
  violet:  'text-violet-400',
  fuchsia: 'text-fuchsia-400',
  emerald: 'text-emerald-400',
  amber:   'text-amber-400',
  cyan:    'text-cyan-400',
  pink:    'text-pink-400',
  rose:    'text-rose-400',
  zinc:    'text-zinc-400'
};

const RATING_TEXT: Record<string, string> = {
  fuchsia: 'text-fuchsia-300',
  violet:  'text-violet-300',
  zinc:    'text-zinc-300',
  amber:   'text-amber-300'
};

export function ProVenuesClient({ initial, isAdmin }: { initial: any[]; isAdmin: boolean }) {
  const [venues, setVenues] = useState<any[]>(initial);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number; errors: number } | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [refreshingFreshId, setRefreshingFreshId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Anchor scroll #venueId pour les liens depuis le dashboard
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`venue-${hash}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-fuchsia-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-fuchsia-500'), 2200);
      }
    }, 200);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    let arr = venues;
    if (filter !== 'all') arr = arr.filter(v => v.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(v =>
        (v.name || '').toLowerCase().includes(q) ||
        (v.city || '').toLowerCase().includes(q) ||
        (Array.isArray(v.tags) ? v.tags.join(' ') : '').toLowerCase().includes(q)
      );
    }
    return arr;
  }, [venues, filter, search]);

  // Stats globales
  const stats = useMemo(() => {
    const total = venues.length;
    const enriched = venues.filter(v => v.enrichedAt).length;
    const published = venues.filter(v => v.published).length;
    const featured = venues.filter(v => v.featured).length;
    const avgFresh = venues.length
      ? Math.round(venues.reduce((s, v) => s + (v.freshnessScore || 0), 0) / venues.length)
      : 0;
    const events = venues.reduce((s, v) => s + (v._count?.events || 0), 0);
    const coupons = venues.reduce((s, v) => s + (v._count?.coupons || 0), 0);
    const views = venues.reduce((s, v) => s + (v.views || 0), 0);
    return { total, enriched, published, featured, avgFresh, events, coupons, views };
  }, [venues]);

  function showFlash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 4500);
  }

  async function save() {
    if (!editing.name || !editing.type) { alert('Nom et type obligatoires'); return; }
    setSaving(true);
    try {
      const data = {
        ...editing,
        lat: editing.lat ? Number(editing.lat) : null,
        lng: editing.lng ? Number(editing.lng) : null,
        tags: typeof editing.tags === 'string'
          ? editing.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : editing.tags
      };
      const url = editing.id ? `/api/admin/venues/${editing.id}` : '/api/admin/venues';
      const method = editing.id ? 'PATCH' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (r.ok) {
        if (editing.id) setVenues(venues.map(v => v.id === editing.id ? { ...v, ...j.venue } : v));
        else setVenues([j.venue, ...venues]);
        setEditing(null);
        showFlash('✓ Lieu enregistré');
      } else alert(`Erreur : ${j.error}`);
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce lieu et ses événements/coupons liés ?')) return;
    const r = await fetch(`/api/admin/venues/${id}`, { method: 'DELETE' });
    if (r.ok) {
      setVenues(venues.filter(v => v.id !== id));
      showFlash('✓ Lieu supprimé');
    }
  }

  async function enrichOne(id: string) {
    setEnrichingId(id);
    try {
      const r = await fetch(`/api/admin/venues/${id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite: false })
      });
      const j = await r.json();
      if (r.ok && j.venue) {
        setVenues(venues.map(v => v.id === id ? { ...v, ...j.venue } : v));
        showFlash(`✨ Enrichi : ${j.venue.name} (confiance ${Math.round((j.venue.enrichmentConfidence || 0) * 100)}%)`);
      } else {
        showFlash(`⚠ Échec enrichissement : ${j.error || 'erreur'}`);
      }
    } catch (e: any) {
      showFlash(`⚠ ${e.message}`);
    }
    setEnrichingId(null);
  }

  async function refreshFreshness(id: string) {
    setRefreshingFreshId(id);
    try {
      const r = await fetch(`/api/admin/venues/${id}/freshness`);
      const j = await r.json();
      if (r.ok && j.score != null) {
        setVenues(venues.map(v => v.id === id ? { ...v, freshnessScore: j.score, freshnessCheckedAt: new Date().toISOString() } : v));
        showFlash(`📊 Score fraîcheur : ${Math.round(j.score)}%`);
      }
    } catch {}
    setRefreshingFreshId(null);
  }

  async function bulkEnrich() {
    if (selected.size === 0) return;
    if (!confirm(`Lancer l'enrichissement IA sur ${selected.size} lieux ? Cela peut prendre plusieurs minutes.`)) return;
    setBulkLoading(true);
    setBulkProgress({ done: 0, total: selected.size, errors: 0 });
    const ids = Array.from(selected);
    let done = 0, errors = 0;
    for (const id of ids) {
      try {
        const r = await fetch(`/api/admin/venues/${id}/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ overwrite: false })
        });
        const j = await r.json();
        if (r.ok && j.venue) {
          setVenues(prev => prev.map(v => v.id === id ? { ...v, ...j.venue } : v));
        } else errors++;
      } catch { errors++; }
      done++;
      setBulkProgress({ done, total: selected.size, errors });
    }
    setBulkLoading(false);
    showFlash(`✨ Bulk terminé : ${done - errors}/${done} succès${errors ? ` · ${errors} échecs` : ''}`);
    setSelected(new Set());
    setTimeout(() => setBulkProgress(null), 6000);
  }

  function toggleSelect(id: string) {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(v => v.id)));
  }

  return (
    <div className="p-4 md:p-8 max-w-[1500px] space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl p-3 shadow-lg shadow-fuchsia-500/30">
            <Building2 size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">
              Mes lieux {isAdmin && <span className="text-fuchsia-400 text-sm font-normal">· vue super-admin</span>}
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              <Link href="/admin/pro" className="hover:underline text-fuchsia-300">← retour Espace Pro</Link>
              {' · '}<Link href="/lieux" target="_blank" className="hover:underline">page publique /lieux</Link>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEditing(empty())}
            className="bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold px-4 py-2 rounded-full text-xs flex items-center gap-1.5"
          >
            <Plus size={13} /> Nouveau lieu
          </button>
          {selected.size > 0 && (
            <button
              onClick={bulkEnrich}
              disabled={bulkLoading}
              className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-full text-xs flex items-center gap-1.5"
            >
              {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              Enrichir IA ({selected.size})
            </button>
          )}
        </div>
      </header>

      {/* Stats globales */}
      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
        <Stat icon={Building2} val={stats.total}     lab="Total"      color="violet" />
        <Stat icon={Sparkles}  val={stats.enriched}  lab="Enrichis"   color="fuchsia" />
        <Stat icon={Eye}       val={stats.published} lab="Publiés"    color="emerald" />
        <Stat icon={Star}      val={stats.featured}  lab="Featured"   color="amber" />
        <Stat icon={Calendar}  val={stats.events}    lab="Events"     color="cyan" />
        <Stat icon={Tag}       val={stats.coupons}   lab="Coupons"    color="pink" />
        <Stat icon={Heart}     val={`${stats.avgFresh}%`} lab="Fraîcheur ⌀" color={freshnessColor(stats.avgFresh)} />
      </section>

      {/* Toolbar : search + filtres types */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3 space-y-3 backdrop-blur">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un lieu, une ville, un tag…"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-full pl-9 pr-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
            />
          </div>
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? <CheckSquare size={13} className="text-fuchsia-300" />
              : <Square size={13} />}
            {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : 'Tout sélectionner'}
          </button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <FilterPill active={filter === 'all'} on={() => setFilter('all')} label={`Tous (${venues.length})`} />
          {TYPES.map(t => {
            const n = venues.filter(v => v.type === t).length;
            if (!n) return null;
            return <FilterPill key={t} active={filter === t} on={() => setFilter(t)} label={`${t} (${n})`} />;
          })}
        </div>
      </section>

      {/* Bulk progress bar */}
      {bulkProgress && (
        <div className="bg-fuchsia-500/10 border border-fuchsia-500/40 rounded-xl p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-fuchsia-200 flex items-center gap-1.5">
              <Sparkles size={12} className="animate-pulse" />
              Enrichissement IA en cours
            </span>
            <span className="text-fuchsia-200">
              {bulkProgress.done} / {bulkProgress.total}
              {bulkProgress.errors > 0 && <span className="text-rose-300"> · {bulkProgress.errors} échecs</span>}
            </span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all duration-300"
              style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Flash feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-fuchsia-500/40 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-50">
          {feedback}
        </div>
      )}

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <Building2 size={36} className="mx-auto mb-3 opacity-30" />
          {venues.length === 0
            ? <>Tu n'as pas encore de lieu. <button onClick={() => setEditing(empty())} className="text-fuchsia-400 hover:underline ml-1">Créer le premier →</button></>
            : 'Aucun résultat avec ces filtres.'}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(v => (
            <VenueCard
              key={v.id}
              v={v}
              selected={selected.has(v.id)}
              onToggle={() => toggleSelect(v.id)}
              onEdit={() => setEditing(v)}
              onRemove={() => remove(v.id)}
              onEnrich={() => enrichOne(v.id)}
              onFreshness={() => refreshFreshness(v.id)}
              enriching={enrichingId === v.id}
              refreshingFresh={refreshingFreshId === v.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Modal édition */}
      {editing && (
        <EditModal
          editing={editing}
          setEditing={setEditing}
          onSave={save}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      )}

    </div>
  );
}

/* -------------------- Sub-components -------------------- */

function Stat({ icon: Icon, val, lab, color }: any) {
  return (
    <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3 transition ${STAT_BORDER[color] || STAT_BORDER.zinc}`}>
      <Icon size={14} className={`mb-1 ${STAT_ICON[color] || STAT_ICON.zinc}`} />
      <div className="text-lg font-bold leading-none">{val}</div>
      <div className="text-[9px] text-zinc-500 uppercase mt-1 tracking-wider">{lab}</div>
    </div>
  );
}

function FilterPill({ active, on, label }: any) {
  return (
    <button
      onClick={on}
      className={`px-3 py-1 rounded-full text-[11px] font-bold transition ${
        active ? 'bg-fuchsia-500 text-white shadow shadow-fuchsia-500/30' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
      }`}
    >
      {label}
    </button>
  );
}

function VenueCard({ v, selected, onToggle, onEdit, onRemove, onEnrich, onFreshness, enriching, refreshingFresh, isAdmin }: any) {
  const fresh = v.freshnessScore;
  const freshC = freshnessColor(fresh);
  const ratingMeta = RATINGS.find(r => r.v === v.rating);

  return (
    <article
      id={`venue-${v.id}`}
      className={`bg-zinc-900 border ${selected ? 'border-fuchsia-500' : 'border-zinc-800'} rounded-2xl overflow-hidden hover:border-fuchsia-500/50 transition relative group`}
    >
      {/* Cover */}
      <div className="relative h-28 bg-gradient-to-br from-zinc-800 to-zinc-900">
        {v.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-40">
            <Camera size={26} className="text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent" />

        {/* Top-left : checkbox + featured */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <button
            onClick={onToggle}
            className={`w-5 h-5 rounded flex items-center justify-center ${selected ? 'bg-fuchsia-500 text-white' : 'bg-black/60 backdrop-blur text-zinc-300'} hover:bg-fuchsia-500 hover:text-white transition`}
          >
            {selected ? <CheckSquare size={11} /> : <Square size={11} />}
          </button>
          {v.featured && <span className="text-amber-400 bg-black/60 backdrop-blur p-1 rounded"><Star size={10} fill="currentColor" /></span>}
        </div>

        {/* Top-right : status + freshness */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold backdrop-blur ${v.published ? 'bg-emerald-500/30 text-emerald-200' : 'bg-zinc-700/60 text-zinc-300'}`}>
            {v.published ? '● live' : 'draft'}
          </span>
          {fresh != null && (
            <button
              onClick={onFreshness}
              disabled={refreshingFresh}
              title="Recalculer le score de fraîcheur"
              className={`text-[9px] px-2 py-0.5 rounded-full font-bold backdrop-blur flex items-center gap-1 hover:scale-105 transition ${FRESH_PILL[freshC] || FRESH_PILL.zinc}`}
            >
              {refreshingFresh ? <Loader2 size={9} className="animate-spin" /> : '📊'} {Math.round(fresh)}%
            </button>
          )}
          {v.enrichedAt && (
            <span className="text-[9px] px-2 py-0.5 rounded-full font-bold backdrop-blur bg-fuchsia-500/30 text-fuchsia-100" title={`Enrichi le ${new Date(v.enrichedAt).toLocaleString('fr-FR')}`}>
              ✨ IA
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-bold text-white truncate">{v.name}</h3>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-zinc-400 font-mono">{v.type}</span>
            {ratingMeta && <span className={`text-[10px] ${RATING_TEXT[ratingMeta.color] || 'text-zinc-300'}`}>{ratingMeta.label}</span>}
          </div>
          {(v.city || v.country) && (
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <MapPin size={10} /> {[v.city, v.country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>

        {/* Stats inline */}
        <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
          <span className="flex items-center gap-1" title="Événements"><Calendar size={10} /> {v._count?.events || 0}</span>
          <span className="flex items-center gap-1" title="Coupons"><Tag size={10} /> {v._count?.coupons || 0}</span>
          <span className="flex items-center gap-1" title="Vues"><Eye size={10} /> {v.views || 0}</span>
          {v.phone && <Phone size={10} className="text-emerald-400" aria-label="Téléphone" />}
          {v.website && <Globe size={10} className="text-cyan-400" aria-label="Site web" />}
          {v.email && <Mail size={10} className="text-violet-400" aria-label="Email" />}
        </div>

        {/* Actions */}
        <div className="flex gap-1 pt-1">
          <button
            onClick={onEdit}
            className="flex-1 bg-zinc-800 hover:bg-fuchsia-600 text-white text-[10px] font-bold px-2 py-1.5 rounded flex items-center justify-center gap-1 transition"
          >
            <Pencil size={10} /> Éditer
          </button>
          <button
            onClick={onEnrich}
            disabled={enriching}
            title="Enrichir avec IA Gemini (téléphone, horaires, photos…)"
            className="flex-1 bg-gradient-to-r from-fuchsia-500/30 to-violet-500/30 hover:from-fuchsia-500 hover:to-violet-500 border border-fuchsia-500/40 text-fuchsia-100 hover:text-white text-[10px] font-bold px-2 py-1.5 rounded flex items-center justify-center gap-1 transition disabled:opacity-60"
          >
            {enriching ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
            IA
          </button>
          <Link
            href={`/admin/pro/events?venue=${v.id}`}
            title="Voir les events de ce lieu"
            className="bg-zinc-800 hover:bg-cyan-600 text-zinc-300 hover:text-white text-[10px] px-2 py-1.5 rounded flex items-center justify-center transition"
          >
            <Calendar size={11} />
          </Link>
          <Link
            href={`/lieux#${v.slug || v.id}`}
            target="_blank"
            title="Voir la fiche publique"
            className="bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white text-[10px] px-2 py-1.5 rounded flex items-center justify-center transition"
          >
            <ExternalLink size={11} />
          </Link>
          {isAdmin && (
            <button
              onClick={onRemove}
              title="Supprimer"
              className="bg-zinc-800 hover:bg-rose-600 text-zinc-400 hover:text-white text-[10px] px-2 py-1.5 rounded flex items-center justify-center transition"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {/* Warnings */}
        {!v.coverImage && (
          <div className="text-[9px] text-amber-300/70 flex items-center gap-1">
            <AlertTriangle size={9} /> Pas de photo : améliore le score IA
          </div>
        )}
      </div>
    </article>
  );
}

/* -------------------- Edit Modal -------------------- */

function EditModal({ editing, setEditing, onSave, onCancel, saving }: any) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-zinc-950 border border-fuchsia-500/30 rounded-2xl p-5 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl shadow-fuchsia-500/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-zinc-950 -mt-5 -mx-5 px-5 pt-5 pb-3 border-b border-zinc-800 z-10">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {editing.id ? <Pencil size={16} /> : <Plus size={16} />}
            {editing.id ? 'Modifier le lieu' : 'Créer un lieu'}
          </h2>
          <button onClick={onCancel} className="text-zinc-500 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Nom *" v={editing.name} on={(x: string) => setEditing({ ...editing, name: x })} />
          <div className="grid grid-cols-2 gap-2">
            <SelField label="Type" v={editing.type} options={TYPES} on={(x: string) => setEditing({ ...editing, type: x })} />
            <SelField
              label="Rating"
              v={editing.rating}
              options={RATINGS.map(r => r.v)}
              labels={RATINGS.map(r => r.label)}
              on={(x: string) => setEditing({ ...editing, rating: x })}
            />
          </div>

          <Field label="Adresse" v={editing.address} on={(x: string) => setEditing({ ...editing, address: x })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="Ville" v={editing.city} on={(x: string) => setEditing({ ...editing, city: x })} />
            <Field label="Pays (code)" v={editing.country} on={(x: string) => setEditing({ ...editing, country: x })} placeholder="FR" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitude" v={editing.lat || ''} on={(x: string) => setEditing({ ...editing, lat: x })} placeholder="48.8566" />
            <Field label="Longitude" v={editing.lng || ''} on={(x: string) => setEditing({ ...editing, lng: x })} placeholder="2.3522" />
          </div>

          <Field label="Téléphone" v={editing.phone || ''} on={(x: string) => setEditing({ ...editing, phone: x })} />
          <Field label="Email" v={editing.email || ''} on={(x: string) => setEditing({ ...editing, email: x })} />
          <Field label="Site web" v={editing.website || ''} on={(x: string) => setEditing({ ...editing, website: x })} placeholder="https://…" />
          <Field label="URL réservation" v={editing.bookingUrl || ''} on={(x: string) => setEditing({ ...editing, bookingUrl: x })} />
          <Field label="Image cover URL" v={editing.coverImage || ''} on={(x: string) => setEditing({ ...editing, coverImage: x })} />
          <Field label="Logo URL" v={editing.logo || ''} on={(x: string) => setEditing({ ...editing, logo: x })} />
          <Field label="Instagram (@handle)" v={editing.instagram || ''} on={(x: string) => setEditing({ ...editing, instagram: x })} />
          <Field label="Facebook URL" v={editing.facebook || ''} on={(x: string) => setEditing({ ...editing, facebook: x })} />
        </div>

        {/* Description courte */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold uppercase text-zinc-400">Description courte (carte, max 150)</label>
            <AiTextHelper
              value={editing.shortDescription || ''}
              onChange={(s: string) => setEditing({ ...editing, shortDescription: s.slice(0, 150) })}
              context={`Lieu LGBTQ+ "${editing.name || ''}" type ${editing.type} à ${editing.city || '?'}`}
            />
          </div>
          <input
            value={editing.shortDescription || ''}
            onChange={(e) => setEditing({ ...editing, shortDescription: e.target.value })}
            maxLength={150}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
          />
          <div className="text-[10px] text-zinc-500 text-right mt-0.5">{(editing.shortDescription || '').length}/150</div>
        </div>

        {/* Description complète */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold uppercase text-zinc-400">Description complète</label>
            <AiTextHelper
              value={editing.description || ''}
              onChange={(s: string) => setEditing({ ...editing, description: s })}
              context={`Description longue d'un lieu LGBTQ+ "${editing.name || ''}" type ${editing.type}`}
            />
          </div>
          <textarea
            value={editing.description || ''}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            rows={5}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div className="mt-3">
          <label className="text-xs font-bold uppercase text-zinc-400">Tags (virgules)</label>
          <input
            value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags || ''}
            onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
            className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            placeholder="happy-hour, drag-show, brunch, terrasse"
          />
        </div>

        {/* Toggles */}
        <div className="mt-4 flex flex-wrap gap-4 pt-3 border-t border-zinc-800">
          <Toggle label="Publié" v={editing.published} on={(x: boolean) => setEditing({ ...editing, published: x })} />
          <Toggle label="Mis en avant" v={editing.featured} on={(x: boolean) => setEditing({ ...editing, featured: x })} />
          <Toggle label="Vérifié" v={editing.verified} on={(x: boolean) => setEditing({ ...editing, verified: x })} />
        </div>

        {/* Enrichissement IA notes */}
        {editing.enrichmentNotes && (
          <details className="mt-4 bg-fuchsia-500/5 border border-fuchsia-500/30 rounded-lg p-3">
            <summary className="text-xs font-bold text-fuchsia-300 cursor-pointer flex items-center gap-1.5">
              <Sparkles size={11} /> Notes enrichissement IA
              <span className="ml-auto text-[10px] text-fuchsia-400/70">
                {editing.enrichedAt && new Date(editing.enrichedAt).toLocaleDateString('fr-FR')}
                {editing.enrichmentConfidence != null && ` · confiance ${Math.round(editing.enrichmentConfidence * 100)}%`}
              </span>
            </summary>
            <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto">{editing.enrichmentNotes}</pre>
          </details>
        )}

        {/* Footer */}
        <div className="mt-6 flex justify-end gap-2 sticky bottom-0 bg-zinc-950 -mx-5 -mb-5 px-5 py-3 border-t border-zinc-800">
          <button onClick={onCancel} className="px-4 py-2 text-zinc-400 hover:text-white text-sm">Annuler</button>
          <button
            onClick={onSave}
            disabled={saving}
            className="bg-gradient-to-r from-pink-500 to-violet-600 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, v, on, placeholder }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-zinc-400">{label}</span>
      <input
        value={v}
        onChange={(e) => on(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
      />
    </label>
  );
}

function SelField({ label, v, on, options, labels }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase text-zinc-400">{label}</span>
      <select
        value={v}
        onChange={(e) => on(e.target.value)}
        className="w-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
      >
        {options.map((o: string, i: number) => <option key={o} value={o}>{labels?.[i] ?? o}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, v, on }: any) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm">
      <input type="checkbox" checked={!!v} onChange={(e) => on(e.target.checked)} className="w-4 h-4 accent-fuchsia-500" />
      {label}
    </label>
  );
}
