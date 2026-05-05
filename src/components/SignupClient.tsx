'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, Loader2, Check, Sparkles, Heart } from 'lucide-react';

export function SignupClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit() {
    if (!email || password.length < 8) {
      setError('Email + mot de passe (8 caractères mini) requis');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error); return; }
      setDone(true);
      setTimeout(() => router.push('/admin/login?next=/'), 2500);
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <main className="container-wide py-20 max-w-md text-center">
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-8">
          <Check size={48} className="text-emerald-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Compte créé ✨</h1>
          <p className="text-zinc-300">On te redirige vers la page de connexion…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="container-wide py-12 max-w-md">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3">
          <UserPlus size={28} className="text-white" />
        </div>
        <h1 className="text-3xl font-display font-bold mb-2">Rejoins GLD</h1>
        <p className="text-zinc-400 text-sm">Compte gratuit · accès au forum, témoignages, parrainage, badges</p>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Pseudo (visible publiquement)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lou·" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">Mot de passe (min 8 chars) *</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button onClick={submit} disabled={busy || !email || password.length < 8} className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-full flex items-center justify-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
          Créer mon compte
        </button>
        <p className="text-[10px] text-zinc-400 text-center">
          Déjà un compte ? <Link href="/admin/login" className="text-fuchsia-400 underline">Connecte-toi</Link>
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {[
          { Icon: Sparkles, label: 'Badges & karma' },
          { Icon: Heart, label: 'Soutien pairs' },
          { Icon: UserPlus, label: 'Parrainage' }
        ].map((item, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <item.Icon size={16} className="text-fuchsia-400 mx-auto mb-1" />
            <div className="text-[10px] text-zinc-300">{item.label}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
