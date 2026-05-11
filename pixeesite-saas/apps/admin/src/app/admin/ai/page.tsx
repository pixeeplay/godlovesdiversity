import { platformDb } from '@pixeesite/database';
import { card } from '@/components/SimpleOrgPage';

export const dynamic = 'force-dynamic';

export default async function AdminAiPage() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [byProvider, recent] = await Promise.all([
    platformDb.aiUsage.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: since } },
      _sum: { costCents: true, promptTokens: true, outputTokens: true },
      _count: true,
    }).catch(() => [] as any[]),
    platformDb.aiUsage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => [] as any[]),
  ]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 16px' }}>🤖 IA Usage (30 derniers jours)</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {byProvider.map((p: any) => (
          <div key={p.provider} style={card}>
            <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>{p.provider}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {((p._sum.costCents || 0) / 100).toFixed(2)} €
            </div>
            <div style={{ fontSize: 11, opacity: 0.5 }}>
              {p._count} requêtes · {((p._sum.promptTokens || 0) + (p._sum.outputTokens || 0)).toLocaleString()} tokens
            </div>
          </div>
        ))}
        {byProvider.length === 0 && <p style={{ opacity: 0.5 }}>Aucune utilisation enregistrée</p>}
      </div>
      <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>Dernières requêtes</h2>
      <div style={{ ...card, padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0a0a0f' }}>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Date</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Provider · Modèle</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Op</th>
              <th style={{ textAlign: 'right', padding: 10, opacity: 0.6 }}>Tokens</th>
              <th style={{ textAlign: 'right', padding: 10, opacity: 0.6 }}>Coût</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r: any) => (
              <tr key={r.id} style={{ borderTop: '1px solid #27272a' }}>
                <td style={{ padding: 10, opacity: 0.6 }}>{new Date(r.createdAt).toLocaleString('fr-FR')}</td>
                <td style={{ padding: 10 }}>{r.provider} · <code>{r.model}</code></td>
                <td style={{ padding: 10 }}>{r.operation}</td>
                <td style={{ textAlign: 'right', padding: 10 }}>{(r.promptTokens || 0) + (r.outputTokens || 0)}</td>
                <td style={{ textAlign: 'right', padding: 10 }}>{((r.costCents || 0) / 100).toFixed(4)} €</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
