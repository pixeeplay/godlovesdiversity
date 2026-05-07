'use client';
import { useEffect, useState } from 'react';
import { Brain, Server, Zap, Save, RefreshCw, Loader2, CheckCircle2, AlertCircle, Sparkles, Cpu, Cloud, Image as ImageIcon, Mic, Video, Layers, Database, Globe } from 'lucide-react';
import { AiTopologyMap } from './AiTopologyMap';

const TASK_ICONS: Record<string, any> = {
  'text-short':        Zap,
  'text-medium':       Brain,
  'text-long':         Layers,
  'moderation':        AlertCircle,
  'classify-venue':    Cpu,
  'enrich-venue':      Globe,
  'persona-companion': Sparkles,
  'rag-chat':          Database,
  'embeddings':        Database,
  'stt':               Mic,
  'image-generate':    ImageIcon,
  'video-generate':    Video,
  'avatar-realtime':   Sparkles
};

interface ProviderConfig {
  id: string;
  label: string;
  type: string;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
  description?: string;
}

interface TaskMapping {
  taskKey: string;
  primary:  { providerId: string; model: string };
  fallback: { providerId: string; model: string }[];
}

interface PingResult {
  ok: boolean;
  latencyMs?: number;
  models?: string[];
  error?: string;
}

const TASK_LABELS: Record<string, { label: string; tokens: number; description: string }> = {
  'text-short':        { label: 'Texte court (50-200t)',                tokens: 200,  description: 'Réponses brèves, classifications binaires.' },
  'text-medium':       { label: 'Texte moyen (200-2000t)',              tokens: 2000, description: 'Sections de manuel, brand voice, AI text helper.' },
  'text-long':         { label: 'Texte long (2000-8000t)',              tokens: 8000, description: 'Newsletter, manuel entier, plan annuel.' },
  'moderation':        { label: 'Modération forum/intentions',          tokens: 50,   description: 'Yes/no rapide.' },
  'classify-venue':    { label: 'Classification venue → type religieux', tokens: 200,  description: 'CHURCH_CATHOLIC, MOSQUE, etc.' },
  'enrich-venue':      { label: 'Enrichissement venue (grounded)',       tokens: 3000, description: 'REQUIERT grounded search Google. Garde Gemini.' },
  'persona-companion': { label: 'Compagnon spirituel (4 personas)',     tokens: 2000, description: 'Mère Marie, Sœur Khadija, Rav Yossef, Maître Tenku.' },
  'rag-chat':          { label: '"Demandez à GLD" RAG',                  tokens: 3000, description: 'Chat avec retrieval sur knowledge base.' },
  'embeddings':        { label: 'Embeddings RAG',                        tokens: 0,    description: 'Vectorisation sémantique.' },
  'stt':               { label: 'Speech-to-Text',                        tokens: 0,    description: 'Transcription audio/vidéo.' },
  'image-generate':    { label: 'Génération image',                      tokens: 0,    description: 'Posters, share cards.' },
  'video-generate':    { label: 'Génération vidéo',                      tokens: 0,    description: 'Newsletters vidéo.' },
  'avatar-realtime':   { label: 'Avatar IA temps-réel',                  tokens: 0,    description: 'GLD Live.' }
};

const PROVIDER_TYPE_RECO: Record<string, string[]> = {
  ollama:        ['qwen2.5:3b-instruct-q5_K_M', 'qwen2.5:7b-instruct-q5_K_M', 'llama3.1:8b-instruct-q5_K_M', 'qwen2.5:14b-instruct-q4_K_M', 'nomic-embed-text', 'mxbai-embed-large'],
  'ollama-cloud':['qwen3-coder:480b-cloud', 'gpt-oss:120b-cloud', 'gpt-oss:20b-cloud', 'deepseek-v3.1:671b-cloud', 'kimi-k2:1t-cloud'],
  lmstudio:      ['llama-3.2-3b-instruct', 'qwen2.5-7b-instruct', 'mistral-7b-instruct-v0.3', 'llama-3.1-8b-instruct', 'phi-3.5-mini-instruct'],
  llamacpp:      ['Qwen2.5-7B-Instruct-Q5_K_M.gguf', 'Llama-3.1-8B-Instruct-Q5_K_M.gguf'],
  gemini:        ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'imagen-3.0-generate-002', 'text-embedding-004'],
  openrouter:    ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini', 'meta-llama/llama-3.3-70b-instruct', 'mistralai/mistral-7b-instruct', 'qwen/qwen-2.5-72b-instruct', 'google/gemini-2.0-flash-exp:free'],
  fal:           ['flux/schnell', 'flux/dev', 'sdxl-lightning-1step', 'veo-3'],
  heygen:        ['avatar-streaming', 'avatar-video']
};

export function AiSettingsClient() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [mappings, setMappings] = useState<Record<string, TaskMapping>>({});
  const [pings, setPings] = useState<Record<string, PingResult>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'providers' | 'tasks' | 'test' | 'doc'>('providers');
  const [testTask, setTestTask] = useState('text-short');
  const [testPrompt, setTestPrompt] = useState('Dis bonjour à la communauté GLD en 20 mots.');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/ai-providers');
      const j = await r.json();
      setProviders(j.providers || []);
      setMappings(j.mappings || {});
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function pingOne(id: string) {
    setPings(p => ({ ...p, [id]: { ok: false, error: 'pinging…' } as any }));
    try {
      const r = await fetch(`/api/admin/ai-providers?ping=${id}`);
      const j = await r.json();
      setPings(p => ({ ...p, [id]: j }));
    } catch {
      setPings(p => ({ ...p, [id]: { ok: false, error: 'fetch-failed' } }));
    }
  }

  async function pingAll() {
    for (const p of providers) await pingOne(p.id);
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/ai-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers, mappings })
      });
      const j = await r.json();
      setMsg(r.ok ? '✓ Configuration sauvegardée' : `⚠ ${j.error}`);
      setTimeout(() => setMsg(null), 3500);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setSaving(false);
  }

  async function runTest() {
    setTesting(true); setTestResult(null);
    try {
      const r = await fetch(`/api/admin/ai-providers?test=${testTask}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: testPrompt })
      });
      const j = await r.json();
      setTestResult(j);
    } catch (e: any) { setTestResult({ error: e.message }); }
    setTesting(false);
  }

  function updateProvider(id: string, patch: Partial<ProviderConfig>) {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function updateMapping(taskKey: string, patch: Partial<TaskMapping>) {
    setMappings(prev => ({ ...prev, [taskKey]: { ...prev[taskKey], ...patch } as TaskMapping }));
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-2xl p-3">
            <Brain size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">AI Settings</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Multi-providers : Gemini · Ollama · OpenRouter · LM Studio · llama.cpp. Chaîne de fallback automatique.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={pingAll} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5">
            <RefreshCw size={11} /> Test tous les providers
          </button>
          <button onClick={save} disabled={saving} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Sauvegarder
          </button>
        </div>
      </header>

      {msg && <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-sm text-emerald-200">{msg}</div>}

      {/* Visual Topology Map — toujours visible en haut */}
      <AiTopologyMap providers={providers} mappings={mappings} />

      {/* Tabs */}
      <nav className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1">
        {[
          { id: 'providers', label: 'Providers', icon: Server },
          { id: 'tasks',     label: 'Mapping tâches', icon: Zap },
          { id: 'test',      label: 'Test live', icon: Sparkles },
          { id: 'doc',       label: 'Doc Mac mini', icon: Cpu }
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 text-xs font-bold px-4 py-2 rounded-full flex items-center justify-center gap-1.5 transition ${
                activeTab === t.id ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={12} /> {t.label}
            </button>
          );
        })}
      </nav>

      {/* TAB : Providers */}
      {activeTab === 'providers' && (
        <section className="space-y-3">
          {providers.map(p => {
            const ping = pings[p.id];
            const recoModels = PROVIDER_TYPE_RECO[p.type] || [];
            return (
              <article key={p.id} className={`bg-zinc-900 border rounded-2xl p-4 transition ${p.enabled ? 'border-emerald-500/40' : 'border-zinc-800'}`}>
                <header className="flex items-center justify-between flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <ProviderIcon type={p.type} />
                    <div>
                      <h3 className="font-bold text-base">{p.label}</h3>
                      <p className="text-[11px] text-zinc-500">{p.type} · ID: <code className="text-[10px] bg-zinc-800 px-1 rounded">{p.id}</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ping && (
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${ping.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {ping.ok ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                        {ping.ok ? `${ping.latencyMs}ms` : ping.error}
                      </span>
                    )}
                    <button onClick={() => pingOne(p.id)} className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded-full">
                      Ping
                    </button>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={p.enabled} onChange={(e) => updateProvider(p.id, { enabled: e.target.checked })} className="accent-emerald-500" />
                      <span className={p.enabled ? 'text-emerald-300 font-bold' : 'text-zinc-500'}>{p.enabled ? 'Activé' : 'Désactivé'}</span>
                    </label>
                  </div>
                </header>
                {p.description && <p className="text-xs text-zinc-400 mb-3">{p.description}</p>}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Base URL {p.type === 'ollama' || p.type === 'lmstudio' || p.type === 'llamacpp' ? '(Tailscale ex: http://100.64.0.1:11434)' : ''}</span>
                    <input
                      value={p.baseUrl || ''}
                      onChange={(e) => updateProvider(p.id, { baseUrl: e.target.value })}
                      placeholder={
                        p.type === 'ollama'         ? 'http://100.64.0.1:11434' :
                        p.type === 'ollama-cloud'   ? 'https://ollama.com' :
                        p.type === 'lmstudio'       ? 'http://100.64.0.1:1234/v1' :
                        p.type === 'llamacpp'       ? 'http://100.64.0.1:8080' :
                        p.type === 'comfyui'        ? 'http://100.64.0.1:8188' :
                        p.type === 'whisper-local'  ? 'http://100.64.0.1:9000' :
                        ''
                      }
                      className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">API Key {['gemini', 'openrouter', 'fal', 'heygen', 'ollama-cloud'].includes(p.type) ? '(requis)' : '(optionnel)'}</span>
                    <input
                      type="password"
                      value={p.apiKey || ''}
                      onChange={(e) => updateProvider(p.id, { apiKey: e.target.value })}
                      placeholder="••••••••"
                      className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs font-mono"
                    />
                  </label>
                </div>
                {ping?.models && ping.models.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-[11px] text-emerald-300 cursor-pointer">📦 Modèles détectés ({ping.models.length})</summary>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ping.models.slice(0, 30).map(m => (
                        <span key={m} className="text-[10px] bg-emerald-500/10 text-emerald-200 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">{m}</span>
                      ))}
                    </div>
                  </details>
                )}
                {recoModels.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-[11px] text-fuchsia-300 cursor-pointer">💡 Modèles recommandés pour ce type</summary>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {recoModels.map(m => (
                        <code key={m} className="text-[10px] bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-500/20 px-2 py-0.5 rounded">{m}</code>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </section>
      )}

      {/* TAB : Mapping tasks → providers */}
      {activeTab === 'tasks' && (
        <section className="space-y-2">
          <p className="text-xs text-zinc-400 mb-3 italic">
            Pour chaque tâche, choisis le provider primaire + les fallbacks. Si le primaire échoue, GLD essaie automatiquement les fallbacks dans l'ordre.
          </p>
          {Object.entries(TASK_LABELS).map(([taskKey, info]) => {
            const Icon = TASK_ICONS[taskKey] || Brain;
            const mapping = mappings[taskKey];
            if (!mapping) return null;
            return (
              <article key={taskKey} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                <header className="flex items-start gap-3 mb-3">
                  <div className="bg-zinc-800 rounded-lg p-2"><Icon size={14} className="text-fuchsia-400" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm">{info.label}</h3>
                    <p className="text-[11px] text-zinc-500">{info.description}</p>
                    <code className="text-[10px] text-zinc-600">{taskKey} · {info.tokens} tokens</code>
                  </div>
                </header>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Primaire</span>
                    <ProviderModelSelect
                      providerId={mapping.primary.providerId}
                      model={mapping.primary.model}
                      providers={providers}
                      pings={pings}
                      onProviderChange={(providerId) => updateMapping(taskKey, { primary: { ...mapping.primary, providerId, model: '' } })}
                      onModelChange={(model) => updateMapping(taskKey, { primary: { ...mapping.primary, model } })}
                      onPing={pingOne}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400">Fallback (1er)</span>
                    {mapping.fallback[0] ? (
                      <ProviderModelSelect
                        providerId={mapping.fallback[0].providerId}
                        model={mapping.fallback[0].model}
                        providers={providers}
                        pings={pings}
                        onProviderChange={(providerId) => updateMapping(taskKey, { fallback: [{ ...mapping.fallback[0], providerId, model: '' }, ...mapping.fallback.slice(1)] })}
                        onModelChange={(model) => updateMapping(taskKey, { fallback: [{ ...mapping.fallback[0], model }, ...mapping.fallback.slice(1)] })}
                        onPing={pingOne}
                      />
                    ) : (
                      <button onClick={() => updateMapping(taskKey, { fallback: [{ providerId: providers[0]?.id || '', model: '' }] })} className="text-[10px] text-amber-400 hover:underline mt-1 block">+ Ajouter fallback</button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* TAB : Test live */}
      {activeTab === 'test' && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Sparkles size={14} className="text-fuchsia-400" /> Test une tâche live</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <select value={testTask} onChange={(e) => setTestTask(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
              {Object.entries(TASK_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={runTest} disabled={testing} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-sm font-bold rounded-full">
              {testing ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
              {testing ? 'Test en cours…' : 'Lancer le test'}
            </button>
          </div>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            rows={3}
            placeholder="Ton prompt de test…"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm mb-3"
          />
          {testResult && (
            <div className={`rounded-xl p-4 ${testResult.error ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
              <div className="flex items-center justify-between text-xs mb-2">
                <strong>{testResult.error ? '❌ Erreur' : '✓ Succès'}</strong>
                <span className="text-zinc-400">{testResult.providerId}/{testResult.model} · {testResult.tookMs}ms</span>
              </div>
              <pre className="text-xs whitespace-pre-wrap text-zinc-100">{testResult.text || testResult.error}</pre>
            </div>
          )}
        </section>
      )}

      {/* TAB : Doc Mac mini */}
      {activeTab === 'doc' && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 prose prose-invert prose-sm max-w-none">
          <h3 className="text-base font-bold flex items-center gap-2 mb-3"><Cpu size={14} className="text-cyan-400" /> Setup Mac mini M4 Pro 24 GB via Tailscale</h3>

          <h4 className="text-sm font-bold text-emerald-400 mt-4">1. Installer Ollama (5 min)</h4>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto"><code>brew install ollama
ollama serve  # daemon en arrière-plan, port 11434

# Télécharger les modèles essentiels (~14 GB total)
ollama pull qwen2.5:3b-instruct-q5_K_M     # 2.4 GB · modération yes/no, ultra-rapide
ollama pull qwen2.5:7b-instruct-q5_K_M     # 5.5 GB · texte court/moyen, multilingue
ollama pull llama3.1:8b-instruct-q5_K_M    # 5.7 GB · créatif, dialogue
ollama pull nomic-embed-text                # 270 MB · embeddings RAG</code></pre>

          <h4 className="text-sm font-bold text-emerald-400 mt-4">2. Exposer via Tailscale</h4>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto"><code># Sur le Mac :
sudo nano /Library/LaunchDaemons/com.tailscale.tailscaled.plist  # déjà en place
tailscale up

# Trouver ton IP Tailscale
tailscale ip -4   # ex: 100.64.0.1

# Ollama écoute par défaut sur localhost. Pour exposer via Tailscale :
launchctl setenv OLLAMA_HOST "0.0.0.0:11434"
brew services restart ollama</code></pre>

          <h4 className="text-sm font-bold text-emerald-400 mt-4">3. Auth Coolify → Tailscale</h4>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto"><code># Dans Coolify, le container Docker doit pouvoir parler à 100.64.0.1
# Solution la plus simple : Tailscale en sidecar dans Docker

# Variable env Coolify à ajouter :
TAILSCALE_AUTHKEY=tskey-auth-...   # depuis https://login.tailscale.com/admin/settings/keys

# Ou plus simple : exposer le Mac via un port public temporaire (moins safe)
# Recommandé : Tailscale Subnet Router</code></pre>

          <h4 className="text-sm font-bold text-emerald-400 mt-4">4. Configurer dans /admin/ai-settings</h4>
          <ol className="text-xs space-y-1.5 ml-4">
            <li>Onglet <strong>Providers</strong> → activer "Ollama (Mac mini Tailscale)" + remplir Base URL <code className="bg-zinc-800 px-1 rounded">http://100.64.0.1:11434</code></li>
            <li>Cliquer <strong>Ping</strong> — tu dois voir ✓ + la liste de tes modèles installés</li>
            <li>Onglet <strong>Mapping tâches</strong> → pour chaque tâche, choisir Ollama en primaire, Gemini en fallback</li>
            <li>Sauvegarder, tester via onglet <strong>Test live</strong></li>
          </ol>

          <h4 className="text-sm font-bold text-emerald-400 mt-4">5. Optionnel : LM Studio (GUI swap modèles)</h4>
          <p className="text-xs">LM Studio app Mac → Server tab → Start. Port défaut <code className="bg-zinc-800 px-1 rounded">1234</code>. Permet de swap les modèles depuis la GUI sans toucher au code GLD.</p>

          <h4 className="text-sm font-bold text-emerald-400 mt-4">6. Optionnel : llama.cpp (le plus rapide Metal)</h4>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto"><code>brew install llama.cpp
# Lancer en mode server avec un modèle GGUF
llama-server -m ~/models/qwen2.5-7b-instruct-q5_k_m.gguf -c 8192 --port 8080 --host 0.0.0.0</code></pre>

          <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs">
            <strong className="text-amber-200">⚠️ Honnête sur les limites :</strong>
            <ul className="mt-2 space-y-1 list-disc ml-4">
              <li><strong>Pic de charge</strong> : 1-2 reqs/sec en parallèle sur M4 Pro Q5 7B. Au-delà, fallback Gemini ou OpenRouter requis.</li>
              <li><strong>Mac off / qui dort</strong> : si tu fermes le Mac, le fallback Gemini doit être activé sinon dégradation user.</li>
              <li><strong>Latence Tailscale</strong> : ajoute ~30-80 ms vs localhost. Reste plus rapide que Gemini API (~150-300 ms) sur les tâches courtes.</li>
              <li><strong>Image génération locale</strong> : DiffusionBee ou ComfyUI. FLUX.1-schnell tourne mais ralentit le système (~3s/image).</li>
              <li><strong>Vidéo + Avatar realtime</strong> : <strong>pas réaliste</strong> en local. Garde fal.ai + HeyGen.</li>
            </ul>
          </div>

          <h4 className="text-sm font-bold text-teal-400 mt-4">7. Ollama Cloud (online) — accès aux gros modèles</h4>
          <p className="text-xs">
            Tu as une clé Ollama Cloud ? Elle te donne accès aux modèles trop gros pour ton Mac : <code className="bg-zinc-800 px-1 rounded">qwen3-coder:480b-cloud</code>, <code className="bg-zinc-800 px-1 rounded">gpt-oss:120b-cloud</code>, <code className="bg-zinc-800 px-1 rounded">deepseek-v3.1:671b-cloud</code>, <code className="bg-zinc-800 px-1 rounded">kimi-k2:1t-cloud</code>. Endpoint OpenAI-compatible.
          </p>
          <ol className="text-xs space-y-1.5 ml-4 mt-2">
            <li>Provider <strong>Ollama Cloud (online)</strong> → activer + coller ta clé API (déjà créée sur ollama.com)</li>
            <li>Base URL pré-remplie : <code className="bg-zinc-800 px-1 rounded">https://ollama.com</code></li>
            <li>Cliquer <strong>Ping</strong> → liste les modèles cloud auxquels tu as accès</li>
            <li>Mapper sur les tâches qui demandent un gros modèle (texte long créatif, RAG complexe)</li>
          </ol>
          <p className="text-[11px] text-teal-300 mt-2">💡 Avantage : tu paies à l'usage (pay-per-token) sans gérer d'infra GPU, et ça remplace bien Gemini Pro si tu veux quitter Google.</p>

          <h4 className="text-sm font-bold text-amber-400 mt-4">8. OpenRouter — 200+ modèles cloud unifiés</h4>
          <p className="text-xs">
            Tu as une clé OpenRouter ? Crée un compte sur <a href="https://openrouter.ai" target="_blank" className="text-fuchsia-400 hover:underline">openrouter.ai</a>, génère une clé, colle-la dans le provider <strong>OpenRouter</strong>. Accès à Claude 3.5 Sonnet, GPT-4o, Llama 3.3 70B, Qwen 72B, Mistral, etc. en pay-per-use unifié.
          </p>
          <p className="text-[11px] text-amber-300 mt-2">💡 Bon comme <strong>fallback secondaire</strong> si Ollama Mac + Ollama Cloud + Gemini sont KO. Ça te donne une 4e ligne de défense.</p>

          <h4 className="text-sm font-bold text-fuchsia-400 mt-4">9. Stratégie de chaînage recommandée pour GLD</h4>
          <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs overflow-x-auto"><code>Tâches courtes (modération, classify) :
  Primaire   → Ollama Mac (local Tailscale)         ⚡ ~150 ms
  Fallback 1 → Ollama Cloud (online, gros modèle)    ⚡ ~500 ms
  Fallback 2 → Gemini Flash (Google)                 ⚡ ~200 ms

Tâches moyennes (manuel sections, brand voice) :
  Primaire   → Ollama Mac (Llama 3.1 8B)             ⚡ ~2 s
  Fallback 1 → Ollama Cloud (gpt-oss:20b-cloud)      ⚡ ~3 s
  Fallback 2 → OpenRouter (Claude 3.5 Sonnet)        💰 0.003 €/req

Tâches longues créatives :
  Primaire   → Ollama Cloud (qwen3-coder:480b-cloud) ⚡ ~10 s
  Fallback 1 → OpenRouter (Claude 3.5 Sonnet)
  Fallback 2 → Gemini 2.5 Pro

Image/Vidéo/Avatar :
  → Cloud uniquement (fal.ai, HeyGen) — pas réaliste local</code></pre>
        </section>
      )}
    </div>
  );
}

/**
 * Sélecteur Provider + Modèle avec :
 *  - Dropdown providers (parmi ceux activés)
 *  - Dropdown modèles : alimenté dynamiquement par le ping (si ping a réussi),
 *    sinon liste statique des modèles recommandés du type, sinon free-text
 *  - Bouton 🔄 Discover pour ping manuel et rafraîchir la liste de modèles
 *  - Bascule "free-text" pour modèles custom non détectés
 */
function ProviderModelSelect({
  providerId, model, providers, pings,
  onProviderChange, onModelChange, onPing
}: {
  providerId: string;
  model: string;
  providers: ProviderConfig[];
  pings: Record<string, PingResult>;
  onProviderChange: (id: string) => void;
  onModelChange: (model: string) => void;
  onPing: (id: string) => Promise<void>;
}) {
  const [discovering, setDiscovering] = useState(false);
  const [freeText, setFreeText] = useState(false);

  const provider = providers.find(p => p.id === providerId);
  const ping = pings[providerId];
  const detectedModels = ping?.models || [];
  const recoModels = provider ? (PROVIDER_TYPE_RECO[provider.type] || []) : [];

  // Liste de modèles à afficher : détectés en priorité, sinon recommandés
  const availableModels = detectedModels.length > 0 ? detectedModels : recoModels;
  const modelInList = availableModels.includes(model);

  async function discover() {
    setDiscovering(true);
    await onPing(providerId);
    setDiscovering(false);
  }

  return (
    <div className="space-y-1.5 mt-1">
      {/* Provider selector */}
      <div className="flex gap-1">
        <select
          value={providerId}
          onChange={(e) => onProviderChange(e.target.value)}
          className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs"
        >
          {providers.filter(p => p.enabled).map(p => {
            const pp = pings[p.id];
            const indicator = pp?.ok ? '🟢' : pp?.error ? '🔴' : '⚪';
            return <option key={p.id} value={p.id}>{indicator} {p.label}</option>;
          })}
        </select>
        <button
          type="button"
          onClick={discover}
          disabled={discovering}
          title="Découvrir les modèles disponibles (ping)"
          className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-2 py-1.5 rounded-lg text-[11px] flex items-center gap-1"
        >
          {discovering ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
        </button>
      </div>

      {/* Model selector — dropdown OU input free-text */}
      {freeText || (model && !modelInList && availableModels.length > 0) ? (
        <div className="flex gap-1">
          <input
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            placeholder="modèle (ex: qwen2.5:7b-instruct-q5_K_M)"
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono"
          />
          {availableModels.length > 0 && (
            <button
              type="button"
              onClick={() => setFreeText(false)}
              className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 rounded-lg"
              title="Retour à la liste"
            >
              ↩ Liste
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-1">
          <select
            value={modelInList ? model : ''}
            onChange={(e) => onModelChange(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono"
          >
            <option value="">— Choisir un modèle —</option>
            {detectedModels.length > 0 && (
              <optgroup label="🟢 Détectés (live)">
                {detectedModels.map(m => <option key={m} value={m}>{m}</option>)}
              </optgroup>
            )}
            {detectedModels.length === 0 && recoModels.length > 0 && (
              <optgroup label="💡 Recommandés (par défaut)">
                {recoModels.map(m => <option key={m} value={m}>{m}</option>)}
              </optgroup>
            )}
          </select>
          <button
            type="button"
            onClick={() => setFreeText(true)}
            className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 rounded-lg"
            title="Saisir un modèle custom (non détecté)"
          >
            ✎ Custom
          </button>
        </div>
      )}

      {/* Status hint */}
      <div className="text-[10px] text-zinc-500 flex items-center gap-2">
        {ping?.ok ? (
          <span className="text-emerald-400">
            🟢 {ping.latencyMs}ms · {detectedModels.length} modèles détectés
          </span>
        ) : ping?.error ? (
          <span className="text-rose-400">🔴 {ping.error}</span>
        ) : (
          <span>⚪ Cliquer 🔄 pour découvrir les modèles</span>
        )}
      </div>
    </div>
  );
}

function ProviderIcon({ type }: { type: string }) {
  const icons: Record<string, any> = {
    gemini: Cloud, ollama: Cpu, 'ollama-cloud': Cloud, lmstudio: Cpu, llamacpp: Cpu,
    openrouter: Cloud, fal: ImageIcon, heygen: Video, comfyui: ImageIcon, 'whisper-local': Mic
  };
  const colors: Record<string, string> = {
    gemini: 'bg-cyan-500/20 text-cyan-300',
    ollama: 'bg-emerald-500/20 text-emerald-300',
    'ollama-cloud': 'bg-teal-500/20 text-teal-300',
    lmstudio: 'bg-blue-500/20 text-blue-300',
    llamacpp: 'bg-purple-500/20 text-purple-300',
    openrouter: 'bg-amber-500/20 text-amber-300',
    fal: 'bg-pink-500/20 text-pink-300',
    heygen: 'bg-rose-500/20 text-rose-300',
    comfyui: 'bg-violet-500/20 text-violet-300',
    'whisper-local': 'bg-orange-500/20 text-orange-300'
  };
  const Icon = icons[type] || Server;
  return <div className={`rounded-lg p-2 ${colors[type] || 'bg-zinc-700 text-zinc-300'}`}><Icon size={16} /></div>;
}
