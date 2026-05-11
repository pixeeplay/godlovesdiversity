/**
 * Scraper runner — exécute en arrière-plan un ScraperJob.
 *
 * Pipeline par URL :
 *   1. Fetch via Jina (clé tenant) sinon direct
 *   2. (Optionnel) cleaning via Gemini si cleaner='gemini'
 *   3. Extraction contacts (email/phone/handles)
 *   4. Upsert dans la table Lead du tenant
 *   5. Update progress en SQL après chaque page
 *
 * Note : pas de fork worker — fire-and-forget depuis la route. Le polling client
 * lit les colonnes results.* et status pour suivre l'avancée.
 */
import { getTenantPrisma } from '@pixeesite/database';
import { getOrgSecret } from './secrets';

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}\b/g;
const PHONE_RE = /(?:(?:\+?\d{1,3}[ .-]?)?(?:\(?\d{2,4}\)?[ .-]?)?\d{2,4}[ .-]?\d{2,4}[ .-]?\d{2,4})/g;
const LINKEDIN_RE = /linkedin\.com\/(?:in|company)\/([A-Za-z0-9_-]+)/g;
const TWITTER_RE = /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/g;
const INSTAGRAM_RE = /instagram\.com\/([A-Za-z0-9_.]+)/g;
const FACEBOOK_RE = /facebook\.com\/([A-Za-z0-9_.-]+)/g;

const SKIP_EMAIL_DOMAINS = new Set(['sentry.io', 'wixpress.com', 'wix.com', 'cloudfront.net', 'example.com', 'example.org', 'localhost', 'gstatic.com']);

type JobLog = { ts: number; level: 'info' | 'warn' | 'error'; msg: string };
type JobResult = {
  url: string;
  ok: boolean;
  title?: string;
  bytes?: number;
  bytesRaw?: number;
  cleanRemovedPct?: number;
  cleanerMode?: string;
  durationMs?: number;
  source?: string;
  ingested?: boolean;
  chunkCount?: number;
  error?: string;
};

function extractFromText(text: string) {
  const emails = Array.from(new Set((text.match(EMAIL_RE) || []).map((e) => e.toLowerCase())))
    .filter((e) => {
      const d = e.split('@')[1];
      return d && !SKIP_EMAIL_DOMAINS.has(d) && !d.includes('.local');
    });
  const phones = Array.from(new Set((text.match(PHONE_RE) || []).map((p) => p.replace(/\s+/g, ' ').trim())))
    .filter((p) => p.replace(/\D/g, '').length >= 9)
    .slice(0, 10);
  const handles: Record<string, string> = {};
  let m: RegExpExecArray | null;
  LINKEDIN_RE.lastIndex = 0;
  if ((m = LINKEDIN_RE.exec(text))) handles.linkedin = m[1];
  TWITTER_RE.lastIndex = 0;
  if ((m = TWITTER_RE.exec(text))) handles.twitter = m[1];
  INSTAGRAM_RE.lastIndex = 0;
  if ((m = INSTAGRAM_RE.exec(text))) handles.instagram = m[1];
  FACEBOOK_RE.lastIndex = 0;
  if ((m = FACEBOOK_RE.exec(text))) handles.facebook = m[1];
  return { emails, phones, handles };
}

async function fetchPage(url: string, jinaKey: string | null, skipJina: boolean): Promise<{ ok: boolean; text: string; error?: string; source: string }> {
  try {
    if (!skipJina && jinaKey) {
      const r = await fetch(`https://r.jina.ai/${url}`, {
        headers: { 'Authorization': `Bearer ${jinaKey}` },
        signal: AbortSignal.timeout(45_000),
      });
      if (r.ok) return { ok: true, text: await r.text(), source: 'jina' };
    }
    if (!skipJina) {
      // Free tier Jina (no key)
      const r = await fetch(`https://r.jina.ai/${url}`, { signal: AbortSignal.timeout(45_000) });
      if (r.ok) return { ok: true, text: await r.text(), source: 'jina-free' };
    }
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PixeesiteBot/1.0)' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return { ok: false, text: '', error: `HTTP ${r.status}`, source: 'direct' };
    return { ok: true, text: await r.text(), source: 'direct' };
  } catch (e: any) {
    return { ok: false, text: '', error: e?.message || 'fetch-error', source: 'unknown' };
  }
}

async function geminiClean(text: string, hint: string | undefined, geminiKey: string): Promise<string | null> {
  try {
    const prompt = `Extrait le contenu principal utile (descriptions, prix, infos clés, contacts) de ce texte. Retourne UNIQUEMENT le contenu nettoyé, sans menus, footers, navigation, listes de liens.${hint ? ` Contexte: ${hint}.` : ''}\n\nTexte:\n${text.slice(0, 30_000)}`;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch { return null; }
}

async function appendLog(tenantDb: any, jobId: string, level: 'info' | 'warn' | 'error', msg: string) {
  await tenantDb.$executeRawUnsafe(
    `UPDATE "ScraperJob" SET results = jsonb_set(results, '{logs}', (COALESCE(results->'logs', '[]'::jsonb) || $1::jsonb)), "updatedAt" = NOW() WHERE id = $2`,
    JSON.stringify([{ ts: Date.now(), level, msg } as JobLog]),
    jobId
  ).catch(() => {});
}

async function appendResult(tenantDb: any, jobId: string, result: JobResult) {
  await tenantDb.$executeRawUnsafe(
    `UPDATE "ScraperJob" SET results = jsonb_set(results, '{results}', (COALESCE(results->'results', '[]'::jsonb) || $1::jsonb)), "updatedAt" = NOW() WHERE id = $2`,
    JSON.stringify([result]),
    jobId
  ).catch(() => {});
}

async function updateProgress(tenantDb: any, jobId: string, progress: number, done: number, errors: number, currentUrl?: string) {
  await tenantDb.$executeRawUnsafe(
    `UPDATE "ScraperJob" SET
       results = jsonb_set(jsonb_set(jsonb_set(jsonb_set(COALESCE(results, '{}'::jsonb), '{progress}', $1::jsonb), '{done}', $2::jsonb), '{errors}', $3::jsonb), '{currentUrl}', $4::jsonb),
       "errorCount" = $3::int,
       "updatedAt" = NOW()
     WHERE id = $5`,
    JSON.stringify(progress),
    JSON.stringify(done),
    JSON.stringify(errors),
    JSON.stringify(currentUrl || null),
    jobId
  ).catch(() => {});
}

async function isCancelled(tenantDb: any, jobId: string): Promise<boolean> {
  const rows: any[] = await tenantDb.$queryRawUnsafe(`SELECT status FROM "ScraperJob" WHERE id = $1`, jobId).catch(() => []);
  return rows[0]?.status === 'cancelled';
}

export async function runScrapeJob(opts: { orgSlug: string; orgId: string; jobId: string }): Promise<void> {
  const { orgSlug, orgId, jobId } = opts;
  const tenantDb: any = await getTenantPrisma(orgSlug);

  const rows: any[] = await tenantDb.$queryRawUnsafe(`SELECT id, "sourceUrl", config FROM "ScraperJob" WHERE id = $1`, jobId).catch(() => []);
  const job = rows[0];
  if (!job) return;

  const config = job.config || {};
  const urls: string[] = Array.isArray(config.urls) ? config.urls : [];
  const total = urls.length;
  if (total === 0) {
    await tenantDb.$executeRawUnsafe(`UPDATE "ScraperJob" SET status = 'error', "finishedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`, jobId);
    return;
  }

  await tenantDb.$executeRawUnsafe(`UPDATE "ScraperJob" SET status = 'running', "startedAt" = NOW(), "updatedAt" = NOW() WHERE id = $1`, jobId);
  await tenantDb.$executeRawUnsafe(
    `UPDATE "ScraperJob" SET results = jsonb_set(COALESCE(results, '{}'::jsonb), '{total}', $1::jsonb) WHERE id = $2`,
    JSON.stringify(total),
    jobId
  );
  await appendLog(tenantDb, jobId, 'info', `Job démarré : ${total} URL(s), cleaner=${config.cleaner}, ingest=${config.ingest}, importToLeads=${config.importToLeads}`);

  const jinaKey = await getOrgSecret(orgId, 'JINA_KEY');
  const geminiKey = config.cleaner === 'gemini' ? await getOrgSecret(orgId, 'GEMINI_API_KEY') : null;
  if (config.cleaner === 'gemini' && !geminiKey) await appendLog(tenantDb, jobId, 'warn', 'Cleaner gemini demandé mais GEMINI_API_KEY non configurée → fallback aggressive');

  const tags: string[] = Array.isArray(config.tags) ? config.tags : [];
  const tagsDefault = tags.length > 0 ? tags : [config.target === 'b2c' ? 'b2c' : 'b2b'];
  const hostDelay = typeof config.hostDelayMs === 'number' ? config.hostDelayMs : 2500;

  let done = 0;
  let errors = 0;
  let totalLeads = 0;

  for (let i = 0; i < urls.length; i++) {
    if (await isCancelled(tenantDb, jobId)) {
      await appendLog(tenantDb, jobId, 'warn', 'Job annulé par l\'utilisateur');
      break;
    }

    const url = urls[i];
    const t0 = Date.now();
    await updateProgress(tenantDb, jobId, Math.round((i / total) * 100), done, errors, url);
    await appendLog(tenantDb, jobId, 'info', `→ ${url}`);

    const fetched = await fetchPage(url, jinaKey, !!config.skipJina);
    const dt = Date.now() - t0;

    if (!fetched.ok) {
      errors++;
      await appendLog(tenantDb, jobId, 'error', `${url}: ${fetched.error}`);
      await appendResult(tenantDb, jobId, { url, ok: false, error: fetched.error, source: fetched.source, durationMs: dt });
    } else {
      let text = fetched.text;
      const bytesRaw = text.length;

      // Cleaning
      if (config.cleaner === 'gemini' && geminiKey) {
        const cleaned = await geminiClean(text, config.cleanerHint, geminiKey);
        if (cleaned) text = cleaned;
      } else if (config.cleaner === 'aggressive') {
        // Heuristique simple : enlève lignes < 30 chars contenant uniquement liens/menus
        text = text.split('\n').filter((line) => {
          const t = line.trim();
          if (!t) return false;
          if (t.length < 30 && /^[•·\-\|·>→»]+/.test(t)) return false;
          return true;
        }).join('\n');
      }
      const bytes = text.length;
      const cleanRemovedPct = bytesRaw > 0 ? Math.round(((bytesRaw - bytes) / bytesRaw) * 100) : 0;

      // Extraction
      const { emails, phones, handles } = extractFromText(text);
      const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(fetched.text);
      const title = titleMatch ? titleMatch[1].trim().slice(0, 120) : undefined;

      // Import leads
      let upserts = 0;
      if (config.importToLeads !== false) {
        const social: Record<string, string> = {};
        if (handles.linkedin) social.linkedin = `https://linkedin.com/in/${handles.linkedin}`;
        if (handles.twitter) social.twitter = `https://twitter.com/${handles.twitter}`;
        if (handles.instagram) social.instagram = `https://instagram.com/${handles.instagram}`;
        if (handles.facebook) social.facebook = `https://facebook.com/${handles.facebook}`;

        const phone = phones[0] || null;
        for (const email of emails.slice(0, 20)) {
          try {
            const existing = await tenantDb.lead.findUnique({ where: { email } });
            if (existing) {
              const existingSocial = (existing.customFields?.social || {}) as Record<string, string>;
              await tenantDb.lead.update({
                where: { id: existing.id },
                data: {
                  phone: existing.phone || phone,
                  tags: Array.from(new Set([...(existing.tags || []), ...tagsDefault])),
                  customFields: { ...(existing.customFields || {}), social: { ...existingSocial, ...social } }
                }
              });
            } else {
              await tenantDb.lead.create({
                data: {
                  email,
                  phone,
                  source: 'scrape-web',
                  sourceDetail: url,
                  status: 'new',
                  tags: tagsDefault,
                  segments: [],
                  customFields: Object.keys(social).length > 0 ? { social, scrapedFromUrl: url } : { scrapedFromUrl: url }
                }
              });
            }
            upserts++;
          } catch { /* skip duplicates */ }
        }
        // Phone-only lead si pas d'email
        if (emails.length === 0 && phones[0]) {
          try {
            await tenantDb.lead.create({
              data: {
                phone: phones[0],
                source: 'scrape-web',
                sourceDetail: url,
                status: 'new',
                tags: tagsDefault,
                customFields: Object.keys(social).length > 0 ? { social, scrapedFromUrl: url } : { scrapedFromUrl: url }
              }
            });
            upserts++;
          } catch { /* skip */ }
        }
        totalLeads += upserts;
      }

      await appendLog(tenantDb, jobId, 'info', `✓ ${url}: ${emails.length} email(s), ${phones.length} phone(s), ${upserts} lead(s) upserted (${dt}ms)`);
      await appendResult(tenantDb, jobId, {
        url, ok: true, title,
        bytesRaw, bytes, cleanRemovedPct,
        cleanerMode: config.cleaner,
        durationMs: dt,
        source: fetched.source,
        ingested: !!config.ingest && upserts > 0,
        chunkCount: upserts,
      });
    }
    done++;

    // Throttle si polite
    if (config.polite && i < urls.length - 1) {
      const jitter = Math.round(hostDelay * (0.8 + Math.random() * 0.4));
      await new Promise((res) => setTimeout(res, jitter));
    }
  }

  const finalStatus = await isCancelled(tenantDb, jobId) ? 'cancelled' : (errors === total ? 'error' : 'done');
  await tenantDb.$executeRawUnsafe(
    `UPDATE "ScraperJob" SET status = $1, "finishedAt" = NOW(), "leadCount" = $2, "errorCount" = $3,
       results = jsonb_set(jsonb_set(results, '{progress}', '100'::jsonb), '{done}', $4::jsonb), "updatedAt" = NOW()
     WHERE id = $5`,
    finalStatus, totalLeads, errors, JSON.stringify(done), jobId
  );
  await appendLog(tenantDb, jobId, 'info', `Job terminé: ${finalStatus} · ${done}/${total} pages · ${totalLeads} leads upserted · ${errors} erreur(s)`);
}
