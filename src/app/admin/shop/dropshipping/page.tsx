import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import Link from 'next/link';
import { Truck, ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { DropshippingProviderCards } from '@/components/admin/DropshippingProviderCards';

export const dynamic = 'force-dynamic';

export default async function DropshippingPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  // État config + nb produits par provider
  const [settings, dropshipProducts] = await Promise.all([
    getSettings([
      'integrations.gelato.apiKey',
      'integrations.tpop.apiKey',
      'integrations.printful.apiKey',
      'integrations.printful.storeId'
    ]),
    prisma.product.findMany({
      where: { dropProvider: { not: null } },
      select: { id: true, title: true, slug: true, dropProvider: true, dropProductId: true, costCents: true, priceCents: true, images: true, published: true }
    })
  ]);

  const providersStatus = {
    gelato: !!(settings['integrations.gelato.apiKey'] || process.env.GELATO_API_KEY),
    tpop: !!(settings['integrations.tpop.apiKey'] || process.env.TPOP_API_KEY),
    printful: !!(settings['integrations.printful.apiKey'] || process.env.PRINTFUL_API_KEY)
  };

  const byProvider = {
    gelato: dropshipProducts.filter((p) => p.dropProvider === 'gelato'),
    tpop: dropshipProducts.filter((p) => p.dropProvider === 'tpop'),
    printful: dropshipProducts.filter((p) => p.dropProvider === 'printful')
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-2.5">
              <Truck size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold">Dropshipping</h1>
          </div>
          <p className="text-zinc-400 text-sm max-w-2xl">
            Configure tes fournisseurs print-on-demand. Les commandes payées sont automatiquement transmises au bon fournisseur, qui imprime, emballe et livre directement le client.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/shop" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
            ← Retour Boutique
          </Link>
          <Link href="/admin/settings" className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded-full text-sm flex items-center gap-2">
            <SettingsIcon size={14} /> Paramètres avancés
          </Link>
        </div>
      </header>

      {/* COMPARATIF RAPIDE */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold mb-3 text-zinc-300">Lequel choisir ?</h2>
        <div className="grid md:grid-cols-3 gap-3 text-xs">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <div className="font-bold text-emerald-300 mb-1">🌍 GELATO — recommandé EU</div>
            <p className="text-emerald-100/80">130+ usines dans 32 pays, livraison 2-5j en Europe, carbon-neutral. Le + rapide et le + large catalogue.</p>
          </div>
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3">
            <div className="font-bold text-violet-300 mb-1">🌱 TPOP — recommandé valeurs</div>
            <p className="text-violet-100/80">100% éthique, bio, vegan, packaging recyclé, made in France/NL. Aligné GLD ❤️ — marges + fines.</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
            <div className="font-bold text-blue-300 mb-1">🇺🇸 PRINTFUL — fallback</div>
            <p className="text-blue-100/80">Le + connu mondialement, entrepôts EU à Riga & Madrid. Catalogue énorme mais + cher en EU que Gelato.</p>
          </div>
        </div>
        <p className="text-[11px] text-zinc-500 mt-3">
          💡 Tu peux activer plusieurs fournisseurs en parallèle. Chaque produit peut être assigné individuellement à celui qui propose le meilleur tarif/qualité.
        </p>
      </section>

      {/* CARTES PROVIDERS */}
      <DropshippingProviderCards
        status={providersStatus}
        printfulStoreConfigured={!!(settings['integrations.printful.storeId'] || process.env.PRINTFUL_STORE_ID)}
        productsByProvider={{
          gelato: byProvider.gelato.length,
          tpop: byProvider.tpop.length,
          printful: byProvider.printful.length
        }}
      />

      {/* PRODUITS DROPSHIP */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Tes produits en dropshipping ({dropshipProducts.length})</h2>
          <Link href="/admin/shop" className="text-xs text-brand-pink hover:underline flex items-center gap-1">
            Gérer les produits <ExternalLink size={12} />
          </Link>
        </div>
        {dropshipProducts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <Truck size={32} className="mx-auto mb-2 opacity-40" />
            <p>Aucun produit n'est encore configuré en dropshipping.</p>
            <p className="text-xs mt-1">
              Va dans <Link href="/admin/shop" className="text-brand-pink hover:underline">Boutique → Produits</Link>, ouvre un produit et choisis un fournisseur dans la section « Dropshipping ».
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dropshipProducts.map((p) => {
              const cover = p.images?.[0];
              const margin = p.costCents ? p.priceCents - p.costCents : 0;
              const marginPct = p.costCents && p.priceCents > 0 ? Math.round((margin / p.priceCents) * 100) : null;
              const provBadge = p.dropProvider === 'gelato'
                ? 'bg-emerald-500/20 text-emerald-300'
                : p.dropProvider === 'tpop'
                ? 'bg-violet-500/20 text-violet-300'
                : 'bg-blue-500/20 text-blue-300';
              return (
                <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-3">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt="" className="w-16 h-16 rounded-lg object-cover bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.title}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${provBadge}`}>
                        {p.dropProvider}
                      </span>
                      {!p.published && <span className="text-[10px] uppercase bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Brouillon</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      ID: <span className="font-mono">{p.dropProductId || '—'}</span>
                    </div>
                    {marginPct !== null && (
                      <div className="text-xs text-emerald-400 font-bold mt-1">
                        Marge {marginPct}% ({(margin / 100).toFixed(2)}€)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WORKFLOW EXPLICATION */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-lg font-bold mb-4">Comment ça marche</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="bg-brand-pink text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
            <div>
              <strong className="text-white">Tu crées tes designs</strong> chez Gelato/TPOP/Printful (ou tu importes les nôtres) puis tu récupères l'<code className="bg-zinc-800 px-1 rounded text-xs">ID variant</code>.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-pink text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
            <div>
              <strong className="text-white">Dans la fiche produit GLD</strong> (Boutique → Produits), tu choisis le fournisseur et tu colles l'ID variant + le coût d'achat. La marge s'affiche en direct.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-pink text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
            <div>
              <strong className="text-white">Quand un client paye</strong>, la commande part automatiquement chez le bon fournisseur (regroupement par provider si plusieurs articles).
            </div>
          </li>
          <li className="flex gap-3">
            <span className="bg-brand-pink text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</span>
            <div>
              <strong className="text-white">Le fournisseur imprime + emballe + livre</strong>. Tu reçois un n° de tracking, le client est notifié par email/SMS, et tu touches la marge nette.
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
