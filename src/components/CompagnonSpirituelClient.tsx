'use client';
import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, AlertTriangle, RotateCw } from 'lucide-react';

const PERSONAS = [
  { id: 'marie',   label: 'Mère Marie',     subtitle: 'Catholique inclusive', emoji: '🕊️', gradient: 'from-rose-500 to-pink-500',     intro: 'Bonjour, mon enfant. Je suis Mère Marie, religieuse catholique inclusive. Tu peux me parler de ce que tu portes — je t\'accueille avec un amour inconditionnel. Que veux-tu partager aujourd\'hui ?' },
  { id: 'khadija', label: 'Sœur Khadija',   subtitle: 'Islam progressiste',    emoji: '☪️', gradient: 'from-emerald-500 to-teal-500', intro: 'As-salaam alaykoum. Je suis Sœur Khadija, théologienne musulmane progressiste. Ta foi et ton identité ne sont pas en contradiction — partageons. Que portes-tu en cœur ?' },
  { id: 'rabbin',  label: 'Rav Yossef',     subtitle: 'Beit Haverim',          emoji: '✡️', gradient: 'from-blue-500 to-indigo-500',  intro: 'Shalom. Je suis Rav Yossef, rabbin progressiste de Beit Haverim. Le judaïsme libéral te reconnaît pleinement. Que veux-tu apporter à notre étude aujourd\'hui ?' },
  { id: 'zen',     label: 'Maître Tenku',   subtitle: 'Bouddhisme zen',         emoji: '🧘', gradient: 'from-amber-500 to-orange-500',  intro: 'Bienvenue. Je suis Maître Tenku. Pose ton sac un instant. Respire. Que viens-tu déposer ici ?' }
];

interface Msg { role: 'user' | 'persona'; content: string }

export function CompagnonSpirituelClient() {
  const [active, setActive] = useState<string>('marie');
  const persona = PERSONAS.find(p => p.id === active)!;

  // Conversations stockées par persona
  const [conversations, setConversations] = useState<Record<string, Msg[]>>(() => {
    const init: Record<string, Msg[]> = {};
    for (const p of PERSONAS) init[p.id] = [{ role: 'persona', content: p.intro }];
    return init;
  });

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll en bas quand nouvelle réponse
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [conversations, active]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setError(null);
    const newMsgs: Msg[] = [...(conversations[active] || []), { role: 'user', content: text }];
    setConversations((c) => ({ ...c, [active]: newMsgs }));
    setBusy(true);
    try {
      const r = await fetch('/api/spiritual-companion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: active,
          message: text,
          history: newMsgs.slice(-10).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
        })
      });
      const j = await r.json();
      if (r.ok && j.ok && j.reply) {
        setConversations((c) => ({ ...c, [active]: [...newMsgs, { role: 'persona', content: j.reply }] }));
      } else {
        setError(j.message || j.error || 'Erreur');
      }
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  function reset() {
    setConversations((c) => ({ ...c, [active]: [{ role: 'persona', content: persona.intro }] }));
  }

  const messages = conversations[active] || [];

  return (
    <main className="container-wide py-12 max-w-5xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-violet-500 via-fuchsia-500 to-rose-500 rounded-2xl p-3 mb-3">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Compagnon spirituel IA</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl mx-auto">
          4 personas inclusives pour t'accompagner — chaque persona connaît les textes sacrés et les figures progressistes de sa tradition.
          Tes conversations restent locales (jamais sauvegardées sur serveur).
        </p>
      </header>

      {/* Sélecteur de persona */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        {PERSONAS.map(p => {
          const isActive = active === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className={`relative overflow-hidden rounded-2xl p-4 text-left transition ${
                isActive ? 'ring-2 ring-fuchsia-500 scale-[1.02]' : 'hover:scale-[1.02]'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${p.gradient} opacity-${isActive ? '100' : '40'}`} />
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
              <div className="relative">
                <div className="text-3xl mb-1">{p.emoji}</div>
                <div className="font-bold text-sm text-white">{p.label}</div>
                <div className="text-[11px] text-white/80">{p.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Conversation */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col" style={{ height: '60vh', minHeight: 400 }}>
        <header className={`px-5 py-3 bg-gradient-to-r ${persona.gradient} flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{persona.emoji}</div>
            <div>
              <h2 className="font-bold text-white">{persona.label}</h2>
              <p className="text-[11px] text-white/85">{persona.subtitle}</p>
            </div>
          </div>
          <button onClick={reset} title="Effacer la conversation" className="text-white/80 hover:text-white p-2 rounded-full bg-black/20 hover:bg-black/40">
            <RotateCw size={14} />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-fuchsia-500 text-white'
                  : 'bg-zinc-800 text-zinc-100'
              }`}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-zinc-800 text-zinc-400 rounded-2xl px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> {persona.label} réfléchit…
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-zinc-800 p-3 bg-zinc-950">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/40 rounded-lg px-3 py-2 mb-2 text-xs text-rose-200 flex items-center gap-2">
              <AlertTriangle size={12} /> {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={`Parle à ${persona.label}…`}
              disabled={busy}
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 text-sm focus:border-fuchsia-500 outline-none"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white p-2.5 rounded-full"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </footer>
      </section>

      <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
        ⚠️ Important : ces personas sont des assistants IA, pas des officiants religieux. Pour une confession sacramentelle, un avis halakhique, fatwa ou guidance pastorale officielle, consulte un·e officiant·e humain·e (annuaire en construction sur GLD). En cas de détresse psychologique : <strong>3114</strong> (France, 24h/24, gratuit) ou helpline locale.
      </div>
    </main>
  );
}
