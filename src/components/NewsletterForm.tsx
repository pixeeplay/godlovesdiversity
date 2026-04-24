'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, Mail, CheckCircle2 } from 'lucide-react';

export function NewsletterForm() {
  const t = useTranslations('newsletter');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const r = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale })
      });
      if (!r.ok) throw new Error(await r.text());
      setState('success');
    } catch (err: any) {
      setState('error');
      setMsg(err?.message || t('error'));
    }
  }

  if (state === 'success') {
    return (
      <div className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-8 max-w-xl">
        <CheckCircle2 className="text-brand-pink mb-3" />
        <p className="text-white/80">{t('success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 max-w-xl">
      <label className="grid gap-1 text-sm">
        <span className="text-white/70">{t('email_label')}</span>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-3 focus:border-brand-pink outline-none"
            />
          </div>
          <button disabled={state === 'loading'} className="btn-primary">
            {state === 'loading' ? <Loader2 className="animate-spin" size={16} /> : t('subscribe')}
          </button>
        </div>
      </label>
      {state === 'error' && <p className="text-red-400 text-sm">{msg}</p>}
      <p className="text-xs text-white/40">
        Double opt-in RGPD. Désinscription en 1 clic à tout moment.
      </p>
    </form>
  );
}
