import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/time-machine
 *   → Liste les 50 derniers commits GitHub + statut deploy Coolify
 *
 * POST /api/admin/time-machine?action=rollback&sha=ABC
 *   → Trigger Coolify redeploy avec un SHA spécifique (via webhook)
 *
 * Auth : ADMIN uniquement.
 */

const GITHUB_OWNER = 'pixeeplay';
const GITHUB_REPO = 'godlovesdiversity';

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return null;
  return s;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  // Settings : token GitHub + webhook Coolify
  const cfg = await getSettings([
    'integrations.github.token',
    'integrations.coolify.deployWebhook',
    'integrations.coolify.url'
  ]).catch(() => ({} as Record<string, string>));

  const ghToken = cfg['integrations.github.token'] || process.env.GITHUB_TOKEN;
  const coolifyUrl = cfg['integrations.coolify.url'] || 'http://51.75.31.123:8000';

  let commits: any[] = [];
  let error: string | null = null;
  try {
    const ghHeaders: Record<string, string> = { Accept: 'application/vnd.github+json' };
    if (ghToken) ghHeaders.Authorization = `Bearer ${ghToken}`;
    const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?per_page=50`, {
      headers: ghHeaders,
      signal: AbortSignal.timeout(10_000)
    });
    if (!r.ok) {
      error = `github-http-${r.status}` + (r.status === 401 ? ' (token requis pour repo privé)' : '');
    } else {
      const list: any[] = await r.json();
      commits = list.map(c => ({
        sha: c.sha,
        shortSha: c.sha.slice(0, 7),
        message: c.commit.message.split('\n')[0].slice(0, 140),
        fullMessage: c.commit.message,
        author: c.commit.author?.name || 'unknown',
        avatar: c.author?.avatar_url || null,
        date: c.commit.author?.date,
        url: c.html_url
      }));
    }
  } catch (e: any) {
    error = e?.message || 'github-fetch-failed';
  }

  return NextResponse.json({
    commits,
    error,
    coolifyUrl,
    webhookConfigured: !!cfg['integrations.coolify.deployWebhook'],
    info: 'Pour rollback : configure le webhook Coolify dans /admin/settings (integrations.coolify.deployWebhook).'
  });
}

/**
 * POST /api/admin/time-machine?action=rollback&sha=...
 * Déclenche un redeploy Coolify sur le SHA donné.
 * Coolify ne supporte pas nativement le rollback à un SHA via webhook (rebuild = HEAD).
 * Donc cette action :
 *  1. Pousse un commit "Revert to <sha>" via API GitHub (cherry-pick reverse) — non implémenté
 *  2. OU déclenche le webhook Coolify (rebuild HEAD actuel) — fonctionnel
 *  3. OU notifie via Telegram que l'admin doit faire `git revert` manuellement
 */
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const sha = url.searchParams.get('sha');

  const cfg = await getSettings(['integrations.coolify.deployWebhook']).catch(() => ({} as Record<string, string>));
  const webhook = cfg['integrations.coolify.deployWebhook'];

  if (action === 'redeploy') {
    if (!webhook) return NextResponse.json({ error: 'webhook-not-configured', message: 'Configure integrations.coolify.deployWebhook dans /admin/settings.' }, { status: 400 });
    try {
      const r = await fetch(webhook, { method: 'GET', signal: AbortSignal.timeout(10_000) });
      return NextResponse.json({
        ok: r.ok,
        status: r.status,
        message: r.ok ? '✅ Redeploy déclenché — vérifie Coolify dans 2-5 min.' : `❌ HTTP ${r.status}`
      });
    } catch (e: any) {
      return NextResponse.json({ error: 'webhook-failed', message: e?.message }, { status: 500 });
    }
  }

  if (action === 'rollback' && sha) {
    // Pour un vrai rollback à un SHA spécifique, il faut faire un git revert ou reset --hard
    // C'est dangereux à automatiser depuis l'UI. On retourne les instructions :
    return NextResponse.json({
      ok: false,
      manualSteps: [
        `git checkout main`,
        `git revert --no-edit HEAD..${sha}     # OU pour un hard reset (DANGEREUX) :`,
        `# git reset --hard ${sha} && git push --force-with-lease`,
        `# Coolify redeploy auto via webhook après push`
      ],
      message: 'Rollback à un SHA arbitraire n\'est pas automatisé pour des raisons de sécurité. Suis les étapes manuelles.'
    });
  }

  return NextResponse.json({ error: 'action-unknown', validActions: ['redeploy', 'rollback'] }, { status: 400 });
}
