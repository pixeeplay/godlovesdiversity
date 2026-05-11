'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

export function SecurityClient({ orgSlug }: { orgSlug: string }) {
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/2fa`);
    const j = await r.json();
    setEnabled(!!j.enabled);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function init() {
    const r = await fetch(`/api/orgs/${orgSlug}/2fa`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init' }),
    });
    const j = await r.json();
    setSetup(j);
  }

  async function enable() {
    const r = await fetch(`/api/orgs/${orgSlug}/2fa`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'enable', code }),
    });
    const j = await r.json();
    if (r.ok) {
      setRecovery(j.recoveryCodes);
      setSetup(null);
      setCode('');
      load();
    } else {
      alert(j.error || 'Erreur');
    }
  }

  async function disable() {
    if (!confirm('Désactiver le 2FA ?')) return;
    await fetch(`/api/orgs/${orgSlug}/2fa`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disable' }),
    });
    setEnabled(false);
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🔐" title="Sécurité"
      desc="Authentification à deux facteurs (2FA TOTP)"
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ ...card, padding: 24 }}>
          <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            🔑 2FA TOTP
            {enabled ? (
              <span style={{ fontSize: 11, padding: '2px 6px', background: '#10b98133', color: '#10b981', borderRadius: 4 }}>Activé</span>
            ) : (
              <span style={{ fontSize: 11, padding: '2px 6px', background: '#71717a33', color: '#a1a1aa', borderRadius: 4 }}>Désactivé</span>
            )}
          </h3>
          <p style={{ opacity: 0.7, fontSize: 13 }}>
            Renforce ton compte avec Google Authenticator, Authy, 1Password ou Aegis.
          </p>

          {!enabled && !setup && (
            <button style={btnPrimary} onClick={init}>Activer le 2FA</button>
          )}

          {setup && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 13, opacity: 0.8 }}>1. Scanne ce QR code dans ton app TOTP (ou copie le secret)</p>
              <div style={{ background: 'white', padding: 12, borderRadius: 8, display: 'inline-block', marginBottom: 12 }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.otpauth)}`} alt="2FA QR" />
              </div>
              <div style={{ ...card, padding: 8, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', background: '#0a0a0f' }}>
                Secret : {setup.secret}
              </div>
              <p style={{ fontSize: 13, opacity: 0.8, marginTop: 16 }}>2. Entre le code à 6 chiffres affiché par ton app</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...input, maxWidth: 120, fontFamily: 'monospace', fontSize: 18, letterSpacing: 4, textAlign: 'center' }}
                  maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value)} />
                <button style={btnPrimary} onClick={enable} disabled={code.length !== 6}>Activer</button>
                <button style={btnSecondary} onClick={() => setSetup(null)}>Annuler</button>
              </div>
            </div>
          )}

          {enabled && (
            <button style={{ ...btnSecondary, color: '#ef4444', borderColor: '#ef4444' }} onClick={disable}>
              Désactiver le 2FA
            </button>
          )}

          {recovery && (
            <div style={{ ...card, padding: 16, marginTop: 16, background: '#10b9810f', borderColor: '#10b981' }}>
              <h4 style={{ marginTop: 0 }}>🎉 2FA activé !</h4>
              <p style={{ fontSize: 13, opacity: 0.8 }}>
                Voici tes codes de récupération. <strong>Sauvegarde-les en lieu sûr</strong> — ils ne seront plus affichés.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontFamily: 'monospace', fontSize: 13 }}>
                {recovery.map((c) => (
                  <div key={c} style={{ background: '#0a0a0f', padding: 6, borderRadius: 4, textAlign: 'center' }}>{c}</div>
                ))}
              </div>
              <button style={{ ...btnSecondary, marginTop: 12 }} onClick={() => setRecovery(null)}>J'ai copié les codes</button>
            </div>
          )}
        </div>
      )}
    </SimpleOrgPage>
  );
}
