import { platformDb } from '@pixeesite/database';
import { getOrgSecret, getPlatformSecret } from './secrets';

/**
 * Unified AI client that routes to the right provider based on OrgAiConfig.
 * Resolves API keys from OrgSecret (with platform fallback) automatically.
 *
 * Usage:
 *   const text = await aiText({ orgId, feature: 'text', prompt: 'Hello' });
 */

export interface AiCallOpts {
  orgId: string;
  feature: 'text' | 'image' | 'video' | 'audio' | 'embed' | 'moderation' | 'classification';
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  imageBase64?: string;
}

export interface AiResult {
  ok: boolean;
  output: string;
  provider: string;
  model: string;
  costCents?: number;
  promptTokens?: number;
  outputTokens?: number;
  error?: string;
}

async function getConfig(orgId: string, feature: string) {
  return platformDb.orgAiConfig.findUnique({
    where: { orgId_feature: { orgId, feature } },
  });
}

/** Track usage in AiUsage table for billing/monitoring. */
async function recordUsage(orgId: string, partial: Partial<AiResult> & { provider: string; model: string; operation: string }) {
  await platformDb.aiUsage.create({
    data: {
      orgId,
      provider: partial.provider,
      model: partial.model,
      operation: partial.operation,
      promptTokens: partial.promptTokens || 0,
      outputTokens: partial.outputTokens || 0,
      costCents: partial.costCents || 0,
      success: partial.ok ?? true,
      errorMessage: partial.error || null,
    },
  }).catch(() => {});
}

/**
 * Résout les alias de modèles Gemini "futurs" (3.x.x) vers les vrais noms exposés
 * par l'API v1beta de Google AI. Si un nom inconnu arrive, on fallback sur 2.5-flash.
 */
function resolveGeminiModel(name: string): string {
  // Aliases UI → vrais modèles Google AI
  const ALIASES: Record<string, string> = {
    'gemini-3.0-pro': 'gemini-2.5-pro',
    'gemini-3.0-flash': 'gemini-2.5-flash',
    'gemini-3.1-flash-lite': 'gemini-2.5-flash-lite',
    'gemini-3-flash-lite': 'gemini-2.5-flash-lite',
    'gemini-3-flash': 'gemini-2.5-flash',
    'gemini-3-pro': 'gemini-2.5-pro',
  };
  if (ALIASES[name]) return ALIASES[name];
  // Si déjà un vrai nom 2.x → on garde
  if (/^gemini-2\.[05]-(flash|pro|flash-lite|flash-exp)$/.test(name)) return name;
  if (/^gemini-1\.5-(flash|pro)$/.test(name)) return name;
  // Inconnu → fallback safe
  return 'gemini-2.5-flash';
}

export async function aiCall(opts: AiCallOpts): Promise<AiResult> {
  const cfg = await getConfig(opts.orgId, opts.feature);
  const provider = cfg?.provider || 'gemini';
  let model = cfg?.model || 'gemini-2.5-flash';
  if (provider === 'gemini') model = resolveGeminiModel(model);
  const temperature = opts.temperature ?? cfg?.temperature ?? 0.7;
  const maxTokens = opts.maxTokens ?? cfg?.maxTokens ?? 2048;
  const systemPrompt = opts.systemPrompt ?? cfg?.systemPrompt;
  const baseUrl = cfg?.baseUrl;

  try {
    let result: AiResult;
    switch (provider) {
      case 'gemini': result = await callGemini({ orgId: opts.orgId, model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      case 'openai': result = await callOpenAI({ orgId: opts.orgId, model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      case 'anthropic': result = await callAnthropic({ orgId: opts.orgId, model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      case 'openrouter': result = await callOpenRouter({ orgId: opts.orgId, model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      case 'groq': result = await callGroq({ orgId: opts.orgId, model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      case 'ollama': result = await callOpenAICompat({ provider: 'ollama', baseUrl: baseUrl || 'http://localhost:11434/v1', apiKey: 'ollama', model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      case 'lmstudio': result = await callOpenAICompat({ provider: 'lmstudio', baseUrl: baseUrl || 'http://localhost:1234/v1', apiKey: 'lm-studio', model, prompt: opts.prompt, systemPrompt, temperature, maxTokens }); break;
      default: result = { ok: false, output: '', provider, model, error: `Provider ${provider} non implémenté` };
    }
    await recordUsage(opts.orgId, { ...result, provider, model, operation: opts.feature });
    return result;
  } catch (e: any) {
    const fail: AiResult = { ok: false, output: '', provider, model, error: e.message || 'unknown' };
    await recordUsage(opts.orgId, { ...fail, provider, model, operation: opts.feature });
    return fail;
  }
}

// ── Provider implementations ──────────────────────────────────

async function callGemini({ orgId, model, prompt, systemPrompt, temperature, maxTokens }: any): Promise<AiResult> {
  const key = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!key) return { ok: false, output: '', provider: 'gemini', model, error: 'GEMINI_API_KEY non configurée' };
  // Chaîne de fallback : si le modèle demandé est 404 (not found), on retombe sur des modèles supportés
  const FALLBACK_CHAIN: Record<string, string[]> = {
    'gemini-2.5-pro':         ['gemini-2.5-pro', 'gemini-2.0-pro-exp', 'gemini-1.5-pro'],
    'gemini-2.5-flash':       ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'],
    'gemini-2.5-flash-lite':  ['gemini-2.5-flash-lite', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-8b'],
    'gemini-2.0-flash':       ['gemini-2.0-flash', 'gemini-1.5-flash'],
    'gemini-2.0-flash-lite':  ['gemini-2.0-flash-lite', 'gemini-1.5-flash-8b'],
    'gemini-1.5-pro':         ['gemini-1.5-pro'],
    'gemini-1.5-flash':       ['gemini-1.5-flash'],
  };
  const chain = FALLBACK_CHAIN[model] || [model, 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = '';
  for (const tryModel of chain) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${tryModel}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(systemPrompt && { systemInstruction: { parts: [{ text: systemPrompt }] } }),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });
    const j = await r.json();
    if (r.ok) {
      const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = j.usageMetadata || {};
      return {
        ok: true, output: text, provider: 'gemini', model: tryModel,
        promptTokens: usage.promptTokenCount, outputTokens: usage.candidatesTokenCount,
      };
    }
    lastError = j.error?.message || `HTTP ${r.status}`;
    // Si l'erreur n'est pas "not found", on arrête le fallback (clé invalide, quota, etc.)
    if (!/not found|not supported|404/i.test(lastError)) break;
  }
  return { ok: false, output: '', provider: 'gemini', model, error: lastError };
}

async function callOpenAI(args: any): Promise<AiResult> {
  const key = await getOrgSecret(args.orgId, 'OPENAI_API_KEY');
  if (!key) return { ok: false, output: '', provider: 'openai', model: args.model, error: 'OPENAI_API_KEY non configurée' };
  return callOpenAICompat({ ...args, provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: key });
}

async function callOpenRouter(args: any): Promise<AiResult> {
  const key = await getOrgSecret(args.orgId, 'OPENROUTER_API_KEY');
  if (!key) return { ok: false, output: '', provider: 'openrouter', model: args.model, error: 'OPENROUTER_API_KEY non configurée' };
  return callOpenAICompat({ ...args, provider: 'openrouter', baseUrl: 'https://openrouter.ai/api/v1', apiKey: key });
}

async function callGroq(args: any): Promise<AiResult> {
  const key = await getOrgSecret(args.orgId, 'GROQ_API_KEY');
  if (!key) return { ok: false, output: '', provider: 'groq', model: args.model, error: 'GROQ_API_KEY non configurée' };
  return callOpenAICompat({ ...args, provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: key });
}

async function callAnthropic({ orgId, model, prompt, systemPrompt, temperature, maxTokens }: any): Promise<AiResult> {
  const key = await getOrgSecret(orgId, 'ANTHROPIC_API_KEY');
  if (!key) return { ok: false, output: '', provider: 'anthropic', model, error: 'ANTHROPIC_API_KEY non configurée' };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model, max_tokens: maxTokens, temperature,
      ...(systemPrompt && { system: systemPrompt }),
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const j = await r.json();
  if (!r.ok) return { ok: false, output: '', provider: 'anthropic', model, error: j.error?.message };
  const text = j.content?.[0]?.text || '';
  return {
    ok: true, output: text, provider: 'anthropic', model,
    promptTokens: j.usage?.input_tokens, outputTokens: j.usage?.output_tokens,
  };
}

/** OpenAI-compatible API (works with OpenAI, OpenRouter, Groq, Ollama, LM Studio). */
async function callOpenAICompat({ provider, baseUrl, apiKey, model, prompt, systemPrompt, temperature, maxTokens }: any): Promise<AiResult> {
  const messages: any[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const r = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
  });
  const j = await r.json();
  if (!r.ok) return { ok: false, output: '', provider, model, error: j.error?.message || JSON.stringify(j).slice(0, 200) };
  return {
    ok: true,
    output: j.choices?.[0]?.message?.content || '',
    provider, model,
    promptTokens: j.usage?.prompt_tokens,
    outputTokens: j.usage?.completion_tokens,
  };
}

/** Convenience helpers. */
export async function aiText(orgId: string, prompt: string, opts?: Partial<AiCallOpts>) {
  return aiCall({ orgId, feature: 'text', prompt, ...opts });
}

export async function aiClassify(orgId: string, prompt: string, opts?: Partial<AiCallOpts>) {
  return aiCall({ orgId, feature: 'classification', prompt, ...opts });
}

export async function aiModerate(orgId: string, prompt: string, opts?: Partial<AiCallOpts>) {
  return aiCall({ orgId, feature: 'moderation', prompt, ...opts });
}
