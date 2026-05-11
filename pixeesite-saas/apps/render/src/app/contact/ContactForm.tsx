'use client';
import { useState } from 'react';

export function ContactForm({ orgSlug, primaryColor }: { orgSlug: string; primaryColor: string }) {
  const [draft, setDraft] = useState<any>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  async function send() {
    setSending(true);
    const r = await fetch(`/api/public/leads?org=${orgSlug}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, source: 'contact-form' }),
    });
    setSending(false);
    if (r.ok) { setDone(true); setDraft({}); }
  }

  if (done) return (
    <div style={{ background: '#10b9810f', border: '1px solid #10b981', borderRadius: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 36 }}>✅</div>
      <h3 style={{ margin: '8px 0' }}>Message envoyé !</h3>
      <p style={{ opacity: 0.7, fontSize: 14 }}>On revient vers toi rapidement.</p>
    </div>
  );

  const inp: React.CSSProperties = {
    width: '100%', padding: 12, background: '#0a0a0f', border: '1px solid #3f3f46',
    borderRadius: 8, color: 'inherit', fontSize: 14, marginBottom: 12, fontFamily: 'inherit',
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); send(); }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <input style={inp} placeholder="Prénom" value={draft.firstName || ''} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} required />
        <input style={inp} placeholder="Nom" value={draft.lastName || ''} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
      </div>
      <input style={inp} placeholder="Email *" type="email" value={draft.email || ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} required />
      <input style={inp} placeholder="Téléphone" value={draft.phone || ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
      <textarea style={{ ...inp, minHeight: 120 }} placeholder="Ton message *" value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} required />
      <button type="submit" disabled={sending}
        style={{ background: primaryColor, color: 'white', border: 0, padding: '14px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
        {sending ? 'Envoi…' : 'Envoyer le message'}
      </button>
    </form>
  );
}
