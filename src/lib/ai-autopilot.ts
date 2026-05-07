/**
 * AI Autopilot — config centrale pour les fonctionnalités IA autonomes du site.
 *
 * Toutes les valeurs sont stockées dans la table `Setting` (clés `ai.*`),
 * modifiables depuis /admin/ai-autopilot par le super-admin.
 *
 * Convention : chaque feature a un toggle `enabled`, un set de paramètres,
 * un lastRunAt (lecture seule, mis à jour par le code), et un statut.
 */

import { getSettings, setSetting } from './settings';

// ─────────────────────────────────────────────
// CLÉS — single source of truth
// ─────────────────────────────────────────────

export const AI_KEYS = {
  // LGBT Soul (deprecated) — la "voix" du site, retirée Phase 1
  soulEnabled: 'ai.soul.enabled',
  soulFrequency: 'ai.soul.frequency',         // "daily" | "weekly"
  soulTone: 'ai.soul.tone',                   // ex: "poétique, chaleureux, inclusif"
  soulShowOnHome: 'ai.soul.showOnHome',       // "1" | "0"
  soulLastRunAt: 'ai.soul.lastRunAt',
  soulLastEntryId: 'ai.soul.lastEntryId',

  // Mood Engine — humeur visuelle du site
  moodEnabled: 'ai.mood.enabled',
  moodAffectsTheme: 'ai.mood.affectsTheme',   // "1" change couleurs selon humeur
  moodAffectsMusic: 'ai.mood.affectsMusic',   // "1" adapte intensité ambient
  moodCurrent: 'ai.mood.current',             // "joyful" | "calm" | "somber" | "festive" | "neutral"
  moodLastRunAt: 'ai.mood.lastRunAt',

  // Forum moderation
  modEnabled: 'ai.moderation.enabled',
  modAutoHide: 'ai.moderation.autoHide',      // "1" hide auto si toxic
  modThreshold: 'ai.moderation.threshold',    // 0..1, score min pour auto-hide
  modNotifyAdmin: 'ai.moderation.notifyAdmin',
  modLastRunAt: 'ai.moderation.lastRunAt',
  modBlockedToday: 'ai.moderation.blockedToday',

  // Newsletter auto
  nlEnabled: 'ai.newsletter.enabled',
  nlAutoSend: 'ai.newsletter.autoSend',       // "1" envoie auto, "0" save en draft
  nlDayOfWeek: 'ai.newsletter.dayOfWeek',     // 1=lundi … 7=dimanche
  nlHour: 'ai.newsletter.hour',               // 0..23
  nlTone: 'ai.newsletter.tone',               // ex: "amical, militant, court"
  nlLastRunAt: 'ai.newsletter.lastRunAt',
  nlLastDraftId: 'ai.newsletter.lastDraftId',

  // Quotas globaux
  quotaDailyMax: 'ai.quota.dailyMax',         // max appels Gemini par jour (sécurité coût)
  quotaUsedToday: 'ai.quota.usedToday'        // compteur reset à minuit
} as const;

// ─────────────────────────────────────────────
// DÉFAUTS
// ─────────────────────────────────────────────

export const AI_DEFAULTS: Record<string, string> = {
  [AI_KEYS.soulEnabled]: '0',
  [AI_KEYS.soulFrequency]: 'daily',
  [AI_KEYS.soulTone]: 'poétique, chaleureux, inclusif, pudique',
  [AI_KEYS.soulShowOnHome]: '1',

  [AI_KEYS.moodEnabled]: '0',
  [AI_KEYS.moodAffectsTheme]: '1',
  [AI_KEYS.moodAffectsMusic]: '0',
  [AI_KEYS.moodCurrent]: 'neutral',

  [AI_KEYS.modEnabled]: '0',
  [AI_KEYS.modAutoHide]: '1',
  [AI_KEYS.modThreshold]: '0.7',
  [AI_KEYS.modNotifyAdmin]: '1',
  [AI_KEYS.modBlockedToday]: '0',

  [AI_KEYS.nlEnabled]: '0',
  [AI_KEYS.nlAutoSend]: '0',
  [AI_KEYS.nlDayOfWeek]: '5',  // vendredi
  [AI_KEYS.nlHour]: '10',
  [AI_KEYS.nlTone]: 'amical, inclusif, court, mention témoignages + événements',

  [AI_KEYS.quotaDailyMax]: '500',
  [AI_KEYS.quotaUsedToday]: '0'
};

// ─────────────────────────────────────────────
// API
// ─────────────────────────────────────────────

export async function getAiConfig(): Promise<Record<string, string>> {
  const stored = await getSettings(Object.values(AI_KEYS));
  return { ...AI_DEFAULTS, ...stored };
}

export function isEnabled(cfg: Record<string, string>, key: string): boolean {
  return cfg[key] === '1' || cfg[key] === 'true';
}

/** Vérifie le quota Gemini avant un appel. Renvoie true si OK pour proceder. */
export async function checkQuota(): Promise<{ ok: boolean; used: number; max: number }> {
  const cfg = await getAiConfig();
  const used = parseInt(cfg[AI_KEYS.quotaUsedToday] || '0');
  const max = parseInt(cfg[AI_KEYS.quotaDailyMax] || '500');
  return { ok: used < max, used, max };
}

/** Incrémente le compteur de quota après un appel Gemini. */
export async function bumpQuota(by = 1): Promise<void> {
  const cfg = await getAiConfig();
  const used = parseInt(cfg[AI_KEYS.quotaUsedToday] || '0') + by;
  await setSetting(AI_KEYS.quotaUsedToday, String(used));
}

/** Reset quota à minuit (à appeler par cron quotidien). */
export async function resetQuotaIfNewDay(): Promise<void> {
  const lastReset = (await getSettings(['ai.quota.resetAt']))['ai.quota.resetAt'];
  const today = new Date().toISOString().slice(0, 10);
  if (lastReset !== today) {
    await setSetting(AI_KEYS.quotaUsedToday, '0');
    await setSetting('ai.quota.resetAt', today);
  }
}

export async function recordRun(featureKey: string): Promise<void> {
  await setSetting(featureKey, new Date().toISOString());
}
