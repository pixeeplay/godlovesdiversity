'use client';
import { useEffect, useState } from 'react';
import { Shield, Loader2, CheckCircle2, AlertTriangle, KeyRound, Copy, Smartphone, X, Phone } from 'lucide-react';

interface MfaStatus {
  enabled: boolean;
  enrolled: boolean;
  smsEnabled: boolean;
  hasPhone: boolean;
  backupCodesCount: number;
}

interface EnrollResponse {
  ok: boolean;
  secret?: string;
  uri?: string;
  qrCodeDataUrl?: string;
  backupCodes?: string[];
  message?: string;
}

export function Mfa2faClient({ userEmail }: { userEmail: string }) {
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollData, setEnrollData] = useState<EnrollResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsTesting, setSmsTesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/auth/mfa');
      const j = await r.json();
      setStatus(j);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function startEnroll() {
    setEnrolling(true); setMsg(null);
    try {
      const r = await fetch('/api/auth/mfa?action=enroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (r.ok) setEnrollData(j);
      else setMsg(`⚠ ${j.error || j.message}`);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setEnrolling(false);
  }

  async function verifyEnroll() {
    if (verifyCode.replace(/\s/g, '').length !== 6) { setMsg('⚠ Code à 6 chiffres requis'); return; }
    setVerifying(true); setMsg(null);
    try {
      const r = await fetch('/api/auth/mfa?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode })
      });
      const j = await r.json();
      if (r.ok) {
        setMsg('✓ ' + j.message);
        setEnrollData(null);
        setVerifyCode('');
        load();
      } else {
        setMsg(`⚠ ${j.error}`);
      }
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setVerifying(false);
  }

  async function disable2fa() {
    if (!confirm('Désactiver le 2FA ? Tu perds une couche de sécurité.')) return;
    try {
      await fetch('/api/auth/mfa', { method: 'DELETE' });
      load();
      setMsg('✓ 2FA désactivé');
    } catch {}
  }

  async function sendSmsTest() {
    if (!/^\+\d{6,15}$/.test(smsPhone)) { setMsg('⚠ Format E.164 attendu (ex +33612345678)'); return; }
    setSmsTesting(true); setMsg(null);
    try {
      const r = await fetch('/api/auth/sms-code?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneE164: smsPhone, purpose: 'phone-verify' })
      });
      const j = await r.json();
      setMsg(r.ok ? `✓ ${j.message}` : `⚠ ${j.message || j.error}${j.hint ? ` — ${j.hint}` : ''}`);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setSmsTesting(false);
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-emerald-500 via-cyan-500 to-violet-500 rounded-2xl p-3">
          <Shield size={26} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Authentification 2FA</h1>
          <p className="text-zinc-400 text-xs mt-1">Compte : <code className="bg-zinc-800 px-1.5 rounded text-fuchsia-300">{userEmail}</code></p>
        </div>
      </header>

      {msg && (
        <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${msg.startsWith('✓') ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'}`}>
          {msg.startsWith('✓') ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {msg}
        </div>
      )}

      {/* Statut actuel */}
      <section className={`rounded-2xl border p-5 ${status?.enabled ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-amber-500/10 border-amber-500/40'}`}>
        <div className="flex items-start gap-3">
          {status?.enabled ? <CheckCircle2 size={24} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={24} className="text-amber-400 shrink-0" />}
          <div className="flex-1">
            <h2 className="font-bold text-lg">{status?.enabled ? '✅ 2FA activé' : '⚠ 2FA non activé'}</h2>
            <p className="text-sm mt-1 text-zinc-300">
              {status?.enabled
                ? `À chaque connexion, tu dois entrer un code à 6 chiffres généré par ton app Authenticator. ${status.backupCodesCount} codes de récupération restants.`
                : 'Active la 2FA pour ajouter une seconde couche de protection à ton compte. Recommandé pour tous les ADMIN.'}
            </p>
          </div>
          {status?.enabled && (
            <button onClick={disable2fa} className="text-xs bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 px-3 py-1.5 rounded-full">
              Désactiver
            </button>
          )}
        </div>
      </section>

      {/* Enrôlement */}
      {!status?.enabled && !enrollData && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Smartphone size={14} className="text-cyan-400" /> Activer 2FA TOTP</h3>
          <p className="text-sm text-zinc-300 mb-4">
            Tu auras besoin d'une app Authenticator sur ton téléphone :
          </p>
          <ul className="text-xs text-zinc-400 mb-4 space-y-1 list-disc ml-5">
            <li><strong>Google Authenticator</strong> — gratuit, simple</li>
            <li><strong>Microsoft Authenticator</strong> — gratuit, sync entre appareils</li>
            <li><strong>Authy / Twilio Authy</strong> — gratuit, multi-device</li>
            <li><strong>1Password / Bitwarden</strong> — si tu utilises déjà un gestionnaire de mdp</li>
          </ul>
          <button
            onClick={startEnroll}
            disabled={enrolling}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2"
          >
            {enrolling ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Activer la 2FA maintenant
          </button>
        </section>
      )}

      {/* QR code + backup codes */}
      {enrollData && (
        <section className="bg-zinc-900 border-2 border-fuchsia-500/40 rounded-2xl p-5">
          <h3 className="font-bold mb-3">📱 Étape 1 : Scanne le QR code</h3>
          <div className="bg-white rounded-xl p-4 inline-block">
            <img src={enrollData.qrCodeDataUrl} alt="QR Code 2FA" className="block" width="240" height="240" />
          </div>
          <p className="text-xs text-zinc-400 mt-3">
            Ou copie ce secret manuellement dans ton app :
          </p>
          <div className="mt-2 flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2 font-mono text-sm">
            <code className="flex-1">{enrollData.secret}</code>
            <button onClick={() => navigator.clipboard.writeText(enrollData.secret || '')} className="text-fuchsia-400 hover:text-fuchsia-300">
              <Copy size={12} />
            </button>
          </div>

          <h3 className="font-bold mt-6 mb-3">🔐 Étape 2 : Sauvegarde tes codes de récupération</h3>
          <p className="text-xs text-zinc-400 mb-3">
            <strong>Ces codes ne s'afficheront qu'UNE SEULE FOIS.</strong> Imprime-les ou stocke-les dans ton gestionnaire de mots de passe. Tu peux utiliser chacun une fois si tu perds ton téléphone.
          </p>
          <div className="grid grid-cols-2 gap-2 bg-zinc-950 border border-amber-500/30 rounded-lg p-3 font-mono text-sm">
            {enrollData.backupCodes?.map(c => (
              <code key={c} className="text-amber-300">{c}</code>
            ))}
          </div>
          <button
            onClick={() => {
              const text = (enrollData.backupCodes || []).join('\n');
              navigator.clipboard.writeText(text);
              setMsg('✓ Codes copiés dans le presse-papier');
            }}
            className="mt-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1 rounded-full flex items-center gap-1"
          >
            <Copy size={11} /> Copier tous les codes
          </button>

          <h3 className="font-bold mt-6 mb-3">✅ Étape 3 : Vérifie en entrant le code à 6 chiffres</h3>
          <div className="flex gap-2">
            <input
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              maxLength={7}
              placeholder="123 456"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-2xl font-mono text-center tracking-widest focus:border-fuchsia-500 outline-none"
            />
            <button
              onClick={verifyEnroll}
              disabled={verifying}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-5 rounded-lg flex items-center gap-2"
            >
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Activer
            </button>
          </div>

          <button
            onClick={() => { setEnrollData(null); setVerifyCode(''); }}
            className="mt-4 text-xs text-zinc-500 hover:text-white"
          >
            ← Annuler l'enrôlement
          </button>
        </section>
      )}

      {/* SMS Twilio test */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Phone size={14} className="text-violet-400" /> SMS de vérification (Twilio)</h3>
        <p className="text-sm text-zinc-400 mb-3">
          Envoyer un code à 6 chiffres par SMS pour les actions critiques (changement de rôle, suppression d'admin).
          Configure d'abord ton compte Twilio dans <code className="bg-zinc-800 px-1 rounded">/admin/settings → integrations.twilio</code>.
        </p>
        <div className="flex gap-2">
          <input
            value={smsPhone}
            onChange={(e) => setSmsPhone(e.target.value)}
            placeholder="+33612345678"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <button
            onClick={sendSmsTest}
            disabled={smsTesting || !/^\+\d{6,15}$/.test(smsPhone)}
            className="bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1"
          >
            {smsTesting ? <Loader2 size={11} className="animate-spin" /> : <Phone size={11} />}
            Test SMS
          </button>
        </div>
      </section>

      {/* Tailscale ACL info */}
      <section className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-200">
        <h3 className="font-bold mb-2 flex items-center gap-2"><Shield size={14} /> Tailscale ACL — Niveau 4</h3>
        <p className="text-xs">
          Pour bloquer l'accès <code className="bg-zinc-800 px-1 rounded">/admin/*</code> aux IPs Internet publiques :
        </p>
        <ol className="text-xs space-y-1 list-decimal ml-5 mt-2">
          <li>Dans Coolify → env vars → ajoute <code className="bg-blue-500/20 px-1 rounded">ADMIN_TAILSCALE_ONLY=true</code></li>
          <li>Redéploie</li>
          <li>Le middleware bloque toute IP non-Tailscale (range 100.64.0.0/10) et localhost</li>
        </ol>
        <p className="text-xs italic text-blue-300/80 mt-2">
          ⚠ Test depuis le Tailnet AVANT d'activer en prod, sinon tu te bloques toi-même.
        </p>
      </section>
    </div>
  );
}
