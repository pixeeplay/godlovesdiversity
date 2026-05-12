/**
 * Tenant-scoped HeyGen client (port faithful de GLD /src/lib/heygen.ts).
 * La clé HEYGEN_API_KEY est résolue via getOrgSecret(orgId, 'HEYGEN_API_KEY').
 */
const BASE = 'https://api.heygen.com';

async function heygenFetch(key: string, path: string, init: RequestInit = {}, version: 'v1' | 'v2' = 'v2') {
  const r = await fetch(`${BASE}/${version}${path}`, {
    ...init,
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j?.error?.message || j?.message || `HeyGen HTTP ${r.status}`;
    throw new Error(msg);
  }
  return j;
}

export type HeygenAvatar = {
  avatar_id: string;
  avatar_name: string;
  preview_image_url: string;
  preview_video_url?: string;
  gender?: string;
};

export async function listAvatars(key: string): Promise<HeygenAvatar[]> {
  const j = await heygenFetch(key, '/avatars');
  const arr = j?.data?.avatars || j?.avatars || j?.data || [];
  return Array.isArray(arr) ? arr : [];
}

export type HeygenVoice = {
  voice_id: string;
  language: string;
  gender: string;
  name: string;
  preview_audio?: string;
};

export async function listVoices(key: string, language?: string): Promise<HeygenVoice[]> {
  const j = await heygenFetch(key, '/voices');
  const arr = j?.data?.voices || j?.voices || j?.data || [];
  if (!Array.isArray(arr)) return [];
  if (!language) return arr;
  const lang = language.toLowerCase();
  return arr.filter((v: HeygenVoice) => (v.language || '').toLowerCase().includes(lang));
}

export type GenerateInput = {
  text: string;
  avatarId: string;
  voiceId: string;
  bgColor?: string;
  ratio?: '16:9' | '9:16' | '1:1';
};

export async function generateVideo(key: string, input: GenerateInput): Promise<{ video_id: string }> {
  const body = {
    video_inputs: [
      {
        character: { type: 'avatar', avatar_id: input.avatarId, avatar_style: 'normal' },
        voice: { type: 'text', input_text: input.text.slice(0, 1500), voice_id: input.voiceId },
        background: { type: 'color', value: input.bgColor || '#FBEAF0' },
      },
    ],
    dimension:
      input.ratio === '9:16' ? { width: 720, height: 1280 } :
      input.ratio === '1:1' ? { width: 720, height: 720 } :
      { width: 1280, height: 720 },
  };
  const j = await heygenFetch(key, '/video/generate', { method: 'POST', body: JSON.stringify(body) });
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

export async function getVideoStatus(key: string, videoId: string): Promise<VideoStatus> {
  const j = await heygenFetch(key, `/video_status.get?video_id=${videoId}`, {}, 'v1');
  const d = j?.data || j;
  return {
    status: (d?.status || 'pending') as any,
    video_url: d?.video_url,
    thumbnail_url: d?.thumbnail_url,
    error: d?.error,
    duration: d?.duration,
  };
}

export async function getRemainingQuota(key: string): Promise<{ remainingCredits: number | null; raw: any }> {
  try {
    const j = await heygenFetch(key, '/user/remaining_quota', {}, 'v2');
    const raw = j?.data || j;
    const credits = raw?.remaining_quota ?? raw?.remaining_credits ?? null;
    return { remainingCredits: typeof credits === 'number' ? credits : null, raw };
  } catch {
    return { remainingCredits: null, raw: null };
  }
}
