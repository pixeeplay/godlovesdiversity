'use client';
import { useEffect, useState } from 'react';
import { Loader2, Save, Check } from 'lucide-react';

const TRADITIONS = ['catholique', 'protestant', 'orthodoxe', 'musulman·e', 'juif·ve', 'bouddhiste', 'hindou·e', 'spirituel·le sans religion', 'agnostique'];

export function MeProfileForm() {
  const [user, setUser] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { fetch('/api/me/profile').then(r => r.json()).then(j => setUser(j.user)); }, []);

  if (!user) return <div className="text-zinc-400">Chargement…</div>;

  async function save() {
    setBusy(true);
    try {
      const r = await fetch('/api/me/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
      if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setBusy(false); }
  }

  function set(k: string, v: any) { setUser({ ...user, [k]: v }); }
  function toggleTradition(t: string) {
    const list = (user.traditions || []) as string[];
    set('traditions', list.includes(t) ? list.filter((x: string) => x !== t) : [...list, t]);
  }

  return (
    <div className="space-y-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <Field label="Pseudo public (visible des autres)">
        <input value={user.publicName || ''} onChange={(e) => set('publicName', e.target.value)} placeholder={user.name || user.email?.split('@')[0]} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Bio (max 280 chars)">
        <textarea value={user.bio || ''} onChange={(e) => set('bio', e.target.value.slice(0, 280))} rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        <div className="text-[10px] text-zinc-400 text-right">{(user.bio || '').length}/280</div>
      </Field>
      <Field label="Identité (libre)">
        <input value={user.identity || ''} onChange={(e) => set('identity', e.target.value)} placeholder="ex: lesbienne · trans · non-binaire · queer · en questionnement…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Ville">
        <input value={user.cityProfile || ''} onChange={(e) => set('cityProfile', e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
      </Field>
      <Field label="Traditions spirituelles (sélectionne ce qui te parle)">
        <div className="flex flex-wrap gap-1.5 pt-1">
          {TRADITIONS.map(t => {
            const on = (user.traditions || []).includes(t);
            return <button key={t} type="button" onClick={() => toggleTradition(t)} className={`text-[11px] px-2.5 py-1 rounded-full border ${on ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-200' : 'bg-zinc-950 border-zinc-700 text-zinc-300'}`}>{t}</button>;
          })}
        </div>
      </Field>
      <Field label="URL photo de profil (avatar)">
        <input value={user.image || ''} onChange={(e) => set('image', e.target.value)} placeholder="https://…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono" />
      </Field>
      <button onClick={save} disabled={busy} className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full inline-flex items-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
        {saved ? 'Enregistré' : 'Enregistrer'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
