'use client';
import { useState } from 'react';
import { Save, Loader2, Eye, EyeOff, Heart, ExternalLink, CheckCircle2, Plus, Trash2 } from 'lucide-react';

export function DonateSettings({ initial }: { initial: Record<string, string> }) {
  const [v, setV] = useState<Record<string, string>>({
    'integrations.square.accessToken': initial['integrations.square.accessToken'] || '',
    'integrations.square.locationId': initial['integrations.square.locationId'] || '',
    'integrations.square.applicationId': initial['integrations.square.applicationId'] || '',
    'integrations.square.environment': initial['integrations.square.environment'] || 'sandbox',
    'donate.amounts': initial['donate.amounts'] || '5,10',
    'donate.tickerItems': initial['donate.tickerItems'] || '💖 Soutenez le mouvement\n✨ Chaque don fait la différence\n🌍 Aidez-nous à diffuser l\'affiche partout dans le monde\n🏳️‍🌈 Foi et diversité, ensemble\n📣 Découvre la communauté'
  });
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function set<K extends string>(k: K, val: string) {
    setV((s) => ({ ...s, [k]: val }));
    setSaved(false);
  }

  async function save() {
    setBusy(true); setSaved(false);
    const r = await fetch('/api/admin/settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v)
    });
    setBusy(false);
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function testDonation() {
    setTesting(true); setTestResult(null);
    const r = await fetch('/api/donate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1 })
    });
    const j = await r.json();
    setTesting(false);
    if (j.url) {
      setTestResult(`✅ Lien Square créé : ${j.url}`);
      window.open(j.url, '_blank');
    } else {
      setTestResult(`❌ ${j.error || 'Erreur inconnue'}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Square */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="text-brand-pink" size={18} />
          <h2 className="font-bold text-lg">Square — paiements (Apple Pay, Google Pay, CB)</h2>
        </div>
        <p className="text-zinc-500 text-sm mb-4">
          Crée un compte sur <a href="https://squareup.com/signup" target="_blank" rel="noreferrer" className="text-brand-pink hover:underline">squareup.com</a>, puis va dans <strong>Developer Dashboard → Applications → ton app → Credentials</strong>.
        </p>

        <div className="space-y-3">
          <Field label="Access Token (privé)" type="password"
                 value={v['integrations.square.accessToken']}
                 onChange={(x) => set('integrations.square.accessToken', x)}
                 reveal={show['at']} setReveal={(b) => setShow((s) => ({ ...s, at: b }))}
                 placeholder="EAAAxxx…" />
          <Field label="Location ID" value={v['integrations.square.locationId']}
                 onChange={(x) => set('integrations.square.locationId', x)} placeholder="L1AB2CD3EF4G5" />
          <Field label="Application ID (public)" value={v['integrations.square.applicationId']}
                 onChange={(x) => set('integrations.square.applicationId', x)} placeholder="sq0idp-…" />
          <label className="block text-xs text-zinc-400">Environnement
            <select value={v['integrations.square.environment']}
                    onChange={(e) => set('integrations.square.environment', e.target.value)}
                    className="w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
              <option value="sandbox">🧪 Sandbox (test, faux paiements)</option>
              <option value="production">🟢 Production (vrais paiements)</option>
            </select>
          </label>
        </div>

        <button onClick={testDonation} disabled={testing} className="btn-ghost text-sm mt-4">
          {testing ? <Loader2 className="animate-spin" size={14} /> : <ExternalLink size={14} />}
          Tester (créer un don de 1€)
        </button>
        {testResult && (
          <p className={`mt-2 text-sm ${testResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
            {testResult}
          </p>
        )}
      </section>

      {/* Montants rapides */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-bold mb-2">Montants de don rapide</h2>
        <p className="text-zinc-500 text-sm mb-3">Séparés par des virgules. Ex: <code>5,10,20,50</code></p>
        <input value={v['donate.amounts']} onChange={(e) => set('donate.amounts', e.target.value)}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono" />
      </section>

      {/* Ticker messages */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-bold mb-2">Messages du ticker (style Times Square)</h2>
        <p className="text-zinc-500 text-sm mb-3">Un message par ligne. Les emojis sont supportés. Le bandeau défile en boucle au-dessus du carrousel photos sur la home.</p>
        <textarea
          value={v['donate.tickerItems']}
          onChange={(e) => set('donate.tickerItems', e.target.value)}
          rows={6}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
        />
      </section>

      <div className="sticky bottom-4 flex items-center justify-between gap-3 bg-zinc-950/90 backdrop-blur border border-zinc-800 rounded-2xl p-4">
        {saved && <span className="flex items-center gap-1 text-emerald-400 text-sm"><CheckCircle2 size={16} /> Enregistré</span>}
        <a href="/" target="_blank" rel="noreferrer" className="btn-ghost text-xs ml-auto"><ExternalLink size={12} /> Voir sur la home</a>
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Enregistrer
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type, placeholder, reveal, setReveal }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; reveal?: boolean; setReveal?: (b: boolean) => void;
}) {
  const isPw = type === 'password' && !reveal;
  return (
    <label className="block text-xs text-zinc-400">
      {label}
      <div className="relative mt-1">
        <input value={value} onChange={(e) => onChange(e.target.value)} type={isPw ? 'password' : 'text'} placeholder={placeholder}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-10 py-2 text-sm font-mono" />
        {type === 'password' && setReveal && (
          <button type="button" onClick={() => setReveal(!reveal)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
            {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </label>
  );
}
