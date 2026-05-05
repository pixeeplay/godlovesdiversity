'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Send, ArrowLeft, Loader2, Flag } from 'lucide-react';

export default function ThreadPage() {
  const { convId } = useParams<{ convId: string }>();
  const router = useRouter();
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await fetch(`/api/connect/messages/${convId}`);
    const j = await r.json();
    if (j.messages) setMsgs(j.messages);
    setLoading(false);
  }
  useEffect(() => { void load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [convId]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [msgs.length]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    const t = text.trim();
    setText('');
    await fetch(`/api/connect/messages/${convId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: t })
    });
    setSending(false);
    void load();
  }

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-220px)] flex flex-col backdrop-blur-2xl bg-white/[0.04] border border-white/10 rounded-3xl overflow-hidden">
      <header className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={() => router.push('/connect/messages')} className="text-zinc-400 hover:text-white"><ArrowLeft size={16} /></button>
        <div className="flex-1 font-bold text-sm">Conversation</div>
        <button className="text-zinc-400 hover:text-rose-400" title="Signaler"><Flag size={14} /></button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <Loader2 className="animate-spin mx-auto text-zinc-500" />}
        {msgs.map((m) => (
          <div key={m.id} className="bg-white/[0.06] rounded-2xl p-3 max-w-[80%]">
            <p className="text-sm whitespace-pre-wrap">{m.text}</p>
            <p className="text-[9px] text-zinc-500 mt-1">{new Date(m.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        ))}
      </div>

      <footer className="p-3 border-t border-white/10 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())} placeholder="Ton message…" className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm outline-none focus:border-fuchsia-400" />
        <button onClick={send} disabled={!text.trim() || sending} className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white p-2 rounded-full disabled:opacity-50">
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </footer>
    </div>
  );
}
