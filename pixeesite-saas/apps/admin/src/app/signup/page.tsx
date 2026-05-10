'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function autoSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgName, orgSlug: orgSlug || autoSlug(orgName) }),
      });
      const j = await r.json();
      if (!r.ok) {
        const errors: Record<string, string> = {
          'slug-taken': 'Ce slug est déjà pris.',
          'email-already-used': 'Cet email a déjà un compte. Connecte-toi.',
          'invalid-email': 'Email invalide.',
          'password-too-short': 'Le mot de passe doit faire au moins 8 caractères.',
          'invalid-slug': 'Slug invalide (3-40 caractères, a-z 0-9 -).',
          'reserved-slug': 'Ce slug est réservé.',
        };
        setError(errors[j.error] || j.error || 'Erreur');
        setLoading(false);
        return;
      }
      // Auto-login
      await signIn('credentials', { email, password, redirect: false });
      router.push(`/dashboard?welcome=1`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'system-ui', background: '#0a0a0f', color: '#fafafa' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pixeesite</h1>
        <p style={{ opacity: 0.6, marginBottom: 8 }}>14 jours d'essai gratuit. Sans carte bancaire.</p>
        <p style={{ opacity: 0.4, marginBottom: 32, fontSize: 13 }}>Tu pourras inviter ton équipe + connecter ton domaine après.</p>

        <form onSubmit={submit}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 4 }}>Nom de ton organisation</span>
            <input
              value={orgName} onChange={(e) => { setOrgName(e.target.value); if (!orgSlug) setOrgSlug(autoSlug(e.target.value)); }}
              placeholder="Mon agence créative" required autoFocus
              style={{ width: '100%', padding: 12, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: 'inherit' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 4 }}>Slug (URL)</span>
            <div style={{ display: 'flex', alignItems: 'center', background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, padding: '0 12px' }}>
              <input
                value={orgSlug} onChange={(e) => setOrgSlug(autoSlug(e.target.value))}
                placeholder="mon-agence" required pattern="[a-z0-9-]+" minLength={3} maxLength={40}
                style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 0, color: 'inherit', fontFamily: 'monospace' }}
              />
              <span style={{ opacity: 0.5, fontSize: 12 }}>.pixeesite.app</span>
            </div>
          </label>

          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 4 }}>Email</span>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@exemple.com" required
              style={{ width: '100%', padding: 12, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: 'inherit' }}
            />
          </label>

          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, marginBottom: 4 }}>Mot de passe</span>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Au moins 8 caractères" required minLength={8}
              style={{ width: '100%', padding: 12, background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, color: 'inherit' }}
            />
          </label>

          {error && <p style={{ color: '#f43f5e', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', border: 0, borderRadius: 12, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: 15 }}
          >
            {loading ? 'Création…' : 'Créer mon organisation ✨'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 14, opacity: 0.6, textAlign: 'center' }}>
          Déjà inscrit ? <Link href="/login" style={{ color: '#d946ef' }}>Se connecter</Link>
        </p>
        <p style={{ marginTop: 12, fontSize: 11, opacity: 0.4, textAlign: 'center' }}>
          En créant un compte, tu acceptes les <Link href="/terms" style={{ color: '#a1a1aa' }}>CGU</Link> et la <Link href="/privacy" style={{ color: '#a1a1aa' }}>politique de confidentialité</Link>.
        </p>
      </div>
    </main>
  );
}
