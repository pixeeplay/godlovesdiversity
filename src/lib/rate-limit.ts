/**
 * Rate-limiter simple en mémoire (token-bucket sliding-window).
 * Usage typique : limiter les routes publiques sensibles (login, upload, chat IA, commentaires, newsletter).
 *
 * Limites :
 * - In-memory : reset à chaque restart du conteneur. Pour de la prod sérieuse, passer à Redis.
 * - Pas de partage entre replicas. Si on scale horizontalement, prévoir Redis.
 *
 * Usage :
 *   const r = rateLimit(req, { key: 'chat', max: 20, windowMs: 60_000 });
 *   if (!r.ok) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    '0.0.0.0'
  );
}

export function rateLimit(
  req: Request,
  opts: { key: string; max: number; windowMs: number }
): { ok: boolean; remaining: number; resetAt: number } {
  const ip = getClientIp(req);
  const bucketKey = `${opts.key}:${ip}`;
  const now = Date.now();
  const existing = buckets.get(bucketKey);

  // Clean : si on a > 5000 buckets, on purge ceux expirés
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }

  if (!existing || existing.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.max - 1, resetAt: now + opts.windowMs };
  }

  if (existing.count >= opts.max) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, remaining: opts.max - existing.count, resetAt: existing.resetAt };
}

/** Helper pour répondre 429 proprement. */
export function rateLimitResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Trop de requêtes — réessaie dans quelques instants.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.max(1, retryAfter))
      }
    }
  );
}
