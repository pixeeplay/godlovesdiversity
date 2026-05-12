import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/orgs/[slug]/ai-autopilot/[id]/run
 *   Exécute la règle immédiatement (test ou trigger manuel). Met à jour lastRunAt + runsCount.
 *
 * Actions supportées (simulées — la pipeline réelle se branche au cas par cas) :
 *   - generate-newsletter   → aiCall feature=text, prompt depuis actionConfig.template
 *   - post-social           → idem text + retourne le draft à publier
 *   - send-email            → aiCall + nécessite RESEND_API_KEY (stub si manquant)
 *   - generate-article      → aiCall feature=text
 *   - generate-manual       → idem (voir manuals/generate)
 *   - moderate-forum        → aiCall feature=moderation sur les posts en attente
 *   - classify-leads        → aiCall feature=classification
 *   - translate-content     → aiCall feature=text avec prompt traduction
 */

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const orgId = auth.membership.org.id;
  const db = await getTenantPrisma(slug);
  const rows: any = await (db as any).$queryRawUnsafe(`SELECT * FROM "AiAutopilotRule" WHERE "id" = $1`, id);
  const rule = rows?.[0];
  if (!rule) return NextResponse.json({ error: 'rule-not-found' }, { status: 404 });

  let output = '';
  let status: 'ok' | 'error' = 'ok';
  let errorMsg: string | null = null;

  const cfg = (typeof rule.actionConfig === 'string' ? JSON.parse(rule.actionConfig) : rule.actionConfig) || {};
  const tpl = cfg.template || cfg.prompt || '';

  try {
    switch (rule.action) {
      case 'generate-newsletter': {
        const r = await aiCall({ orgId, feature: 'text', prompt: tpl || `Rédige une newsletter mensuelle (ton: ${cfg.tone || 'amical'}) sur l'activité récente.`, maxTokens: 3000 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      case 'post-social': {
        const r = await aiCall({ orgId, feature: 'text', prompt: tpl || `Rédige un post court (200 caractères max) pour ${cfg.network || 'LinkedIn'}.`, maxTokens: 400 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      case 'send-email': {
        const r = await aiCall({ orgId, feature: 'text', prompt: tpl || 'Rédige un email court et chaleureux.', maxTokens: 1000 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        // L'envoi réel via Resend doit être fait par le job appelant (mail-service tenant)
        break;
      }
      case 'generate-article': {
        const r = await aiCall({ orgId, feature: 'text', prompt: tpl || 'Rédige un article SEO court (800 mots).', maxTokens: 4000 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      case 'generate-manual': {
        const r = await aiCall({ orgId, feature: 'text', prompt: tpl || 'Génère le manuel utilisateur.', maxTokens: 6000 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      case 'moderate-forum': {
        const r = await aiCall({ orgId, feature: 'moderation', prompt: tpl || 'Analyse la toxicité de ce post : "[contenu]".', maxTokens: 200 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      case 'classify-leads': {
        const r = await aiCall({ orgId, feature: 'classification', prompt: tpl || 'Classe ce lead par catégorie (B2B / B2C / spam).', maxTokens: 200 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      case 'translate-content': {
        const r = await aiCall({ orgId, feature: 'text', prompt: tpl || `Traduis ce contenu en ${cfg.targetLanguage || 'anglais'}.`, maxTokens: 3000 });
        if (!r.ok) { status = 'error'; errorMsg = r.error || 'aiCall failed'; }
        output = r.output;
        break;
      }
      default:
        status = 'error';
        errorMsg = `Action inconnue: ${rule.action}`;
    }
  } catch (e: any) {
    status = 'error';
    errorMsg = e.message || 'execution-failed';
  }

  // Update lastRun
  await (db as any).$executeRawUnsafe(
    `UPDATE "AiAutopilotRule" SET "lastRunAt" = CURRENT_TIMESTAMP, "lastRunStatus" = $1, "runsCount" = "runsCount" + 1, "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = $2`,
    status,
    id
  );

  return NextResponse.json({ ok: status === 'ok', output, error: errorMsg, ruleId: id, action: rule.action });
}
