'use client';
import { useState, useRef } from 'react';
import { X, Heart, Star, Filter, ShieldCheck, Crown, MessageCircle, MapPin } from 'lucide-react';
import { MOCK_SWIPE_DECK, getUser, INTENTION_LABELS } from '@/lib/connect-mock';

export default function RencontresPage() {
  const [deck, setDeck] = useState(MOCK_SWIPE_DECK);
  const [matches, setMatches] = useState<string[]>([]);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showPremium, setShowPremium] = useState(false);
  const startX = useRef<number | null>(null);

  function decide(action: 'pass' | 'like' | 'super') {
    if (deck.length === 0) return;
    const top = deck[0];
    setDeck(deck.slice(1));
    if (action === 'like' || action === 'super') {
      // Simule un match aléatoire (50%)
      if (Math.random() > 0.5) setMatches([top.userHandle, ...matches]);
    }
    setSwipeOffset(0);
  }

  const top = deck[0];
  const next = deck[1];
  const topUser = top ? getUser(top.userHandle) : null;
  const nextUser = next ? getUser(next.userHandle) : null;

  return (
    <div className="grid lg:grid-cols-[260px_1fr_240px] gap-5">
      {/* INTENTIONS + filtres */}
      <aside className="space-y-3">
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-4 sticky top-32">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5"><Filter size={12} /> Mes intentions</h3>
          <ToggleRow defaultChecked label="💖 Amour / couple" sub="Je cherche une relation" />
          <ToggleRow defaultChecked label="🕊 Amitié spirituelle" sub="Discussions, partages de foi" />
          <ToggleRow label="🎓 Mentor de foi" sub="Quelqu'un qui m'accompagne" />
          <ToggleRow label="🏠 Coloc inclusive" sub="Vivre ensemble, partager" />

          <div className="border-t border-white/10 mt-4 pt-4">
            <h3 className="text-xs font-bold text-zinc-300 mb-2">Filtres</h3>
            <FilterRow label="Distance" value="25 km" />
            <FilterRow label="Âge" value="28-42" />
            <FilterRow label="Tradition" value="Toutes" />
            <FilterRow label="Verified only" value="Oui" />
          </div>

          <button
            onClick={() => setShowPremium(true)}
            className="w-full mt-4 bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-500 text-white font-bold text-xs py-2.5 rounded-full shadow-lg flex items-center justify-center gap-1.5"
          >
            <Crown size={12} /> GLD Premium · 5€/mois
          </button>
        </div>
      </aside>

      {/* DECK CENTRAL */}
      <div className="flex flex-col items-center gap-4">
        {topUser && top ? (
          <>
            {/* Carte du dessous (next) */}
            <div className="relative w-full max-w-sm" style={{ aspectRatio: '3/4' }}>
              {nextUser && (
                <div className="absolute inset-0 backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl shadow-2xl scale-95 opacity-50" style={{
                  background: `linear-gradient(135deg, ${nextUser.avatarColor[0]}33, ${nextUser.avatarColor[1]}33), rgba(255,255,255,0.04)`
                }} />
              )}

              {/* Carte du dessus */}
              <div
                onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
                onTouchMove={(e) => { if (startX.current !== null) setSwipeOffset(e.touches[0].clientX - startX.current); }}
                onTouchEnd={() => {
                  if (Math.abs(swipeOffset) > 100) decide(swipeOffset > 0 ? 'like' : 'pass');
                  else setSwipeOffset(0);
                  startX.current = null;
                }}
                className="absolute inset-0 backdrop-blur-2xl bg-white/[0.06] border border-white/10 rounded-3xl shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${topUser.avatarColor[0]}66, ${topUser.avatarColor[1]}55), linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.7) 100%)`,
                  transform: `translateX(${swipeOffset}px) rotate(${swipeOffset / 30}deg)`,
                  boxShadow: swipeOffset > 50 ? '0 20px 60px rgba(34, 197, 94, 0.4)' : swipeOffset < -50 ? '0 20px 60px rgba(239, 68, 68, 0.4)' : '0 20px 60px rgba(0,0,0,0.4)'
                }}
              >
                {topUser.verified && (
                  <span className="absolute top-3 right-3 backdrop-blur-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} /> Vérifié
                  </span>
                )}

                {/* Indicateurs swipe */}
                {swipeOffset > 50 && (
                  <span className="absolute top-1/3 left-6 rotate-[-12deg] border-4 border-emerald-300 text-emerald-300 px-3 py-1 rounded-xl font-black text-2xl">LIKE</span>
                )}
                {swipeOffset < -50 && (
                  <span className="absolute top-1/3 right-6 rotate-[12deg] border-4 border-rose-300 text-rose-300 px-3 py-1 rounded-xl font-black text-2xl">PASS</span>
                )}

                {/* Bottom info */}
                <div className="absolute bottom-0 inset-x-0 p-5 backdrop-blur-md bg-black/30 border-t border-white/10">
                  <h2 className="text-2xl font-bold mb-1">{topUser.name}, {topUser.age}</h2>
                  <div className="flex items-center gap-2 text-xs text-zinc-200 mb-2">
                    <MapPin size={11} /> {topUser.city} · à {top.distanceKm} km
                  </div>
                  <p className="text-[12px] text-zinc-100 mb-2 italic line-clamp-2">« {top.quote} »</p>
                  <p className="text-[11px] text-zinc-300 mb-3 line-clamp-2">{topUser.bio}</p>
                  <div className="flex flex-wrap gap-1">
                    {top.intentions.map((i) => {
                      const m = INTENTION_LABELS[i];
                      return (
                        <span key={i} style={{ background: m.bg, color: m.color }} className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {m.label}
                        </span>
                      );
                    })}
                    <span className="bg-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20">
                      {topUser.tradition}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Boutons d'action glass */}
            <div className="flex items-center gap-4 mt-2">
              <ActionBtn onClick={() => decide('pass')} icon={X} color="from-rose-500/20 to-rose-500/30 border-rose-400/40 text-rose-300" size="sm" />
              <ActionBtn onClick={() => decide('super')} icon={Star} color="from-amber-400/30 to-yellow-500/30 border-amber-300/50 text-amber-200" size="md" />
              <ActionBtn onClick={() => decide('like')} icon={Heart} color="from-emerald-400/30 to-cyan-500/30 border-emerald-300/50 text-emerald-200" size="lg" />
            </div>
            <div className="text-[11px] text-zinc-500">Glisse à droite pour liker · à gauche pour passer · ★ super-like</div>
          </>
        ) : (
          <div className="w-full max-w-sm aspect-square backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl grid place-items-center text-center p-6">
            <div>
              <div className="text-5xl mb-3">💫</div>
              <h2 className="font-bold text-xl mb-2">Tu as vu tout le monde !</h2>
              <p className="text-sm text-zinc-400">Reviens demain ou élargis tes filtres.</p>
              <button onClick={() => setDeck(MOCK_SWIPE_DECK)} className="mt-4 bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 rounded-full text-sm font-bold">
                Recommencer la démo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MATCHES + safe mode */}
      <aside className="space-y-3">
        <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-2xl p-4 sticky top-32">
          <h3 className="text-xs font-bold text-zinc-300 mb-3">Mes matches ({matches.length})</h3>
          {matches.length === 0 ? (
            <p className="text-[11px] text-zinc-500">Aucun match pour l'instant. Continue à swiper !</p>
          ) : (
            <div className="space-y-2">
              {matches.map((handle) => {
                const u = getUser(handle);
                if (!u) return null;
                return (
                  <div key={handle} className="flex items-center gap-2 p-2 bg-white/[0.04] rounded-xl">
                    <div className="w-9 h-9 rounded-full" style={{ background: `linear-gradient(135deg, ${u.avatarColor[0]}, ${u.avatarColor[1]})` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{u.name}</div>
                      <div className="text-[10px] text-emerald-300">✨ Match !</div>
                    </div>
                    <button className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 p-1.5 rounded-full"><MessageCircle size={12} /></button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-white/10 mt-4 pt-3 bg-amber-500/10 -mx-4 -mb-4 rounded-b-2xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200 mb-1">
              <ShieldCheck size={11} /> Mode safe activé
            </div>
            <p className="text-[10px] text-amber-100/70">
              Profils vérifiés · signalement 1-clic · check-in date auto-SMS si pas de retour 2h après RDV
            </p>
          </div>
        </div>
      </aside>

      {/* Modal Premium */}
      {showPremium && (
        <div className="fixed inset-0 z-[100] backdrop-blur-2xl bg-black/60 grid place-items-center p-4">
          <div className="max-w-md w-full backdrop-blur-3xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-fuchsia-500/20 border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="text-center mb-4">
              <Crown size={32} className="mx-auto mb-3 text-amber-300" />
              <h2 className="text-xl font-bold">GLD Premium</h2>
              <p className="text-sm text-zinc-300">5€/mois · annulable à tout moment</p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><span className="text-amber-300">✦</span> Swipes illimités (vs 50/jour gratuit)</li>
              <li className="flex items-center gap-2"><span className="text-amber-300">✦</span> 5 super-likes par jour</li>
              <li className="flex items-center gap-2"><span className="text-amber-300">✦</span> Vois qui t'a liké en premier</li>
              <li className="flex items-center gap-2"><span className="text-amber-300">✦</span> Boost de profil 1× par mois</li>
              <li className="flex items-center gap-2"><span className="text-amber-300">✦</span> Mode incognito (parcours sans laisser de trace)</li>
              <li className="flex items-center gap-2"><span className="text-amber-300">✦</span> Accès aux pros premium (thérapeutes vérifiés)</li>
            </ul>
            <button className="w-full mt-5 bg-gradient-to-r from-amber-400 via-rose-400 to-fuchsia-500 text-white font-bold py-3 rounded-full shadow-lg">
              Devenir Premium
            </button>
            <button onClick={() => setShowPremium(false)} className="w-full mt-2 text-zinc-400 text-xs hover:text-white">Plus tard</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, sub, defaultChecked }: { label: string; sub: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button onClick={() => setOn(!on)} className={`w-full text-left flex items-center gap-2 p-2 rounded-xl mb-1 transition ${on ? 'bg-rose-500/15 border border-rose-400/30' : 'bg-white/[0.03] border border-white/5'}`}>
      <div className="flex-1">
        <div className="text-xs font-bold">{label}</div>
        <div className="text-[10px] text-zinc-400">{sub}</div>
      </div>
      <div className={`w-9 h-5 rounded-full p-0.5 transition ${on ? 'bg-rose-500' : 'bg-zinc-700'}`}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}

function FilterRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-1 px-1">
      <span className="text-zinc-400">{label}</span>
      <span className="text-zinc-200 font-bold">{value}</span>
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, color, size }: { onClick: () => void; icon: any; color: string; size: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-12 h-12' : 'w-14 h-14';
  const isz = size === 'lg' ? 28 : size === 'md' ? 18 : 22;
  return (
    <button onClick={onClick} className={`${dim} rounded-full backdrop-blur-2xl bg-gradient-to-br ${color} border-2 grid place-items-center hover:scale-110 active:scale-95 transition shadow-2xl`}>
      <Icon size={isz} />
    </button>
  );
}
