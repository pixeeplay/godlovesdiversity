import { platformDb } from '@pixeesite/database';
import { card } from '@/components/SimpleOrgPage';

export const dynamic = 'force-dynamic';

export default async function AdminAuditPage() {
  const logs = await platformDb.platformAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  }).catch(() => []);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, margin: '0 0 16px' }}>📜 Audit log</h1>
      <div style={{ ...card, padding: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#0a0a0f' }}>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Date</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>User ID</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Org ID</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Action</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Resource</th>
              <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>IP</th>
            </tr>
          </thead>
          <tbody>
            {(logs || []).map((l: any) => (
              <tr key={l.id} style={{ borderTop: '1px solid #27272a' }}>
                <td style={{ padding: 10, opacity: 0.6 }}>{new Date(l.createdAt).toLocaleString('fr-FR')}</td>
                <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{l.userId?.slice(0, 8) || '—'}</td>
                <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{l.orgId?.slice(0, 8) || '—'}</td>
                <td style={{ padding: 10, fontFamily: 'monospace' }}>{l.action}</td>
                <td style={{ padding: 10, fontFamily: 'monospace', fontSize: 11 }}>{l.resource || '—'}</td>
                <td style={{ padding: 10, opacity: 0.5, fontSize: 11 }}>{l.ip || '—'}</td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', opacity: 0.5 }}>Aucun log</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
