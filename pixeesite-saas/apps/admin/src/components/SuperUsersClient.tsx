'use client';
import { useEffect, useState } from 'react';
import { card, input } from './SimpleOrgPage';

export function SuperUsersClient() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    const j = await r.json();
    setUsers(j.users || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [q]);

  async function patch(id: string, data: any) {
    await fetch('/api/admin/users', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    });
    load();
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>👥 Utilisateurs</h1>
        <input style={{ ...input, maxWidth: 280 }} placeholder="Rechercher email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ ...card, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0a0a0f' }}>
                <th style={{ textAlign: 'left', padding: 10, opacity: 0.6 }}>Email</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Orgs</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>2FA</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Super</th>
                <th style={{ textAlign: 'center', padding: 10, opacity: 0.6 }}>Banni</th>
                <th style={{ textAlign: 'right', padding: 10, opacity: 0.6 }}>Last login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderTop: '1px solid #27272a' }}>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{u.email}</div>
                    {u.name && <div style={{ fontSize: 11, opacity: 0.5 }}>{u.name}</div>}
                  </td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{u._count?.memberships || 0}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>{u.twoFactorEnabled ? '🔒' : '—'}</td>
                  <td style={{ textAlign: 'center', padding: 10 }}>
                    <input type="checkbox" checked={!!u.isSuperAdmin} onChange={(e) => patch(u.id, { isSuperAdmin: e.target.checked })} />
                  </td>
                  <td style={{ textAlign: 'center', padding: 10 }}>
                    <input type="checkbox" checked={!!u.banned} onChange={(e) => patch(u.id, { banned: e.target.checked })} />
                  </td>
                  <td style={{ textAlign: 'right', padding: 10, fontSize: 11, opacity: 0.5 }}>
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr-FR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
