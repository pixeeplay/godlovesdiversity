'use client';
import { useEffect, useRef, useState } from 'react';
import { Heart, Users, Send, Flame, Sparkles, MapPin, Loader2 } from 'lucide-react';

const CIRCLES = [
  { id: 'catholic',    label: 'Catholique inclusif',  emoji: '✝️',  color: '#dc2626', day: 'Mardi',           time: '20h CET',     hosts: 'David & Jonathan',                       url: 'https://www.davidetjonathan.com' },
  { id: 'protestant',  label: 'Protestant inclusif',  emoji: '✠',   color: '#1e40af', day: 'Jeudi',           time: '20h CET',     hosts: 'Carrefour des Chrétiens Inclusifs (CCI)', url: 'https://www.carrefour-cci.org' },
  { id: 'orthodox',    label: 'Orthodoxe inclusif',   emoji: '☦️',  color: '#7c3aed', day: 'Dimanche',        time: '18h CET',     hosts: 'Cercle œcuménique GLD',                  url: '/contact' },
  { id: 'muslim',      label: 'Musulman·e LGBT',      emoji: '☪️',  color: '#059669', day: 'Vendredi',        time: '21h CET',     hosts: 'HM2F',                                   url: 'https://hm2f.org' },
  { id: 'jewish',      label: 'Juif·ves LGBT',        emoji: '✡️',  color: '#3b82f6', day: 'Vendredi soir',   time: 'avant Shabbat', hosts: 'Beit Haverim',                         url: 'https://beit-haverim.com' },
  { id: 'buddhist',    label: 'Bouddhiste·s LGBT',    emoji: '☸️',  color: '#f59e0b', day: 'Dimanche',        time: '19h CET',     hosts: 'Sangha Inclusive Européenne',            url: '#' },
  { id: 'hindu',       label: 'Hindou·es LGBT',       emoji: '🕉️',  color: '#ec4899', day: 'Mercredi',        time: '20h CET',     hosts: 'Réseau Galva-108',                       url: 'https://galva108.org' },
  { id: 'sikh',        label: 'Sikh·es LGBT',         emoji: '☬',   color: '#f97316', day: 'Samedi',          time: '11h CET',     hosts: 'Sarbat (UK Sikh LGBT)',                  url: 'https://www.sarbat.net' },
  { id: 'interfaith',  label: 'Inter-religieux',      emoji: '🌍',  color: '#22d3ee', day: '1er dim. du mois', time: '17h CET',    hosts: 'GLD',                                    url: '/contact' }
];

export function CerclesPriereLive() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [activeCircle, setActiveCircle] = useState<string | null>(null);
  const [intentions, setIntentions] = useState<any[]>([]);
  const [intentionText, setIntentionText] = useState('');
  const [postingIntention, setPostingIntention] = useState(false);
  const [intentionMsg, setIntentionMsg] = useState<string | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  // Heartbeat de présence + counts
  useEffect(() => {
    let interval: any;
    let stop = false;

    async function ping() {
      if (stop || !activeCircle) return;
      try {
        const r = await fetch('/api/prayer-presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: sessionTokenRef.current, circle: activeCircle })
        });
        const j = await r.json();
        if (j.sessionToken) sessionTokenRef.current = j.sessionToken;
        if (j.counts) { setCounts(j.counts); setTotal(j.total); }
      } catch {}
    }

    async function fetchCounts() {
      try {
        const r = await fetch('/api/prayer-presence');
        const j = await r.json();
        setCounts(j.counts || {});
        setTotal(j.total || 0);
      } catch {}
    }

    fetchCounts();
    if (activeCircle) {
      ping();
      interval = setInterval(ping, 30_000);
    } else {
      // pas de cercle joint : pull counts toutes les 10s
      interval = setInterval(fetchCounts, 10_000);
    }

    return () => {
      stop = true;
      if (interval) clearInterval(interval);
      // sortie propre du cercle
      if (sessionTokenRef.current && activeCircle) {
        fetch(`/api/prayer-presence?sessionToken=${sessionTokenRef.current}`, { method: 'DELETE' }).catch(() => {});
      }
    };
  }, [activeCircle]);

  // Charge les intentions du cercle actif
  useEffect(() => {
    async function load() {
      const r = await fetch(`/api/prayer-intentions?circle=${activeCircle || 'public'}`);
      const j = await r.json();
      setIntentions(j.intentions || []);
    }
    load();
    const i = setInterval(load, 12_000);
    return () => clearInterval(i);
  }, [activeCircle]);

  async function postIntention() {
    if (intentionText.trim().length < 5) {
      setIntentionMsg('Trop court (min 5 chars)');
      return;
    }
    setPostingIntention(true);
    try {
      const r = await fetch('/api/prayer-intentions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: intentionText, circle: activeCircle || 'public' })
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        setIntentionText('');
        setIntentions((prev) => [j.intention, ...prev]);
        setIntentionMsg('✓ Intention partagée');
      } else {
        setIntentionMsg(`⚠ ${j.reason || j.error}`);
      }
    } catch (e: any) { setIntentionMsg(`⚠ ${e.message}`); }
    setPostingIntention(false);
    setTimeout(() => setIntentionMsg(null), 4000);
  }

  async function prayFor(intentionId: string) {
    setIntentions((prev) => prev.map(i => i.id === intentionId ? { ...i, prayerCount: (i.prayerCount || 0) + 1, _prayed: true } : i));
    try {
      await fetch('/api/prayer-intentions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: intentionId, action: 'pray' })
      });
    } catch {}
  }

  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-500 to-rose-500 rounded-2xl p-3 mb-3">
          <Heart size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Cercles de prière inclusifs</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">
          9 communautés spirituelles LGBT-friendly se retrouvent en ligne. Toutes sont gratuites et ouvertes.
        </p>

        {/* Compteur live global */}
        <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/40 rounded-full px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-bold text-emerald-200">
            {total === 0 ? 'Personne en prière maintenant' : `${total} personne${total > 1 ? 's' : ''} en prière maintenant`}
          </span>
        </div>
      </header>

      {/* Liens vers les pages associées */}
      <div className="grid sm:grid-cols-3 gap-2 mb-6">
        <a href="/champ-de-priere" className="bg-fuchsia-500/15 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-200 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 transition">
          <Flame size={14} /> Champ de prières mondial — bougies en direct
        </a>
        <a href="/compagnon-spirituel" className="bg-violet-500/15 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 transition">
          <Sparkles size={14} /> Compagnon spirituel IA — 4 personas
        </a>
        <a href="/calendrier-religieux" className="bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2 transition">
          🌍 Calendrier religieux mondial
        </a>
      </div>

      {/* Grille des 9 cercles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {CIRCLES.map((c) => {
          const count = counts[c.id] || 0;
          const isActive = activeCircle === c.id;
          return (
            <article
              key={c.id}
              className={`bg-zinc-900 border-2 rounded-2xl p-4 transition relative overflow-hidden ${
                isActive ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-zinc-800 hover:border-zinc-700'
              }`}
              style={{ borderLeftWidth: 4, borderLeftColor: c.color }}
            >
              {count > 0 && (
                <div className="absolute top-2 right-2 bg-emerald-500/20 text-emerald-200 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  {count} en prière
                </div>
              )}
              <div className="font-bold text-base mb-1 flex items-center gap-2">
                <span className="text-2xl">{c.emoji}</span> {c.label}
              </div>
              <div className="text-xs text-zinc-400">📅 {c.day} · 🕒 {c.time}</div>
              <div className="text-[11px] text-zinc-500 mt-1">Hôte : <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 hover:underline">{c.hosts}</a></div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setActiveCircle(isActive ? null : c.id)}
                  className={`flex-1 text-xs font-bold px-3 py-2 rounded-full flex items-center justify-center gap-1.5 transition ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-800 hover:bg-emerald-500/30 text-zinc-200'
                  }`}
                >
                  <Users size={12} /> {isActive ? 'Je suis dans ce cercle' : 'Rejoindre en prière'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Composer + feed des intentions */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2">
          <Heart size={16} className="text-fuchsia-400" />
          Intentions de prière {activeCircle ? `· ${CIRCLES.find(c => c.id === activeCircle)?.label}` : '· Public'}
        </h2>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 mb-4">
          <textarea
            value={intentionText}
            onChange={(e) => setIntentionText(e.target.value.slice(0, 280))}
            placeholder="Partage une intention que tu portes (anonyme par défaut, modéré IA)…"
            rows={2}
            className="w-full bg-transparent text-sm outline-none resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-zinc-500">{intentionText.length}/280 · modéré par IA</span>
            <div className="flex items-center gap-2">
              {intentionMsg && <span className="text-[10px] text-fuchsia-300">{intentionMsg}</span>}
              <button
                onClick={postIntention}
                disabled={postingIntention || intentionText.length < 5}
                className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
              >
                {postingIntention ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                Partager
              </button>
            </div>
          </div>
        </div>

        {intentions.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-6">
            Aucune intention partagée pour l'instant. Sois le premier à porter une parole.
          </div>
        ) : (
          <div className="space-y-2">
            {intentions.map(i => {
              const circle = CIRCLES.find(c => c.id === i.circle);
              return (
                <article key={i.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {i.isAnonymous ? '🕊' : (i.authorName?.[0]?.toUpperCase() || 'A')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-zinc-300">{i.isAnonymous ? 'Anonyme' : i.authorName}</span>
                        {circle && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: `${circle.color}30`, color: circle.color }}>
                            {circle.emoji} {circle.label}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 ml-auto">
                          {new Date(i.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap">{i.text}</p>
                      <button
                        onClick={() => prayFor(i.id)}
                        disabled={i._prayed}
                        className={`mt-2 text-xs px-3 py-1 rounded-full flex items-center gap-1.5 transition ${
                          i._prayed ? 'bg-pink-500/20 text-pink-200 cursor-default' : 'bg-zinc-800 hover:bg-pink-500/30 text-zinc-300 hover:text-pink-200'
                        }`}
                      >
                        <Heart size={10} className={i._prayed ? 'fill-pink-400 text-pink-400' : ''} />
                        {i._prayed ? 'Tu pries' : 'Je prie'} · {i.prayerCount || 0}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-8 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200 text-center">
        💡 Tu animes un cercle inclusif à ajouter ? <a href="/contact" className="underline font-bold">Écris-nous</a>.
      </div>
    </main>
  );
}
