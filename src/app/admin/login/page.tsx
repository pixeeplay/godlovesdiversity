'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';

/**
 * Page de login universelle (admin + user simple).
 * Redirection après login :
 *  - ?next=… si fourni (priorité absolue)
 *  - rôle ADMIN / EDITOR → /admin
 *  - rôle USER → /mon-espace
 */
function destFor(role: string | undefined, next: string | null) {
  if (next && next.startsWith('/')) return next;
  if (role === 'ADMIN' || role === 'EDITOR') return '/admin';
  return '/mon-espace';
}

export default function LoginPage() {
  const { data, status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (data?.user as any)?.role;
      router.replace(destFor(role, next));
    }
  }, [status, router, data, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr('');
    const r = await signIn('credentials', { redirect: false, email, password: pw });
    if (r?.error) {
      setLoading(false);
      setErr('Identifiants invalides');
      return;
    }
    // Récupère le rôle pour rediriger au bon endroit
    try {
      const sess = await fetch('/api/auth/session', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
      const role = sess?.user?.role;
      router.replace(destFor(role, next));
    } catch {
      router.replace(next && next.startsWith('/') ? next : '/mon-espace');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-zinc-950">
      <form onSubmit={submit} className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="text-brand-pink" />
          <h1 className="text-xl font-display font-bold">Connexion</h1>
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

        <div className="mt-5 pt-4 border-t border-zinc-800 text-center text-xs text-zinc-500">
          Pas encore de compte ?{' '}
          <Link href="/signup" className="text-brand-pink hover:underline font-bold">Créer un compte</Link>
        </div>

        <p className="text-[10px] text-zinc-600 mt-4 text-center">
          Après connexion, tu seras redirigé vers ton espace perso (ou le back-office si tu es admin).
        </p>
      </form>
    </div>
  );
}
