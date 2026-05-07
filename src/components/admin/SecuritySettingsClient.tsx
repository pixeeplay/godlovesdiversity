'use client';
import { useEffect, useState } from 'react';
import { Shield, Save, Loader2, CheckCircle2, AlertTriangle, Key, Mail, Sparkles, Globe, Lock, Users } from 'lucide-react';

interface Settings {
  allowSignup: boolean;
  allowMagicLink: boolean;
  allowGoogle: boolean;
  allowApple: boolean;
  allowInvitation: boolean;
  emailVerificationRequired: boolean;
  twoFactorRequired: boolean;
  adminTailscaleOnly: boolean;
  lockoutAfterFailedLogins: number;
  sessionDurationDays: number;
  passwordMinLength: number;
}

const DEFAULT_SETTINGS: Settings = {
  allowSignup: true,
  allowMagicLink: true,
  allowGoogle: false,
  allowApple: false,
  allowInvitation: true,
  emailVerificationRequired: true,
  twoFactorRequired: false,
  adminTailscaleOnly: false,
  lockoutAfterFailedLogins: 5,
  sessionDurationDays: 30,
  passwordMinLength: 10
};

export function SecuritySettingsClient() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/security-settings');
      const j = await r.json();
      setSettings({ ...DEFAULT_SETTINGS, ...j });
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/security-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const j = await r.json();
      setMsg(r.ok ? '✓ Sauvegardé — les modifications sont actives immédiatement' : `⚠ ${j.error}`);
      setTimeout(() => setMsg(null), 4000);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setSaving(false);
  }

  function toggle(key: keyof Settings) {
    setSettings(s => ({ ...s, [key]: !s[key] }));
  }

  function update(key: keyof Settings, value: any) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 rounded-2xl p-3">
            <Shield size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Sécurité — Super-Admin</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Active/désactive chaque méthode de connexion et règle les options de sécurité globales.
            </p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-full flex items-center gap-2"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Sauvegarder
        </button>
      </header>

      {msg && (
        <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${msg.startsWith('✓') ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border border-rose-500/30 text-rose-200'}`}>
          {msg.startsWith('✓') ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {msg}
        </div>
      )}

      {/* Méthodes de connexion */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Key size={14} className="text-fuchsia-400" /> Méthodes de connexion
        </h2>
        <p className="text-xs text-zinc-500">Active les méthodes que les utilisateurs peuvent utiliser pour se connecter sur <code className="bg-zinc-800 px-1 rounded">/admin/login</code>.</p>
        <Toggle label="Mot de passe (Credentials)"     description="Email + mot de passe classique. Toujours activé."           checked={true} disabled />
        <Toggle label="Lien magique (Email)"            description="Connexion sans mot de passe via lien envoyé par email."     checked={settings.allowMagicLink}        onChange={() => toggle('allowMagicLink')} />
        <Toggle label="Code d'invitation"                description="Codes générés par admin avec TTL pour onboarding rapide."   checked={settings.allowInvitation}       onChange={() => toggle('allowInvitation')} />
        <Toggle label="Google OAuth"                     description="Connexion via compte Google. Requiert clés OAuth dans .env." checked={settings.allowGoogle}           onChange={() => toggle('allowGoogle')} />
        <Toggle label="Apple OAuth"                      description="Connexion via compte Apple. Requiert clés OAuth Apple."     checked={settings.allowApple}            onChange={() => toggle('allowApple')} />
      </section>

      {/* Inscription */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Users size={14} className="text-emerald-400" /> Inscription publique
        </h2>
        <Toggle
          label="Auto-inscription publique sur /signup"
          description="Si désactivé, seules les invitations admin permettent de créer un compte."
          checked={settings.allowSignup}
          onChange={() => toggle('allowSignup')}
        />
        <Toggle
          label="Vérification email obligatoire"
          description="Le user doit cliquer sur un lien envoyé par email avant de pouvoir se connecter."
          checked={settings.emailVerificationRequired}
          onChange={() => toggle('emailVerificationRequired')}
        />
        <NumberSetting
          label="Longueur minimale du mot de passe"
          value={settings.passwordMinLength}
          min={6} max={32} step={1}
          onChange={(v) => update('passwordMinLength', v)}
          suffix=" caractères"
        />
      </section>

      {/* Sécurité avancée */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-base flex items-center gap-2">
          <Lock size={14} className="text-violet-400" /> Sécurité avancée
        </h2>
        <Toggle
          label="2FA TOTP obligatoire pour ADMIN"
          description="Code Authenticator à 6 chiffres requis à chaque connexion ADMIN. ⚠ Nécessite implémentation otplib (P1)."
          checked={settings.twoFactorRequired}
          onChange={() => toggle('twoFactorRequired')}
        />
        <Toggle
          label="Restreindre /admin/* aux IPs Tailscale"
          description="Bloque l'accès au back-office depuis Internet public. Seules les IPs 100.x.y.z (Tailnet) sont autorisées. ⚠ Nécessite middleware (P2)."
          checked={settings.adminTailscaleOnly}
          onChange={() => toggle('adminTailscaleOnly')}
        />
        <NumberSetting
          label="Lockout après N échecs de login"
          value={settings.lockoutAfterFailedLogins}
          min={3} max={20} step={1}
          onChange={(v) => update('lockoutAfterFailedLogins', v)}
          suffix=" tentatives (puis 5 min cooldown)"
        />
        <NumberSetting
          label="Durée des sessions"
          value={settings.sessionDurationDays}
          min={1} max={90} step={1}
          onChange={(v) => update('sessionDurationDays', v)}
          suffix=" jours avant expiration"
        />
      </section>

      {/* Note */}
      <section className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-200">
        <h3 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={14} /> Important</h3>
        <ul className="text-xs space-y-1 list-disc ml-5">
          <li>Les méthodes désactivées ici disparaissent immédiatement de la page <code>/admin/login</code>.</li>
          <li>Les <strong>flags marqués ⚠</strong> ne sont pas encore implémentés côté code (2FA TOTP, Tailscale ACL, lockout) — le toggle persiste en config et les implémentations viendront dans des commits dédiés.</li>
          <li>Un super-admin peut toujours se connecter avec mot de passe même si toutes les autres méthodes sont désactivées.</li>
          <li>Les changements sont actifs <strong>immédiatement</strong> après "Sauvegarder" (pas de redeploy nécessaire).</li>
        </ul>
      </section>
    </div>
  );
}

function Toggle({ label, description, checked, onChange, disabled }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 cursor-pointer rounded-xl p-3 border transition ${
      checked ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
    } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 accent-emerald-500"
      />
      <div className="flex-1">
        <div className="font-bold text-sm">{label}</div>
        {description && <p className="text-[11px] text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
        checked ? 'bg-emerald-500/30 text-emerald-200' : 'bg-zinc-700 text-zinc-400'
      }`}>
        {checked ? 'ACTIF' : 'INACTIF'}
      </span>
    </label>
  );
}

function NumberSetting({ label, value, min, max, step, onChange, suffix }: {
  label: string;
  value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold">{label}</span>
        <span className="text-xs text-fuchsia-300 font-mono">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-fuchsia-500"
      />
      <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
