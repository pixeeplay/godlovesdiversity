import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSettings } from '@/lib/settings';

/**
 * Vérifie qu'une clé API dropshipping fonctionne en faisant un appel "ping"
 * (le moins coûteux possible) chez chaque fournisseur.
 *
 * POST { provider: 'gelato' | 'tpop' | 'printful' }
 * → { ok: boolean, message: string, info?: any }
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { provider } = await req.json();

  try {
    if (provider === 'gelato') {
      const cfg = await getSettings(['integrations.gelato.apiKey']);
      const key = cfg['integrations.gelato.apiKey'] || process.env.GELATO_API_KEY;
      if (!key) return NextResponse.json({ ok: false, message: 'Aucune clé API renseignée' });
      const r = await fetch('https://product-catalogues.gelatoapis.com/v3/catalogs', {
        headers: { 'X-API-KEY': key }
      });
      if (!r.ok) {
        const t = await r.text();
        return NextResponse.json({ ok: false, message: `Gelato HTTP ${r.status} — ${t.slice(0, 120)}` });
      }
      const j = await r.json();
      return NextResponse.json({
        ok: true,
        message: `Connexion OK — ${(j?.data || j?.catalogs || j)?.length || '?'} catalogue(s) accessibles`,
        info: { catalogs: (j?.data || j?.catalogs || j)?.slice?.(0, 3) }
      });
    }

    if (provider === 'tpop') {
      const cfg = await getSettings(['integrations.tpop.apiKey']);
      const key = cfg['integrations.tpop.apiKey'] || process.env.TPOP_API_KEY;
      if (!key) return NextResponse.json({ ok: false, message: 'Aucune clé API renseignée' });
      // Ping TPOP via une introspection minimale GraphQL
      const r = await fetch('https://api.tpop.com/graphql', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ __schema { queryType { name } } }' })
      });
      if (!r.ok) {
        return NextResponse.json({ ok: false, message: `TPOP HTTP ${r.status}` });
      }
      const j = await r.json();
      if (j.errors) return NextResponse.json({ ok: false, message: j.errors[0]?.message || 'Erreur GraphQL' });
      return NextResponse.json({ ok: true, message: 'Connexion OK — schema GraphQL accessible' });
    }

    if (provider === 'printful') {
      const cfg = await getSettings(['integrations.printful.apiKey', 'integrations.printful.storeId']);
      const key = cfg['integrations.printful.apiKey'] || process.env.PRINTFUL_API_KEY;
      const storeId = cfg['integrations.printful.storeId'] || process.env.PRINTFUL_STORE_ID;
      if (!key) return NextResponse.json({ ok: false, message: 'Aucune clé API renseignée' });
      const headers: Record<string, string> = { Authorization: `Bearer ${key}` };
      if (storeId) headers['X-PF-Store-Id'] = storeId;
      const r = await fetch('https://api.printful.com/store', { headers });
      const j = await r.json();
      if (!r.ok) {
        return NextResponse.json({ ok: false, message: j?.error?.message || `Printful HTTP ${r.status}` });
      }
      return NextResponse.json({
        ok: true,
        message: `Connexion OK — boutique « ${j?.result?.name || j?.result?.id || 'sans nom'} »`,
        info: { storeName: j?.result?.name, storeId: j?.result?.id, currency: j?.result?.currency }
      });
    }

    return NextResponse.json({ ok: false, message: `Fournisseur inconnu : ${provider}` });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message || 'Erreur inconnue' });
  }
}
