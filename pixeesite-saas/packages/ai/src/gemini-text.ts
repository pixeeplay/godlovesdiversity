import { trackAiUsage, assertAiQuota } from './tracking';
import type { AiCallContext } from './types';

const FALLBACK_CHAINS: Record<string, string[]> = {
  'gemini-3-flash-lite': ['gemini-3-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
  'gemini-3-flash': ['gemini-3-flash', 'gemini-2.5-flash', 'gemini-2.0-flash'],
  'gemini-3-pro': ['gemini-3-pro', 'gemini-2.5-pro'],
};

export async function generateText(
  ctx: AiCallContext,
  prompt: string,
  opts: { model?: string; temperature?: number; maxOutputTokens?: number; jsonMode?: boolean } = {}
): Promise<string> {
  await assertAiQuota(ctx.orgId, 1);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY required');
  const startedAt = Date.now();
  const chain = FALLBACK_CHAINS[opts.model || 'gemini-3-flash'] || ['gemini-2.5-flash'];

  for (const model of chain) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: opts.temperature ?? 0.4,
              maxOutputTokens: opts.maxOutputTokens ?? 800,
              ...(opts.jsonMode && { responseMimeType: 'application/json' }),
            },
          }),
          signal: AbortSignal.timeout(30_000),
        }
      );
      if (!r.ok) continue;
      const j: any = await r.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = j?.usageMetadata || {};
      await trackAiUsage(ctx, 'gemini', model, 'text', {
        success: true,
        durationMs: Date.now() - startedAt,
        promptTokens: usage.promptTokenCount,
        outputTokens: usage.candidatesTokenCount,
        costCents: 1,
      });
      return text;
    } catch {
      continue;
    }
  }
  await trackAiUsage(ctx, 'gemini', chain[0], 'text', {
    success: false,
    durationMs: Date.now() - startedAt,
    errorMessage: 'all-models-failed',
  });
  throw new Error('Gemini text generation failed');
}
