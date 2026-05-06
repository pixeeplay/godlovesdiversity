'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Flame, Send, Loader2, Heart, Sparkles, MapPin } from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer    = dynamic(() => import('react-leaflet').then(m => m.TileLayer),    { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(m => m.CircleMarker), { ssr: false });
const Tooltip      = dynamic(() => import('react-leaflet').then(m => m.Tooltip),      { ssr: false });

const FAITH_COLORS: Record<string, string> = {
  catholic: '#dc2626', protestant: '#1e40af', orthodox: '#7c3aed',
  muslim: '#059669', jewish: '#3b82f6', buddhist: '#f59e0b',
  hindu: '#ec4899', sikh: '#f97316', interfaith: '#22d3ee'
};

interface Candle {
  id: string;
  lat: number;
  lng: number;
  intention?: string | null;
  faith?: string | null;
  city?: string | null;
  country?: string | null;
  createdAt: string;
  expiresAt: string;
}

export function ChampDePriereClient() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [intention, setIntention] = useState('');
  const [faith, setFaith] = useState<string>('');
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [posting, setPosting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  // Inject leaflet css
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.setAttribute('data-leaflet-css', '1');
      document.head.appendChild(link);
    }
    setLeafletReady(true);
  }, []);

  // Charge les bougies actives
  async function loadCandles() {
    try {
      const r = await fetch('/api/prayer-candles');
      const j = await r.json();
      setCandles(j.candles || []);
    } catch {}
  }

  useEffect(() => {
    loadCandles();
    const interval = setInterval(loadCandles, 12_000);
    return () => clearInterval(interval);
  }, []);

  // Géoloc utilisateur
  function requestGeo() {
    if (!navigator.geolocation) { setMsg('Géolocalisation non supportée'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMsg('Géolocalisation refusée — la bougie sera placée au centre de la carte'),
      { enableHighAccuracy: false, timeout: 6000 }
    );
  }

  useEffect(() => { requestGeo(); }, []);

  async function lightCandle() {
    if (intention.trim().length > 280) return;
    setPosting(true); setMsg(null);
    const lat = userLoc?.lat ?? (Math.random() * 60 + 20);
    const lng = userLoc?.lng ?? (Math.random() * 360 - 180);
    try {
      const r = await fetch('/api/prayer-candles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, intention: intention.trim() || null, faith: faith || null })
      });
      const j = await r.json();
      if (r.ok && j.ok) {
        setMsg('🕯 Bougie allumée pour 24h');
        setIntention('');
        loadCandles();
      } else {
        setMsg(`⚠ ${j.message || j.error}`);
      }
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setPosting(false);
    setTimeout(() => setMsg(null), 5000);
  }

  return (
    <main className="container-wide py-12 max-w-6xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-3 mb-3">
          <Flame size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Champ de prières mondial</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-xl mx-auto">
          Allume une bougie virtuelle pour 24h. Visualise les prières du monde entier en temps réel.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 rounded-full px-4 py-2">
          <Flame size={14} className="text-amber-300" />
          <span className="text-sm font-bold text-amber-200">
            {candles.length} bougie{candles.length > 1 ? 's' : ''} allumée{candles.length > 1 ? 's' : ''} en ce moment
          </span>
        </div>
      </header>

      <section className="grid lg:grid-cols-[1fr_320px] gap-4 mb-6">
        {/* Carte des bougies */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden h-[60vh] min-h-[400px]">
          {leafletReady ? (
            <MapContainer
              center={[20, 0] as any}
              zoom={2}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap &copy; CARTO'
              />
              {candles.map((c) => (
                <CircleMarker
                  key={c.id}
                  center={[c.lat, c.lng]}
                  radius={5}
                  pathOptions={{
                    color: c.faith ? FAITH_COLORS[c.faith] || '#f59e0b' : '#f59e0b',
                    fillColor: c.faith ? FAITH_COLORS[c.faith] || '#f59e0b' : '#f59e0b',
                    fillOpacity: 0.7
                  }}
                >
                  <Tooltip>
                    <strong>🕯 Bougie</strong>
                    {c.intention ? <><br/>"{c.intention.slice(0, 100)}"</> : null}
                    <br/>
                    <em>{c.city || ''}{c.country ? ` (${c.country})` : ''}</em>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">Chargement de la carte…</div>
          )}
        </div>

        {/* Sidebar : allumer une bougie + dernières intentions */}
        <aside className="space-y-3">
          <div className="bg-gradient-to-br from-amber-500/10 to-rose-500/10 border-2 border-amber-500/30 rounded-2xl p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Flame size={14} className="text-amber-400" /> Allumer ma bougie
            </h3>
            <textarea
              value={intention}
              onChange={(e) => setIntention(e.target.value.slice(0, 280))}
              placeholder="Mon intention (optionnelle)…"
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none resize-none"
            />
            <div className="text-[10px] text-zinc-500 mt-1 mb-2">{intention.length}/280 · modéré IA</div>
            <select
              value={faith}
              onChange={(e) => setFaith(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs mb-2"
            >
              <option value="">Confession (optionnel)</option>
              <option value="catholic">✝️ Catholique</option>
              <option value="protestant">✠ Protestant</option>
              <option value="orthodox">☦️ Orthodoxe</option>
              <option value="muslim">☪️ Musulman·e</option>
              <option value="jewish">✡️ Juif·ve</option>
              <option value="buddhist">☸️ Bouddhiste</option>
              <option value="hindu">🕉️ Hindou·e</option>
              <option value="sikh">☬ Sikh·e</option>
              <option value="interfaith">🌍 Inter-religieux</option>
            </select>
            <button
              onClick={lightCandle}
              disabled={posting}
              className="w-full bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold py-2 rounded-full flex items-center justify-center gap-2"
            >
              {posting ? <Loader2 size={12} className="animate-spin" /> : <Flame size={12} />}
              Allumer (24h)
            </button>
            {msg && <div className="mt-2 text-xs text-amber-200">{msg}</div>}
            {!userLoc && <div className="mt-2 text-[10px] text-zinc-500">📍 Position non détectée — bougie au hasard sur la carte. <button onClick={requestGeo} className="text-amber-400 underline">Activer GPS</button></div>}
          </div>

          {/* Récap intentions récentes */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
              <Heart size={12} className="text-fuchsia-400" /> Dernières intentions
            </h3>
            {candles.filter(c => c.intention).slice(0, 5).length === 0 ? (
              <div className="text-xs text-zinc-500 italic">Aucune intention partagée pour l'instant.</div>
            ) : (
              <div className="space-y-2">
                {candles.filter(c => c.intention).slice(0, 5).map(c => (
                  <div key={c.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span style={{ color: c.faith ? FAITH_COLORS[c.faith] : '#f59e0b' }}>🕯</span>
                      <span className="text-[10px] text-zinc-500">
                        {c.city || c.country || 'Quelque part dans le monde'}
                      </span>
                    </div>
                    <p className="text-zinc-200">{c.intention!.slice(0, 140)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <a href="/cercles-priere" className="block bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-4 text-sm transition">
            <div className="flex items-center gap-2 font-bold"><Sparkles size={12} className="text-fuchsia-400" /> Rejoindre un cercle de prière live →</div>
            <p className="text-[11px] text-zinc-500 mt-1">9 cercles inter-religieux avec présence en direct.</p>
          </a>
        </aside>
      </section>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400 text-center">
        💡 Les bougies disparaissent après 24h. Les intentions sont modérées par IA. Limite : 5 bougies par heure et par appareil.
      </div>
    </main>
  );
}
