/**
 * Modération IA : analyse un texte via Gemini et renvoie un score + catégorie.
 * Utilisé par les hooks de création de post forum / témoignage / commentaire.
 */
import { generateText } from './gemini';
import { prisma } from './prisma';
import { getAiConfig, isEnabled, AI_KEYS, recordRun, bumpQuota, checkQuota } from './ai-autopilot';

export interface ModResult {
  score: number;       // 0..1, plus haut = plus toxique
  category: 'safe' | 'toxic' | 'hate' | 'spam' | 'nsfw' | 'self_harm';
  reason?: string;
  shouldHide: boolean;
}

export async function moderateText(text: string, opts?: { targetType?: string; targetId?: string }): Promise<ModResult> {
  const cfg = await getAiConfig();
  if (!isEnabled(cfg, AI_KEYS.modEnabled)) {
    return { score: 0, category: 'safe', shouldHide: false };
  }
  const quota = await checkQuota();
  if (!quota.ok) return { score: 0, category: 'safe', shouldHide: false, reason: 'quota-exceeded' };

  const threshold = parseFloat(cfg[AI_KEYS.modThreshold] || '0.7');
  const autoHide = isEnabled(cfg, AI_KEYS.modAutoHide);

  const prompt = `Tu modères du contenu pour un site LGBT+ inclusif (mentions de foi, identité, sexualité OK ; pas de hate speech ni harcèlement).

Évalue ce texte et réponds UNIQUEMENT en JSON strict :
{"score":0.0,"category":"safe|toxic|hate|spam|nsfw|self_harm","reason":"1 phrase courte"}

Règles :
- "safe" : 0.0-0.3 — discussion normale, même si sujet sensible
- "toxic" : 0.4-0.7 — agressif, insulte, mais pas hate organisé
- "hate" : 0.8-1.0 — homophobie/transphobie/racisme/antisémitisme/islamophobie explicites
- "spam" : pub commerciale hors sujet, lien suspicieux
- "nsfw" : explicitement sexuel non sollicité
- "self_harm" : appel à l'aide suicide/automutilation (à signaler, PAS à hide)

Texte à analyser :
"""
${text.slice(0, 2000)}
"""`;

  let raw: any;
  try {
    raw = await generateText(prompt);
    await bumpQuota(1);
  } catch {
    return { score: 0, category: 'safe', shouldHide: false, reason: 'gemini-error' };
  }

  let parsed: any = {};
  try {
    const cleaned = (raw.text || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { score: 0, category: 'safe', shouldHide: false, reason: 'parse-failed' };
  }

  const score = Math.max(0, Math.min(1, parseFloat(parsed.score) || 0));
  const category = (parsed.category as ModResult['category']) || 'safe';
  const reason = parsed.reason || '';
  // self_harm : on signale mais on NE hide PAS (la personne a besoin d'être vue)
  const shouldHide = autoHide && score >= threshold && category !== 'safe' && category !== 'self_harm';

  // Audit trail
  if (opts?.targetType && opts?.targetId) {
    try {
      await prisma.moderationDecision.create({
        data: {
          targetType: opts.targetType,
          targetId: opts.targetId,
          score,
          category,
          reason,
          action: shouldHide ? 'hidden' : (score >= 0.4 ? 'flagged' : 'approved')
        }
      });
    } catch {}
  }

  await recordRun(AI_KEYS.modLastRunAt);

  return { score, category, reason, shouldHide };
}
