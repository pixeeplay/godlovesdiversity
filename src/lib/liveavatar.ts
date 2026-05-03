import { getSettings, setSetting } from './settings';
import { prisma } from './prisma';

/**
 * Wrapper LiveAvatar API (https://api.liveavatar.com)
 *
 * LiveAvatar = succession de HeyGen Interactive Streaming (sunset le 3 mai 2026).
 * API REST + transport WebRTC via LiveKit.
 *
 * Flow Lite Mode :
 *  1. createSessionToken() → { session_id, session_token }
 *  2. startSession(session_token) → { livekit_url, livekit_client_token }
 *  3. browser se connecte à la room LiveKit, reçoit le flux vidéo + audio de l'avatar
 *  4. keepAlive toutes les 60 s
 *  5. stopSession à la fin
 */

const BASE = 'https://api.liveavatar.com';

async function getApiKey(): Promise<string | null> {
  const cfg = await getSettings(['integrations.liveavatar.apiKey']).catch(() => ({} as Record<string, string>));
  return cfg['integrations.liveavatar.apiKey'] || process.env.LIVEAVATAR_API_KEY || null;
}

type LiveAvatarResponse<T> = { code: number; message?: string; data: T | null };

async function callLA<T>(path: string, init: RequestInit & { auth: 'apiKey' | 'bearer'; bearer?: string }): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined)
  };

  if (init.auth === 'apiKey') {
    const key = await getApiKey();
    if (!key) throw new Error('LiveAvatar API key not configured. Add it in /admin/settings → integrations.liveavatar.apiKey');
    headers['X-API-Key'] = key;
  } else {
    if (!init.bearer) throw new Error('Bearer token required');
    headers['Authorization'] = `Bearer ${init.bearer}`;
  }

  const r = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await r.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }

  if (!r.ok) {
    const msg = body?.message || body?.detail || body?.raw || `HTTP ${r.status}`;
    throw new Error(`LiveAvatar ${path}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
  }

  // Réponses LiveAvatar viennent dans { code, message, data }
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data as T;
  }
  return body as T;
}

// =================== Sessions ===================

export type SessionTokenLite = {
  avatar_id: string;
  max_session_duration?: number; // seconds
  is_sandbox?: boolean;
  gemini_realtime_config?: {
    secret_id: string;
    context_id?: string;
    voice?: string;
    temperature?: number;
    model?: string;
  };
  elevenlabs_agent_config?: {
    secret_id: string;
    agent_id: string;
  };
};

export type CreateSessionTokenResult = {
  session_id: string;
  session_token: string;
};

export async function createSessionToken(opts: SessionTokenLite): Promise<CreateSessionTokenResult> {
  const body: Record<string, unknown> = {
    mode: 'LITE',
    avatar_id: opts.avatar_id,
    max_session_duration: opts.max_session_duration ?? 120, // 2 min par défaut
    is_sandbox: !!opts.is_sandbox
  };
  if (opts.gemini_realtime_config) body.gemini_realtime_config = opts.gemini_realtime_config;
  if (opts.elevenlabs_agent_config) body.elevenlabs_agent_config = opts.elevenlabs_agent_config;
  return callLA<CreateSessionTokenResult>('/v1/sessions/token', {
    method: 'POST',
    auth: 'apiKey',
    body: JSON.stringify(body)
  });
}

export type StartSessionResult = {
  session_id: string;
  livekit_url: string;
  livekit_client_token: string;
  livekit_agent_token?: string;
  max_session_duration?: number;
  ws_url?: string;
};

export async function startSession(sessionToken: string): Promise<StartSessionResult> {
  return callLA<StartSessionResult>('/v1/sessions/start', {
    method: 'POST',
    auth: 'bearer',
    bearer: sessionToken
  });
}

export async function stopSession(sessionToken: string, sessionId: string, reason: string = 'USER_DISCONNECTED'): Promise<void> {
  await callLA('/v1/sessions/stop', {
    method: 'POST',
    auth: 'bearer',
    bearer: sessionToken,
    body: JSON.stringify({ session_id: sessionId, reason })
  });
}

/** Variante : ferme une session via la clé API (pas besoin du session_token). */
export async function stopSessionByApiKey(sessionId: string, reason: string = 'ZOMBIE_SESSION_REAP'): Promise<void> {
  await callLA('/v1/sessions/stop', {
    method: 'POST',
    auth: 'apiKey',
    body: JSON.stringify({ session_id: sessionId, reason })
  });
}

export type ActiveSession = { id: string; created_at: string; duration: number };

export async function listActiveSessions(): Promise<{ count: number; results: ActiveSession[] }> {
  return callLA('/v1/sessions?type=active&page_size=20', { method: 'GET', auth: 'apiKey' });
}

/**
 * Sur le free tier (max 1 concurrency), on doit fermer toute session précédente
 * avant d'en démarrer une nouvelle. Sinon /v1/sessions/start renvoie
 * « Session concurrency limit reached ».
 */
export async function reapActiveSessions(): Promise<number> {
  try {
    const { results } = await listActiveSessions();
    if (!results || results.length === 0) return 0;
    let killed = 0;
    for (const s of results) {
      try {
        await stopSessionByApiKey(s.id, 'ZOMBIE_SESSION_REAP');
        killed++;
      } catch { /* ignore et continue */ }
    }
    return killed;
  } catch {
    return 0;
  }
}

export async function keepSessionAlive(sessionToken: string, sessionId: string): Promise<void> {
  await callLA('/v1/sessions/keep-alive', {
    method: 'POST',
    auth: 'bearer',
    bearer: sessionToken,
    body: JSON.stringify({ session_id: sessionId })
  });
}

// =================== Avatars / Voices / Credits ===================

export type Avatar = {
  id: string;
  name: string;
  preview_url?: string;
  default_voice?: { voice_id: string; voice_name?: string } | null;
};

export async function listPublicAvatars(limit: number = 50): Promise<{ count: number; results: Avatar[] }> {
  return callLA(`/v1/avatars/public?limit=${limit}`, { method: 'GET', auth: 'apiKey' });
}

export type Voice = {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string;
  tags?: string[];
};

export async function listVoices(limit: number = 100): Promise<{ count: number; results: Voice[] }> {
  return callLA(`/v1/voices?limit=${limit}`, { method: 'GET', auth: 'apiKey' });
}

export type Language = { language: string; code: string };

export async function listLanguages(): Promise<Language[]> {
  // /v1/languages renvoie un array direct (pas paginé) dans data
  const res = await callLA<Language[] | { results: Language[] }>('/v1/languages', { method: 'GET', auth: 'apiKey' });
  if (Array.isArray(res)) return res;
  return res.results || [];
}

/** Voix Gemini Realtime supportées par LiveAvatar (8 voix) */
export const GEMINI_VOICES: { id: string; label: string; description: string }[] = [
  { id: 'Puck', label: 'Puck', description: 'Chaleureuse, jeune, mixte' },
  { id: 'Aoede', label: 'Aoede', description: 'Douce, féminine, posée' },
  { id: 'Charon', label: 'Charon', description: 'Profonde, masculine, calme' },
  { id: 'Fenrir', label: 'Fenrir', description: 'Énergique, masculine' },
  { id: 'Kore', label: 'Kore', description: 'Claire, féminine, neutre' },
  { id: 'Leda', label: 'Leda', description: 'Sereine, féminine' },
  { id: 'Orus', label: 'Orus', description: 'Posée, masculine' },
  { id: 'Zephyr', label: 'Zephyr', description: 'Aérienne, mixte' }
];

export async function getCredits(): Promise<{ credits_left: string }> {
  return callLA('/v1/users/credits', { method: 'GET', auth: 'apiKey' });
}

// =================== Secrets ===================

export type SecretType = 'OPENAI_API_KEY' | 'ELEVENLABS_API_KEY' | 'GEMINI_API_KEY';

export async function createSecret(name: string, value: string, type: SecretType): Promise<{ id: string; name: string }> {
  return callLA('/v1/secrets', {
    method: 'POST',
    auth: 'apiKey',
    body: JSON.stringify({ secret_name: name, secret_value: value, secret_type: type })
  });
}

export async function listSecrets(): Promise<{ count: number; results: Array<{ id: string; name: string; type: string }> }> {
  return callLA('/v1/secrets', { method: 'GET', auth: 'apiKey' });
}

// =================== Contexts ===================

export async function createContext(name: string, prompt: string, openingText: string): Promise<{ id: string; name: string }> {
  return callLA('/v1/contexts', {
    method: 'POST',
    auth: 'apiKey',
    body: JSON.stringify({ name, prompt, opening_text: openingText })
  });
}

export async function updateContext(contextId: string, name: string, prompt: string, openingText: string): Promise<{ id: string; name: string }> {
  return callLA(`/v1/contexts/${contextId}`, {
    method: 'PUT',
    auth: 'apiKey',
    body: JSON.stringify({ name, prompt, opening_text: openingText })
  });
}

export async function listContexts(): Promise<{ count: number; results: Array<{ id: string; name: string; created_at?: string }> }> {
  return callLA('/v1/contexts', { method: 'GET', auth: 'apiKey' });
}

/**
 * Construit le prompt complet GLD à partir du systemPrompt + corpus RAG.
 * Inclut autant de docs/chunks que possible sous une limite raisonnable de tokens.
 */
export async function buildGldContextPrompt(maxChars: number = 24000): Promise<{ prompt: string; opening: string; docCount: number; chunksUsed: number }> {
  const cfg = await getSettings(['rag.systemPrompt']).catch(() => ({} as Record<string, string>));
  const sysPrompt = cfg['rag.systemPrompt'] || `Tu es l'assistant officiel du mouvement « God Loves Diversity » (GLD).
Réponds avec chaleur et accueil, en tutoyant. Tu parles de foi, d'inclusion, et d'amour radical.
Réponses courtes (3-5 phrases max) et termine par une question d'ouverture.`;

  // Récupère les docs activés en français — dans l'ordre alphabétique du titre
  let docs: Array<{ id: string; title: string; source: string | null; tags: string[]; content: string }> = [];
  try {
    docs = await prisma.knowledgeDoc.findMany({
      where: { enabled: true, locale: 'fr' },
      select: { id: true, title: true, source: true, tags: true, content: true },
      orderBy: { title: 'asc' }
    });
  } catch (e) {
    console.warn('[LiveAvatar] DB query for KnowledgeDoc failed:', e);
  }

  let knowledgeBlock = '';
  let usedDocs = 0;
  for (const d of docs) {
    const block = `\n\n## ${d.title}\n${d.tags?.length ? `Tags : ${d.tags.join(', ')}\n` : ''}${d.source ? `Source : ${d.source}\n` : ''}\n${d.content.trim()}`;
    if ((sysPrompt.length + knowledgeBlock.length + block.length) > maxChars) break;
    knowledgeBlock += block;
    usedDocs++;
  }

  const fullPrompt = `${sysPrompt}\n\n# BASE DE CONNAISSANCES GLD\nVoici les textes officiels du mouvement. Utilise-les en priorité pour répondre. Cite la source quand pertinent.\n${knowledgeBlock || '\n(aucun document encore disponible)'}`;
  const opening = 'Bonjour ! Je suis GLD, l\'assistant du mouvement. Pose-moi une question sur la foi, l\'inclusion et l\'amour radical.';

  return { prompt: fullPrompt.slice(0, maxChars), opening, docCount: docs.length, chunksUsed: usedDocs };
}

// =================== Auto-provisioning ===================

/**
 * Garantit qu'un secret Gemini existe côté LiveAvatar et un context system prompt aussi.
 * Stocke les IDs dans nos settings pour éviter de recréer à chaque session.
 *
 * Renvoie { secretId, contextId } prêts à passer à gemini_realtime_config.
 */
export async function ensureGeminiVoiceAgent(): Promise<{ secretId: string | null; contextId: string | null; reason?: string }> {
  const cfg = await getSettings([
    'avatar.liveavatar.geminiSecretId',
    'avatar.liveavatar.contextId',
    'integrations.gemini.apiKey',
    'rag.systemPrompt'
  ]);

  let secretId = cfg['avatar.liveavatar.geminiSecretId'] || null;
  let contextId = cfg['avatar.liveavatar.contextId'] || null;

  // 1. Provisionner le secret Gemini si nécessaire
  if (!secretId) {
    const geminiKey = cfg['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return { secretId: null, contextId: null, reason: 'Pas de clé Gemini configurée. Va dans Paramètres → IA & Outils → Gemini.' };
    }
    try {
      const secret = await createSecret(`GLD-Gemini-${Date.now()}`, geminiKey, 'GEMINI_API_KEY');
      secretId = secret.id;
      await setSetting('avatar.liveavatar.geminiSecretId', secretId);
    } catch (e: any) {
      return { secretId: null, contextId: null, reason: `Création secret Gemini : ${e?.message || 'erreur'}` };
    }
  }

  // 2. Provisionner le context (system prompt + corpus RAG) si nécessaire
  if (!contextId) {
    try {
      const built = await buildGldContextPrompt();
      const ctx = await createContext('GLD - Brain (RAG synced)', built.prompt, built.opening);
      contextId = ctx.id;
      await setSetting('avatar.liveavatar.contextId', contextId);
    } catch (e: any) {
      // Le context peut être optionnel — on continue avec juste le secret
      console.warn('[LiveAvatar] Context creation failed:', e?.message);
    }
  }

  return { secretId, contextId };
}

/**
 * Synchronise le context LiveAvatar avec le corpus RAG actuel.
 * À appeler après ajout/modif/suppression de KnowledgeDoc, ou via un bouton admin.
 * Si pas de context_id, en crée un nouveau et le sauvegarde dans settings.
 */
export async function syncContextWithRag(): Promise<{ ok: boolean; contextId: string; docsIncluded: number; chars: number; reason?: string }> {
  const cfg = await getSettings(['avatar.liveavatar.contextId']);
  let contextId = cfg['avatar.liveavatar.contextId'] || null;

  const built = await buildGldContextPrompt();

  try {
    if (contextId) {
      await updateContext(contextId, 'GLD - Brain (RAG synced)', built.prompt, built.opening);
    } else {
      const ctx = await createContext('GLD - Brain (RAG synced)', built.prompt, built.opening);
      contextId = ctx.id;
      await setSetting('avatar.liveavatar.contextId', contextId);
    }
    return { ok: true, contextId, docsIncluded: built.chunksUsed, chars: built.prompt.length };
  } catch (e: any) {
    return { ok: false, contextId: contextId || '', docsIncluded: 0, chars: 0, reason: e?.message || 'erreur' };
  }
}

// =================== Helper combiné pour le widget ===================

/**
 * Démarre une session complète (token + start) en un appel.
 * Renvoie tout ce dont le browser a besoin pour rejoindre la room LiveKit.
 *
 * Si on tombe sur « concurrency limit reached » (free tier = 1 session max),
 * on ferme automatiquement les sessions actives existantes et on retente.
 */
export async function bootstrapSession(opts: SessionTokenLite): Promise<{
  session_id: string;
  session_token: string;
  livekit_url: string;
  livekit_client_token: string;
  max_session_duration: number;
  reaped?: number;
}> {
  let reaped = 0;
  const attempt = async () => {
    const tok = await createSessionToken(opts);
    const start = await startSession(tok.session_token);
    return { tok, start };
  };

  let result;
  try {
    result = await attempt();
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (/concurrency limit/i.test(msg)) {
      reaped = await reapActiveSessions();
      // petite pause pour laisser le serveur enregistrer la fermeture
      await new Promise((r) => setTimeout(r, 800));
      result = await attempt();
    } else {
      throw e;
    }
  }

  return {
    session_id: result.tok.session_id,
    session_token: result.tok.session_token,
    livekit_url: result.start.livekit_url,
    livekit_client_token: result.start.livekit_client_token,
    max_session_duration: result.start.max_session_duration || opts.max_session_duration || 120,
    reaped: reaped || undefined
  };
}
