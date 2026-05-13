'use client';
import { useState } from 'react';
import { Loader2, Send, Check } from 'lucide-react';

type Field = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'email' | 'number' | 'tel' | 'url' | 'select' | 'checkbox';
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

type Props = {
  kind: string;
  fields: Field[];
  submitLabel?: string;
  successMessage?: string;
  intro?: React.ReactNode;
};

export function SubmissionForm({ kind, fields, submitLabel = 'Envoyer', successMessage, intro }: Props) {
  const [data, setData] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    const required = fields.filter(f => f.required).find(f => !data[f.name]);
    if (required) { alert(`Champ requis : ${required.label}`); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/submissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          email: data.email || null,
          name: data.name || null,
          city: data.city || null,
          country: data.country || null,
          data
        })
      });
      const j = await r.json();
      if (j.ok) setDone(true);
      else alert(`Erreur : ${j.error}`);
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
        <Check size={36} className="text-emerald-400 mx-auto mb-2" />
        <p className="text-emerald-200 font-bold">{successMessage || 'Reçu ! On revient vers toi sous 48h.'}</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
      {intro}
      {fields.map(f => (
        <div key={f.name}>
          <label className="text-[10px] uppercase font-bold text-zinc-400 mb-1 block">
            {f.label}{f.required && ' *'}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              value={data[f.name] || ''}
              onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
              rows={4}
              placeholder={f.placeholder}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          ) : f.type === 'select' ? (
            <select
              value={data[f.name] || ''}
              onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— choisir —</option>
              {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : f.type === 'checkbox' ? (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!data[f.name]} onChange={(e) => setData({ ...data, [f.name]: e.target.checked })} />
              {f.placeholder || 'Confirmer'}
            </label>
          ) : (
            <input
              type={f.type || 'text'}
              value={data[f.name] || ''}
              onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
              placeholder={f.placeholder}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm"
            />
          )}
        </div>
      ))}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-full flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        {submitLabel}
      </button>
    </div>
  );
}
