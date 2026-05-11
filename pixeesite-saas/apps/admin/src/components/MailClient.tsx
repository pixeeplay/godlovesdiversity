'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

export function MailClient({ orgSlug }: { orgSlug: string }) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ imapPort: 993, smtpPort: 465, imapSecure: true, smtpSecure: true });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/mail-accounts`);
    const j = await r.json();
    setAccounts(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    const r = await fetch(`/api/orgs/${orgSlug}/mail-accounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (r.ok) { setShowNew(false); setDraft({ imapPort: 993, smtpPort: 465, imapSecure: true, smtpSecure: true }); load(); }
    else { const j = await r.json(); alert(j.error || 'Erreur'); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer ce compte mail ?')) return;
    await fetch(`/api/orgs/${orgSlug}/mail-accounts?id=${id}`, { method: 'DELETE' });
    load();
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Boîte mail</button>
  );
  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="✉️" title="Webmail"
      desc="Connecte tes boîtes IMAP/SMTP — envoie et reçois depuis le dashboard"
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : accounts.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
          <p style={{ opacity: 0.6, margin: '0 0 8px' }}>Aucune boîte mail configurée.</p>
          <p style={{ opacity: 0.5, fontSize: 12, margin: '0 0 16px' }}>Configure IMAP+SMTP pour gérer tes emails depuis Pixeesite.</p>
          <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Connecter une boîte</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {accounts.map((a) => (
            <article key={a.id} style={{ ...card, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✉️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.label}{a.isDefault && <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 6px', background: '#d946ef33', color: '#d946ef', borderRadius: 4 }}>DEFAULT</span>}</div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>{a.email}</div>
                <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>IMAP {a.imapHost} · SMTP {a.smtpHost}</div>
              </div>
              <button onClick={() => remove(a.id)} style={{ background: 'transparent', color: '#ef4444', border: 0, cursor: 'pointer' }}>×</button>
            </article>
          ))}
        </div>
      )}

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>Connecter une boîte mail</h3>
            <p style={{ fontSize: 12, opacity: 0.6 }}>Tes mots de passe sont chiffrés au repos. Utilise un mot de passe d'application si possible (Gmail, iCloud).</p>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Label</div>
              <input style={input} placeholder="Boîte principale" value={draft.label || ''} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Email *</div>
              <input style={input} type="email" value={draft.email || ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </label>
            <h4 style={{ fontSize: 13, opacity: 0.7, margin: '12px 0 6px' }}>IMAP (réception)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
              <input style={input} placeholder="imap.gmail.com" value={draft.imapHost || ''} onChange={(e) => setDraft({ ...draft, imapHost: e.target.value })} />
              <input style={input} type="number" placeholder="993" value={draft.imapPort} onChange={(e) => setDraft({ ...draft, imapPort: parseInt(e.target.value || '993', 10) })} />
            </div>
            <input style={{ ...input, marginBottom: 8 }} type="password" placeholder="Mot de passe IMAP" value={draft.imapPassword || ''} onChange={(e) => setDraft({ ...draft, imapPassword: e.target.value })} />
            <h4 style={{ fontSize: 13, opacity: 0.7, margin: '12px 0 6px' }}>SMTP (envoi)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
              <input style={input} placeholder="smtp.gmail.com" value={draft.smtpHost || ''} onChange={(e) => setDraft({ ...draft, smtpHost: e.target.value })} />
              <input style={input} type="number" placeholder="465" value={draft.smtpPort} onChange={(e) => setDraft({ ...draft, smtpPort: parseInt(e.target.value || '465', 10) })} />
            </div>
            <input style={{ ...input, marginBottom: 12 }} type="password" placeholder="Mot de passe SMTP" value={draft.smtpPassword || ''} onChange={(e) => setDraft({ ...draft, smtpPassword: e.target.value })} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
              <span style={{ fontSize: 13 }}>Par défaut pour cette org</span>
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
              <button style={btnPrimary} onClick={save}>Connecter</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
