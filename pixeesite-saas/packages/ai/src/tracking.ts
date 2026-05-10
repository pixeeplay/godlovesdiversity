import { platformDb } from '@pixeesite/database';
import type { AiCallContext, AiCallResult, AiOperation, AiProvider } from './types';

export async function trackAiUsage(
  ctx: AiCallContext,
  provider: AiProvider,
  model: string,
  operation: AiOperation,
  result: AiCallResult,
): Promise<void> {
  try {
    await platformDb.aiUsage.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        provider,
        model,
        operation,
        promptTokens: result.promptTokens || 0,
        outputTokens: result.outputTokens || 0,
        imagesCount: result.imagesCount || 0,
        audioSeconds: result.audioSeconds || 0,
        videoSeconds: result.videoSeconds || 0,
        costCents: result.costCents || 0,
        durationMs: result.durationMs,
        success: result.success,
        errorMessage: result.errorMessage,
      },
    });
    // Increment used credits (1 credit = 1 cent for now)
    if (result.success && result.costCents) {
      await platformDb.org.update({
        where: { id: ctx.orgId },
        data: { usedAiCredits: { increment: result.costCents } },
      });
    }
  } catch (e) {
    // Don't fail the AI call if tracking fails
    console.error('[ai-tracking] failed', e);
  }
}

/**
 * Vérifie qu'une org a des credits restants avant d'appeler l'IA.
 * Throw si dépassé.
 */
export async function assertAiQuota(orgId: string, estimatedCostCents: number): Promise<void> {
  const org = await platformDb.org.findUnique({
    where: { id: orgId },
    select: { maxAiCredits: true, usedAiCredits: true, plan: true },
  });
  if (!org) throw new Error('Org not found');
  const remaining = org.maxAiCredits - org.usedAiCredits;
  if (remaining < estimatedCostCents) {
    throw new Error(
      `AI quota exceeded for plan "${org.plan}". Used ${org.usedAiCredits} / ${org.maxAiCredits} credits. Upgrade to continue.`
    );
  }
}
