'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Heart } from 'lucide-react';
import Link from 'next/link';

export function PrayerChatClient({ circle, title }: { circle: string; title: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await fetch(`/api/prayer-chat/${circle}`, { cache: 'no-store' });
    const j = await r.json();
    setMessages(j.messages || []);
    setTimeout(() => ref.current?.scrollTo(0, ref.current.scrollHeight), 100);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // polling 5s
    return () => clearInterval(t);
  }, []);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await fetch(`/api/prayer-chat/${circle}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, authorName: name || 'Anonyme' })
      });
      setText('');
      await load();
    } finally { setBusy(false); }
  }

  return (
    <main className="container-wide py-8 max-w-3xl">
      <Link href="/cercles-priere" className="text-fuchsia-400 hover:underline text-sm">← Tous les cercles</Link>
      <header className="my-4 flex items-center gap-2"><Heart size={22} className="text-rose-400" /><h1 className="font-bold text-2xl">{title}</h1></header>

      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton pseudo (ou laisse vide pour Anonyme)" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mb-3" />

      <div ref={ref} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 h-[400px] overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 ? <p className="text-center text-zinc-400 text-xs py-6">Aucun message. Sois le·la premier·e.</p>
          : messages.map(m => (
            <div key={m.id} className="flex flex-col">
              <div className="text-[10px] text-fuchsia-400 font-bold">{m.authorName} · <span className="text-zinc-400">{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></div>
              <div className="text-sm text-zinc-200">{m.message}</div>
            </div>
          ))}
      </div>

      <div className="flex gap-2">
        <textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())} placeholder="Une intention de prière, un mot de soutien…" rows={2} maxLength={500} className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm" />
        <button onClick={send} disabled={busy || !text.trim()} className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white rounded-lg px-4 self-stretch">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
      <p className="text-[10px] text-zinc-400 mt-2 text-center">Refresh auto toutes les 5s · 500 chars max · modéré.</p>
    </main>
  );
}
