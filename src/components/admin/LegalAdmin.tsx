'use client';
/**
 * LegalAdmin — assistant juridique français basé sur le skillset paperasse.
 *
 * Sections :
 *   1. Statut d'ingestion par skill (combien de docs/skill, dernière sync)
 *   2. Bouton sync (full ou par skill, avec option force)
 *   3. Chat dédié juridique (filtre par skill optionnel)
 *
 * Le chat utilise askLegal qui applique un system prompt prudent + filtre les
 * chunks RAG sur le tag "paperasse".
 */
import { useEffect, useState } from 'react';

const SKILLS = [
  { id: 'comptable',                emoji: '📚', label: 'Expert-comptable',     hint: 'PCG, TVA, IS, FEC, liasse, facturation 2026' },
  { id: 'fiscaliste',               emoji: '💼', label: 'Fiscaliste particuliers', hint: 'IR, IFI, PFU, PEA, LMNP, RSU, BSPCE, crypto, PER' },
  { id: 'notaire',                  emoji: '🏛️', label: 'Notaire',              hint: 'Frais, plus-value, succession, donation, SCI, PACS' },
  { id: 'controleur-fiscal',        emoji: '🔍', label: 'Contrôleur fiscal',    hint: 'Simulation contrôle DGFIP, redressements' },
  { id: 'commissaire-aux-comptes',  emoji: '✅', label: 'CAC',                  hint: 'Audit NEP, opinion motivée, validation croisée' },
  { id: 'syndic',                   emoji: '🏘️', label: 'Syndic copropriété',  hint: 'AG, charges, travaux, impayés, transition' },
];

type Status = {
  total: number;
  perSkill: Record<string, { count: number; lastIngestedAt: string | null }>;
};

type AskResult = {
  answer: string;
  sources: { title: string; source: string | null; score: number; skill?: string }[];
  topScore: number;
  noSourceMatch: boolean;
  modelUsed?: string;
};

export function LegalAdmin() {
  const [status, setStatus] = useState<Status | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Chat
  const [question, setQuestion] = useState('');
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [history, setHistory] = useState<{ id: string; q: string; skill: string | null; r: AskResult; ms: number }[]>([]);
  const [askError, setAskError] = useState<string | null>(null);

  const loadStatus = async () => {
    const r = await fetch('/api/admin/legal/sync-paperasse');
    setStatus(await r.json());
  };
  useEffect(() => { loadStatus(); }, []);

  const handleSync = async (skill?: string, force = false) => {
    setSyncing(true);
    setSyncMsg(skill ? `Sync ${skill} en cours…` : 'Sync complet en cours (peut prendre 5-10 min)…');
    try {
      const r = await fetch('/api/admin/legal/sync-paperasse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills: skill ? [skill] : undefined, force }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSyncMsg(`✓ ${j.ingested} docs ingérés · ${j.skipped} déjà à jour · ${j.errors.length} erreur(s)`);
      await loadStatus();
    } catch (e: any) {
      setSyncMsg(`⚠ ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleAsk = async () => {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setAskError(null);
    const t0 = Date.now();
    try {
      const r = await fetch('/api/admin/legal/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, skill: activeSkill || undefined }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setHistory((prev) => [{ id: Math.random().toString(36).slice(2), q, skill: activeSkill, r: j, ms: Date.now() - t0 }, ...prev]);
      setQuestion('');
    } catch (e: any) {
      setAskError(e?.message);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6">
          <h1 className="bg-gradient-to-r from-amber-400 via-rose-400 to-violet-400 bg-clip-text text-3xl font-bold text-transparent">
            ⚖️ Assistant juridique français
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            6 skills paperasse (comptable, notaire, fiscaliste, contrôleur fiscal, CAC, syndic) ingérés dans le RAG GLD pour répondre à tes questions juridiques et bureaucratiques.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Source : <a href="https://github.com/romainsimon/paperasse" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">github.com/romainsimon/paperasse</a> (MIT) ·
            ⚠️ assistant à but informatif, pas un substitut à un professionnel
          </p>
        </header>

        {/* SECTION 1 : STATUS / SYNC */}
        <section className="mb-6 rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-zinc-200">📚 Bibliothèque ingérée</h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleSync(undefined, false)} disabled={syncing}
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >{syncing ? '⏳' : '🔄 Sync tous skills'}</button>
              <button
                onClick={() => handleSync(undefined, true)} disabled={syncing}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
                title="Force re-ingestion (supprime ancien et ré-embed)"
              >🔁 Force</button>
            </div>
          </div>
          {syncMsg && (
            <div className={`mb-3 rounded-lg p-3 text-xs ring-1 ${
              syncMsg.startsWith('✓') ? 'bg-emerald-950/40 text-emerald-300 ring-emerald-700/40' :
              syncMsg.startsWith('⚠') ? 'bg-rose-950/40 text-rose-300 ring-rose-700/40' :
              'bg-amber-950/40 text-amber-300 ring-amber-700/40'
            }`}>{syncMsg}</div>
          )}
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {SKILLS.map((sk) => {
              const stat = status?.perSkill[sk.id] || { count: 0, lastIngestedAt: null };
              const installed = stat.count > 0;
              return (
                <div key={sk.id} className={`rounded-lg p-3 ring-1 ${installed ? 'bg-amber-950/20 ring-amber-700/40' : 'bg-zinc-950 ring-zinc-800'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sk.emoji}</span>
                        <span className="text-sm font-bold text-zinc-100">{sk.label}</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-zinc-500">{sk.hint}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${installed ? 'bg-amber-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                      {stat.count} doc{stat.count > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">
                      {stat.lastIngestedAt ? `Sync : ${new Date(stat.lastIngestedAt).toLocaleDateString()}` : 'Pas encore ingéré'}
                    </span>
                    <button
                      onClick={() => handleSync(sk.id)} disabled={syncing}
                      className="text-[10px] text-amber-400 hover:underline disabled:opacity-50"
                    >Sync ce skill</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-zinc-500">
            Total ingéré : <strong className="text-zinc-300">{status?.total ?? 0} documents</strong> dans le RAG GLD.
          </div>
        </section>

        {/* SECTION 2 : CHAT */}
        <section className="rounded-2xl bg-zinc-900 p-5 ring-1 ring-zinc-800">
          <h2 className="mb-3 text-sm font-bold text-zinc-200">💬 Pose ta question</h2>

          {/* Filtre skill */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveSkill(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${activeSkill === null ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >Tous</button>
            {SKILLS.map((sk) => (
              <button
                key={sk.id}
                onClick={() => setActiveSkill(activeSkill === sk.id ? null : sk.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${activeSkill === sk.id ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
              >{sk.emoji} {sk.label}</button>
            ))}
          </div>

          <textarea
            value={question} onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk(); }}
            placeholder="ex: Calcule mon impôt 2025 si je gagne 50k€ célibataire · ou · Frais de notaire pour un appart 350k€ Paris"
            rows={3}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <div className="mt-2 flex items-center justify-between text-xs">
            {askError && <span className="text-rose-400">⚠ {askError}</span>}
            <div className="ml-auto">
              <button
                onClick={handleAsk} disabled={asking || !question.trim()}
                className="rounded-lg bg-amber-600 px-5 py-1.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-500 disabled:opacity-40"
              >{asking ? '⏳ Recherche…' : '⚡ Demander'}</button>
            </div>
          </div>

          {/* Historique */}
          <div className="mt-4 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-lg bg-zinc-950 p-6 text-center text-xs text-zinc-500 ring-1 ring-zinc-800">
                Pose ta première question juridique. Cmd/Ctrl+Enter pour envoyer.
              </div>
            ) : history.map((h) => (
              <div key={h.id} className="rounded-lg bg-zinc-950 p-4 ring-1 ring-zinc-800">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
                  <span className="rounded-full bg-amber-900/50 px-2 py-0.5 font-bold uppercase text-amber-300 ring-1 ring-amber-700/50">QUESTION</span>
                  {h.skill && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">{h.skill}</span>}
                  {h.r.noSourceMatch && <span className="rounded bg-amber-900/50 px-1.5 py-0.5 font-bold text-amber-300">⚠ pas de source paperasse</span>}
                  <span className="text-zinc-500">·</span>
                  <span className="font-mono text-zinc-500">{h.ms} ms</span>
                  <span className="font-mono text-zinc-500">· top {h.r.topScore}</span>
                  {h.r.modelUsed && <span className="font-mono text-zinc-500">· {h.r.modelUsed}</span>}
                </div>
                <p className="mb-3 text-sm font-medium text-zinc-100">{h.q}</p>

                <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                  {h.r.answer}
                </div>

                {h.r.sources.length > 0 && (
                  <details className="mt-3 text-xs text-zinc-400">
                    <summary className="cursor-pointer hover:text-zinc-200">📚 {h.r.sources.length} source(s) paperasse</summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {h.r.sources.map((s, i) => (
                        <li key={i}>
                          <span className="font-mono text-amber-400">[{i + 1}]</span> {s.title}
                          {s.skill && <span className="ml-2 rounded bg-zinc-800 px-1 text-[10px]">{s.skill}</span>}
                          <span className="ml-2 font-mono text-zinc-500">score {s.score}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
