import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/orgs/[slug]/ai-providers
 *   - list providers configured for the org (12+ types) + per-feature mappings (= OrgAiConfig).
 *   - ?ping=PROVIDER_ID → health-check a single provider (latency + list of models).
 *
 * POST /api/orgs/[slug]/ai-providers
 *   - body: { providers: [...], mappings: {feature: {provider, model, ...}} } → upsert OrgAiConfig.
 *     "providers" is informative — the actual API keys live in OrgSecret (not edited here).
 */

const PROVIDER_DEFS = [
  { id: 'gemini',        label: 'Google Gemini',        type: 'gemini',        keyName: 'GEMINI_API_KEY' },
  { id: 'openai',        label: 'OpenAI',                type: 'openai',        keyName: 'OPENAI_API_KEY' },
  { id: 'anthropic',     label: 'Anthropic Claude',      type: 'anthropic',     keyName: 'ANTHROPIC_API_KEY' },
  { id: 'openrouter',    label: 'OpenRouter',            type: 'openrouter',    keyName: 'OPENROUTER_API_KEY' },
  { id: 'groq',          label: 'Groq (rapide)',         type: 'groq',          keyName: 'GROQ_API_KEY' },
  { id: 'mistral',       label: 'Mistral',               type: 'mistral',       keyName: 'MISTRAL_API_KEY' },
  { id: 'ollama',        label: 'Ollama (local)',        type: 'ollama',        keyName: null },
  { id: 'ollama-cloud',  label: 'Ollama Cloud',          type: 'ollama-cloud',  keyName: 'OLLAMA_CLOUD_API_KEY' },
  { id: 'lmstudio',      label: 'LM Studio (local)',     type: 'lmstudio',      keyName: null },
  { id: 'fal',           label: 'fal.ai (image/vidéo)',  type: 'fal',           keyName: 'FAL_API_KEY' },
  { id: 'elevenlabs',    label: 'ElevenLabs (audio)',    type: 'elevenlabs',    keyName: 'ELEVENLABS_API_KEY' },
  { id: 'heygen',        label: 'HeyGen (avatars)',      type: 'heygen',        keyName: 'HEYGEN_API_KEY' },
  { id: 'imagen',        label: 'Google Imagen',         type: 'imagen',        keyName: 'IMAGEN_API_KEY' },
];

async function pingProvider(orgId: string, providerId: string, baseUrl?: string | null): Promise<{ ok: boolean; latencyMs?: number; models?: string[]; error?: string }> {
  const def = PROVIDER_DEFS.find((p) => p.id === providerId);
  if (!def) return { ok: false, error: 'provider-not-found' };
  const apiKey = def.keyName ? await getOrgSecret(orgId, def.keyName) : null;
  const start = Date.now();

  try {
    switch (def.type) {
      case 'gemini': {
        if (!apiKey) return { ok: false, error: 'GEMINI_API_KEY non configurée' };
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error?.message || `HTTP ${r.status}` };
        const models = (j.models || []).map((m: any) => (m.name || '').replace('models/', '')).filter(Boolean);
        return { ok: true, latencyMs: Date.now() - start, models };
      }
      case 'openai': {
        if (!apiKey) return { ok: false, error: 'OPENAI_API_KEY non configurée' };
        const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error?.message || `HTTP ${r.status}` };
        return { ok: true, latencyMs: Date.now() - start, models: (j.data || []).map((m: any) => m.id).slice(0, 50) };
      }
      case 'anthropic': {
        if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY non configurée' };
        // Anthropic doesn't expose /models on legacy auth — use minimal /messages echo
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
        });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error?.message || `HTTP ${r.status}` };
        return { ok: true, latencyMs: Date.now() - start, models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5', 'claude-3.5-sonnet', 'claude-3-haiku-20240307'] };
      }
      case 'openrouter': {
        if (!apiKey) return { ok: false, error: 'OPENROUTER_API_KEY non configurée' };
        const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error?.message || `HTTP ${r.status}` };
        return { ok: true, latencyMs: Date.now() - start, models: (j.data || []).map((m: any) => m.id).slice(0, 60) };
      }
      case 'groq': {
        if (!apiKey) return { ok: false, error: 'GROQ_API_KEY non configurée' };
        const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.error?.message || `HTTP ${r.status}` };
        return { ok: true, latencyMs: Date.now() - start, models: (j.data || []).map((m: any) => m.id) };
      }
      case 'mistral': {
        if (!apiKey) return { ok: false, error: 'MISTRAL_API_KEY non configurée' };
        const r = await fetch('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${apiKey}` } });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.message || `HTTP ${r.status}` };
        return { ok: true, latencyMs: Date.now() - start, models: (j.data || []).map((m: any) => m.id) };
      }
      case 'ollama':
      case 'lmstudio': {
        const url = baseUrl || (def.type === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234/v1');
        const endpoint = def.type === 'ollama' ? `${url.replace(/\/$/, '')}/api/tags` : `${url.replace(/\/$/, '')}/models`;
        const r = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
        const j = await r.json();
        const models = def.type === 'ollama'
          ? (j.models || []).map((m: any) => m.name)
          : (j.data || []).map((m: any) => m.id);
        return { ok: true, latencyMs: Date.now() - start, models };
      }
      case 'ollama-cloud': {
        if (!apiKey) return { ok: false, error: 'OLLAMA_CLOUD_API_KEY non configurée' };
        const url = baseUrl || 'https://ollama.com';
        const r = await fetch(`${url}/api/tags`, { headers: { Authorization: `Bearer ${apiKey}` } });
        if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
        const j = await r.json();
        return { ok: true, latencyMs: Date.now() - start, models: (j.models || []).map((m: any) => m.name) };
      }
      case 'fal': {
        if (!apiKey) return { ok: false, error: 'FAL_API_KEY non configurée' };
        return { ok: true, latencyMs: Date.now() - start, models: ['fal-ai/flux/dev', 'fal-ai/flux/schnell', 'fal-ai/flux-pro', 'fal-ai/seedance-2', 'fal-ai/veo-3'] };
      }
      case 'elevenlabs': {
        if (!apiKey) return { ok: false, error: 'ELEVENLABS_API_KEY non configurée' };
        const r = await fetch('https://api.elevenlabs.io/v1/models', { headers: { 'xi-api-key': apiKey } });
        const j = await r.json();
        if (!r.ok) return { ok: false, error: j.detail?.message || `HTTP ${r.status}` };
        return { ok: true, latencyMs: Date.now() - start, models: (j || []).map((m: any) => m.model_id) };
      }
      case 'heygen': {
        if (!apiKey) return { ok: false, error: 'HEYGEN_API_KEY non configurée' };
        return { ok: true, latencyMs: Date.now() - start, models: ['heygen-v5'] };
      }
      case 'imagen': {
        if (!apiKey) return { ok: false, error: 'IMAGEN_API_KEY non configurée' };
        return { ok: true, latencyMs: Date.now() - start, models: ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'] };
      }
      default:
        return { ok: false, error: `provider-type ${def.type} non implémenté` };
    }
  } catch (e: any) {
    return { ok: false, error: e.message || 'fetch-failed' };
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const url = new URL(req.url);
  const pingId = url.searchParams.get('ping');

  if (pingId) {
    // baseUrl from OrgAiConfig for ollama/lmstudio
    const anyCfg = await platformDb.orgAiConfig.findFirst({ where: { orgId, provider: pingId } });
    const res = await pingProvider(orgId, pingId, anyCfg?.baseUrl || null);
    return NextResponse.json(res);
  }

  const configs = await platformDb.orgAiConfig.findMany({ where: { orgId }, orderBy: { feature: 'asc' } });

  // Build provider config list: for each known provider, check if key is set
  const providers = await Promise.all(PROVIDER_DEFS.map(async (def) => {
    const hasKey = def.keyName ? !!(await getOrgSecret(orgId, def.keyName)) : true;
    const cfg = configs.find((c) => c.provider === def.id);
    return {
      id: def.id,
      label: def.label,
      type: def.type,
      enabled: hasKey,
      baseUrl: cfg?.baseUrl || '',
      apiKeyConfigured: hasKey,
      keyName: def.keyName,
    };
  }));

  // mappings: feature → { primary: { providerId, model }, fallback: [] }
  const mappings: Record<string, any> = {};
  for (const c of configs) {
    mappings[c.feature] = {
      taskKey: c.feature,
      primary: { providerId: c.provider, model: c.model },
      fallback: [],
      temperature: c.temperature,
      maxTokens: c.maxTokens,
      systemPrompt: c.systemPrompt,
      baseUrl: c.baseUrl,
    };
  }

  return NextResponse.json({ providers, mappings });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const b = await req.json().catch(() => ({}));

  // Upsert mappings (one OrgAiConfig per feature)
  if (b.mappings && typeof b.mappings === 'object') {
    for (const [feature, m] of Object.entries(b.mappings as Record<string, any>)) {
      if (!m?.primary?.providerId || !m?.primary?.model) continue;
      await platformDb.orgAiConfig.upsert({
        where: { orgId_feature: { orgId, feature } },
        create: {
          orgId,
          feature,
          provider: m.primary.providerId,
          model: m.primary.model,
          temperature: m.temperature ?? 0.7,
          maxTokens: m.maxTokens ?? 2048,
          systemPrompt: m.systemPrompt || null,
          baseUrl: m.baseUrl || null,
        },
        update: {
          provider: m.primary.providerId,
          model: m.primary.model,
          temperature: m.temperature,
          maxTokens: m.maxTokens,
          systemPrompt: m.systemPrompt,
          baseUrl: m.baseUrl,
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
