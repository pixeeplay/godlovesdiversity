'use client';
/**
 * AI Settings — multi-tenant, multi-provider (12+).
 * Port faithful de godlovedirect/src/components/admin/AiSettingsClient.tsx + AiTopologyMap.
 * URLs des endpoints en /api/orgs/[slug]/* (tenant-scoped, requireOrgMember).
 */
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { AiTopologyMap } from './AiTopologyMap';
import { colors } from '@/lib/design-tokens';

// Features (= "tasks" in GLD) supportées (alignées avec OrgAiConfig.feature)
const FEATURES = [
  { id: 'text',           label: '✍️ Texte',          desc: 'Rédaction blog/email/social, manuels' },
  { id: 'image',          label: '🎨 Image',           desc: 'Hero, illustrations, banners' },
  { id: 'video',          label: '🎬 Vidéo',           desc: 'Intros, animations, B-roll' },
  { id: 'audio',          label: '🎙️ Audio',           desc: 'Voix, TTS, transcription' },
  { id: 'embed',          label: '🧬 Embeddings',      desc: 'Recherche sémantique RAG' },
  { id: 'moderation',     label: '🛡️ Modération',     desc: 'Forum auto-flag, anti-spam' },
  { id: 'classification', label: '🏷️ Classification', desc: 'Tagging leads, catégorisation' },
];

const PROVIDERS: Record<string, { label: string; models: string[] }> = {
  gemini:        { label: 'Google Gemini',     models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash', 'imagen-3.0-generate-002', 'text-embedding-004'] },
  openai:        { label: 'OpenAI',             models: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini', 'dall-e-3', 'tts-1', 'whisper-1', 'text-embedding-3-large'] },
  anthropic:     { label: 'Anthropic Claude',   models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3.5-sonnet', 'claude-3-haiku-20240307'] },
  openrouter:    { label: 'OpenRouter',         models: ['anthropic/claude-sonnet-4-5', 'openai/gpt-5', 'meta-llama/llama-3.3-70b', 'deepseek/deepseek-r1', 'qwen/qwen-2.5-72b', 'google/gemini-2.0-flash-exp:free'] },
  groq:          { label: 'Groq (rapide)',      models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.2-90b-vision-preview'] },
  mistral:       { label: 'Mistral',            models: ['mistral-large-latest', 'mistral-small-latest', 'pixtral-large-latest', 'codestral-latest'] },
  ollama:        { label: 'Ollama (local)',     models: ['llama3.3:70b', 'qwen2.5:32b', 'qwen2.5:7b-instruct', 'deepseek-r1:32b', 'mistral-nemo', 'nomic-embed-text', 'mxbai-embed-large'] },
  'ollama-cloud':{ label: 'Ollama Cloud',       models: ['qwen3-coder:480b-cloud', 'gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'deepseek-v3.1:671b-cloud', 'kimi-k2:1t-cloud'] },
  lmstudio:      { label: 'LM Studio (local)',  models: ['custom'] },
  fal:           { label: 'fal.ai (image/vidéo)', models: ['fal-ai/flux-pro', 'fal-ai/flux/dev', 'fal-ai/flux/schnell', 'fal-ai/seedance-2', 'fal-ai/kling-2.5', 'fal-ai/veo-3'] },
  elevenlabs:    { label: 'ElevenLabs (audio)', models: ['eleven_v3', 'eleven_turbo_v2_5', 'eleven_multilingual_v2'] },
  heygen:        { label: 'HeyGen (avatars)',   models: ['heygen-v5', 'avatar-streaming'] },
  imagen:        { label: 'Google Imagen',      models: ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'] },
};

interface ProviderRow {
  id: string;
  label: string;
  type: string;
  enabled: boolean;
  baseUrl?: string;
  apiKeyConfigured?: boolean;
  keyName?: string | null;
}

interface MappingRow {
  taskKey: string;
  primary: { providerId: string; model: string };
  fallback: { providerId: string; model: string }[];
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  baseUrl?: string;
}

export function AiSettingsClient({ orgSlug }: { orgSlug: string }) {
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [mappings, setMappings] = useState<Record<string, MappingRow>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'providers' | 'tasks' | 'test'>('tasks');
  const [testFeature, setTestFeature] = useState('text');
  const [testPrompt, setTestPrompt] = useState('Dis bonjour à la communauté en 20 mots.');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai-providers`);
      const j = await r.json();
      setProviders(j.providers || []);
      setMappings(j.mappings || {});
    } catch {}
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgSlug]);

  function getMapping(feature: string): MappingRow {
    return mappings[feature] || {
      taskKey: feature,
      primary: { providerId: 'gemini', model: 'gemini-2.5-flash' },
      fallback: [],
    };
  }
  function updateMapping(feature: string, patch: Partial<MappingRow>) {
    setMappings((prev) => ({ ...prev, [feature]: { ...getMapping(feature), ...patch } as MappingRow }));
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai-providers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });
      const j = await r.json();
      setMsg(r.ok ? '✓ Configuration sauvegardée' : `⚠ ${j.error || 'erreur'}`);
      setTimeout(() => setMsg(null), 3500);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setSaving(false);
  }

  async function runTest() {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/ai-providers/test`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature: testFeature, prompt: testPrompt }),
      });
      const j = await r.json();
      setTestResult(j);
    } catch (e: any) { setTestResult({ ok: false, error: e.message }); }
    setTesting(false);
  }

  if (loading) {
    return (
      <SimpleOrgPage orgSlug={orgSlug} emoji="🤖" title="IA Settings" desc="Chargement...">
        <p style={{ opacity: 0.5 }}>Chargement…</p>
      </SimpleOrgPage>
    );
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🤖" title="IA Settings"
      desc="Configure le provider et le modèle pour chaque feature. 12+ providers — clés gérées dans /keys."
      actions={
        <>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </>
      }
    >
      {msg && (
        <div style={{ background: msg.startsWith('✓') ? '#10b98115' : '#ef444415', border: `1px solid ${msg.startsWith('✓') ? '#10b981' : '#ef4444'}33`, borderRadius: 12, padding: 12, fontSize: 13, marginBottom: 12 }}>
          {msg}
        </div>
      )}

      {/* Topology Map */}
      <AiTopologyMap orgSlug={orgSlug} providers={providers} mappings={mappings} />

      {/* Tabs */}
      <nav style={{ display: 'flex', gap: 4, background: '#18181b', border: `1px solid ${colors.border}`, borderRadius: 999, padding: 4, marginBottom: 12 }}>
        {[
          { id: 'tasks', label: 'Mapping par feature' },
          { id: 'providers', label: 'Providers + clés' },
          { id: 'test', label: 'Test live' },
        ].map((t) => {
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{
              flex: 1, padding: '8px 14px', borderRadius: 999, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: 0,
              background: active ? 'linear-gradient(90deg,#d946ef,#8b5cf6)' : 'transparent',
              color: active ? 'white' : '#a1a1aa',
            }}>
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* TAB: tasks (mapping par feature) */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {FEATURES.map((f) => {
            const m = getMapping(f.id);
            const provMeta = PROVIDERS[m.primary.providerId];
            const models = provMeta?.models || ['custom'];
            return (
              <section key={f.id} style={card}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr 90px 90px', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{f.desc}</div>
                  </div>
                  <select style={input} value={m.primary.providerId} onChange={(e) => {
                    const pid = e.target.value;
                    updateMapping(f.id, { primary: { providerId: pid, model: PROVIDERS[pid]?.models[0] || 'custom' } });
                  }}>
                    {Object.entries(PROVIDERS).map(([k, p]) => {
                      const prov = providers.find((x) => x.id === k);
                      const dot = prov?.apiKeyConfigured ? '🟢' : '⚪';
                      return <option key={k} value={k}>{dot} {p.label}</option>;
                    })}
                  </select>
                  <select style={input} value={m.primary.model} onChange={(e) => updateMapping(f.id, { primary: { ...m.primary, model: e.target.value } })}>
                    {models.map((mm) => <option key={mm} value={mm}>{mm}</option>)}
                    {!models.includes(m.primary.model) && <option value={m.primary.model}>{m.primary.model} (custom)</option>}
                  </select>
                  <input
                    type="number" min={0} max={2} step={0.1} style={input}
                    value={m.temperature ?? 0.7}
                    onChange={(e) => updateMapping(f.id, { temperature: parseFloat(e.target.value) })}
                    title="Temperature"
                  />
                  <input
                    type="number" min={100} max={32000} step={100} style={input}
                    value={m.maxTokens ?? 2048}
                    onChange={(e) => updateMapping(f.id, { maxTokens: parseInt(e.target.value) })}
                    title="Max tokens"
                  />
                </div>
                {(m.primary.providerId === 'ollama' || m.primary.providerId === 'lmstudio') && (
                  <input style={{ ...input, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
                    placeholder={m.primary.providerId === 'ollama' ? 'http://192.168.1.50:11434' : 'http://192.168.1.50:1234/v1'}
                    value={m.baseUrl || ''} onChange={(e) => updateMapping(f.id, { baseUrl: e.target.value })} />
                )}
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 11, color: '#a1a1aa', cursor: 'pointer' }}>System prompt + advanced</summary>
                  <textarea
                    rows={3} placeholder="System prompt (optionnel) — instructions persistantes pour ce provider/modèle"
                    style={{ ...input, marginTop: 6, fontFamily: 'monospace', fontSize: 12 }}
                    value={m.systemPrompt || ''} onChange={(e) => updateMapping(f.id, { systemPrompt: e.target.value })}
                  />
                </details>
              </section>
            );
          })}
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 12 }}>
            💡 Tip : configure <code>gemini-2.5-flash-lite</code> sur Classification + Modération pour réduire les coûts, et garde un modèle premium (Claude Opus / GPT-5) pour la rédaction longue.
          </p>
        </div>
      )}

      {/* TAB: providers */}
      {activeTab === 'providers' && (
        <div style={{ display: 'grid', gap: 12 }}>
          {providers.map((p) => (
            <article key={p.id} style={{
              ...card,
              borderColor: p.apiKeyConfigured ? '#10b98166' : '#27272a',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    background: `${getProvColor(p.type)}30`, color: getProvColor(p.type),
                    width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                  }}>
                    {p.type.includes('ollama') || p.type === 'lmstudio' ? '💻' :
                      p.type === 'fal' || p.type === 'imagen' || p.type === 'heygen' ? '🎨' :
                      p.type === 'elevenlabs' ? '🎙️' : '☁️'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>{p.label}</h3>
                    <p style={{ margin: 0, fontSize: 11, color: '#71717a' }}>{p.type} · ID: <code style={{ background: '#27272a', padding: '1px 4px', borderRadius: 4 }}>{p.id}</code></p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {p.apiKeyConfigured ? (
                    <span style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>● Clé configurée</span>
                  ) : (
                    <span style={{ fontSize: 11, color: '#71717a' }}>○ Pas de clé</span>
                  )}
                  {p.keyName && (
                    <a href={`/dashboard/orgs/${orgSlug}/keys`} style={{ ...btnSecondary, padding: '6px 10px', fontSize: 11 }}>
                      Gérer {p.keyName}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
          <div style={{ ...card, background: `${colors.info}10`, borderColor: `${colors.info}33`, fontSize: 12 }}>
            💡 Les clés API sont stockées chiffrées (AES-256-GCM) côté plateforme dans la table <code>OrgSecret</code>.
            Va dans <a href={`/dashboard/orgs/${orgSlug}/keys`} style={{ color: colors.info }}>Clés &amp; secrets</a> pour les configurer.
          </div>
        </div>
      )}

      {/* TAB: test live */}
      {activeTab === 'test' && (
        <section style={{ ...card, padding: 18 }}>
          <h3 style={{ marginTop: 0, fontSize: 15 }}>✨ Test live</h3>
          <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 0 }}>Envoie un prompt sur la feature/provider configuré.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <select style={input} value={testFeature} onChange={(e) => setTestFeature(e.target.value)}>
              {FEATURES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button onClick={runTest} disabled={testing} style={{ ...btnPrimary, opacity: testing ? 0.6 : 1 }}>
              {testing ? '⏳ Test...' : '⚡ Lancer le test'}
            </button>
          </div>
          <textarea rows={3} style={{ ...input, fontFamily: 'monospace', fontSize: 12, marginBottom: 12 }}
            value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} placeholder="Ton prompt de test…"
          />
          {testResult && (
            <div style={{
              background: testResult.ok ? '#10b98110' : '#ef444410',
              border: `1px solid ${testResult.ok ? '#10b98155' : '#ef444455'}`,
              borderRadius: 12, padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                <strong>{testResult.ok ? '✓ Succès' : '❌ Erreur'}</strong>
                <span style={{ color: '#a1a1aa' }}>{testResult.providerId} / {testResult.model} · {testResult.tookMs}ms</span>
              </div>
              <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, color: '#fafafa' }}>
                {testResult.text || testResult.error}
              </pre>
            </div>
          )}
        </section>
      )}
    </SimpleOrgPage>
  );
}

function getProvColor(type: string): string {
  const map: Record<string, string> = {
    gemini: '#22d3ee', openai: '#10b981', anthropic: '#f59e0b', openrouter: '#a855f7',
    groq: '#84cc16', mistral: '#fb923c', ollama: '#10b981', 'ollama-cloud': '#14b8a6',
    lmstudio: '#3b82f6', fal: '#ec4899', elevenlabs: '#8b5cf6', heygen: '#f43f5e', imagen: '#06b6d4',
  };
  return map[type] || '#a855f7';
}
