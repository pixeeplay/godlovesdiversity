'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary } from './SimpleOrgPage';

const FEATURES = [
  { id: 'text', label: '✍️ Texte (rédaction)', desc: 'Blog, descriptions, emails' },
  { id: 'image', label: '🎨 Image', desc: 'Hero, illustrations, banners' },
  { id: 'video', label: '🎬 Vidéo', desc: 'Intros, animations, B-roll' },
  { id: 'audio', label: '🎙️ Audio', desc: 'Voix, transcription, TTS' },
  { id: 'embed', label: '🧬 Embeddings', desc: 'Recherche sémantique' },
  { id: 'moderation', label: '🛡️ Modération', desc: 'Forum auto-flag' },
  { id: 'classification', label: '🏷️ Classification', desc: 'Tagging leads, catégorisation' },
];

const PROVIDERS: Record<string, { label: string; models: string[] }> = {
  gemini:     { label: 'Google Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
  openai:     { label: 'OpenAI', models: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4o', 'o1', 'dall-e-3'] },
  anthropic:  { label: 'Anthropic Claude', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
  openrouter: { label: 'OpenRouter', models: ['anthropic/claude-sonnet-4-6', 'meta-llama/llama-3.3-70b', 'deepseek/deepseek-r1', 'qwen/qwen-2.5-72b'] },
  groq:       { label: 'Groq (rapide)', models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'llama-3.2-90b-vision'] },
  mistral:    { label: 'Mistral', models: ['mistral-large-latest', 'mistral-small-latest', 'pixtral-large'] },
  ollama:     { label: 'Ollama (local)', models: ['llama3.3:70b', 'qwen2.5:32b', 'deepseek-r1:32b', 'mistral-nemo'] },
  lmstudio:   { label: 'LM Studio (local)', models: ['custom'] },
  fal:        { label: 'fal.ai (image/vidéo)', models: ['flux-pro-1.1', 'flux-dev', 'seedance-2', 'kling-2.5', 'veo-3'] },
  elevenlabs: { label: 'ElevenLabs (audio)', models: ['eleven_v3', 'eleven_turbo_v2_5'] },
  heygen:     { label: 'HeyGen (avatars)', models: ['heygen-v5'] },
  imagen:     { label: 'Google Imagen', models: ['imagen-3', 'imagen-3-fast'] },
};

export function AiConfigClient({ orgSlug }: { orgSlug: string }) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/ai-config`);
    const j = await r.json();
    setConfigs(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function getConfig(feature: string) {
    return configs.find((c) => c.feature === feature) || { feature, provider: 'gemini', model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 2048 };
  }

  async function saveFeature(feature: string, partial: any) {
    const cur = getConfig(feature);
    const merged = { ...cur, ...partial };
    await fetch(`/api/orgs/${orgSlug}/ai-config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged),
    });
    load();
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🤖" title="IA Settings"
      desc="Configure le provider et le modèle pour chaque feature. Les clés sont gérées dans /keys."
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ display: 'grid', gap: 12 }}>
          {FEATURES.map((f) => {
            const cfg = getConfig(f.id);
            const providerMeta = PROVIDERS[cfg.provider];
            const models = providerMeta?.models || ['custom'];
            return (
              <section key={f.id} style={card}>
                <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr 100px', gap: 12, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.5 }}>{f.desc}</div>
                  </div>
                  <select style={input} value={cfg.provider} onChange={(e) => saveFeature(f.id, { provider: e.target.value, model: PROVIDERS[e.target.value]?.models[0] || 'custom' })}>
                    {Object.entries(PROVIDERS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </select>
                  <select style={input} value={cfg.model} onChange={(e) => saveFeature(f.id, { model: e.target.value })}>
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <input type="number" min="0" max="2" step="0.1" style={input} value={cfg.temperature ?? 0.7}
                    onChange={(e) => saveFeature(f.id, { temperature: parseFloat(e.target.value) })} title="Temperature" />
                </div>
                {(cfg.provider === 'ollama' || cfg.provider === 'lmstudio') && (
                  <input style={{ ...input, marginTop: 8, fontFamily: 'monospace', fontSize: 12 }}
                    placeholder={cfg.provider === 'ollama' ? 'http://192.168.1.50:11434' : 'http://192.168.1.50:1234/v1'}
                    value={cfg.baseUrl || ''} onChange={(e) => saveFeature(f.id, { baseUrl: e.target.value })} />
                )}
              </section>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 12, opacity: 0.5, marginTop: 16 }}>
        💡 Tip : pour réduire les coûts, configure <code>gemini-3.1-flash-lite</code> sur Classification/Modération et garde un modèle premium pour la rédaction.
      </p>
    </SimpleOrgPage>
  );
}
