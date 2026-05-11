'use client';
import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0f' }} />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await signIn('credentials', { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (r?.error) setError('Email ou mot de passe incorrect');
    else if (r?.ok) { router.push(callbackUrl); router.refresh(); }
  }

  async function oauth(provider: string) {
    setOauthLoading(provider);
    await signIn(provider, { callbackUrl });
  }

  return (
    <main className="login-grid" style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fafafa', fontFamily: 'Inter, -apple-system, system-ui, sans-serif', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>

      {/* ── LEFT : Visual branding panel ─────────────────────── */}
      <aside className="login-aside" style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(40px, 5vw, 60px)' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-15%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,70,239,0.5) 0%, transparent 60%)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', right: '-15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.4) 0%, transparent 60%)', filter: 'blur(70px)' }} />
          <div style={{ position: 'absolute', top: '40%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 60%)', filter: 'blur(50px)' }} />
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '50px 50px', maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'white' }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>✨</span>
            <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>Pixeesite</span>
          </Link>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 460 }}>
          <div style={{ fontSize: 60, color: 'rgba(255,255,255,0.3)', fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>"</div>
          <p style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', lineHeight: 1.4, fontWeight: 500, color: 'white', margin: 0, letterSpacing: -0.3 }}>
            En 5 minutes mon site était en ligne avec un design pro. L'IA a même rédigé tous les textes.
          </p>
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white', boxShadow: '0 4px 14px rgba(0,0,0,0.3)' }}>LM</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Léa Martin</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Photographe mariage</div>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {[{ v: '5 min', l: 'Setup moyen' }, { v: '106', l: 'Templates' }, { v: '12', l: 'Providers IA' }].map((s) => (
            <div key={s.l}>
              <div style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: -1 }}>{s.v}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── RIGHT : Form ─────────────────────────────────────── */}
      <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(24px, 4vw, 60px)' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <Link href="/" className="login-mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', marginBottom: 32 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #d946ef 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✨</span>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Pixeesite</span>
          </Link>

          <h1 style={{ fontSize: 'clamp(28px, 4vw, 36px)', fontWeight: 800, margin: 0, letterSpacing: -1, lineHeight: 1.15 }}>Bon retour 👋</h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginTop: 8, marginBottom: 32 }}>Connecte-toi pour accéder à tes sites.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            <button onClick={() => oauth('google')} disabled={!!oauthLoading} style={oauthBtn}>
              <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" /><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" /><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" /><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" /></svg>
              {oauthLoading === 'google' ? 'Connexion…' : 'Continuer avec Google'}
            </button>
            <button onClick={() => oauth('github')} disabled={!!oauthLoading} style={oauthBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" /></svg>
              {oauthLoading === 'github' ? 'Connexion…' : 'Continuer avec GitHub'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '24px 0', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            <span>Ou par email</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'block' }}>
              <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus placeholder="toi@exemple.com" style={inputStyle} />
            </label>
            <label style={{ display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Mot de passe</span>
                <a href="/forgot-password" style={{ fontSize: 11, color: '#d946ef', textDecoration: 'none', fontWeight: 600 }}>Oublié ?</a>
              </div>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required placeholder="••••••••" style={inputStyle} />
            </label>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', borderRadius: 10, padding: '10px 14px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #d946ef 0%, #06b6d4 100%)', color: 'white', border: 0, padding: '14px 0', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 10px 30px rgba(217,70,239,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', marginTop: 8 }}>
              {loading ? 'Connexion…' : 'Se connecter →'}
            </button>
          </form>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 28, textAlign: 'center' }}>
            Pas encore de compte ? <Link href="/signup" style={{ color: '#d946ef', fontWeight: 700, textDecoration: 'none' }}>Créer un compte gratuit</Link>
          </p>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 40, textAlign: 'center', lineHeight: 1.6 }}>
            En continuant, tu acceptes nos <a href="/legal/cgu" style={{ color: 'rgba(255,255,255,0.6)' }}>CGU</a> & <a href="/legal/privacy" style={{ color: 'rgba(255,255,255,0.6)' }}>Confidentialité</a>.
          </p>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-aside { display: none !important; }
          .login-mobile-logo { display: inline-flex !important; }
        }
        input:focus { border-color: rgba(217,70,239,0.5) !important; background: rgba(255,255,255,0.06) !important; }
        button[type=button]:hover:not(:disabled) { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.2) !important; }
      `}</style>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10, color: 'inherit', fontSize: 14, fontFamily: 'inherit',
  transition: 'border-color .15s, background .15s', outline: 'none',
};

const oauthBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: 'white', padding: '12px 16px', borderRadius: 10,
  fontWeight: 600, fontSize: 14, cursor: 'pointer',
  transition: 'background .15s, border-color .15s', fontFamily: 'inherit',
};
