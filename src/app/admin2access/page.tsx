'use client';
import { useState, useEffect } from 'react';

/**
 * Page de login admin de SECOURS — ultra-minimaliste.
 * Pas de NextAuth client, pas de useSearchParams, pas de Suspense, pas d'icônes.
 * Si /admin/login casse pour n'importe quelle raison (layout, hydration, build),
 * cette page reste accessible. Elle utilise directement l'endpoint NextAuth
 * /api/auth/callback/credentials en POST classique.
 */

export default function Admin2AccessPage() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [csrf, setCsrf] = useState('');

  // On charge le csrf token avant de pouvoir signer (NextAuth l'exige).
  useEffect(() => {
    fetch('/api/auth/csrf', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => setCsrf(j?.csrfToken || ''))
      .catch(() => setErr('Impossible de charger le token CSRF.'));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr('');
    try {
      // Login via signIn API (POST credentials)
      const r = await fetch('/api/auth/callback/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          csrfToken: csrf,
          email,
          password: pw,
          redirect: 'false',
          json: 'true'
        }).toString()
      });
      // NextAuth renvoie soit { url } soit { error }
      const j = await r.json().catch(() => null);
      if (j?.error || !j?.url || /error/i.test(j?.url || '')) {
        setErr('Identifiants invalides.');
        setLoading(false);
        return;
      }
      // OK -> aller sur /admin
      window.location.href = '/admin';
    } catch (e: any) {
      setErr(e?.message || 'Erreur réseau.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        padding: 24,
        color: '#fff'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#18181b',
          border: '1px solid #27272a',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-block',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #d946ef, #8b5cf6, #06b6d4)',
              marginBottom: 12,
              lineHeight: '56px',
              fontSize: 28
            }}
          >
            ❤
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>God Loves Diversity</h1>
          <p style={{ color: '#a1a1aa', fontSize: 13, marginTop: 6 }}>Accès admin — page de secours</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#71717a', fontWeight: 700 }}>
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={{
                width: '100%',
                marginTop: 4,
                background: '#09090b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </label>
          <label style={{ display: 'block' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: '#71717a', fontWeight: 700 }}>
              Mot de passe
            </span>
            <input
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
              style={{
                width: '100%',
                marginTop: 4,
                background: '#09090b',
                border: '1px solid #3f3f46',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 14,
                color: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </label>
          <button
            type="submit"
            disabled={loading || !csrf}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'linear-gradient(90deg, #d946ef, #8b5cf6)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              borderRadius: 999,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading || !csrf ? 0.6 : 1,
              marginTop: 8
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {err && (
          <div
            style={{
              marginTop: 16,
              background: 'rgba(244,63,94,0.1)',
              border: '1px solid rgba(244,63,94,0.3)',
              color: '#fda4af',
              fontSize: 13,
              borderRadius: 8,
              padding: 12
            }}
          >
            {err}
          </div>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: '#71717a' }}>
          <a href="/admin/login" style={{ color: '#d946ef', textDecoration: 'none' }}>
            ← Retour login standard
          </a>
        </div>
      </div>
    </div>
  );
}
