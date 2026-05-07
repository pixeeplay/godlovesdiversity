'use client';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, Loader2, Mail, LockKeyhole as Lock, Sparkles, KeyRound, ArrowRight, CheckCircle2 } from 'lucide-react';

/**
 * Page de login universelle (admin + user) — UI complète multi-méthodes.
 *
 * Méthodes proposées :
 *   1. Email + mot de passe (Credentials)
 *   2. Magic link (NextAuth EmailProvider — si configuré)
 *   3. Google OAuth (si configuré)
 *   4. Code d'invitation (envoyé par admin)
 *
 * Les méthodes désactivées dans /admin/security-settings n'apparaissent pas.
 */

function destFor(role: string | undefined, next: string | null) {
  if (next && next.startsWith('/')) return next;
  if (role === 'ADMIN' || role === 'EDITOR') return '/admin';
  return '/mon-espace';
}

interface SecurityCfg {
  allowSignup: boolean;
  allowMagicLink: boolean;
  allowGoogle: boolean;
  allowApple: boolean;
  allowInvitation: boolean;
  emailVerificationRequired: boolean;
}

const DEFAULT_CFG: SecurityCfg = {
  allowSignup: true,
  allowMagicLink: true,
  allowGoogle: false,
  allowApple: false,
  allowInvitation: true,
  emailVerificationRequired: true
};

export default function LoginPage() {
  const { data, status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next');
  const invitationCode = sp.get('invitation');

  const [mode, setMode] = useState<'password' | 'magic' | 'invitation'>('password');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [code, setCode] = useState(invitationCode || '');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cfg, setCfg] = useState<SecurityCfg>(DEFAULT_CFG);

  useEffect(() => {
    fetch('/api/admin/security-settings/public').then(r => r.json()).then(j => {
      if (j && typeof j === 'object') setCfg({ ...DEFAULT_CFG, ...j });
    }).catch(() => {});
    if (invitationCode) setMode('invitation');

    // Auto-fill depuis ?email=...&tempPassword=...&msg=magic-link-success
    const urlEmail = sp.get('email');
    const tempPw = sp.get('tempPassword');
    const urlMsg = sp.get('msg');
    const urlErr = sp.get('err');
    if (urlEmail) setEmail(urlEmail);
    if (tempPw) {
      setPw(tempPw);
      setMode('password');
      setInfo('✨ Lien magique validé ! Mot de passe pré-rempli — clique sur "Se connecter".');
    }
    if (urlErr === 'expired') setErr('⏰ Lien expiré. Refais une demande.');
    if (urlErr === 'invalid') setErr('❌ Lien invalide ou déjà utilisé.');
    if (urlErr === 'server') setErr('Erreur serveur. Réessaie plus tard.');
  }, [invitationCode, sp]);

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (data?.user as any)?.role;
      router.replace(destFor(role, next));
    }
  }, [status, router, data, next]);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(''); setInfo('');
    const r = await signIn('credentials', { redirect: false, email, password: pw });
    if (r?.error) {
      setLoading(false);
      setErr('Identifiants invalides. Vérifie ton email + mot de passe.');
      return;
    }
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

  async function submitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(''); setInfo('');
    try {
      const r = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const j = await r.json();
      if (r.ok) {
        setInfo(`✓ Lien magique envoyé à ${email}. Vérifie ta boîte mail (et tes spams). Le lien expire dans 30 min.`);
      } else {
        setErr(j.error || 'Erreur lors de l\'envoi.');
      }
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

  async function submitInvitation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(''); setInfo('');
    try {
      const r = await fetch('/api/admin/invitations/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const j = await r.json();
      if (r.ok) {
        setInfo(`✓ ${j.message} Vérifie ta boîte mail (${j.email}) pour le mot de passe temporaire.`);
        setEmail(j.email);
        setMode('password');
      } else {
        setErr(j.error === 'expired' ? '⏰ Code expiré' :
               j.error === 'already-used' ? '✓ Code déjà utilisé — connecte-toi avec ton mot de passe' :
               j.error === 'code-invalid' ? '❌ Code invalide' :
               (j.message || j.error || 'Erreur'));
      }
    } catch (e: any) { setErr(e.message); }
    setLoading(false);
  }

  function googleSignIn() {
    signIn('google', { callbackUrl: next || '/admin' });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-zinc-950 via-violet-950/20 to-zinc-950">
      <div className="w-full max-w-md">
        {/* Logo / titre */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 rounded-2xl p-3 mb-3 shadow-2xl shadow-fuchsia-500/30">
            <Heart size={32} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-white">God Loves Diversity</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Connecte-toi pour accéder au {next?.startsWith('/admin') ? 'back-office' : 'site'}.
          </p>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tabs des méthodes */}
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => { setMode('password'); setErr(''); setInfo(''); }}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                mode === 'password' ? 'bg-fuchsia-500/15 text-fuchsia-300 border-b-2 border-fuchsia-500' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Lock size={12} /> Mot de passe
            </button>
            {cfg.allowMagicLink && (
              <button
                onClick={() => { setMode('magic'); setErr(''); setInfo(''); }}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  mode === 'magic' ? 'bg-fuchsia-500/15 text-fuchsia-300 border-b-2 border-fuchsia-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Sparkles size={12} /> Lien magique
              </button>
            )}
            {cfg.allowInvitation && (
              <button
                onClick={() => { setMode('invitation'); setErr(''); setInfo(''); }}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  mode === 'invitation' ? 'bg-fuchsia-500/15 text-fuchsia-300 border-b-2 border-fuchsia-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <KeyRound size={12} /> Invitation
              </button>
            )}
          </div>

          <div className="p-6">
            {/* PASSWORD */}
            {mode === 'password' && (
              <form onSubmit={submitPassword} className="space-y-3">
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:border-fuchsia-500 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Mot de passe</span>
                  <input
                    type="password"
                    required
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:border-fuchsia-500 outline-none"
                  />
                </label>
                <button
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold py-2.5 rounded-full flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                  Se connecter
                </button>
              </form>
            )}

            {/* MAGIC LINK */}
            {mode === 'magic' && (
              <form onSubmit={submitMagicLink} className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Reçois un lien de connexion par email. Pas besoin de mot de passe.
                </p>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:border-fuchsia-500 outline-none"
                  />
                </label>
                <button
                  disabled={loading || !email.includes('@')}
                  className="w-full bg-gradient-to-r from-cyan-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white font-bold py-2.5 rounded-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                  Envoyer le lien magique
                </button>
              </form>
            )}

            {/* INVITATION */}
            {mode === 'invitation' && (
              <form onSubmit={submitInvitation} className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Tu as reçu une invitation par email avec un code ? Colle-le ici.
                </p>
                <label className="block">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Code d'invitation</span>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.trim())}
                    placeholder="Code à 28 caractères"
                    className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm font-mono focus:border-fuchsia-500 outline-none"
                  />
                </label>
                <button
                  disabled={loading || code.length < 10}
                  className="w-full bg-gradient-to-r from-amber-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white font-bold py-2.5 rounded-full flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Utiliser l'invitation
                </button>
              </form>
            )}

            {/* Errors / info */}
            {err && (
              <div className="mt-4 bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm rounded-lg p-3">
                {err}
              </div>
            )}
            {info && (
              <div className="mt-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm rounded-lg p-3 flex items-start gap-2">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> <span>{info}</span>
              </div>
            )}

            {/* OAuth providers */}
            {cfg.allowGoogle && (
              <>
                <div className="my-5 flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-[10px] uppercase text-zinc-500 tracking-widest">ou</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>
                <button
                  onClick={googleSignIn}
                  className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-bold py-2.5 rounded-full flex items-center justify-center gap-2 text-sm"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18a11 11 0 0 0 0 9.86z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continuer avec Google
                </button>
              </>
            )}
          </div>

          {/* Footer signup */}
          {cfg.allowSignup && (
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 text-center text-xs text-zinc-500">
              Pas encore de compte ?{' '}
              <Link href="/signup" className="text-fuchsia-400 hover:underline font-bold">Créer un compte</Link>
            </div>
          )}
        </div>

        {/* Méthodes alternatives */}
        <div className="mt-4 text-center text-[11px] text-zinc-500">
          <Link href="/" className="hover:text-fuchsia-300 transition">← Retour au site public</Link>
        </div>
      </div>
    </div>
  );
}
