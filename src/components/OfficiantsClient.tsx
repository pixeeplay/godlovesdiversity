'use client';
import { useEffect, useState } from 'react';
import { Loader2, HandHeart, MapPin, Mail, Phone, Globe, CheckCircle2, Send, X } from 'lucide-react';

const FAITHS = [
  { id: 'catholic',   label: 'Catholique',   emoji: '✝️' },
  { id: 'protestant', label: 'Protestant',   emoji: '✠' },
  { id: 'orthodox',   label: 'Orthodoxe',    emoji: '☦️' },
  { id: 'muslim',     label: 'Musulman·e',   emoji: '☪️' },
  { id: 'jewish',     label: 'Juif·ve',      emoji: '✡️' },
  { id: 'buddhist',   label: 'Bouddhiste',   emoji: '☸️' },
  { id: 'hindu',      label: 'Hindou·e',     emoji: '🕉️' },
  { id: 'sikh',       label: 'Sikh·e',       emoji: '☬' },
  { id: 'interfaith', label: 'Inter-religieux', emoji: '🌍' }
];

const SERVICES = ['mariage', 'baptême', 'funérailles', 'bénédiction', 'conversion', 'rite-passage'];

export function OfficiantsClient() {
  const [officiants, setOfficiants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFaith, setFilterFaith] = useState<string>('');
  const [filterService, setFilterService] = useState<string>('');
  const [bookingTarget, setBookingTarget] = useState<any>(null);
  const [bookingForm, setBookingForm] = useState<any>({ requesterName: '', requesterEmail: '', serviceType: 'mariage', proposedDate: '', city: '', message: '' });
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterFaith) params.set('faith', filterFaith);
      if (filterService) params.set('service', filterService);
      const r = await fetch(`/api/officiants?${params}`);
      const j = await r.json();
      setOfficiants(j.officiants || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [filterFaith, filterService]);

  async function submitBooking() {
    if (!bookingForm.requesterName || !bookingForm.requesterEmail.includes('@')) {
      setBookingMsg('⚠ Nom + email valide requis');
      return;
    }
    setBookingSubmitting(true);
    try {
      const r = await fetch('/api/officiants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingForm, officiantId: bookingTarget.id })
      });
      const j = await r.json();
      if (r.ok) {
        setBookingMsg('✓ Demande envoyée — l\'officiant·e te recontactera');
        setTimeout(() => { setBookingTarget(null); setBookingMsg(null); setBookingForm({ requesterName: '', requesterEmail: '', serviceType: 'mariage', proposedDate: '', city: '', message: '' }); }, 2500);
      } else {
        setBookingMsg(`⚠ ${j.error}`);
      }
    } catch (e: any) { setBookingMsg(`⚠ ${e.message}`); }
    setBookingSubmitting(false);
  }

  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-500 rounded-2xl p-3 mb-3">
          <HandHeart size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Officiants LGBT-friendly</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl mx-auto">
          Annuaire d'officiants religieux prêts à célébrer mariages, baptêmes, funérailles, bénédictions et autres rites pour les couples et les personnes LGBT+.
        </p>
      </header>

      {/* Filtres */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2">Confession</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button onClick={() => setFilterFaith('')} className={`text-xs px-3 py-1.5 rounded-full font-bold ${!filterFaith ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>Toutes</button>
          {FAITHS.map(f => (
            <button key={f.id} onClick={() => setFilterFaith(filterFaith === f.id ? '' : f.id)} className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ${filterFaith === f.id ? 'bg-violet-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              <span>{f.emoji}</span> {f.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest mb-2">Service recherché</div>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setFilterService('')} className={`text-xs px-3 py-1.5 rounded-full font-bold ${!filterService ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}>Tous</button>
          {SERVICES.map(s => (
            <button key={s} onClick={() => setFilterService(filterService === s ? '' : s)} className={`text-xs px-3 py-1.5 rounded-full ${filterService === s ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
              {s}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-zinc-500" /></div>
      ) : officiants.length === 0 ? (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-12 text-center">
          <HandHeart size={40} className="text-amber-400 mx-auto mb-3" />
          <h2 className="font-bold text-amber-200">Annuaire en construction</h2>
          <p className="text-sm text-amber-300/80 mt-2 max-w-xl mx-auto">
            Aucun officiant ne correspond encore à ce filtre. Tu es officiant·e LGBT-friendly ?
            <a href="/contact?sujet=Inscription+officiant" className="text-fuchsia-400 hover:underline ml-1">Inscris-toi</a>.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {officiants.map(o => {
            const faithMeta = FAITHS.find(f => f.id === o.faith);
            return (
              <article key={o.id} className="bg-zinc-900 border border-zinc-800 hover:border-fuchsia-500/40 rounded-2xl p-4 transition">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center text-xl font-bold text-white shrink-0">
                    {o.avatarUrl ? <img src={o.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" /> : o.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{o.name}</h3>
                      {o.verified && <CheckCircle2 size={12} className="text-cyan-400" />}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      {faithMeta?.emoji} {faithMeta?.label} · {o.role}
                    </div>
                    {(o.city || o.country) && (
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} /> {[o.city, o.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                {o.bio && <p className="text-xs text-zinc-300 mb-3 line-clamp-3">{o.bio}</p>}
                {o.servicesOffered?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {o.servicesOffered.map((s: string) => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200">{s}</span>
                    ))}
                  </div>
                )}
                {o.affiliations?.length > 0 && (
                  <div className="text-[10px] text-violet-300 mb-3">
                    Affilié·e : {o.affiliations.join(' · ')}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-zinc-800">
                  {o.email && <a href={`mailto:${o.email}`} className="text-[11px] text-fuchsia-400 hover:underline flex items-center gap-1"><Mail size={10} /> Email</a>}
                  {o.phone && <a href={`tel:${o.phone}`} className="text-[11px] text-fuchsia-400 hover:underline flex items-center gap-1"><Phone size={10} /> Tel</a>}
                  {o.website && <a href={o.website} target="_blank" rel="noopener noreferrer" className="text-[11px] text-fuchsia-400 hover:underline flex items-center gap-1"><Globe size={10} /> Site</a>}
                  <button onClick={() => setBookingTarget(o)} className="ml-auto text-xs bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-bold px-3 py-1 rounded-full">
                    Demander
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-violet-500/10 border border-violet-500/40 rounded-xl p-4 text-sm text-violet-200 text-center">
        💡 Tu es officiant·e LGBT-friendly et veux figurer dans l'annuaire ? <a href="/contact?sujet=Inscription+officiant" className="underline font-bold">Inscris-toi gratuitement</a>.
      </div>

      {/* Modal booking */}
      {bookingTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setBookingTarget(null)}>
          <div className="bg-zinc-950 border border-fuchsia-500/40 rounded-2xl shadow-2xl max-w-lg w-full p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-base">Demander {bookingTarget.name}</h3>
                <p className="text-xs text-zinc-400">L'officiant·e te recontactera par email.</p>
              </div>
              <button onClick={() => setBookingTarget(null)}><X size={16} className="text-zinc-500" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <input value={bookingForm.requesterName} onChange={(e) => setBookingForm({ ...bookingForm, requesterName: e.target.value })} placeholder="Ton nom *" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
              <input value={bookingForm.requesterEmail} onChange={(e) => setBookingForm({ ...bookingForm, requesterEmail: e.target.value })} type="email" placeholder="Ton email *" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <select value={bookingForm.serviceType} onChange={(e) => setBookingForm({ ...bookingForm, serviceType: e.target.value })} className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
                {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input value={bookingForm.proposedDate} onChange={(e) => setBookingForm({ ...bookingForm, proposedDate: e.target.value })} type="date" placeholder="Date souhaitée" className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm" />
            </div>
            <input value={bookingForm.city} onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })} placeholder="Ville" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm mb-3" />
            <textarea value={bookingForm.message} onChange={(e) => setBookingForm({ ...bookingForm, message: e.target.value })} rows={4} placeholder="Décris ta demande, le contexte, vos attentes…" className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm mb-3" />
            <div className="flex items-center justify-end gap-2">
              {bookingMsg && <span className="text-xs text-fuchsia-300 mr-auto">{bookingMsg}</span>}
              <button onClick={() => setBookingTarget(null)} className="text-xs text-zinc-400 hover:text-white px-3 py-2">Annuler</button>
              <button onClick={submitBooking} disabled={bookingSubmitting} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1">
                {bookingSubmitting ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
