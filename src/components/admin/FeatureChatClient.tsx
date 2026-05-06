'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, Loader2, Copy, ExternalLink, RotateCw, MessageSquare, Lightbulb, CheckCircle2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  coworkPrompt?: string;
  timestamp: number;
}

const STORAGE_KEY = 'gld.feature-chat.history.v1';

const EXAMPLES = [
  "Je veux que les utilisateurs puissent enregistrer leur prière vocale et que l'IA la transcrive automatiquement",
  "Ajoute un système de parrainage où chaque user invite 3 amis et gagne 1 mois Premium",
  "Permets aux modérateurs de planifier l'approbation d'un post à une date future",
  "Crée un mode 'pleine conscience' qui met en pause les notifications pendant 25 min",
  "Génère automatiquement une vidéo TikTok hebdomadaire récapitulant les meilleurs témoignages"
];

export function FeatureChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Charge l'historique depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  // Sauvegarde
  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30))); } catch {}
    }
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function send() {
    const idea = input.trim();
    if (!idea || busy) return;
    setInput('');
    setError(null);

    const userMsg: Message = { role: 'user', content: idea, timestamp: Date.now() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setBusy(true);

    try {
      const r = await fetch('/api/admin/feature-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea,
          history: newMsgs.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
        })
      });
      const j = await r.json();
      if (r.ok && j.plan) {
        setMessages([...newMsgs, {
          role: 'assistant',
          content: j.plan,
          coworkPrompt: j.coworkPrompt,
          timestamp: Date.now()
        }]);
      } else {
        setError(j.message || j.error || 'Erreur');
      }
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  function copyCowork(msg: Message, idx: number) {
    if (!msg.coworkPrompt) return;
    navigator.clipboard.writeText(msg.coworkPrompt);
    setCopiedSha(idx);
    setTimeout(() => setCopiedSha(null), 2000);
  }

  function clearHistory() {
    if (!confirm('Effacer toute la conversation ?')) return;
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-4">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 via-fuchsia-500 to-violet-500 rounded-2xl p-3">
            <Lightbulb size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Feature Chat IA</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Décris une idée → l'IA Architecte Produit te livre un plan complet + un prompt prêt à coller dans Claude Cowork.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button onClick={clearHistory} className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full flex items-center gap-1">
              <RotateCw size={11} /> Effacer
            </button>
          )}
        </div>
      </header>

      {/* Examples si vide */}
      {messages.length === 0 && (
        <section className="bg-gradient-to-br from-amber-500/10 via-fuchsia-500/5 to-violet-500/10 border border-fuchsia-500/30 rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-fuchsia-300" /> Exemples d'idées que tu peux soumettre
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => setInput(ex)}
                className="text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-fuchsia-500/40 rounded-xl p-3 text-xs text-zinc-300 transition"
              >
                💡 {ex}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Conversation */}
      {messages.length > 0 && (
        <section ref={scrollRef} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {messages.map((m, i) => (
            <article key={i} className={`rounded-xl p-4 ${m.role === 'user' ? 'bg-fuchsia-500/15 border border-fuchsia-500/30 ml-12' : 'bg-zinc-950 border border-zinc-800 mr-12'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${m.role === 'user' ? 'bg-fuchsia-500 text-white' : 'bg-gradient-to-br from-violet-500 to-cyan-500 text-white'}`}>
                  {m.role === 'user' ? '🙂' : '🏗️'}
                </div>
                <span className="text-[11px] font-bold text-zinc-400">
                  {m.role === 'user' ? 'Toi' : 'Architecte Produit IA'}
                </span>
                <span className="text-[10px] text-zinc-600 ml-auto">
                  {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-zinc-100 prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                {m.content}
              </div>
              {m.coworkPrompt && (
                <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-wrap gap-2">
                  <button
                    onClick={() => copyCowork(m, i)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5"
                  >
                    {copiedSha === i ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                    {copiedSha === i ? 'Copié !' : 'Copier pour Claude Cowork'}
                  </button>
                  <a
                    href="https://claude.ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5"
                  >
                    <ExternalLink size={11} /> Ouvrir Claude
                  </a>
                  <span className="text-[10px] text-zinc-500 italic ml-auto self-center">
                    Colle dans Cowork (Mac/Desktop) pour lancer le développement automatique
                  </span>
                </div>
              )}
            </article>
          ))}
          {busy && (
            <article className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mr-12">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> L'Architecte réfléchit…
              </div>
            </article>
          )}
        </section>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-200">⚠ {error}</div>
      )}

      {/* Composer */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
            placeholder="Décris ton idée de feature… (Cmd+Entrée pour envoyer)"
            rows={3}
            disabled={busy}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:border-fuchsia-500 outline-none resize-none"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white p-3 rounded-xl"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2 italic">
          💡 Astuce : Décris fonctionnellement (pas en code) — l'IA reformule, identifie les modules réutilisables, propose une découpe en commits incrémentaux.
        </p>
      </section>

      {/* Workflow expliqué */}
      <section className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-200">
        <h3 className="font-bold mb-2 flex items-center gap-2"><MessageSquare size={14} /> Workflow recommandé</h3>
        <ol className="text-xs space-y-1 list-decimal ml-5">
          <li>Décris ton idée ici (n'importe quel device — iPad, mobile, desktop)</li>
          <li>L'IA renvoie un plan structuré + un prompt formaté pour Cowork</li>
          <li>Une notification Telegram t'arrive aussi avec un résumé de l'idée</li>
          <li>Sur ton Mac : ouvre Claude Cowork → colle le prompt → l'agent code, push, déploie</li>
          <li>Reviens ici → tu peux affiner avec des messages de suivi (l'historique est gardé)</li>
        </ol>
        <p className="text-[11px] text-blue-200/70 mt-3 italic">
          🔮 Future feature (P3) : auto-push direct dans une session Cowork active sur ton Mac via tunnel Tailscale + webhook signé. Pour l'instant le copier-coller manuel reste le plus fiable.
        </p>
      </section>
    </div>
  );
}
