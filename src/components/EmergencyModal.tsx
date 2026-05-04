'use client';
import { useEffect, useState } from 'react';
import { X, AlertCircle, Phone, ExternalLink, MapPin, ShieldAlert, Loader2, Globe } from 'lucide-react';

type Helpline = {
  name: string;
  phone?: string;
  whatsapp?: string;
  url?: string;
  email?: string;
  description: string;
  hours?: string;
  language?: string;
};

type CountryHelp = {
  countryCode: string;
  countryName: string;
  riskLevel: 'safe' | 'caution' | 'danger' | 'extreme';
  helplines: Helpline[];
};

type ApiResponse = {
  detectedCountry: string | null;
  help: CountryHelp | null;
  global: Helpline[];
  fallbackMessage: string | null;
};

type Props = { onClose: () => void };

export function EmergencyModal({ onClose }: Props) {
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

  // Détection navigateur fallback (geolocation API browser)
  async function detectViaGPS() {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        // reverse geocode via Nominatim OpenStreetMap (gratuit, sans clé)
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const j = await r.json();
        const code = (j.address?.country_code || '').toUpperCase();
        if (code) await load(code);
        else setLoading(false);
      } catch { setLoading(false); }
    }, () => setLoading(false), { timeout: 8000 });
  }

  const country = data?.help;
  const riskColor = country?.riskLevel === 'extreme' ? 'red' :
                    country?.riskLevel === 'danger' ? 'red' :
                    country?.riskLevel === 'caution' ? 'amber' : 'emerald';

  return (
    <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-zinc-950 border-2 border-red-500/40 rounded-2xl max-w-2xl w-full my-8 shadow-[0_0_60px_rgba(239,68,68,0.3)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={28} className="text-white" />
            <div>
              <h2 className="text-xl font-bold text-white">Urgence — Aide LGBTQ+</h2>
              <p className="text-xs text-white/90">Tu n'es pas seul·e. Voici des contacts qui peuvent t'aider tout de suite.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1"><X size={22} /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={28} className="text-red-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Localisation des aides…</p>
            </div>
          ) : (
            <>
              {/* Détection pays */}
              {country ? (
                <div className={`bg-${riskColor}-500/10 border border-${riskColor}-500/30 rounded-xl p-3 flex items-center gap-2`}>
                  <MapPin size={16} className={`text-${riskColor}-400`} />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white">{country.countryName}</div>
                    {country.riskLevel === 'extreme' && <div className="text-[11px] text-red-300">⚠ Législation très restrictive — utilise un VPN et Tor</div>}
                    {country.riskLevel === 'danger' && <div className="text-[11px] text-red-300">⚠ Législation hostile</div>}
                    {country.riskLevel === 'caution' && <div className="text-[11px] text-amber-300">Discrimination encore présente</div>}
                    {country.riskLevel === 'safe' && <div className="text-[11px] text-emerald-300">Cadre légal protecteur</div>}
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                  <p className="text-xs text-zinc-400 mb-2">{data?.fallbackMessage || 'Pays non détecté.'}</p>
                  <div className="flex gap-2">
                    <button onClick={detectViaGPS} className="bg-violet-500 hover:bg-violet-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                      <MapPin size={11} /> Géolocaliser
                    </button>
                    <input
                      value={manualCountry}
                      onChange={(e) => setManualCountry(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && manualCountry && load(manualCountry)}
                      placeholder="Code pays (FR, US, BR…)"
                      className="bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-xs flex-1"
                      maxLength={2}
                    />
                    <button onClick={() => manualCountry && load(manualCountry)} className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs px-3 py-1.5 rounded-full">OK</button>
                  </div>
                </div>
              )}

              {/* Contacts locaux */}
              {country?.helplines && country.helplines.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase font-bold text-red-300 mb-2">Aides locales — {country.countryName}</h3>
                  <div className="space-y-2">
                    {country.helplines.map((h, i) => (
                      <HelplineCard key={i} h={h} accent="red" />
                    ))}
                  </div>
                </div>
              )}

              {/* Contacts internationaux */}
              {data?.global && data.global.length > 0 && (
                <div>
                  <h3 className="text-xs uppercase font-bold text-violet-300 mb-2 flex items-center gap-1.5">
                    <Globe size={11} /> International (toujours disponibles)
                  </h3>
                  <div className="space-y-2">
                    {data.global.map((h, i) => (
                      <HelplineCard key={i} h={h} accent="violet" />
                    ))}
                  </div>
                </div>
              )}

              {/* Si rien trouvé */}
              {!country && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs">
                  Si tu es en danger immédiat, appelle le numéro d'urgence de ton pays ou rejoins un endroit public sécurisé.
                  Cherche ton aide locale via <a href="https://ilga.org/help-and-support" target="_blank" rel="noopener noreferrer" className="underline">l'annuaire mondial ILGA</a>.
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-3">
            ⚠ GLD ne remplace pas une aide professionnelle. Si tu es en danger imminent, contacte les secours (112 EU, 911 US, 190 BR…).
            Toutes les conversations avec ces lignes sont confidentielles.
          </p>
        </div>
      </div>
    </div>
  );
}

function HelplineCard({ h, accent }: { h: Helpline; accent: 'red' | 'violet' }) {
  const color = accent === 'red' ? 'border-red-500/30 bg-red-500/5' : 'border-violet-500/30 bg-violet-500/5';
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="font-bold text-sm text-white">{h.name}</div>
      <p className="text-xs text-zinc-300 mt-1">{h.description}</p>
      {(h.hours || h.language) && (
        <div className="text-[10px] text-zinc-500 mt-1">
          {h.hours && <span>🕒 {h.hours}</span>}
          {h.hours && h.language && ' · '}
          {h.language && <span>🗣 {h.language}</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {h.phone && (
          <a href={`tel:${h.phone.replace(/\s/g, '')}`} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <Phone size={11} /> {h.phone}
          </a>
        )}
        {h.url && (
          <a href={h.url} target="_blank" rel="noopener noreferrer" className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <ExternalLink size={11} /> Site web
          </a>
        )}
        {h.email && (
          <a href={`mailto:${h.email}`} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-full">
            ✉ {h.email}
          </a>
        )}
      </div>
    </div>
  );
}
