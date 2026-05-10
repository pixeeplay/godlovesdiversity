'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Inbox, Send, FileText, Trash2, Star, Archive, Plus, RefreshCw, Search, X,
  Loader2, Mail, ChevronLeft, Reply, ReplyAll, Forward, Settings as SettingsIcon,
  AlertTriangle, Paperclip, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface MailAccount { id: string; label: string; email: string; isDefault: boolean; signature: string | null; }
interface Folder { path: string; name: string; specialUse?: string; unread: number; total: number; }
interface MessageSummary { uid: number; subject: string; from: { name: string; address: string }[]; to: { name: string; address: string }[]; date: string; flags: string[]; hasAttachments: boolean; preview: string; }
interface MessageFull extends MessageSummary { bodyText?: string; bodyHtml?: string; messageId: string; cc?: { name: string; address: string }[]; }

const SPECIAL_ICONS: Record<string, any> = {
  '\\Inbox': Inbox,
  '\\Sent': Send,
  '\\Drafts': FileText,
  '\\Trash': Trash2,
  '\\Junk': AlertTriangle,
  '\\Archive': Archive,
  '\\Flagged': Star
};

export function WebmailClient() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folder, setFolder] = useState<string>('INBOX');
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [selected, setSelected] = useState<MessageFull | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [composeOpen, setComposeOpen] = useState<{ to?: string; subject?: string; inReplyTo?: string; references?: string[]; quote?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load accounts
  useEffect(() => {
    fetch('/api/admin/mail/accounts').then((r) => r.json()).then((j) => {
      const list: MailAccount[] = j.accounts || [];
      setAccounts(list);
      const def = list.find((a) => a.isDefault) || list[0];
      if (def) setAccountId(def.id);
      else setShowSettings(true);
    });
  }, []);

  // Load folders when account changes
  useEffect(() => {
    if (!accountId) return;
    setError(null);
    fetch(`/api/admin/mail/folders?accountId=${accountId}`).then((r) => r.json()).then((j) => {
      if (j.error) {
        setError(j.error);
        setFolders([]);
      } else {
        setFolders(j.folders || []);
      }
    });
  }, [accountId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ accountId, folder, page: '1' });
    if (search.trim()) params.set('search', search.trim());
    const r = await fetch(`/api/admin/mail/messages?${params}`);
    const j = await r.json();
    if (j.error) {
      setError(j.error);
      setMessages([]);
    } else {
      setMessages(j.messages || []);
    }
    setLoading(false);
  }, [accountId, folder, search]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function openMessage(uid: number) {
    if (!accountId) return;
    setLoading(true);
    const r = await fetch(`/api/admin/mail/messages/${uid}?accountId=${accountId}&folder=${encodeURIComponent(folder)}`);
    const j = await r.json();
    setSelected(j.message);
    setLoading(false);
  }

  async function deleteMsg(uid: number) {
    if (!accountId || !confirm('Supprimer ce message ?')) return;
    await fetch(`/api/admin/mail/messages/${uid}?accountId=${accountId}&folder=${encodeURIComponent(folder)}`, { method: 'DELETE' });
    setSelected(null);
    loadMessages();
  }

  async function toggleFlag(uid: number, flag: string, enable: boolean) {
    if (!accountId) return;
    await fetch(`/api/admin/mail/messages/${uid}?accountId=${accountId}&folder=${encodeURIComponent(folder)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flag, enable })
    });
  }

  function reply(msg: MessageFull) {
    setComposeOpen({
      to: msg.from?.[0]?.address,
      subject: msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`,
      inReplyTo: msg.messageId,
      references: msg.messageId ? [msg.messageId] : [],
      quote: `\n\nLe ${new Date(msg.date).toLocaleString('fr-FR')}, ${msg.from?.[0]?.address} a écrit:\n> ${(msg.bodyText || '').split('\n').join('\n> ')}`
    });
  }

  if (showSettings || (accounts.length === 0 && !loading)) {
    return <MailAccountSettings onClose={() => { setShowSettings(false); fetch('/api/admin/mail/accounts').then((r) => r.json()).then((j) => setAccounts(j.accounts || [])); }} accounts={accounts} />;
  }

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-600 via-violet-600 to-fuchsia-600 rounded-2xl p-4 mb-3 ring-1 ring-white/10 flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">✉️</div>
        <div className="flex-1">
          <h1 className="text-xl font-display font-black text-white tracking-tight">Webmail</h1>
          <p className="text-white/85 text-xs">Gère le mail du site directement depuis l'admin</p>
        </div>
        {accounts.length > 1 && (
          <select value={accountId || ''} onChange={(e) => setAccountId(e.target.value)} className="bg-white/15 text-white text-xs px-3 py-2 rounded-full">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label || a.email}</option>)}
          </select>
        )}
        <button onClick={() => setComposeOpen({})} className="bg-white text-fuchsia-600 hover:bg-zinc-100 font-bold text-xs px-4 py-2 rounded-full flex items-center gap-1.5 shadow-xl">
          <Plus size={12} /> Nouveau
        </button>
        <button onClick={() => setShowSettings(true)} className="bg-white/15 hover:bg-white/25 text-white text-xs px-2.5 py-2 rounded-full" title="Comptes mail">
          <SettingsIcon size={12} />
        </button>
        <button onClick={loadMessages} className="bg-white/15 hover:bg-white/25 text-white text-xs px-2.5 py-2 rounded-full" title="Actualiser">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle size={12} /> Erreur connexion : {error}
          <button onClick={() => setShowSettings(true)} className="ml-auto bg-rose-500 hover:bg-rose-400 text-white px-3 py-1 rounded-full text-[10px] font-bold">Vérifier comptes</button>
        </div>
      )}

      {/* 3-col layout */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_360px_1fr] gap-3" style={{ minHeight: '70vh' }}>
        {/* Sidebar folders */}
        <aside className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-2 self-start">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold px-2 py-1.5">Dossiers</p>
          {folders.length === 0 ? (
            <p className="text-[10px] text-zinc-500 p-2">{loading ? 'Chargement…' : 'Aucun dossier'}</p>
          ) : (
            <nav>
              {folders.sort(sortFolders).map((f) => {
                const Icon = SPECIAL_ICONS[f.specialUse || ''] || Mail;
                return (
                  <button
                    key={f.path}
                    onClick={() => setFolder(f.path)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center gap-2 transition mb-0.5 ${
                      folder === f.path ? 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/40' : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={12} />
                    <span className="flex-1 truncate">{f.name}</span>
                    {f.unread > 0 && (
                      <span className="text-[9px] font-bold bg-fuchsia-500 text-white px-1.5 rounded-full">{f.unread}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}
        </aside>

        {/* Liste messages */}
        <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl flex flex-col min-h-0" style={{ maxHeight: '78vh' }}>
          <header className="border-b border-zinc-800 p-2 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadMessages()}
                placeholder="Rechercher…"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-2 py-1.5 text-xs"
              />
            </div>
            <span className="text-[10px] text-zinc-500">{messages.length}</span>
          </header>
          <div className="flex-1 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <p className="text-xs text-zinc-500 p-8 text-center"><Loader2 size={12} className="animate-spin inline mr-1" /> Chargement…</p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-zinc-500 p-8 text-center">Aucun message dans <strong>{folder}</strong>.</p>
            ) : (
              <ul>
                {messages.map((m) => {
                  const seen = m.flags?.includes('\\Seen');
                  const flagged = m.flags?.includes('\\Flagged');
                  return (
                    <li key={m.uid}>
                      <button
                        onClick={() => openMessage(m.uid)}
                        className={`w-full text-left p-2 border-b border-zinc-800 hover:bg-zinc-800/50 transition ${
                          selected?.uid === m.uid ? 'bg-fuchsia-500/10' : ''
                        } ${!seen ? 'bg-zinc-950' : ''}`}
                      >
                        <div className="flex items-baseline gap-1">
                          {!seen && <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500 flex-shrink-0" />}
                          <p className={`text-xs ${seen ? 'text-zinc-300' : 'text-white font-bold'} truncate flex-1`}>
                            {m.from?.[0]?.name || m.from?.[0]?.address || '(?)'}
                          </p>
                          {flagged && <Star size={10} className="text-amber-400 flex-shrink-0" />}
                          {m.hasAttachments && <Paperclip size={10} className="text-zinc-500 flex-shrink-0" />}
                          <span className="text-[10px] text-zinc-500 flex-shrink-0">
                            {m.date ? new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                          </span>
                        </div>
                        <p className={`text-xs truncate ${seen ? 'text-zinc-400' : 'text-zinc-200 font-medium'}`}>
                          {m.subject || '(sans sujet)'}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate">{m.preview}</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Lecture message */}
        <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl flex flex-col min-h-0" style={{ maxHeight: '78vh' }}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div>
                <Mail size={36} className="text-zinc-700 mx-auto mb-2" />
                <p className="text-sm text-zinc-300 font-bold">Aucun message sélectionné</p>
                <p className="text-xs text-zinc-500">Clique sur un message pour le lire</p>
              </div>
            </div>
          ) : (
            <>
              <header className="border-b border-zinc-800 p-3 flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="md:hidden p-1 text-zinc-400 hover:text-white"><ChevronLeft size={14} /></button>
                <button onClick={() => reply(selected)} className="bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Reply size={11} /> Répondre</button>
                <button onClick={() => setComposeOpen({ subject: `Fwd: ${selected.subject}`, quote: `\n\n---------- Forwarded ----------\nFrom: ${selected.from?.[0]?.address}\nDate: ${selected.date}\nSubject: ${selected.subject}\n\n${selected.bodyText || ''}` })} className="bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"><Forward size={11} /> Transférer</button>
                <button onClick={() => toggleFlag(selected.uid, '\\Flagged', !selected.flags?.includes('\\Flagged'))} className="bg-zinc-950 hover:bg-zinc-800 text-zinc-300 hover:text-amber-400 text-xs px-2 py-1.5 rounded-lg" title="Star"><Star size={11} className={selected.flags?.includes('\\Flagged') ? 'text-amber-400 fill-amber-400' : ''} /></button>
                <button onClick={() => deleteMsg(selected.uid)} className="ml-auto bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 text-xs px-2 py-1.5 rounded-lg" title="Supprimer"><Trash2 size={11} /></button>
              </header>
              <div className="p-4 overflow-y-auto flex-1">
                <h2 className="text-lg font-bold text-white mb-2">{selected.subject || '(sans sujet)'}</h2>
                <div className="text-xs space-y-1 mb-4 pb-3 border-b border-zinc-800">
                  <p>
                    <span className="text-zinc-500 mr-1">De :</span>
                    <strong className="text-white">{selected.from?.[0]?.name}</strong>{' '}
                    <span className="text-zinc-400">&lt;{selected.from?.[0]?.address}&gt;</span>
                  </p>
                  <p>
                    <span className="text-zinc-500 mr-1">À :</span>
                    <span className="text-zinc-300">{selected.to?.map((t) => t.address).join(', ')}</span>
                  </p>
                  {selected.cc && selected.cc.length > 0 && (
                    <p><span className="text-zinc-500 mr-1">CC :</span><span className="text-zinc-300">{selected.cc.map((c) => c.address).join(', ')}</span></p>
                  )}
                  <p><span className="text-zinc-500 mr-1">Date :</span><span className="text-zinc-300">{selected.date ? new Date(selected.date).toLocaleString('fr-FR') : ''}</span></p>
                </div>
                {selected.bodyHtml ? (
                  <div className="prose prose-invert prose-sm max-w-none text-zinc-200" dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.bodyHtml) }} />
                ) : (
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans">{selected.bodyText || '(pas de contenu)'}</pre>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Composer */}
      {composeOpen && accountId && (
        <Composer
          accountId={accountId}
          accounts={accounts}
          initial={composeOpen}
          onClose={() => setComposeOpen(null)}
          onSent={() => {
            setComposeOpen(null);
            loadMessages();
          }}
        />
      )}
    </div>
  );
}

function sortFolders(a: Folder, b: Folder): number {
  const order: Record<string, number> = {
    '\\Inbox': 0, '\\Flagged': 1, '\\Sent': 2, '\\Drafts': 3, '\\Archive': 4, '\\Junk': 8, '\\Trash': 9
  };
  const ao = order[a.specialUse || ''] ?? 5;
  const bo = order[b.specialUse || ''] ?? 5;
  if (ao !== bo) return ao - bo;
  return a.name.localeCompare(b.name);
}

function sanitizeHtml(html: string): string {
  // Removes scripts and external image redirects (basic)
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}

function Composer({ accountId, accounts, initial, onClose, onSent }: {
  accountId: string; accounts: MailAccount[]; initial: any; onClose: () => void; onSent: () => void;
}) {
  const acc = accounts.find((a) => a.id === accountId);
  const [to, setTo] = useState(initial.to || '');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(initial.subject || '');
  const [body, setBody] = useState(initial.quote || '');
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);

  async function send() {
    if (!to.trim() || !subject.trim()) {
      alert('Destinataire et sujet requis');
      return;
    }
    setSending(true);
    const r = await fetch('/api/admin/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        cc: cc.split(',').map((s) => s.trim()).filter(Boolean),
        subject,
        text: body,
        inReplyTo: initial.inReplyTo,
        references: initial.references
      })
    });
    const j = await r.json();
    setSending(false);
    if (j.ok) {
      onSent();
    } else {
      alert('Erreur envoi : ' + (j.error || 'unknown'));
    }
  }

  return (
    <div className="fixed bottom-3 right-3 w-full max-w-2xl z-50 bg-zinc-950 border border-fuchsia-500/40 rounded-t-2xl shadow-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
      <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center gap-2">
        <h3 className="text-xs font-bold text-white">Nouveau message</h3>
        <span className="text-[10px] text-zinc-500">depuis {acc?.email}</span>
        <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-white"><X size={14} /></button>
      </header>
      <div className="p-3 space-y-2 flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold w-12">À</span>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="email1@..., email2@..." className="flex-1 bg-transparent text-xs outline-none" />
          {!showCc && <button onClick={() => setShowCc(true)} className="text-[10px] text-zinc-400 hover:text-white">Cc</button>}
        </div>
        {showCc && (
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold w-12">Cc</span>
            <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc..." className="flex-1 bg-transparent text-xs outline-none" />
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold w-12">Sujet</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Sujet" className="flex-1 bg-transparent text-xs font-bold outline-none" />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tape ton message…"
          rows={12}
          className="w-full bg-transparent text-xs outline-none resize-none font-sans"
        />
        {acc?.signature && (
          <div className="text-[10px] text-zinc-500 border-t border-zinc-800 pt-2 italic whitespace-pre-wrap">--{'\n'}{acc.signature}</div>
        )}
      </div>
      <footer className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 flex items-center gap-2">
        <button onClick={send} disabled={sending} className="bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
          {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
        <span className="text-[10px] text-zinc-500 ml-2">Ctrl+Enter pour envoyer</span>
      </footer>
    </div>
  );
}

function MailAccountSettings({ onClose, accounts }: { onClose: () => void; accounts: MailAccount[] }) {
  const [creating, setCreating] = useState(accounts.length === 0);
  const [form, setForm] = useState<any>({
    label: '', email: '', imapHost: '', imapPort: 993, imapSecure: true, imapUser: '', imapPassword: '',
    smtpHost: '', smtpPort: 465, smtpSecure: true, smtpUser: '', smtpPassword: '',
    signature: '', isDefault: true
  });

  async function save() {
    if (!form.email || !form.imapHost || !form.imapUser || !form.imapPassword) {
      alert('Email, IMAP host/user/pwd requis');
      return;
    }
    if (!form.smtpUser) form.smtpUser = form.imapUser;
    if (!form.smtpPassword) form.smtpPassword = form.imapPassword;
    if (!form.smtpHost) form.smtpHost = form.imapHost.replace(/^imap\./, 'smtp.');
    const r = await fetch('/api/admin/mail/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (r.ok) onClose();
    else alert('Erreur sauvegarde');
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce compte ?')) return;
    await fetch(`/api/admin/mail/accounts?id=${id}`, { method: 'DELETE' });
    onClose();
  }

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-3xl mx-auto">
      <div className="bg-gradient-to-br from-cyan-600 to-fuchsia-600 rounded-2xl p-5 mb-4 ring-1 ring-white/10">
        <h1 className="text-xl font-display font-black text-white">Comptes mail</h1>
        <p className="text-white/85 text-xs mt-1">IMAP pour lire — SMTP pour envoyer</p>
      </div>

      {accounts.length > 0 && !creating && (
        <div className="space-y-2 mb-4">
          {accounts.map((a) => (
            <article key={a.id} className="bg-zinc-900 ring-1 ring-zinc-800 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/15 text-fuchsia-300 flex items-center justify-center"><Mail size={14} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{a.label || a.email}</p>
                <p className="text-[10px] text-zinc-500 truncate">{a.email} {a.isDefault && <span className="ml-1 px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[8px]">DEFAULT</span>}</p>
              </div>
              <button onClick={() => del(a.id)} className="text-rose-400 hover:text-rose-300 p-1.5"><Trash2 size={12} /></button>
            </article>
          ))}
          <button onClick={() => setCreating(true)} className="w-full bg-zinc-900 hover:bg-zinc-800 ring-1 ring-dashed ring-zinc-700 hover:ring-fuchsia-500 rounded-xl p-3 text-xs text-zinc-300 flex items-center justify-center gap-1.5">
            <Plus size={11} /> Ajouter un compte
          </button>
        </div>
      )}

      {creating && (
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 space-y-3">
          <h2 className="text-sm font-bold flex items-center gap-2"><Plus size={13} /> Nouveau compte mail</h2>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2.5 text-[11px] text-cyan-200">
            💡 <strong>Gmail :</strong> active 2FA puis génère un <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">app password</a>.
            IMAP : <code>imap.gmail.com:993</code> · SMTP : <code>smtp.gmail.com:465</code>
            <br />
            <strong>OVH/IONOS/etc</strong> : <code>imap.ton-domaine.fr:993</code> · <code>smtp.ton-domaine.fr:465</code>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs"><span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Label</span>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Contact GLD" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            </label>
            <label className="text-xs"><span className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Email</span>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value, imapUser: form.imapUser || e.target.value, smtpUser: form.smtpUser || e.target.value })} placeholder="contact@gld.pixeeplay.com" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />
            </label>
          </div>

          <h3 className="text-[10px] uppercase tracking-widest text-cyan-300 font-bold pt-2">IMAP (lecture)</h3>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.imapHost} onChange={(e) => setForm({ ...form, imapHost: e.target.value })} placeholder="imap.gmail.com" className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input type="number" value={form.imapPort} onChange={(e) => setForm({ ...form, imapPort: Number(e.target.value) })} placeholder="993" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.imapUser} onChange={(e) => setForm({ ...form, imapUser: e.target.value })} placeholder="user" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input type="password" value={form.imapPassword} onChange={(e) => setForm({ ...form, imapPassword: e.target.value })} placeholder="App password" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>

          <h3 className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold pt-2">SMTP (envoi) — vide = même que IMAP</h3>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} placeholder="smtp.gmail.com" className="col-span-2 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} placeholder="465" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={form.smtpUser} onChange={(e) => setForm({ ...form, smtpUser: e.target.value })} placeholder="user (= IMAP)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
            <input type="password" value={form.smtpPassword} onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })} placeholder="(= IMAP)" className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono" />
          </div>

          <textarea value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value })} placeholder="Signature (optionnel)..." rows={3} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs" />

          <label className="flex items-center gap-2 text-xs text-zinc-300">
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Compte par défaut
          </label>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={() => setCreating(false)} className="text-xs text-zinc-400 hover:text-white px-3 py-1.5">Annuler</button>
            <button onClick={save} className="ml-auto bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold px-4 py-2 rounded-full">Enregistrer</button>
          </div>
        </div>
      )}

      {accounts.length > 0 && !creating && (
        <button onClick={onClose} className="mt-3 text-xs text-zinc-400 hover:text-white">← Retour au webmail</button>
      )}
    </div>
  );
}
