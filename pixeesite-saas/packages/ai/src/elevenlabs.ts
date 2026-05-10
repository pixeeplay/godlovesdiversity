import { trackAiUsage, assertAiQuota } from './tracking';
import type { AiCallContext } from './types';

/**
 * Synthétise une voix via ElevenLabs.
 * Coût ≈ 10 cents par 100 caractères (~ 1 minute audio).
 */
export async function synthesizeVoice(
  ctx: AiCallContext,
  text: string,
  voiceId: string = '21m00Tcm4TlvDq8ikWAM' // Rachel par défaut
): Promise<Buffer> {
  await assertAiQuota(ctx.orgId, Math.ceil(text.length / 100) * 10);
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY required');
  const startedAt = Date.now();

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  const success = r.ok;
  const audioSeconds = Math.ceil(text.length / 15); // approx 15 chars/sec
  await trackAiUsage(ctx, 'elevenlabs', 'eleven_multilingual_v2', 'audio', {
    success,
    durationMs: Date.now() - startedAt,
    audioSeconds,
    costCents: Math.ceil(text.length / 100) * 10,
    errorMessage: success ? undefined : `HTTP ${r.status}`,
  });

  if (!success) throw new Error(`ElevenLabs error: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}
