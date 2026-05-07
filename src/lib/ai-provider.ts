/**
 * Routeur IA multi-provider — Gemini + Ollama + OpenRouter + LM Studio + llama.cpp
 *
 * Architecture :
 *  - Chaque "task" (mod-short, text-medium, classification, etc.) est mappé à un provider+model
 *  - Mapping configurable dans /admin/ai-settings (stocké en table Setting)
 *  - Chaque provider a une chaîne de fallback définie
 *  - Si provider primaire down → fallback automatique
 *
 * Usage côté code :
 *   import { generateForTask } from '@/lib/ai-provider';
 *   const result = await generateForTask('moderation-short', { prompt, system });
 *
 * Compat retro : `generateText(prompt, system)` continue de marcher (alias sur 'text-medium').
 */

import { getSettings } from './settings';

// ─────────────────────────────────────────────
// 1. Catalogue des TÂCHES IA du site GLD
// ─────────────────────────────────────────────
export const AI_TASKS = {
  'text-short':           { label: 'Texte court (réponse 50-200t)',          tokens: 200,    description: 'Réponses brèves, classifications binaires, modération yes/no.' },
  'text-medium':          { label: 'Texte moyen (200-2000t)',                 tokens: 2000,   description: 'Sections de manuel, brand voice, AI text helper.' },
  'text-long':            { label: 'Texte long créatif (2000-8000t)',         tokens: 8000,   description: 'Newsletter complète, manuel entier, plan annuel.' },
  'moderation':           { label: 'Modération forum / intentions',          tokens: 50,     description: 'Yes/no sur posts, intentions de prière, annotations.' },
  'classify-venue':       { label: 'Classification venue → type religieux',  tokens: 200,    description: 'Reclassifie OTHER → CHURCH_CATHOLIC, MOSQUE, etc.' },
  'enrich-venue':         { label: 'Enrichissement venue (grounded search)', tokens: 3000,   description: 'REQUIERT grounded search Google. Reste sur Gemini.' },
  'persona-companion':    { label: 'Compagnon spirituel (4 personas)',       tokens: 2000,   description: 'Conversations avec Mère Marie, Sœur Khadija, etc.' },
  'rag-chat':             { label: '"Demandez à GLD" RAG chat',              tokens: 3000,   description: 'Chat avec retrieval augmenté sur knowledge base.' },
  'embeddings':           { label: 'Embeddings RAG / vector search',          tokens: 0,      description: 'Vectorisation pour recherche sémantique.' },
  'stt':                  { label: 'Speech-to-Text (transcription)',         tokens: 0,      description: 'Transcrire témoignages vidéo, sous-titres FR/EN/ES/PT.' },
  'image-generate':       { label: 'Génération d\'images (Studio IA)',       tokens: 0,      description: 'Posters, illustrations, share cards.' },
  'video-generate':       { label: 'Génération vidéo (newsletter, social)',  tokens: 0,      description: 'Vidéos courtes pour calendrier social.' },
  'avatar-realtime':      { label: 'Avatar IA temps-réel',                    tokens: 0,      description: 'GLD Live — vidéo + voix temps-réel.' }
} as const;

export type AiTaskKey = keyof typeof AI_TASKS;

// ─────────────────────────────────────────────
// 2. Catalogue des PROVIDERS
// ─────────────────────────────────────────────
export interface ProviderConfig {
  id: string;
  label: string;
  type: 'gemini' | 'ollama' | 'ollama-cloud' | 'openrouter' | 'lmstudio' | 'llamacpp' | 'fal' | 'heygen' | 'avatar-v' | 'tavus' | 'synthesia' | 'd-id' | 'whisper-local' | 'comfyui';
  baseUrl?: string;       // ex: http://100.x.y.z:11434 (Tailscale)
  apiKey?: string;
  models?: string[];      // liste de modèles disponibles
  enabled: boolean;
  description?: string;
}

export const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    type: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    enabled: true,
    description: 'Provider par défaut. Free tier 1500 req/jour. Grounded search supporté (unique).'
  },
  {
    id: 'ollama-mac',
    label: 'Ollama (Mac mini Tailscale)',
    type: 'ollama',
    baseUrl: '',  // ex: http://100.64.0.1:11434
    enabled: false,
    description: 'Modèles locaux sur ton Mac mini M4 Pro 24GB via Tailscale. Gratuit, privé, rapide en France.'
  },
  {
    id: 'ollama-cloud',
    label: 'Ollama Cloud (online)',
    type: 'ollama-cloud',
    baseUrl: 'https://ollama.com',
    enabled: false,
    description: 'Service Ollama hébergé : accès aux gros modèles cloud (qwen3-coder:480b-cloud, gpt-oss:120b-cloud, deepseek-v3.1:671b-cloud, kimi-k2:1t-cloud). Pay-per-use. Modèles trop gros pour ton Mac.'
  },
  {
    id: 'lmstudio-mac',
    label: 'LM Studio (Mac via Tailscale)',
    type: 'lmstudio',
    baseUrl: '',  // ex: http://100.64.0.1:1234/v1
    enabled: false,
    description: 'Compatible OpenAI. Permet de swap les modèles depuis la GUI Mac sans toucher au code.'
  },
  {
    id: 'llamacpp-mac',
    label: 'llama.cpp server (Mac, ultra-rapide Metal)',
    type: 'llamacpp',
    baseUrl: '',  // ex: http://100.64.0.1:8080
    enabled: false,
    description: '20-40% plus rapide qu\'Ollama sur Apple Silicon. Pour flux temps-réel.'
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    type: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    enabled: false,
    description: 'Proxy unifié vers 200+ modèles cloud. Pay-per-use. Bon fallback.'
  },
  {
    id: 'fal',
    label: 'fal.ai (image + vidéo)',
    type: 'fal',
    baseUrl: 'https://fal.run',
    enabled: false,
    description: 'Génération vidéo + images SDXL/FLUX. Pay-per-call.'
  },
  {
    id: 'heygen',
    label: 'HeyGen (avatar vidéo)',
    type: 'heygen',
    baseUrl: 'https://api.heygen.com',
    enabled: false,
    description: 'Avatar IA vidéo studio + temps-réel via SDK.'
  },
  {
    id: 'avatar-v',
    label: 'Avatar V (upper-body, cross-outfits)',
    type: 'avatar-v',
    baseUrl: 'https://api.heygen.com/v2',
    enabled: false,
    description: 'Nouveau model HeyGen Avatar V (upper-body, consistency cross-tenues, 1 clip 15s en input). Idéal pour les 4 personas spirituels + newsletters vidéo.'
  },
  {
    id: 'tavus',
    label: 'Tavus (avatar conversationnel)',
    type: 'tavus',
    baseUrl: 'https://tavusapi.com',
    enabled: false,
    description: 'Avatars conversationnels temps-réel avec replicas personnels.'
  },
  {
    id: 'synthesia',
    label: 'Synthesia (avatars studio)',
    type: 'synthesia',
    baseUrl: 'https://api.synthesia.io/v2',
    enabled: false,
    description: '160+ avatars stock pré-entraînés, pas besoin de clip source.'
  },
  {
    id: 'd-id',
    label: 'D-ID (talking-head)',
    type: 'd-id',
    baseUrl: 'https://api.d-id.com',
    enabled: false,
    description: 'Talking-head depuis une simple photo + texte. Le moins cher pour des bouts de vidéo courts.'
  },
  {
    id: 'comfyui-mac',
    label: 'ComfyUI (Mac, image FLUX/SDXL)',
    type: 'comfyui',
    baseUrl: '',  // ex: http://100.64.0.1:8188
    enabled: false,
    description: 'Génération d\'images locale via FLUX.1-schnell ou SDXL Turbo.'
  },
  {
    id: 'whisper-mac',
    label: 'whisper.cpp (Mac, STT)',
    type: 'whisper-local',
    baseUrl: '',  // ex: http://100.64.0.1:9000
    enabled: false,
    description: 'Transcription audio rapide (8x temps-réel) sur Apple Silicon.'
  }
];

// ─────────────────────────────────────────────
// 3. Mapping par défaut TASK → PROVIDER + MODEL
// ─────────────────────────────────────────────
export interface TaskMapping {
  taskKey: AiTaskKey;
  primary:  { providerId: string; model: string };
  fallback: { providerId: string; model: string }[];
}

export const DEFAULT_MAPPINGS: Record<AiTaskKey, TaskMapping> = {
  'text-short':        { taskKey: 'text-short',        primary: { providerId: 'gemini', model: 'gemini-2.5-flash' },                 fallback: [{ providerId: 'ollama-mac', model: 'qwen2.5:7b-instruct-q5_K_M' }] },
  'text-medium':       { taskKey: 'text-medium',       primary: { providerId: 'gemini', model: 'gemini-2.5-flash' },                 fallback: [{ providerId: 'ollama-mac', model: 'llama3.1:8b-instruct-q5_K_M' }, { providerId: 'openrouter', model: 'mistralai/mistral-7b-instruct' }] },
  'text-long':         { taskKey: 'text-long',         primary: { providerId: 'gemini', model: 'gemini-2.5-pro' },                   fallback: [{ providerId: 'openrouter', model: 'anthropic/claude-3.5-sonnet' }] },
  'moderation':        { taskKey: 'moderation',        primary: { providerId: 'ollama-mac', model: 'qwen2.5:3b-instruct-q5_K_M' },   fallback: [{ providerId: 'gemini', model: 'gemini-2.5-flash' }] },
  'classify-venue':    { taskKey: 'classify-venue',    primary: { providerId: 'ollama-mac', model: 'qwen2.5:7b-instruct-q5_K_M' },   fallback: [{ providerId: 'gemini', model: 'gemini-2.5-flash' }] },
  'enrich-venue':      { taskKey: 'enrich-venue',      primary: { providerId: 'gemini', model: 'gemini-2.5-flash' },                 fallback: [] },  // Grounded search uniquement Gemini
  'persona-companion': { taskKey: 'persona-companion', primary: { providerId: 'ollama-mac', model: 'llama3.1:8b-instruct-q5_K_M' },  fallback: [{ providerId: 'gemini', model: 'gemini-2.5-flash' }] },
  'rag-chat':          { taskKey: 'rag-chat',          primary: { providerId: 'ollama-mac', model: 'llama3.1:8b-instruct-q5_K_M' },  fallback: [{ providerId: 'gemini', model: 'gemini-2.5-flash' }] },
  'embeddings':        { taskKey: 'embeddings',        primary: { providerId: 'ollama-mac', model: 'nomic-embed-text' },             fallback: [{ providerId: 'gemini', model: 'text-embedding-004' }] },
  'stt':               { taskKey: 'stt',               primary: { providerId: 'whisper-mac', model: 'large-v3-turbo' },              fallback: [] },
  'image-generate':    { taskKey: 'image-generate',    primary: { providerId: 'gemini', model: 'imagen-3.0-generate-002' },           fallback: [{ providerId: 'fal', model: 'flux/schnell' }, { providerId: 'comfyui-mac', model: 'flux1-schnell' }] },
  'video-generate':    { taskKey: 'video-generate',    primary: { providerId: 'fal',    model: 'veo-3' },                            fallback: [] },
  'avatar-realtime':   { taskKey: 'avatar-realtime',   primary: { providerId: 'heygen', model: 'avatar-streaming' },                 fallback: [] }
};

// ─────────────────────────────────────────────
// 4. Lecture de la config (depuis Setting DB)
// ─────────────────────────────────────────────
const KEY_PROVIDERS = 'ai.providers';
const KEY_MAPPINGS  = 'ai.task-mappings';

export async function loadAiConfig(): Promise<{ providers: ProviderConfig[]; mappings: Record<AiTaskKey, TaskMapping> }> {
  const settings = await getSettings([KEY_PROVIDERS, KEY_MAPPINGS]).catch(() => ({} as Record<string, string>));
  let providers: ProviderConfig[] = DEFAULT_PROVIDERS;
  let mappings = DEFAULT_MAPPINGS;
  try {
    if (settings[KEY_PROVIDERS]) {
      const parsed = JSON.parse(settings[KEY_PROVIDERS]);
      if (Array.isArray(parsed)) providers = parsed;
    }
  } catch {}
  try {
    if (settings[KEY_MAPPINGS]) {
      const parsed = JSON.parse(settings[KEY_MAPPINGS]);
      if (parsed && typeof parsed === 'object') mappings = { ...DEFAULT_MAPPINGS, ...parsed };
    }
  } catch {}
  return { providers, mappings };
}

// ─────────────────────────────────────────────
// 5. Routage par tâche
// ─────────────────────────────────────────────
export interface GenerateOptions {
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateResult {
  text: string;
  providerId: string;
  model: string;
  tookMs: number;
  tokensUsed?: number;
  error?: string;
}

export async function generateForTask(taskKey: AiTaskKey, opts: GenerateOptions): Promise<GenerateResult> {
  const cfg = await loadAiConfig();
  const mapping = cfg.mappings[taskKey];
  if (!mapping) throw new Error(`task-unknown: ${taskKey}`);

  const chain = [mapping.primary, ...mapping.fallback];
  const errors: string[] = [];
  for (const step of chain) {
    const provider = cfg.providers.find(p => p.id === step.providerId);
    if (!provider || !provider.enabled) {
      errors.push(`${step.providerId}: disabled or not configured`);
      continue;
    }
    try {
      const t0 = Date.now();
      const text = await callProvider(provider, step.model, opts);
      return {
        text,
        providerId: provider.id,
        model: step.model,
        tookMs: Date.now() - t0
      };
    } catch (e: any) {
      errors.push(`${step.providerId}/${step.model}: ${e?.message || 'error'}`);
    }
  }
  // Tous failed
  return {
    text: `🔑 Tous les providers ont échoué pour la tâche "${taskKey}".\n\n${errors.join('\n')}`,
    providerId: 'none',
    model: 'none',
    tookMs: 0,
    error: errors.join(' | ')
  };
}

// ─────────────────────────────────────────────
// 6. Adapters par provider type
// ─────────────────────────────────────────────
async function callProvider(provider: ProviderConfig, model: string, opts: GenerateOptions): Promise<string> {
  switch (provider.type) {
    case 'gemini':        return callGemini(provider, model, opts);
    case 'ollama':        return callOllama(provider, model, opts);
    case 'ollama-cloud':  return callOllamaCloud(provider, model, opts);
    case 'lmstudio':      return callOpenAICompat(provider, model, opts, 'lmstudio');
    case 'openrouter':    return callOpenAICompat(provider, model, opts, 'openrouter');
    case 'llamacpp':      return callLlamaCpp(provider, model, opts);
    default:              throw new Error(`provider-type-text-not-supported: ${provider.type}`);
  }
}

async function callGemini(provider: ProviderConfig, model: string, opts: GenerateOptions): Promise<string> {
  const key = provider.apiKey || process.env.GEMINI_API_KEY;
  if (!key) throw new Error('gemini-key-missing');
  const url = `${provider.baseUrl || 'https://generativelanguage.googleapis.com/v1beta'}/models/${model}:generateContent?key=${key}`;
  const body: any = {
    contents: [{ parts: [{ text: opts.prompt }] }],
    generationConfig: {
      maxOutputTokens: opts.maxTokens || 2048,
      temperature: opts.temperature ?? 0.7
    }
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000)
  });
  if (!r.ok) throw new Error(`gemini-http-${r.status}`);
  const j: any = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('gemini-empty-response');
  return text;
}

async function callOllama(provider: ProviderConfig, model: string, opts: GenerateOptions): Promise<string> {
  if (!provider.baseUrl) throw new Error('ollama-baseurl-missing');
  const url = `${provider.baseUrl.replace(/\/$/, '')}/api/generate`;
  const body = {
    model,
    prompt: opts.prompt,
    system: opts.system,
    stream: false,
    options: {
      temperature: opts.temperature ?? 0.7,
      num_predict: opts.maxTokens || 2048
    }
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000)
  });
  if (!r.ok) throw new Error(`ollama-http-${r.status}`);
  const j: any = await r.json();
  if (!j?.response) throw new Error('ollama-empty-response');
  return j.response;
}

/**
 * Ollama Cloud — endpoint OpenAI-compatible à `https://ollama.com/v1/chat/completions`
 * (et également API native via `https://ollama.com/api/chat` avec header Authorization).
 * Modèles cloud-only : `qwen3-coder:480b-cloud`, `gpt-oss:20b-cloud`, `gpt-oss:120b-cloud`,
 * `deepseek-v3.1:671b-cloud`, `kimi-k2:1t-cloud`.
 */
async function callOllamaCloud(provider: ProviderConfig, model: string, opts: GenerateOptions): Promise<string> {
  if (!provider.apiKey) throw new Error('ollama-cloud-key-missing');
  const base = (provider.baseUrl || 'https://ollama.com').replace(/\/$/, '');
  // On utilise l'endpoint OpenAI-compatible pour la simplicité
  const url = `${base}/v1/chat/completions`;
  const messages: any[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.prompt });
  const body = {
    model,  // ex: "qwen3-coder:480b-cloud"
    messages,
    max_tokens: opts.maxTokens || 2048,
    temperature: opts.temperature ?? 0.7,
    stream: false
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000)
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`ollama-cloud-http-${r.status}: ${t.slice(0, 200)}`);
  }
  const j: any = await r.json();
  const text = j?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('ollama-cloud-empty-response');
  return text;
}

async function callOpenAICompat(provider: ProviderConfig, model: string, opts: GenerateOptions, kind: string): Promise<string> {
  if (!provider.baseUrl) throw new Error(`${kind}-baseurl-missing`);
  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;
  const messages: any[] = [];
  if (opts.system) messages.push({ role: 'system', content: opts.system });
  messages.push({ role: 'user', content: opts.prompt });
  const body = {
    model,
    messages,
    max_tokens: opts.maxTokens || 2048,
    temperature: opts.temperature ?? 0.7,
    stream: false
  };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
  // OpenRouter required headers
  if (kind === 'openrouter') {
    headers['HTTP-Referer'] = 'https://gld.pixeeplay.com';
    headers['X-Title'] = 'parislgbt';
  }
  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000)
  });
  if (!r.ok) throw new Error(`${kind}-http-${r.status}`);
  const j: any = await r.json();
  const text = j?.choices?.[0]?.message?.content || '';
  if (!text) throw new Error(`${kind}-empty-response`);
  return text;
}

async function callLlamaCpp(provider: ProviderConfig, model: string, opts: GenerateOptions): Promise<string> {
  if (!provider.baseUrl) throw new Error('llamacpp-baseurl-missing');
  const url = `${provider.baseUrl.replace(/\/$/, '')}/completion`;
  const body = {
    prompt: opts.system ? `<|system|>${opts.system}<|user|>${opts.prompt}<|assistant|>` : opts.prompt,
    n_predict: opts.maxTokens || 2048,
    temperature: opts.temperature ?? 0.7,
    stop: ['<|user|>', '</s>']
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000)
  });
  if (!r.ok) throw new Error(`llamacpp-http-${r.status}`);
  const j: any = await r.json();
  return j?.content || '';
}

// ─────────────────────────────────────────────
// 7. Health-check d'un provider (pour /admin/ai-settings)
// ─────────────────────────────────────────────
export async function pingProvider(provider: ProviderConfig): Promise<{ ok: boolean; latencyMs?: number; error?: string; models?: string[] }> {
  const t0 = Date.now();
  try {
    if (provider.type === 'ollama' && provider.baseUrl) {
      const r = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/api/tags`, { signal: AbortSignal.timeout(5_000) });
      if (!r.ok) return { ok: false, error: `http-${r.status}` };
      const j: any = await r.json();
      return { ok: true, latencyMs: Date.now() - t0, models: (j?.models || []).map((m: any) => m.name) };
    }
    if (provider.type === 'ollama-cloud') {
      if (!provider.apiKey) return { ok: false, error: 'no-key' };
      const base = (provider.baseUrl || 'https://ollama.com').replace(/\/$/, '');
      // Liste les modèles disponibles via l'endpoint OpenAI-compatible
      const r = await fetch(`${base}/v1/models`, {
        headers: { Authorization: `Bearer ${provider.apiKey}` },
        signal: AbortSignal.timeout(5_000)
      });
      if (!r.ok) return { ok: false, error: `http-${r.status}`, latencyMs: Date.now() - t0 };
      const j: any = await r.json();
      return {
        ok: true,
        latencyMs: Date.now() - t0,
        models: (j?.data || j?.models || []).map((m: any) => m.id || m.name).slice(0, 50)
      };
    }
    if (provider.type === 'lmstudio' && provider.baseUrl) {
      const r = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/models`, {
        headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {},
        signal: AbortSignal.timeout(5_000)
      });
      if (!r.ok) return { ok: false, error: `http-${r.status}` };
      const j: any = await r.json();
      return { ok: true, latencyMs: Date.now() - t0, models: (j?.data || []).map((m: any) => m.id) };
    }
    if (provider.type === 'openrouter' && provider.apiKey) {
      const r = await fetch(`${provider.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${provider.apiKey}` },
        signal: AbortSignal.timeout(5_000)
      });
      if (!r.ok) return { ok: false, error: `http-${r.status}` };
      const j: any = await r.json();
      return { ok: true, latencyMs: Date.now() - t0, models: (j?.data || []).slice(0, 50).map((m: any) => m.id) };
    }
    if (provider.type === 'gemini') {
      const key = provider.apiKey || process.env.GEMINI_API_KEY;
      if (!key) return { ok: false, error: 'no-key' };
      const r = await fetch(`${provider.baseUrl}/models?key=${key}`, { signal: AbortSignal.timeout(5_000) });
      if (!r.ok) return { ok: false, error: `http-${r.status}` };
      const j: any = await r.json();
      return { ok: true, latencyMs: Date.now() - t0, models: (j?.models || []).slice(0, 30).map((m: any) => m.name?.replace('models/', '')) };
    }
    if (provider.type === 'llamacpp' && provider.baseUrl) {
      const r = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(5_000) });
      return { ok: r.ok, latencyMs: Date.now() - t0 };
    }
    return { ok: false, error: 'no-baseurl-or-key' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown', latencyMs: Date.now() - t0 };
  }
}
