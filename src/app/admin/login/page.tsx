'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Heart, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { data, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (status === 'authenticated') router.replace('/admin'); }, [status, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr('');
    const r = await signIn('credentials', { redirect: false, email, password: pw });
    setLoading(false);
    if (r?.error) setErr('Identifiants invalides');
    else router.replace('/admin');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-zinc-950">
      <form onSubmit={submit} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="text-brand-pink" />
          <h1 className="text-xl font-display font-bold">Back-office</h1>
        </div>
        <label className="grid gap-1 text-sm mb-3">
          <span className="text-zinc-400">Email</span>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink"
          />
        </label>
        <label className="grid gap-1 text-sm mb-5">
          <span className="text-zinc-400">Mot de passe</span>
          <input
            type="password" required value={pw} onChange={(e) => setPw(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink"
          />
        </label>
        {err && <p className="text-red-400 text-sm mb-3">{err}</p>}
        <button disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Se connecter'}
        </button>
        <p className="text-xs text-zinc-500 mt-4">
          Identifiants par défaut (à changer) :<br />
          <code>arnaud@gredai.com</code> / <code>GodLoves2026!</code>
        </p>
      </form>
    </div>
  );
}
