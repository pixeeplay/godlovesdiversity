'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (r?.error) {
      setError('Email ou mot de passe incorrect');
    } else {
      router.push(params.get('callbackUrl') || '/dashboard');
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui', background: '#0a0a0f', color: '#fafafa' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pixeesite</h1>
        <p style={{ opacity: 0.6, marginBottom: 32 }}>Connecte-toi à ton dashboard.</p>

        <button
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          style={{ width: '100%', padding: 14, background: 'white', color: '#18181b', border: 0, borderRadius: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 18 }}>🔵</span> Continuer avec Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: 12, opacity: 0.4, fontSize: 12 }}>
          <div style={{ flex: 1, height: 1, background: '#3f3f46' }} /> ou <div style={{ flex: 1, height: 1, background: '#3f3f46' }} />
        </div>

        <form onSubmit={submit}>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com" required autoFocus
            style={{ width: '100%', padding: 12, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: 'inherit', marginBottom: 12 }}
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe" required minLength={8}
            style={{ width: '100%', padding: 12, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: 'inherit', marginBottom: 12 }}
          />
          {error && <p style={{ color: '#f43f5e', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: 14, background: '#d946ef', color: 'white', border: 0, borderRadius: 12, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 14, opacity: 0.6, textAlign: 'center' }}>
          Pas encore de compte ? <Link href="/signup" style={{ color: '#d946ef' }}>Crée ton organisation</Link>
        </p>
      </div>
    </main>
  );
}
