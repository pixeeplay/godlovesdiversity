/**
 * Client HeyGen — génération de vidéos d'avatar parlant.
 *
 * Doc API : https://docs.heygen.com/reference/
 *
 * Workflow type :
 *   1. listAvatars()  → choisir un avatar_id
 *   2. listVoices()   → choisir un voice_id
 *   3. generateVideo({ text, avatarId, voiceId }) → video_id (async)
 *   4. pollStatus(video_id) → 'completed' avec video_url, ou 'pending'/'processing'
 *
 * Settings :
 *   integrations.heygen.apiKey  → clé API obtenue sur app.heygen.com → Settings → API
 *   avatar.heygen.avatarId      → ID de l'avatar choisi
 *   avatar.heygen.voiceId       → ID de la voix choisie
 *   avatar.heygen.bgColor       → couleur de fond (hex, défaut #FBEAF0 rose pâle GLD)
 *   avatar.dailyCapPerVisitor   → nombre max de vidéos / visiteur / jour (défaut 3)
 *   avatar.enabled              → '1' pour afficher le widget public
 */
import { getSettings } from './settings';

const BASE = 'https://api.heygen.com';

async function getKey(): Promise<string> {
  const s = await getSettings(['integrations.heygen.apiKey']);
  const k = s['integrations.heygen.apiKey'] || process.env.HEYGEN_API_KEY;
  if (!k) throw new Error('Clé API HeyGen non configurée (Paramètres → IA & Outils)');
  return k;
}

async function heygenFetch(path: string, init: RequestInit = {}, version: 'v1' | 'v2' = 'v2') {
  const key = await getKey();
  const r = await fetch(`${BASE}/${version}${path}`, {
    ...init,
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {})
    }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || j?.message || `HeyGen HTTP ${r.status}`;
    throw new Error(msg);
  }
  return j;
}

/* ─── DÉCOUVERTE ──────────────────────────────────────────── */

export type Avatar = {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string;
  preview_video_url?: string;
  gender?: string;
};

export async function listAvatars(): Promise<Avatar[]> {
  const j = await heygenFetch('/avatars');
  // L'API renvoie { data: { avatars: [...] } } selon la version
  const arr = j?.data?.avatars || j?.avatars || j?.data || [];
  return Array.isArray(arr) ? arr : [];
}

export type Voice = {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio?: string;
  support_pause?: boolean;
};

export async function listVoices(language?: string): Promise<Voice[]> {
  const j = await heygenFetch('/voices');
  const arr = j?.data?.voices || j?.voices || j?.data || [];
  if (!Array.isArray(arr)) return [];
  if (!language) return arr;
  const lang = language.toLowerCase();
  return arr.filter((v: Voice) =>
    (v.language || '').toLowerCase().includes(lang)
  );
}

/* ─── GÉNÉRATION VIDÉO ───────────────────────────────────── */

export type GenerateInput = {
  text: string;
  avatarId: string;
  voiceId: string;
  bgColor?: string;
  ratio?: '16:9' | '9:16' | '1:1';
};

export type GenerateResult = { video_id: string };

export async function generateVideo(input: GenerateInput): Promise<GenerateResult> {
  const body = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: input.avatarId,
          avatar_style: 'normal'
        },
        voice: {
          type: 'text',
          input_text: input.text.slice(0, 1500), // HeyGen limite ~1500 chars
          voice_id: input.voiceId
        },
        background: {
          type: 'color',
          value: input.bgColor || '#FBEAF0'
        }
      }
    ],
    dimension:
      input.ratio === '9:16' ? { width: 720, height: 1280 } :
      input.ratio === '1:1'  ? { width: 720, height: 720 } :
                                { width: 1280, height: 720 }
  };
  const j = await heygenFetch('/video/generate', { method: 'POST', body: JSON.stringify(body) });
  const id = j?.data?.video_id || j?.video_id;
  if (!id) throw new Error('HeyGen : pas de video_id retourné');
  return { video_id: id };
}

export type VideoStatus = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  video_url?: string;
  thumbnail_url?: string;
  error?: { message: string };
  duration?: number;
};

export async function getVideoStatus(videoId: string): Promise<VideoStatus> {
  // Endpoint v1 historique pour status
  const j = await heygenFetch(`/video_status.get?video_id=${videoId}`, {}, 'v1');
  const d = j?.data || j;
  return {
    status: (d?.status || 'pending') as any,
    video_url: d?.video_url,
    thumbnail_url: d?.thumbnail_url,
    error: d?.error,
    duration: d?.duration
  };
}

/* ─── INFOS COMPTE ───────────────────────────────────────── */

export async function getRemainingQuota(): Promise<{ remainingCredits: number | null; raw: any }> {
  try {
    const j = await heygenFetch('/user/remaining_quota', {}, 'v2');
    const raw = j?.data || j;
    const credits = raw?.remaining_quota ?? raw?.remaining_credits ?? null;
    return { remainingCredits: typeof credits === 'number' ? credits : null, raw };
  } catch {
    return { remainingCredits: null, raw: null };
  }
}
