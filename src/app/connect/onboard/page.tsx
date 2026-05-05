'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Heart, Briefcase, Users, ShieldCheck, Loader2, Check } from 'lucide-react';

const STEPS = [
  { id: 'who',      title: 'Qui es-tu ?',           sub: 'Présente-toi à la communauté' },
  { id: 'identity', title: 'Ton identité',          sub: 'Optionnel — partage ce qui te ressemble' },
  { id: 'modes',    title: 'Choisis tes univers',   sub: 'Tu peux activer/désactiver à tout moment' },
  { id: 'rencontres', title: 'Pour les rencontres', sub: 'Si activé : âge + intentions' },
  { id: 'pro',      title: 'Profil professionnel',  sub: 'Si activé : ton expertise' },
  { id: 'done',     title: 'Bienvenue !',           sub: 'Ton profil est prêt' }
];

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<any>({
    displayName: '',
    bio: '',
    city: '',
    identity: '',
    traditions: [],
    showInMur: true,
    showInRencontres: false,
    showInPro: false,
    birthYear: '',
    intentions: [],
    quote: '',
    jobTitle: '',
    proCategory: '',
    proPitch: ''
  });

  useEffect(() => {
    fetch('/api/connect/profile').then(r => r.json()).then(j => {
      if (j.profile) setProfile((p: any) => ({ ...p, ...j.profile, birthYear: j.profile.birthYear || '' }));
    });
  }, []);

  async function save(payload: any) {
    setBusy(true);
    await fetch('/api/connect/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setBusy(false);
  }

  async function next() {
    // Sauve à chaque étape
    await save(profile);
    if (step < STEPS.length - 1) {
      // Skip rencontres step si non activé
      if (step === 2 && !profile.showInRencontres && !profile.showInPro) setStep(STEPS.length - 1);
      else if (step === 3 && !profile.showInRencontres) setStep(profile.showInPro ? 4 : 5);
      else setStep(step + 1);
    } else {
      router.push('/connect/mur');
    }
  }

  const current = STEPS[step];

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress glass bar */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500' : 'bg-white/10'}`} />
        ))}
      </div>

      <div className="backdrop-blur-2xl bg-white/[0.06] border border-white/10 rounded-3xl p-6 shadow-2xl">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Étape {step + 1} / {STEPS.length}</div>
        <h1 className="text-2xl font-bold mb-1">{current.title}</h1>
        <p className="text-sm text-zinc-400 mb-5">{current.sub}</p>

        {step === 0 && (
          <div className="space-y-3">
            <Field label="Nom affiché" value={profile.displayName} onChange={(v) => setProfile({ ...profile, displayName: v })} placeholder="ex: Marc-Antoine" />
            <Field label="Ville" value={profile.city} onChange={(v) => setProfile({ ...profile, city: v })} placeholder="ex: Lyon" />
            <Textarea label="Bio courte" value={profile.bio} onChange={(v) => setProfile({ ...profile, bio: v })} placeholder="Quelques mots sur toi…" />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Field label="Identité (optionnel)" value={profile.identity} onChange={(v) => setProfile({ ...profile, identity: v })} placeholder="ex: gay, lesbienne, trans, allié·e…" />
            <Field label="Traditions spirituelles (séparées par virgule, optionnel)" value={(profile.traditions || []).join(', ')} onChange={(v) => setProfile({ ...profile, traditions: v.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="ex: catholique, soufi, agnostique" />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <ModeToggle icon={Users} label="Communauté" sub="Mur, posts, prières, amis" color="fuchsia" checked={profile.showInMur} onChange={(v) => setProfile({ ...profile, showInMur: v })} />
            <ModeToggle icon={Heart} label="Rencontres" sub="Swipe, matches (18+)" color="rose" checked={profile.showInRencontres} onChange={(v) => setProfile({ ...profile, showInRencontres: v })} />
            <ModeToggle icon={Briefcase} label="Pro" sub="Annuaire pros LGBT+, services" color="sky" checked={profile.showInPro} onChange={(v) => setProfile({ ...profile, showInPro: v })} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <Field label="Année de naissance (obligatoire pour Rencontres)" type="number" value={profile.birthYear} onChange={(v) => setProfile({ ...profile, birthYear: parseInt(v) || '' })} placeholder="ex: 1992" />
            <div>
              <div className="text-xs font-bold text-zinc-300 mb-2">Tes intentions</div>
              <div className="grid grid-cols-2 gap-2">
                {[['amour', '💖 Amour'], ['amitie_spi', '🕊 Amitié spi'], ['mentor', '🎓 Mentor'], ['coloc', '🏠 Coloc']].map(([id, label]) => (
                  <button key={id} onClick={() => {
                    const has = profile.intentions.includes(id);
                    setProfile({ ...profile, intentions: has ? profile.intentions.filter((i: string) => i !== id) : [...profile.intentions, id] });
                  }} className={`p-3 rounded-xl border text-sm font-bold transition ${profile.intentions.includes(id) ? 'bg-rose-500/20 border-rose-400/40 text-rose-200' : 'bg-white/5 border-white/10 text-zinc-300'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea label="Citation ou verset préféré (icebreaker)" value={profile.quote} onChange={(v) => setProfile({ ...profile, quote: v })} placeholder="ex: « L'amour ne fait point de mal au prochain » — Romains 13:10" />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <Field label="Titre / fonction" value={profile.jobTitle} onChange={(v) => setProfile({ ...profile, jobTitle: v })} placeholder="ex: Psychologue clinicien" />
            <div>
              <div className="text-xs font-bold text-zinc-300 mb-2">Catégorie</div>
              <select value={profile.proCategory} onChange={(e) => setProfile({ ...profile, proCategory: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm">
                <option value="">— Choisir —</option>
                <option value="pasteur">⛪ Pasteur / Aumônier inclusif</option>
                <option value="therapeute">🧠 Thérapeute LGBT-affirmatif</option>
                <option value="avocat">⚖️ Avocat famille</option>
                <option value="coach">🎤 Coach coming-out</option>
                <option value="photographe">📸 Photographe mariage</option>
                <option value="lieu">🏪 Lieu pro inclusif</option>
                <option value="autre">✨ Autre</option>
              </select>
            </div>
            <Textarea label="Pitch professionnel" value={profile.proPitch} onChange={(v) => setProfile({ ...profile, proPitch: v })} placeholder="Décris tes services, ton approche, ce que tu apportes…" />
          </div>
        )}

        {step === 5 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 grid place-items-center mb-4 shadow-2xl shadow-emerald-500/30">
              <Check size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tu es prêt·e !</h2>
            <p className="text-sm text-zinc-400">Ton profil GLD Connect est créé. Tu peux le modifier à tout moment depuis <code className="text-fuchsia-300">/mon-espace</code>.</p>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-sm text-zinc-400 hover:text-white disabled:opacity-30">← Retour</button>
          <button onClick={next} disabled={busy} className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-bold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 shadow-lg disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : null}
            {step === STEPS.length - 1 ? 'Entrer dans Connect' : 'Continuer'}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <p className="text-center text-[10px] text-zinc-500 mt-4 flex items-center justify-center gap-1">
        <ShieldCheck size={10} /> Modération auto IA · signalement 1-clic · jamais de revente de tes données
      </p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-300 mb-1 block">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400 focus:bg-white/10 transition" />
    </label>
  );
}
function Textarea({ label, value, onChange, placeholder }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-300 mb-1 block">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-fuchsia-400 focus:bg-white/10 resize-none transition" />
    </label>
  );
}
function ModeToggle({ icon: Icon, label, sub, color, checked, onChange }: any) {
  const colors: any = {
    fuchsia: 'from-fuchsia-500/30 to-violet-500/20 border-fuchsia-400/40',
    rose: 'from-rose-500/30 to-orange-500/20 border-rose-400/40',
    sky: 'from-sky-500/30 to-cyan-500/20 border-sky-400/40'
  };
  return (
    <button onClick={() => onChange(!checked)} className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition ${checked ? `bg-gradient-to-r ${colors[color]}` : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
      <Icon size={20} />
      <div className="flex-1">
        <div className="font-bold text-sm">{label}</div>
        <div className="text-[11px] text-zinc-400">{sub}</div>
      </div>
      <div className={`w-10 h-6 rounded-full p-0.5 transition ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
        <div className={`w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
    </button>
  );
}
