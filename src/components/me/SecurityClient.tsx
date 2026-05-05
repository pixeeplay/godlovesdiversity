'use client';
import { useEffect, useState } from 'react';
import { Lock, Smartphone, AlertTriangle, CheckCircle2, Loader2, Eye, EyeOff, Trash2, ShieldCheck } from 'lucide-react';

export function SecurityClient() {
  return (
    <div className="space-y-5">
      <PasswordSection />
      <SessionsSection />
      <TwoFactorSection />
      <DangerZone />
    </div>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save() {
    setMsg('');
    if (next.length < 8) { setMsg('❌ Minimum 8 caractères'); return; }
    if (next !== confirm) { setMsg('❌ Les mots de passe ne correspondent pas'); return; }
    setBusy(true);
    const r = await fetch('/api/me/password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current, next })
    });
    const j = await r.json();
    setBusy(false);
    if (j.ok) { setMsg('✓ Mot de passe modifié'); setCurrent(''); setNext(''); setConfirm(''); }
    else setMsg('❌ ' + (j.error || 'Erreur'));
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="font-bold flex items-center gap-2 mb-3"><Lock size={16} /> Changer le mot de passe</h2>
      <div className="space-y-2">
        <Input label="Mot de passe actuel" value={current} onChange={setCurrent} type={show ? 'text' : 'password'} />
        <Input label="Nouveau mot de passe (8+ chars)" value={next} onChange={setNext} type={show ? 'text' : 'password'} />
        <Input label="Confirmer" value={confirm} onChange={setConfirm} type={show ? 'text' : 'password'} />
        <button onClick={() => setShow(!show)} className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">
          {show ? <EyeOff size={11} /> : <Eye size={11} />} {show ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      {msg && <p className={`text-xs mt-3 ${msg.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>{msg}</p>}
      <button onClick={save} disabled={busy || !current || !next} className="mt-3 bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Mettre à jour
      </button>
    </section>
  );
}

function SessionsSection() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me/sessions').then(r => r.json()).then(j => {
      setSessions(j.sessions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function revoke(id: string) {
    if (!confirm('Déconnecter cette session ?')) return;
    await fetch(`/api/me/sessions?id=${id}`, { method: 'DELETE' });
    setSessions(sessions.filter((s) => s.id !== id));
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="font-bold flex items-center gap-2 mb-3"><Smartphone size={16} /> Sessions actives</h2>
      {loading ? <Loader2 className="animate-spin text-zinc-500" /> : sessions.length === 0 ? (
        <p className="text-sm text-zinc-500">Une seule session active (celle-ci).</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-2 bg-zinc-950 rounded-lg">
              <Smartphone size={16} className="text-zinc-400" />
              <div className="flex-1 text-xs">
                <div className="font-bold">{s.userAgent || 'Appareil inconnu'}</div>
                <div className="text-zinc-500">{s.ip || '—'} · expire {new Date(s.expires).toLocaleDateString('fr-FR')}</div>
              </div>
              <button onClick={() => revoke(s.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-zinc-500 mt-3">💡 Si tu vois une session inconnue, déconnecte-la et change ton mot de passe immédiatement.</p>
    </section>
  );
}

function TwoFactorSection() {
  const [enabled, setEnabled] = useState(false);
  const [setupUrl, setSetupUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/me/2fa/status').then(r => r.json()).then(j => setEnabled(!!j.enabled)).catch(() => {});
  }, []);

  async function start() {
    setBusy(true);
    const r = await fetch('/api/me/2fa/setup', { method: 'POST' });
    const j = await r.json();
    setSetupUrl(j.qrUrl || '');
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    const r = await fetch('/api/me/2fa/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const j = await r.json();
    if (j.ok) { setEnabled(true); setSetupUrl(''); setCode(''); }
    else alert(j.error || 'Code invalide');
    setBusy(false);
  }

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <h2 className="font-bold flex items-center gap-2 mb-3"><ShieldCheck size={16} /> Double authentification (2FA)</h2>
      {enabled ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} /> 2FA activée — ton compte est protégé
        </div>
      ) : setupUrl ? (
        <div>
          <p className="text-xs text-zinc-400 mb-3">Scanne ce QR avec Google Authenticator, Authy ou 1Password :</p>
          <div className="bg-white p-4 rounded-lg inline-block mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupUrl)}`} alt="QR 2FA" />
          </div>
          <Input label="Entre le code à 6 chiffres" value={code} onChange={setCode} placeholder="123456" />
          <button onClick={verify} disabled={busy || code.length !== 6} className="mt-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Activer la 2FA'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-zinc-300 mb-3">Renforce ton compte avec un code à 6 chiffres généré toutes les 30s par une appli.</p>
          <button onClick={start} disabled={busy} className="bg-brand-pink hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-full text-sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Activer la 2FA'}
          </button>
        </div>
      )}
    </section>
  );
}

function DangerZone() {
  return (
    <section className="bg-rose-500/5 border border-rose-500/30 rounded-2xl p-5">
      <h2 className="font-bold flex items-center gap-2 mb-3 text-rose-300"><AlertTriangle size={16} /> Zone de danger</h2>
      <p className="text-xs text-zinc-300 mb-3">Supprimer ton compte efface définitivement tes posts, témoignages, journaux, lettres futures et matchs. Pas de récupération possible.</p>
      <button onClick={() => {
        if (!confirm('Supprimer définitivement ton compte ?')) return;
        if (!confirm('Vraiment ? Cette action est IRRÉVERSIBLE.')) return;
        fetch('/api/me/profile', { method: 'DELETE' }).then(() => location.href = '/');
      }} className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
        <Trash2 size={14} /> Supprimer mon compte (RGPD)
      </button>
    </section>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-zinc-400 mb-1 block">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-brand-pink outline-none" />
    </label>
  );
}
