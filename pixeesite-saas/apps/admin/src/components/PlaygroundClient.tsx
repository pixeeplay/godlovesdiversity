'use client';
/**
 * Playground RAG — chat de test avec contrôle total sur les garde-fous.
 * Port faithful de godlovedirect/src/components/admin/Playground.tsx.
 * Backed par /api/orgs/[slug]/playground/query (RAG cosine + LLM).
 */
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Source = { title: string; source: string | null; score: number; chunkId?: string; text?: string };
type AskResult = {
  answer: string;
  sources: Source[];
  topScore: number;
  offTopic: boolean;
  debugPrompt?: string;
  guardrailsBypass?: boolean;
  provider?: string;
  model?: string;
  error?: string | null;
};
type HistoryEntry = { id: string; question: string; bypassGuardrails: boolean; result: AskResult; durationMs: number };

interface RagSource {
  id: string;
  name: string;
  type: string;
  active: boolean;
  chunksCount: number;
}

export function PlaygroundClient({ orgSlug }: { orgSlug: string }) {
  const [question, setQuestion] = useState('');
  const [bypassGuardrails, setBypassGuardrails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [topK, setTopK] = useState(5);
  const [temperature, setTemperature] = useState(0.7);
  const [sources, setSources] = useState<RagSource[]>([]);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/rag/sources`).then((r) => r.json()).then((j) => {
      if (Array.isArray(j.items)) {
        setSources(j.items);
        setSelectedSources(new Set(j.items.filter((s: any) => s.active).map((s: any) => s.id)));
      }
    }).catch(() => {});
  }, [orgSlug]);

  const submit = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    const t0 = Date.now();
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/playground/query`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          bypassGuardrails,
          topK,
          temperature,
          sourceIds: selectedSources.size && selectedSources.size < sources.length ? Array.from(selectedSources) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Ask KO');
      setHistory((prev) => [
        { id: Math.random().toString(36).slice(2), question: q, bypassGuardrails, result: j, durationMs: Date.now() - t0 },
        ...prev,
      ]);
      setQuestion('');
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
    } finally { setLoading(false); }
  };

  function toggleSource(id: string) {
    setSelectedSources((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🎮" title="Playground RAG"
      desc="Teste tes prompts sur ton cerveau RAG. Vois les chunks matchés, scores, et le prompt envoyé au LLM."
    >
      {/* Guide */}
      <div style={{ ...card, marginBottom: 12, background: `${colors.violet}15`, borderColor: `${colors.violet}55`, fontSize: 12, color: '#ddd6fe' }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700 }}>🎯 Comment utiliser :</p>
        <ol style={{ margin: '0 0 0 18px', padding: 0, lineHeight: 1.6 }}>
          <li>Choisis le mode (prod = garde-fous ON, test admin = OFF)</li>
          <li>Sélectionne les sources RAG à utiliser (toutes par défaut)</li>
          <li>Pose ta question (Cmd/Ctrl+Enter pour envoyer)</li>
          <li>Inspecte les onglets Sources et Prompt pour debug</li>
        </ol>
      </div>

      {/* Mode toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <button onClick={() => setBypassGuardrails(false)} style={{
          ...card, padding: 16, cursor: 'pointer', textAlign: 'left', border: 'none',
          background: !bypassGuardrails ? `linear-gradient(135deg,${colors.success}33,${colors.success}11)` : '#18181b',
          boxShadow: !bypassGuardrails ? `0 0 0 3px ${colors.success}, 0 6px 24px ${colors.success}33` : 'none',
          opacity: !bypassGuardrails ? 1 : 0.6,
          color: 'inherit',
        }}>
          <div style={{ fontSize: 28 }}>🛡️</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>Mode prod</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: colors.success, color: 'white', padding: '2px 6px', borderRadius: 999 }}>Garde-fous ON</span>
          </div>
          <p style={{ fontSize: 11, marginTop: 8, color: '#e4e4e7' }}>
            Comportement identique au chat public. System prompt complet (factuel, refuse hors-sujet, cite sources). Score &lt; 0.55 → flag off-topic.
          </p>
        </button>
        <button onClick={() => setBypassGuardrails(true)} style={{
          ...card, padding: 16, cursor: 'pointer', textAlign: 'left', border: 'none',
          background: bypassGuardrails ? `linear-gradient(135deg,${colors.danger}33,${colors.danger}11)` : '#18181b',
          boxShadow: bypassGuardrails ? `0 0 0 3px ${colors.danger}, 0 6px 24px ${colors.danger}33` : 'none',
          opacity: bypassGuardrails ? 1 : 0.6,
          color: 'inherit',
        }}>
          <div style={{ fontSize: 28 }}>🔓</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800 }}>Mode test admin</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: colors.danger, color: 'white', padding: '2px 6px', borderRadius: 999 }}>Garde-fous OFF</span>
          </div>
          <p style={{ fontSize: 11, marginTop: 8, color: '#e4e4e7' }}>
            Le RAG répond à toute question (météo, code, politique, etc.). System prompt minimal. Idéal pour tester la base.
          </p>
        </button>
      </div>

      {/* Settings + sources */}
      <section style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 10 }}>
          <label>
            <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 4 }}>Top-K chunks</div>
            <input type="number" min={1} max={20} style={input} value={topK} onChange={(e) => setTopK(parseInt(e.target.value) || 5)} />
          </label>
          <label>
            <div style={{ fontSize: 10, color: '#a1a1aa', marginBottom: 4 }}>Temperature</div>
            <input type="number" min={0} max={2} step={0.1} style={input} value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)} />
          </label>
        </div>

        {sources.length > 0 && (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: '#a1a1aa' }}>
              Sources RAG ({selectedSources.size}/{sources.length} actives)
            </summary>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {sources.map((s) => {
                const active = selectedSources.has(s.id);
                return (
                  <button key={s.id} onClick={() => toggleSource(s.id)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                    border: '1px solid', borderColor: active ? colors.primary : '#3f3f46',
                    background: active ? `${colors.primary}20` : 'transparent',
                    color: active ? colors.primary : '#71717a',
                  }}>
                    {s.name} ({s.chunksCount})
                  </button>
                );
              })}
            </div>
          </details>
        )}
        {sources.length === 0 && (
          <p style={{ fontSize: 11, color: '#71717a', margin: '6px 0 0' }}>
            Aucune source RAG indexée. Va dans <a href={`/dashboard/orgs/${orgSlug}/rag`} style={{ color: colors.primary }}>Bibliothèque RAG</a> pour en ajouter.
          </p>
        )}
      </section>

      {/* Input */}
      <section style={{ ...card, marginBottom: 16 }}>
        <textarea rows={3} style={{ ...input, fontFamily: 'inherit' }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Pose ta question…  (Cmd/Ctrl+Enter pour envoyer)"
        />
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
            background: bypassGuardrails ? `${colors.danger}22` : `${colors.success}22`,
            color: bypassGuardrails ? colors.danger : colors.success,
            border: `1px solid ${bypassGuardrails ? colors.danger : colors.success}55`,
          }}>
            <span>{bypassGuardrails ? '🔓' : '🛡️'}</span>
            <span>{bypassGuardrails ? 'Mode test (garde-fous OFF)' : 'Mode prod (garde-fous ON)'}</span>
          </div>

          {error && <span style={{ fontSize: 11, color: colors.danger }}>⚠ {error}</span>}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {history.length > 0 && (
              <button onClick={() => setHistory([])} style={btnSecondary}>Vider</button>
            )}
            <button onClick={submit} disabled={loading || !question.trim()} style={{
              ...btnPrimary,
              background: bypassGuardrails ? `linear-gradient(135deg,${colors.danger},${colors.pink})` : `linear-gradient(135deg,${colors.success},${colors.secondary})`,
              opacity: loading || !question.trim() ? 0.4 : 1,
            }}>
              {loading ? '⏳ Loading...' : `⚡ Envoyer ${bypassGuardrails ? '(test)' : '(prod)'}`}
            </button>
          </div>
        </div>
      </section>

      {/* History */}
      {history.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 32, opacity: 0.6 }}>
          <div style={{ fontSize: 36 }}>🤖</div>
          <p style={{ marginTop: 8 }}>Aucune question encore. Pose-en une pour voir comment le RAG répond.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {history.map((h) => <HistoryCard key={h.id} entry={h} />)}
        </div>
      )}
    </SimpleOrgPage>
  );
}

function HistoryCard({ entry }: { entry: HistoryEntry }) {
  const [tab, setTab] = useState<'answer' | 'sources' | 'prompt'>('answer');
  const r = entry.result;
  return (
    <article style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 14, background: '#0a0a0f' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 10, marginBottom: 4, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, textTransform: 'uppercase', color: colors.violet, background: `${colors.violet}30`, padding: '2px 6px', borderRadius: 999 }}>QUESTION</span>
          {entry.bypassGuardrails && (
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: colors.danger, background: `${colors.danger}30`, padding: '2px 6px', borderRadius: 999 }}>🔓 NO-GUARDRAILS</span>
          )}
          {r.offTopic && (
            <span style={{ fontWeight: 700, textTransform: 'uppercase', color: colors.warning, background: `${colors.warning}30`, padding: '2px 6px', borderRadius: 999 }}>⚠ OFF-TOPIC</span>
          )}
          <span style={{ color: '#71717a' }}>·</span>
          <span style={{ fontFamily: 'monospace', color: '#71717a' }}>{entry.durationMs} ms</span>
          <span style={{ color: '#71717a' }}>·</span>
          <span style={{ fontFamily: 'monospace', color: '#71717a' }}>top score {r.topScore}</span>
          {r.provider && <span style={{ color: '#71717a' }}>· {r.provider}/{r.model}</span>}
        </div>
        <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{entry.question}</p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid #27272a', background: '#18181b' }}>
        {[
          { id: 'answer', label: '💬 Réponse' },
          { id: 'sources', label: `🧩 Sources (${r.sources.length})` },
          { id: 'prompt', label: '📜 Prompt' },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id as any)} style={{
            padding: '8px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'transparent',
            border: 0, color: tab === t.id ? 'white' : '#71717a',
            borderBottom: tab === t.id ? `2px solid ${colors.pink}` : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 14 }}>
        {tab === 'answer' && (
          <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 }}>{r.answer || r.error}</div>
        )}
        {tab === 'sources' && (
          r.sources.length === 0 ? (
            <div style={{ background: `${colors.warning}15`, padding: 10, fontSize: 12, color: '#fcd34d', borderRadius: 8, border: `1px solid ${colors.warning}33` }}>
              Aucune source matchée. Le LLM a répondu depuis le savoir général (pas de base RAG, ou chunks sous le seuil).
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 6 }}>
              {r.sources.map((s, i) => <SourceCard key={i} idx={i + 1} src={s} />)}
            </div>
          )
        )}
        {tab === 'prompt' && (
          <pre style={{ maxHeight: 400, overflow: 'auto', background: '#0a0a0f', padding: 12, fontSize: 11, lineHeight: 1.5, fontFamily: 'monospace', color: '#d4d4d8', borderRadius: 8, border: '1px solid #27272a' }}>
            {r.debugPrompt || '(prompt non disponible)'}
          </pre>
        )}
      </div>
    </article>
  );
}

function SourceCard({ idx, src }: { idx: number; src: Source }) {
  const [open, setOpen] = useState(false);
  const scoreColor = src.score >= 0.7 ? colors.success : src.score >= 0.55 ? colors.info : colors.warning;
  return (
    <div style={{ background: '#0a0a0f', borderRadius: 8, border: '1px solid #27272a' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 10,
        background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', flex: 1 }}>
          <span style={{ background: '#27272a', padding: '1px 6px', borderRadius: 999, fontFamily: 'monospace', fontSize: 10, color: '#a1a1aa' }}>#{idx}</span>
          <span style={{ fontSize: 13, color: '#fafafa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.title}</span>
        </div>
        <span style={{ flexShrink: 0, padding: '2px 6px', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: scoreColor, background: `${scoreColor}20`, borderRadius: 4, border: `1px solid ${scoreColor}55` }}>
          {src.score.toFixed(3)}
        </span>
        <span style={{ color: '#71717a' }}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #27272a', padding: 10 }}>
          {src.source && (
            <a href={src.source} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 10, color: colors.violet, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {src.source}
            </a>
          )}
          {src.text && (
            <div style={{ background: '#18181b', padding: 8, fontSize: 12, lineHeight: 1.5, color: '#d4d4d8', borderRadius: 4 }}>
              {src.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
