'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SimpleOrgPage, card, input, btnPrimary } from './SimpleOrgPage';

const ROLE_META: Record<string, { color: string; label: string }> = {
  owner: { color: '#d946ef', label: 'Owner' },
  admin: { color: '#06b6d4', label: 'Admin' },
  editor: { color: '#10b981', label: 'Éditeur' },
  viewer: { color: '#a1a1aa', label: 'Viewer' },
};

export function TeamClient({ orgSlug, role, members, invites }: { orgSlug: string; role: string; members: any[]; invites: any[] }) {
  const router = useRouter();
  const canInvite = ['owner', 'admin'].includes(role);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');
  const [sending, setSending] = useState(false);

  async function sendInvite() {
    setSending(true);
    const r = await fetch(`/api/orgs/${orgSlug}/team/invites`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role: inviteRole }),
    });
    const j = await r.json();
    setSending(false);
    if (j.ok) {
      alert(`✓ Invitation envoyée à ${email}`);
      setShowInvite(false); setEmail('');
      router.refresh();
    } else alert('Erreur : ' + (j.error || 'unknown'));
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="👥" title="Équipe"
      desc={`${members.length} membre(s) · ${invites.length} invitation(s) en attente`}
      actions={canInvite ? <button style={btnPrimary} onClick={() => setShowInvite(true)}>+ Inviter</button> : null}
    >
      <h3 style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>Membres</h3>
      <div style={{ display: 'grid', gap: 8, marginBottom: 24 }}>
        {members.map((m: any) => {
          const rm = ROLE_META[m.role] || ROLE_META.viewer;
          return (
            <div key={m.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: rm.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{m.user.name || m.user.email}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{m.user.email}</div>
              </div>
              <span style={{ background: `${rm.color}22`, color: rm.color, padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{rm.label}</span>
            </div>
          );
        })}
      </div>

      {invites.length > 0 && (
        <>
          <h3 style={{ fontSize: 14, opacity: 0.7 }}>Invitations en attente</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {invites.map((inv: any) => (
              <div key={inv.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12, opacity: 0.7 }}>
                <span style={{ fontSize: 18 }}>📧</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{inv.email}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{inv.role} · expire {new Date(inv.expiresAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showInvite && (
        <div onClick={() => setShowInvite(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 420, width: '90%' }}>
            <h3 style={{ marginTop: 0 }}>Inviter un membre</h3>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" autoFocus style={{ ...input, marginBottom: 12 }} />
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)} style={input}>
              <option value="admin">Admin (gère membres + paramètres)</option>
              <option value="editor">Éditeur (gère sites + contenus)</option>
              <option value="viewer">Viewer (lecture seule)</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowInvite(false)} style={{ background: 'transparent', border: 0, color: '#a1a1aa', padding: '8px 12px', cursor: 'pointer' }}>Annuler</button>
              <button onClick={sendInvite} disabled={sending || !email.includes('@')} style={{ ...btnPrimary, opacity: sending ? 0.5 : 1 }}>
                {sending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
