'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Plane, Search, ShieldCheck, AlertTriangle, ShieldAlert, ListChecks, Phone, MapPin
} from 'lucide-react';

type Country = { code: string; name: string; riskLevel: string; helplinesCount: number };

const RISK_INFO: Record<string, { color: string; label: string; icon: any; advice: string }> = {
  safe:    { color: 'emerald', label: 'Cadre légal protecteur', icon: ShieldCheck, advice: 'Tu peux voyager sereinement, mariage/PACS reconnus, lois anti-discrimination' },
  caution: { color: 'amber',   label: 'Vigilance recommandée',  icon: AlertTriangle, advice: 'Discrimination présente — discrétion préférable dans certaines régions' },
  danger:  { color: 'red',     label: 'Législation hostile',    icon: ShieldAlert, advice: 'Homosexualité criminalisée ou très réprimée — précautions importantes' },
  extreme: { color: 'red',     label: 'Très restrictif (mort/prison)', icon: ShieldAlert, advice: 'PEINE DE MORT ou prison à vie — ne pas s\'afficher, VPN obligatoire' }
};

export function TravelSafeClient({ countries }: { countries: Country[] }) {
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Country | null>(null);

  const filtered = useMemo(() =>
    q ? countries.filter(c => c.name.toLowerCase().includes(q.toLowerCase()) || c.code.includes(q.toUpperCase())) : countries
  , [countries, q]);

  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="mb-6 text-center">
        <div className="inline-block bg-gradient-to-br from-cyan-500 to-violet-600 rounded-2xl p-3 mb-3">
          <Plane size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Voyage safe LGBTQ+</h1>
        <p className="text-zinc-400 text-sm max-w-2xl mx-auto">
          Avant de partir : statut juridique, niveaux de risque, contacts d'urgence locaux + checklist sécurité.
        </p>
      </header>

      {!picked ? (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 mb-4 flex items-center gap-2">
            <Search size={14} className="text-zinc-500 ml-1" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher ta destination…" className="bg-transparent flex-1 px-1 py-1.5 text-sm outline-none" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(c => {
              const info = RISK_INFO[c.riskLevel] || RISK_INFO.caution;
              const Icon = info.icon;
              return (
                <button
                  key={c.code}
                  onClick={() => setPicked(c)}
                  className={`bg-${info.color}-500/5 border border-${info.color}-500/30 hover:border-${info.color}-500/60 rounded-2xl p-4 text-left transition group`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-2xl mb-1">{toFlagEmoji(c.code)}</div>
                      <div className="font-bold text-white">{c.name}</div>
                      <div className="text-[10px] text-zinc-500">{c.code}</div>
                    </div>
                    <Icon size={18} className={`text-${info.color}-400`} />
                  </div>
                  <div className={`text-[11px] text-${info.color}-200 mb-1`}>{info.label}</div>
                  <div className="text-[10px] text-zinc-500">📞 {c.helplinesCount} aide(s)</div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <CountryDetail c={picked} onBack={() => setPicked(null)} />
      )}
    </main>
  );
}

function CountryDetail({ c, onBack }: { c: Country; onBack: () => void }) {
  const info = RISK_INFO[c.riskLevel] || RISK_INFO.caution;
  const Icon = info.icon;

  const checklist = useMemo(() => {
    const base = [
      'Vérifier passeport valide 6 mois après retour',
      'Souscrire assurance voyage (rapatriement médical inclus)',
      'Imprimer 2 copies des papiers (laisse 1 chez toi, 1 sur toi)',
      'Notifier 1 proche de l\'itinéraire complet (vols, hôtels)',
      'Charger Maps OFFLINE de la destination',
      'Ajouter contacts d\'urgence locaux dans téléphone',
      'Installer VPN avant le départ (pas une fois sur place)'
    ];
    if (c.riskLevel === 'danger' || c.riskLevel === 'extreme') {
      base.push('🚨 SUPPRIMER apps Grindr/Tinder/Hornet du téléphone (perquisition possible)');
      base.push('🚨 Effacer historique navigateur + photos LGBT du téléphone');
      base.push('🚨 NE PAS afficher de geste/symbole/drapeau LGBT en public');
      base.push('🚨 Ne pas tenir la main de ton/ta partenaire en public');
      base.push('🚨 Préparer une "cover story" cohérente (ami·e plutôt que conjoint·e)');
      base.push('🚨 Mémoriser ambassade : adresse + tél (pas seulement dans le tél)');
      base.push('🚨 Code WhatsApp avec un proche pour signaler "tout va bien" / "danger"');
    }
    if (c.riskLevel === 'caution') {
      base.push('⚠ Vérifier où sont les quartiers LGBT-friendly de la ville (forum + GLD /lieux)');
      base.push('⚠ Préparer lieux de culte inclusifs si tu en cherches');
    }
    return base;
  }, [c.riskLevel]);

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-cyan-400 hover:underline text-sm">← Toutes destinations</button>

      <div className={`bg-${info.color}-500/10 border-2 border-${info.color}-500/40 rounded-2xl p-5`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{toFlagEmoji(c.code)}</span>
          <div>
            <h2 className="font-bold text-2xl">{c.name}</h2>
            <div className={`flex items-center gap-1.5 text-${info.color}-300 text-sm`}>
              <Icon size={14} /> {info.label}
            </div>
          </div>
        </div>
        <p className="text-sm text-zinc-200">{info.advice}</p>
      </div>

      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold flex items-center gap-2 mb-3"><ListChecks size={16} className="text-fuchsia-400" /> Checklist avant départ</h3>
        <ul className="space-y-2">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="text-fuchsia-400 mt-0.5">▸</span>
              <span className={item.startsWith('🚨') ? 'text-red-300' : item.startsWith('⚠') ? 'text-amber-300' : ''}>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link href={`/lieux?country=${c.code}`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-4 transition">
          <MapPin size={18} className="text-fuchsia-400 mb-2" />
          <div className="font-bold text-sm">Lieux LGBT-friendly</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Restaurants, bars, lieux de culte inclusifs sur place</div>
        </Link>
        <Link href={`/sos/contacts`} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl p-4 transition">
          <Phone size={18} className="text-red-400 mb-2" />
          <div className="font-bold text-sm">{c.helplinesCount} ligne(s) d'urgence</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">Hotlines locales LGBT + numéros nationaux</div>
        </Link>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
        💡 N'oublie pas d'ajouter tes <Link href="/sos/contacts" className="underline">contacts d'urgence personnels</Link> avant de partir : en cas d'alerte SOS, ils recevront ta géolocalisation par SMS.
      </div>
    </div>
  );
}

function toFlagEmoji(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return String.fromCodePoint(...code.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
