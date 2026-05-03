import { getSettings } from './settings';

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
};

export type CreateSessionTokenResult = {
  session_id: string;
  session_token: string;
};

export async function createSessionToken(opts: SessionTokenLite): Promise<CreateSessionTokenResult> {
  return callLA<CreateSessionTokenResult>('/v1/sessions/token', {
    method: 'POST',
    auth: 'apiKey',
    body: JSON.stringify({
      mode: 'LITE',
      avatar_id: opts.avatar_id,
      max_session_duration: opts.max_session_duration ?? 120, // 2 min par défaut
      is_sandbox: !!opts.is_sandbox
    })
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

export async function stopSession(sessionToken: string, sessionId: string, reason: string = 'USER_END'): Promise<void> {
  await callLA('/v1/sessions/stop', {
    method: 'POST',
    auth: 'bearer',
    bearer: sessionToken,
    body: JSON.stringify({ session_id: sessionId, reason })
  });
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

export async function getCredits(): Promise<{ credits_left: string }> {
  return callLA('/v1/users/credits', { method: 'GET', auth: 'apiKey' });
}

// =================== Helper combiné pour le widget ===================

/**
 * Démarre une session complète (token + start) en un appel.
 * Renvoie tout ce dont le browser a besoin pour rejoindre la room LiveKit.
 */
export async function bootstrapSession(opts: SessionTokenLite): Promise<{
  session_id: string;
  session_token: string;
  livekit_url: string;
  livekit_client_token: string;
  max_session_duration: number;
}> {
  const tok = await createSessionToken(opts);
  const start = await startSession(tok.session_token);
  return {
    session_id: tok.session_id,
    session_token: tok.session_token,
    livekit_url: start.livekit_url,
    livekit_client_token: start.livekit_client_token,
    max_session_duration: start.max_session_duration || opts.max_session_duration || 120
  };
}
