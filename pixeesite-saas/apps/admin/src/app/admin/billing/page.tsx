import { platformDb } from '@pixeesite/database';
import { card } from '@/components/SimpleOrgPage';

export const dynamic = 'force-dynamic';

export default async function AdminBillingPage() {
  const [subs, invoices, mrr] = await Promise.all([
    platformDb.subscription.findMany({
      where: { plan: { not: 'free' } },
      orderBy: { updatedAt: 'desc' },
      include: { org: { select: { slug: true, name: true } } },
    }).catch(() => []),
    platformDb.invoice.findMany({
      where: { status: 'paid' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { org: { select: { slug: true, name: true } } },
    }).catch(() => []),
    platformDb.subscription.aggregate({
      _sum: { amountCents: true },
      where: { plan: { not: 'free' } },
    }).catch(() => ({ _sum: { amountCents: 0 } })),
  ]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 16px' }}>💰 Revenus & abonnements</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>MRR</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{((mrr._sum.amountCents || 0) / 100).toFixed(0)} €</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Abonnements actifs</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{subs.length}</div>
        </div>
        <div style={card}>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>Factures payées</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{invoices.length}+</div>
        </div>
      </div>
      <h2 style={{ fontSize: 18 }}>Dernières factures</h2>
      <div style={{ ...card, padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#0a0a0f' }}>
            <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Date</th>
            <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Org</th>
            <th style={{ textAlign: 'right', padding: 10, opacity: 0.6 }}>Montant</th>
          </tr></thead>
          <tbody>
            {invoices.map((inv: any) => (
              <tr key={inv.id} style={{ borderTop: '1px solid #27272a' }}>
                <td style={{ padding: 10, opacity: 0.6 }}>{new Date(inv.createdAt).toLocaleDateString('fr-FR')}</td>
                <td style={{ padding: 10 }}>{inv.org?.name}</td>
                <td style={{ textAlign: 'right', padding: 10 }}>{((inv.amountCents || 0) / 100).toFixed(2)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
