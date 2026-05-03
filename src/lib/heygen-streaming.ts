/**
 * ⚠️ DÉPRÉCIÉ — HeyGen Interactive Avatar (Streaming) endpoint sunset
 *
 * Le 3 mai 2026, HeyGen a sunset ses endpoints /v1/streaming.* et a séparé
 * le streaming en un produit distinct appelé « LiveAvatar » sur liveavatar.com,
 * avec sa propre API key et son propre billing.
 *
 * Ce module reste pour compatibilité mais renvoie systématiquement une erreur
 * explicative. Pour réactiver le streaming :
 *   1. Créer un compte sur liveavatar.com
 *   2. Récupérer la nouvelle API key
 *   3. Refaire l'intégration avec leur SDK
 *
 * Alternative gratuite codée dans /api/avatar/local-live/* + AskGldAvatarLocal
 * (avatar SVG + ElevenLabs + Web Speech).
 */
import { getSettings } from './settings';

const BASE = 'https://api.heygen.com';

async function getKey(): Promise<string> {
  const s = await getSettings(['integrations.heygen.apiKey']);
  const k = s['integrations.heygen.apiKey'] || process.env.HEYGEN_API_KEY;
  if (!k) throw new Error('Clé HeyGen non configurée');
  return k;
}

async function call(path: string, body?: any) {
  const key = await getKey();
  const init: RequestInit = {
    method: body ? 'POST' : 'GET',
    headers: { 'X-Api-Key': key, 'Content-Type': 'application/json', Accept: 'application/json' }
  };
  if (body) init.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, init);
  const text = await r.text();
  let j: any;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok) {
    const msg = j?.error?.message || j?.message || j?.detail || `HTTP ${r.status}`;
    const isQuota = /quota|insufficient|credits|free tier|upgrade|subscription/i.test(msg);
    throw new Error(isQuota
      ? `HeyGen : ${msg}. Le streaming nécessite un plan Creator+ (24 €/mois) ou des crédits Pay-as-you-go. Vérifie sur app.heygen.com/billing`
      : `HeyGen : ${msg}`);
  }
  return j;
}

/* ─── SESSION TOKEN (1 fois par session) ─────────────────── */

export type SessionToken = { token: string };

export async function createStreamingToken(): Promise<SessionToken> {
  const j = await call('/v1/streaming.create_token', {});
  const token = j?.data?.token || j?.token;
  if (!token) throw new Error('HeyGen : pas de token retourné');
  return { token };
}

/* ─── NOUVELLE SESSION ───────────────────────────────────── */

export type NewSessionInput = {
  avatarName: string;        // ID de l'avatar (ex: "Susan_public_2_20240328")
  voiceId?: string;          // Optionnel, sinon voix par défaut de l'avatar
  quality?: 'low' | 'medium' | 'high';
  bgColor?: string;
  language?: string;
};

export type SessionInfo = {
  session_id: string;
  url: string;               // URL LiveKit pour se connecter
  access_token: string;      // JWT LiveKit pour le client
  realtime_endpoint?: string;
};

export async function newStreamingSession(input: NewSessionInput): Promise<SessionInfo> {
  // L'endpoint a été sunset par HeyGen le 3 mai 2026.
  throw new Error(
    'HeyGen streaming sunset. Migration LiveAvatar requise (nouveau compte sur liveavatar.com). ' +
    'En attendant, utilise le mode Live local (gratuit) basé sur ElevenLabs + avatar SVG.'
  );
  const body = {
    quality: input.quality || 'medium',
    avatar_name: input.avatarName,
    voice: input.voiceId ? { voice_id: input.voiceId } : undefined,
    version: 'v2',
    video_encoding: 'H264'
  };
  const j = await call('/v1/streaming.new', body);
  const d = j?.data || j;
  if (!d?.session_id) throw new Error('HeyGen : session_id manquant dans la réponse');
  return {
    session_id: d.session_id,
    url: d.url || d.livekit_url,
    access_token: d.access_token || d.livekit_token,
    realtime_endpoint: d.realtime_endpoint
  };
}

/* ─── DÉMARRAGE ──────────────────────────────────────────── */

export async function startStreamingSession(sessionId: string): Promise<void> {
  await call('/v1/streaming.start', { session_id: sessionId });
}

/* ─── ENVOI TEXTE (l'avatar le prononce) ─────────────────── */

export async function sendStreamingTask(sessionId: string, text: string, taskType: 'talk' | 'repeat' = 'repeat'): Promise<void> {
  await call('/v1/streaming.task', {
    session_id: sessionId,
    text,
    task_type: taskType,
    task_mode: 'sync'
  });
}

/* ─── ARRÊT (à appeler systématiquement) ─────────────────── */

export async function stopStreamingSession(sessionId: string): Promise<void> {
  try {
    await call('/v1/streaming.stop', { session_id: sessionId });
  } catch {
    // On ne re-throw pas : si la session est déjà finie côté HeyGen, c'est OK
  }
}

/* ─── INTERRUPTION (couper l'avatar en plein milieu) ──── */

export async function interruptStreamingSession(sessionId: string): Promise<void> {
  try {
    await call('/v1/streaming.interrupt', { session_id: sessionId });
  } catch {
    // Best-effort, certains comptes n'ont pas l'API interrupt
  }
}

/* ─── LISTE DES AVATARS STREAMING-COMPATIBLES ────────── */

export type StreamingAvatar = {
  avatar_id: string;
  name: string;
  preview_image: string;
  preview_video?: string;
  gender?: string;
  status?: string;
};

export async function listStreamingAvatars(): Promise<StreamingAvatar[]> {
  try {
    const j = await call('/v1/streaming/avatar.list');
    const arr = j?.data?.avatars || j?.avatars || j?.data || [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
