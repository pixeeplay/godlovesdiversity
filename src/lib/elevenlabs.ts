/**
 * ElevenLabs TTS — synthèse vocale haute qualité.
 * Utilise le voice_id `JBFqnCBsd6RMkjVDRZzb` (« George », FR/EN, voix posée et chaleureuse)
 * par défaut. Personnalisable via Settings.
 *
 * Free tier : 10 000 caractères/mois. Largement suffisant pour tester GLD Live local.
 */
import { getSettings } from './settings';

const DEFAULT_VOICE = 'JBFqnCBsd6RMkjVDRZzb'; // George

export type TtsResult = {
  audioBase64: string;     // audio MP3 encodé base64
  contentType: string;     // 'audio/mpeg'
  estimatedDurationMs: number;
};

async function getKey(): Promise<string> {
  const s = await getSettings(['integrations.elevenlabs.apiKey']);
  const k = s['integrations.elevenlabs.apiKey'] || process.env.ELEVENLABS_API_KEY;
  if (!k) throw new Error('Clé ElevenLabs non configurée (Paramètres → IA & Outils → ElevenLabs)');
  return k;
}

export async function ttsSpeak(text: string, opts: { voiceId?: string; modelId?: string } = {}): Promise<TtsResult> {
  const key = await getKey();
  const voiceId = opts.voiceId || DEFAULT_VOICE;
  const modelId = opts.modelId || 'eleven_multilingual_v2';

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': key,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg'
    },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      model_id: modelId,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.30,
        use_speaker_boost: true
      }
    })
  });

  if (!r.ok) {
    const err = await r.text();
    let msg = `ElevenLabs HTTP ${r.status}`;
    try {
      const j = JSON.parse(err);
      msg = j?.detail?.message || j?.message || msg;
    } catch {}
    if (r.status === 401) msg = 'Clé ElevenLabs invalide — vérifie Paramètres → IA & Outils → ElevenLabs';
    if (r.status === 429) msg = 'Quota ElevenLabs dépassé (10 000 chars/mois sur free tier).';
    throw new Error(msg);
  }

  const buf = await r.arrayBuffer();
  const audioBase64 = Buffer.from(buf).toString('base64');
  // Estimation grossière : ~150 mots/min ≈ 800 chars/min
  const wordsPerMin = 150;
  const estimatedDurationMs = Math.round((text.split(/\s+/).length / wordsPerMin) * 60000);

  return { audioBase64, contentType: 'audio/mpeg', estimatedDurationMs };
}

export async function listVoices(): Promise<any[]> {
  const key = await getKey();
  const r = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': key }
  });
  if (!r.ok) return [];
  const j = await r.json();
  return j?.voices || [];
}
