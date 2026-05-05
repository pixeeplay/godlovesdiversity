'use client';
import { useEffect, useState } from 'react';
import { Users, Heart, Briefcase, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function ConnectVisibilityPage() {
  const [profile, setProfile] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/connect/profile').then(r => r.json()).then(j => setProfile(j.profile));
  }, []);

  async function toggle(field: 'showInMur' | 'showInRencontres' | 'showInPro') {
    if (!profile) return;
    if (field === 'showInRencontres' && !profile.showInRencontres && !profile.birthYear) {
      alert('Pour activer Rencontres, ajoute ton année de naissance dans /connect/onboard (18+ obligatoire).');
      return;
    }
    setBusy(true);
    const next = { ...profile, [field]: !profile[field] };
    setProfile(next);
    await fetch('/api/connect/profile', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !profile[field] })
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setBusy(false);
  }

  if (!profile) return <div className="p-8 text-center text-zinc-400"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Visibilité GLD Connect</h1>
      <p className="text-sm text-zinc-400 mb-5">Choisis dans quels univers ton profil apparaît. Tu peux changer à tout moment.</p>

      {saved && <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-lg p-2 text-sm flex items-center gap-2"><CheckCircle2 size={14} /> Sauvegardé</div>}

      <div className="space-y-3">
        <Card icon={Users} color="fuchsia" label="Communauté" sub="Mur, posts, prières, amis" checked={profile.showInMur} onClick={() => toggle('showInMur')} disabled={busy} />
        <Card icon={Heart} color="rose" label="Rencontres" sub="Swipe, matches (18+ requis)" checked={profile.showInRencontres} onClick={() => toggle('showInRencontres')} disabled={busy} />
        <Card icon={Briefcase} color="sky" label="Pro" sub="Annuaire pros LGBT-friendly" checked={profile.showInPro} onClick={() => toggle('showInPro')} disabled={busy} />
      </div>

      <div className="mt-6 bg-amber-500/5 border border-amber-500/30 rounded-xl p-4 text-xs text-amber-100">
        <ShieldCheck size={14} className="inline mr-1 text-amber-300" />
        <b>Mode Ghost</b> : si tu désactives les 3 modes, tu deviens invisible partout sauf pour tes connexions déjà acceptées et tes matches existants.
      </div>

      <div className="mt-4 text-center">
        <a href="/connect/onboard" className="text-xs text-fuchsia-400 hover:underline">Modifier mon profil complet →</a>
      </div>
    </div>
  );
}

function Card({ icon: Icon, color, label, sub, checked, onClick, disabled }: any) {
  const colors: any = {
    fuchsia: 'from-fuchsia-500/20 to-violet-500/15 border-fuchsia-400/40',
    rose: 'from-rose-500/20 to-orange-500/15 border-rose-400/40',
    sky: 'from-sky-500/20 to-cyan-500/15 border-sky-400/40'
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition ${checked ? `bg-gradient-to-r ${colors[color]}` : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'} disabled:opacity-50`}>
      <Icon size={22} />
      <div className="flex-1">
        <div className="font-bold">{label}</div>
        <div className="text-[11px] text-zinc-400">{sub}</div>
      </div>
      <div className={`w-12 h-7 rounded-full p-0.5 transition ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
        <div className={`w-6 h-6 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  );
}
