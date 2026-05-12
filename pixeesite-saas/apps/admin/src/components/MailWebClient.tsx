'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

type Account = { id: string; email: string; label: string };
type Folder = { path: string; name: string; unread: number; total: number; specialUse?: string };
type Message = {
  uid: number; subject: string; date: string;
  from: { name: string; address: string }[];
  to: { name: string; address: string }[];
  preview?: string; bodyText?: string; bodyHtml?: string;
  flags?: string[];
};

export function MailWebClient({ orgSlug }: { orgSlug: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string>('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folder, setFolder] = useState<string>('INBOX');
  const [messages, setMessages] = useState<Message[]>([]);
  const [open, setOpen] = useState<Message | null>(null);
  const [loading, setLoading] = useState<'accounts' | 'folders' | 'messages' | 'message' | null>('accounts');
  const [error, setError] = useState<string>('');
  const [reply, setReply] = useState<{ to: string; subject: string; text: string } | null>(null);
  const [composing, setComposing] = useState<{ to: string; subject: string; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function loadAccounts() {
    setLoading('accounts'); setError('');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/mail-accounts`);
      const j = await r.json();
      const list: Account[] = j.items || [];
      setAccounts(list);
      if (list.length > 0 && !accountId) setAccountId(list[0].id);
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(null); }
  }

  async function loadFolders(accId: string) {
    setLoading('folders'); setError('');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/mail-web/folders?accountId=${accId}`);
      const j = await r.json();
      if (j.error) { setError(j.error); setFolders([]); }
      else setFolders(j.folders || []);
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(null); }
  }

  async function loadMessages() {
    if (!accountId || !folder) return;
    setLoading('messages'); setError('');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/mail-web/messages?accountId=${accountId}&folder=${encodeURIComponent(folder)}&pageSize=30`);
      const j = await r.json();
      if (j.error) { setError(j.error); setMessages([]); }
      else setMessages(j.messages || []);
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(null); }
  }

  async function openMessage(m: Message) {
    setLoading('message');
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/mail-web/messages/${m.uid}?accountId=${accountId}&folder=${encodeURIComponent(folder)}`);
      const j = await r.json();
      if (j.message) setOpen(j.message);
      else setError(j.error || 'erreur');
    } finally { setLoading(null); }
  }

  async function send(payload: { to: string; subject: string; text: string; inReplyTo?: string }) {
    if (!accountId) return;
    setSending(true);
    const r = await fetch(`/api/orgs/${orgSlug}/mail-web/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, to: payload.to, subject: payload.subject, text: payload.text, inReplyTo: payload.inReplyTo }),
    });
    const j = await r.json();
    setSending(false);
    if (j.ok) { alert('✓ Envoyé'); setReply(null); setComposing(null); }
    else alert(`Erreur : ${j.error}`);
  }

  useEffect(() => { loadAccounts(); }, []);
  useEffect(() => { if (accountId) loadFolders(accountId); }, [accountId]);
  useEffect(() => { if (accountId && folder) loadMessages(); }, [accountId, folder]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="📬" title="Webmail"
      desc="Lis et réponds depuis tes boîtes IMAP/SMTP — folders, messages, reply."
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {accounts.length > 0 && (
            <select value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ ...input, width: 'auto', padding: 6 }}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.label || a.email}</option>)}
            </select>
          )}
          <button style={btnPrimary} onClick={() => setComposing({ to: '', subject: '', text: '' })}>+ Nouveau</button>
          <Link href={`/dashboard/orgs/${orgSlug}/mail-setup`} style={{ ...btnSecondary, textDecoration: 'none' }}>⚙ Boîtes</Link>
        </div>
      }>

      {error && <div style={{ ...card, marginBottom: 12, padding: 10, borderColor: '#ef4444', color: '#ef4444', fontSize: 12 }}>⚠ {error}</div>}

      {accounts.length === 0 && loading !== 'accounts' ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48 }}>📬</div>
          <p style={{ opacity: 0.6 }}>Aucune boîte configurée.</p>
          <Link href={`/dashboard/orgs/${orgSlug}/mail-setup`} style={{ ...btnPrimary, textDecoration: 'none' }}>+ Connecter</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 12 }}>
          {/* Sidebar folders */}
          <aside style={{ ...card, padding: 8, height: 'fit-content' }}>
            {loading === 'folders' ? <p style={{ opacity: 0.5, padding: 8 }}>Chargement…</p>
            : folders.length === 0 ? <p style={{ opacity: 0.5, padding: 8, fontSize: 12 }}>Aucun dossier</p>
            : folders.map((f) => (
              <button key={f.path} onClick={() => setFolder(f.path)}
                style={{ ...folderBtn, ...(folder === f.path ? { background: '#1a1a2e', fontWeight: 700 } : {}) }}>
                <span>{folderEmoji(f.path)} {f.name}</span>
                {f.unread > 0 && <span style={{ fontSize: 10, background: '#d946ef', color: 'white', padding: '1px 6px', borderRadius: 8 }}>{f.unread}</span>}
              </button>
            ))}
          </aside>

          {/* Messages list */}
          <main style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <header style={{ padding: 10, borderBottom: '1px solid #27272a', fontSize: 12, opacity: 0.7, display: 'flex', justifyContent: 'space-between' }}>
              <strong>{folder}</strong>
              <span>{messages.length} messages</span>
            </header>
            {loading === 'messages' ? <p style={{ padding: 20, opacity: 0.5 }}>Chargement…</p>
            : messages.length === 0 ? <p style={{ padding: 20, opacity: 0.5 }}>Aucun message</p>
            : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '70vh', overflow: 'auto' }}>
                {messages.map((m) => (
                  <li key={m.uid} onClick={() => openMessage(m)}
                    style={{ padding: 10, borderBottom: '1px solid #1a1a2e', cursor: 'pointer', fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <strong>{m.from?.[0]?.name || m.from?.[0]?.address || '(inconnu)'}</strong>
                      <span style={{ opacity: 0.5, fontSize: 10 }}>{m.date && new Date(m.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div style={{ fontWeight: 600, marginTop: 2 }}>{m.subject}</div>
                    {m.preview && <div style={{ opacity: 0.6, marginTop: 2 }}>{m.preview.slice(0, 100)}…</div>}
                  </li>
                ))}
              </ul>
            )}
          </main>
        </div>
      )}

      {/* Modal: lecture message */}
      {open && (
        <div onClick={() => setOpen(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 800, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
            <h3 style={{ marginTop: 0 }}>{open.subject}</h3>
            <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12 }}>
              De : {open.from?.[0]?.name} &lt;{open.from?.[0]?.address}&gt;<br />
              Date : {open.date && new Date(open.date).toLocaleString('fr-FR')}
            </div>
            <div style={{ background: '#fff', color: 'black', padding: 16, borderRadius: 8, marginBottom: 12, maxHeight: '50vh', overflow: 'auto' }}>
              {open.bodyHtml ? <div dangerouslySetInnerHTML={{ __html: open.bodyHtml }} /> : <pre style={{ whiteSpace: 'pre-wrap' }}>{open.bodyText}</pre>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btnSecondary} onClick={() => setOpen(null)}>Fermer</button>
              <button style={btnPrimary} onClick={() => {
                setReply({
                  to: open.from?.[0]?.address || '',
                  subject: open.subject.startsWith('Re:') ? open.subject : `Re: ${open.subject}`,
                  text: `\n\n--- Message original ---\n${open.bodyText || ''}`,
                });
                setOpen(null);
              }}>↩ Répondre</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: reply / compose */}
      {(reply || composing) && (() => {
        const m = reply || composing!;
        const update = (patch: any) => (reply ? setReply({ ...reply, ...patch }) : setComposing({ ...composing!, ...patch }));
        const close = () => { setReply(null); setComposing(null); };
        return (
          <div onClick={close} style={modalOverlay}>
            <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 600, width: '100%', maxHeight: '95vh', overflow: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>{reply ? 'Répondre' : 'Nouveau message'}</h3>
              <Field label="À *"><input style={input} value={m.to} onChange={(e) => update({ to: e.target.value })} /></Field>
              <Field label="Sujet *"><input style={input} value={m.subject} onChange={(e) => update({ subject: e.target.value })} /></Field>
              <Field label="Message">
                <textarea style={{ ...input, minHeight: 200 }} value={m.text} onChange={(e) => update({ text: e.target.value })} />
              </Field>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={btnSecondary} onClick={close}>Annuler</button>
                <button style={btnPrimary} disabled={sending || !m.to || !m.subject} onClick={() => send(m)}>{sending ? 'Envoi…' : '✉ Envoyer'}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </SimpleOrgPage>
  );
}

function folderEmoji(path: string) {
  const p = path.toUpperCase();
  if (p.includes('INBOX')) return '📥';
  if (p.includes('SENT')) return '📤';
  if (p.includes('DRAFT')) return '📝';
  if (p.includes('SPAM') || p.includes('JUNK')) return '🚫';
  if (p.includes('TRASH') || p.includes('DELETED')) return '🗑';
  return '📁';
}
function Field({ label, children }: { label: string; children: any }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>{children}</label>;
}
const folderBtn: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  width: '100%', padding: '8px 10px', background: 'transparent', color: 'inherit',
  border: 0, cursor: 'pointer', borderRadius: 6, fontSize: 12, textAlign: 'left',
};
const modalOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16, overflow: 'auto' };
