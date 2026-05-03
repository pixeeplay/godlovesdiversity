import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Vérifie qu'une clé API dropshipping fonctionne.
 *
 * POST { provider: 'gelato' | 'tpop' | 'printful' }
 * → { ok: boolean, message: string, info?: any, debug?: any }
 *
 * En cas d'erreur réseau (fetch failed), capture la VRAIE cause
 * via err.cause (DNS / cert / refus / timeout).
 */

async function safeFetch(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...init, signal: controller.signal });
    return { ok: true as const, response: r };
  } catch (e: any) {
    // Node fetch enveloppe l'erreur réelle dans .cause
    const cause = e?.cause || {};
    return {
      ok: false as const,
      message: e?.message || 'fetch failed',
      causeCode: cause?.code,
      causeMessage: cause?.message,
      causeErrno: cause?.errno,
      causeSyscall: cause?.syscall,
      causeHostname: cause?.hostname,
      isAbort: e?.name === 'AbortError'
    };
  } finally {
    clearTimeout(timer);
  }
}

function explainNetworkError(err: any): string {
  if (err.isAbort) return `Timeout (>15s) — le serveur ne répond pas. Vérifie que le pare-feu de ton serveur Coolify autorise les sorties HTTPS.`;
  const code = err.causeCode;
  if (code === 'ENOTFOUND') return `DNS échoué pour "${err.causeHostname}". Le domaine n'existe pas ou ton serveur ne peut pas le résoudre.`;
  if (code === 'ECONNREFUSED') return `Connexion refusée par le serveur distant.`;
  if (code === 'ECONNRESET') return `Connexion coupée par le serveur distant.`;
  if (code === 'CERT_HAS_EXPIRED' || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    return `Problème certificat SSL : ${code}.`;
  }
  if (code === 'ETIMEDOUT') return `Timeout TCP — le serveur ne répond pas (probable blocage firewall).`;
  if (err.causeMessage) return `${err.message} — ${err.causeMessage}${code ? ` (${code})` : ''}`;
  return err.message || 'Erreur réseau inconnue';
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { provider } = await req.json();

  try {
    if (provider === 'gelato') {
      const cfg = await getSettings(['integrations.gelato.apiKey']);
      const key = cfg['integrations.gelato.apiKey'] || process.env.GELATO_API_KEY;
      if (!key) return NextResponse.json({ ok: false, message: 'Aucune clé API renseignée dans les Paramètres' });
      if (key.length < 20) return NextResponse.json({ ok: false, message: `Clé API trop courte (${key.length} caractères) — vérifie qu'elle est complète` });

      // Endpoint Gelato pour tester : on appelle l'order list (n'envoie rien, juste check auth)
      const url = 'https://order.gelatoapis.com/v4/orders?limit=1';
      const result = await safeFetch(url, { headers: { 'X-API-KEY': key.trim() } });

      if (!result.ok) {
        return NextResponse.json({
          ok: false,
          message: explainNetworkError(result),
          debug: { url, ...result }
        });
      }

      const r = result.response;
      const text = await r.text();
      let body: any;
      try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 200) }; }

      if (r.status === 401 || r.status === 403) {
        return NextResponse.json({ ok: false, message: `Clé API rejetée par Gelato (HTTP ${r.status}). La clé n'est pas valide ou a été révoquée.` });
      }
      if (r.status === 404) {
        return NextResponse.json({ ok: false, message: `Endpoint Gelato introuvable (HTTP 404). L'API a peut-être changé.`, debug: body });
      }
      if (!r.ok) {
        return NextResponse.json({ ok: false, message: `Gelato HTTP ${r.status}`, debug: body });
      }
      return NextResponse.json({
        ok: true,
        message: `Connexion Gelato OK ✓ — clé valide, accès au catalogue Order API confirmé`,
        info: body
      });
    }

    if (provider === 'tpop') {
      const cfg = await getSettings(['integrations.tpop.apiKey']);
      const key = cfg['integrations.tpop.apiKey'] || process.env.TPOP_API_KEY;
      if (!key) return NextResponse.json({ ok: false, message: 'Aucune clé API renseignée' });

      const result = await safeFetch('https://api.tpop.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __schema { queryType { name } } }' })
      });
      if (!result.ok) {
        return NextResponse.json({ ok: false, message: explainNetworkError(result), debug: result });
      }
      const j = await result.response.json().catch(() => ({} as any));
      if (j.errors) return NextResponse.json({ ok: false, message: j.errors[0]?.message || 'Erreur GraphQL TPOP' });
      if (!result.response.ok) return NextResponse.json({ ok: false, message: `TPOP HTTP ${result.response.status}` });
      return NextResponse.json({ ok: true, message: 'Connexion TPOP OK ✓ — schema GraphQL accessible' });
    }

    if (provider === 'printful') {
      const cfg = await getSettings(['integrations.printful.apiKey', 'integrations.printful.storeId']);
      const key = cfg['integrations.printful.apiKey'] || process.env.PRINTFUL_API_KEY;
      const storeId = cfg['integrations.printful.storeId'] || process.env.PRINTFUL_STORE_ID;
      if (!key) return NextResponse.json({ ok: false, message: 'Aucune clé API renseignée' });

      const headers: Record<string, string> = { Authorization: `Bearer ${key.trim()}` };
      if (storeId) headers['X-PF-Store-Id'] = storeId;

      const result = await safeFetch('https://api.printful.com/store', { headers });
      if (!result.ok) {
        return NextResponse.json({ ok: false, message: explainNetworkError(result), debug: result });
      }
      const j = await result.response.json().catch(() => ({} as any));
      if (!result.response.ok) {
        return NextResponse.json({ ok: false, message: j?.error?.message || `Printful HTTP ${result.response.status}` });
      }
      return NextResponse.json({
        ok: true,
        message: `Connexion Printful OK ✓ — boutique « ${j?.result?.name || j?.result?.id || 'sans nom'} »`,
        info: { storeName: j?.result?.name, storeId: j?.result?.id, currency: j?.result?.currency }
      });
    }

    return NextResponse.json({ ok: false, message: `Fournisseur inconnu : ${provider}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: `Erreur interne : ${e?.message || 'inconnue'}` }, { status: 500 });
  }
}
