'use client';
import { useState } from 'react';
import { Send, Save, Sparkles, Loader2 } from 'lucide-react';

export function NewsletterEditor() {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState(`<h1 style="color:#FF1493">Hello 🌈</h1>\n<p>Bonjour à toutes et tous,</p>\n<p>Voici les nouvelles du mouvement ce mois-ci...</p>`);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function save(send: boolean) {
    setBusy(true); setMsg('');
    const r = await fetch('/api/admin/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, htmlContent: html, send })
    });
    setBusy(false);
    setMsg(r.ok ? (send ? '✅ Envoyé !' : '✅ Brouillon enregistré') : '❌ Erreur');
  }

  async function aiDraft() {
    setAiBusy(true);
    const r = await fetch('/api/ai/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: `Rédige une newsletter mensuelle pour le mouvement God Loves Diversity. Sujet du mois : témoignages reçus, actions à venir. Ton inclusif, apaisé, simple. Format HTML simple, max 200 mots, sans <html> tag wrapper.`,
        system: 'Tu es l\'éditorialiste du mouvement God Loves Diversity. Tu écris en français, ton chaleureux et lumineux.'
      })
    });
    const j = await r.json();
    setHtml(j.text || html);
    setAiBusy(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <label className="grid gap-1 text-sm mb-4">
        <span className="text-zinc-400">Objet</span>
        <input
          value={subject} onChange={(e) => setSubject(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink"
          placeholder="🌈 Newsletter d'avril — God Loves Diversity"
        />
      </label>
      <label className="grid gap-1 text-sm mb-4">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Contenu HTML</span>
          <button onClick={aiDraft} disabled={aiBusy}
            className="text-xs flex items-center gap-1 text-brand-pink hover:underline disabled:opacity-50">
            {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Brouillon par IA
          </button>
        </div>
        <textarea
          value={html} onChange={(e) => setHtml(e.target.value)}
          rows={14}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink font-mono text-xs"
        />
      </label>
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-4 max-h-72 overflow-auto"
           dangerouslySetInnerHTML={{ __html: html }} />
      <div className="flex gap-2">
        <button disabled={busy} onClick={() => save(false)} className="btn-ghost text-sm">
          <Save size={14} /> Enregistrer
        </button>
        <button disabled={busy || !subject} onClick={() => save(true)} className="btn-primary text-sm">
          <Send size={14} /> {busy ? 'Envoi…' : 'Envoyer maintenant'}
        </button>
        {msg && <span className="text-sm text-zinc-400 self-center">{msg}</span>}
      </div>
    </div>
  );
}
