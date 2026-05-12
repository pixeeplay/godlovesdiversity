/**
 * Service IMAP+SMTP tenant-scoped pour le webmail multi-tenant.
 *
 * Lookup d'account via tenantDb.mailAccount (la table tenant). Toutes les fonctions
 * prennent orgSlug + accountId pour bien isoler par tenant.
 *
 * Note: imapflow et nodemailer sont importés en dynamic import pour rester optionnels :
 * si les libs ne sont pas installées on retourne une erreur explicite plutôt que de crasher.
 */
import { getTenantPrisma } from '@pixeesite/database';

export interface MailFolder {
  path: string;
  name: string;
  delimiter: string;
  flags: string[];
  specialUse?: string;
  unread: number;
  total: number;
}

export interface MailMessage {
  uid: number;
  seq?: number;
  messageId: string;
  from: { name: string; address: string }[];
  to: { name: string; address: string }[];
  cc?: { name: string; address: string }[];
  subject: string;
  date: string;
  flags: string[];
  hasAttachments: boolean;
  preview: string;
  bodyText?: string;
  bodyHtml?: string;
}

async function loadAccount(orgSlug: string, accountId: string) {
  const db = await getTenantPrisma(orgSlug);
  const acc = await (db as any).mailAccount.findUnique({ where: { id: accountId } });
  if (!acc) throw new Error('mail-account-not-found');
  return acc;
}

async function openImap(acc: any) {
  const mod: any = await import('imapflow').catch(() => null);
  if (!mod?.ImapFlow) throw new Error('imapflow-not-installed (pnpm add imapflow mailparser)');
  const client = new mod.ImapFlow({
    host: acc.imapHost, port: acc.imapPort, secure: acc.imapSecure,
    auth: { user: acc.imapUser, pass: acc.imapPassword },
    logger: false,
  });
  await client.connect();
  return client;
}

export async function listFolders(orgSlug: string, accountId: string): Promise<MailFolder[]> {
  const acc = await loadAccount(orgSlug, accountId);
  const client = await openImap(acc);
  const out: MailFolder[] = [];
  try {
    const list = await client.list();
    for (const f of list) {
      let unread = 0, total = 0;
      try {
        const s: any = await client.status(f.path, { unseen: true, messages: true } as any);
        unread = s.unseen || 0; total = s.messages || 0;
      } catch {}
      out.push({ path: f.path, name: f.name, delimiter: f.delimiter, flags: Array.from(f.flags || []), specialUse: f.specialUse, unread, total });
    }
  } finally { await client.logout().catch(() => {}); }
  return out;
}

export async function listMessages(
  orgSlug: string, accountId: string, folder: string,
  { page = 1, pageSize = 30 }: { page?: number; pageSize?: number } = {},
) {
  const acc = await loadAccount(orgSlug, accountId);
  const client = await openImap(acc);
  const out: { messages: MailMessage[]; total: number; folder: string } = { messages: [], total: 0, folder };
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    const status: any = client.mailbox;
    out.total = status?.exists || 0;
    if (out.total === 0) return out;
    const start = Math.max(1, out.total - page * pageSize + 1);
    const end = out.total - (page - 1) * pageSize;
    if (start > end) return out;
    const range = `${start}:${end}`;
    const messages: MailMessage[] = [];
    for await (const msg of client.fetch(range, { uid: true, flags: true, envelope: true, bodyStructure: true } as any)) {
      const env: any = msg.envelope || {};
      messages.push({
        uid: msg.uid as number,
        seq: msg.seq as number,
        messageId: env.messageId || '',
        from: (env.from || []).map((a: any) => ({ name: a.name || '', address: a.address || '' })),
        to: (env.to || []).map((a: any) => ({ name: a.name || '', address: a.address || '' })),
        cc: (env.cc || []).map((a: any) => ({ name: a.name || '', address: a.address || '' })),
        subject: env.subject || '(sans sujet)',
        date: env.date ? new Date(env.date).toISOString() : '',
        flags: Array.from((msg.flags || []) as any),
        hasAttachments: false,
        preview: '',
      });
    }
    out.messages = messages.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
  return out;
}

export async function getMessage(orgSlug: string, accountId: string, folder: string, uid: number): Promise<MailMessage | null> {
  const acc = await loadAccount(orgSlug, accountId);
  const client = await openImap(acc);
  const parserMod: any = await import('mailparser').catch(() => null);
  const simpleParser = parserMod?.simpleParser;
  let result: MailMessage | null = null;
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    const dl: any = await client.download(String(uid), undefined, { uid: true });
    if (!dl?.content) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of dl.content) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    const parsed: any = simpleParser ? await simpleParser(raw) : null;
    const env: any = await client.fetchOne(String(uid), { uid: true, envelope: true, flags: true } as any, { uid: true });
    const e: any = env?.envelope || {};
    result = {
      uid,
      messageId: e.messageId || parsed?.messageId || '',
      from: parsed?.from?.value?.map((a: any) => ({ name: a.name || '', address: a.address || '' })) || [],
      to: parsed?.to?.value?.map((a: any) => ({ name: a.name || '', address: a.address || '' })) || [],
      cc: parsed?.cc?.value?.map((a: any) => ({ name: a.name || '', address: a.address || '' })) || [],
      subject: parsed?.subject || e.subject || '(sans sujet)',
      date: parsed?.date ? new Date(parsed.date).toISOString() : (e.date ? new Date(e.date).toISOString() : ''),
      flags: Array.from((env?.flags || []) as any),
      hasAttachments: !!parsed?.attachments?.length,
      preview: (parsed?.text || '').slice(0, 200),
      bodyText: parsed?.text || '',
      bodyHtml: parsed?.html || '',
    };
    try { await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }); } catch {}
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
  return result;
}

export async function sendEmail(
  orgSlug: string, accountId: string,
  msg: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; text?: string; html?: string; inReplyTo?: string; references?: string[] },
) {
  const acc = await loadAccount(orgSlug, accountId);
  const nm: any = await import('nodemailer').catch(() => null);
  if (!nm) throw new Error('nodemailer-not-installed (pnpm add nodemailer)');
  const transporter = nm.createTransport({
    host: acc.smtpHost, port: acc.smtpPort, secure: acc.smtpSecure,
    auth: { user: acc.smtpUser, pass: acc.smtpPassword },
  });
  const text = msg.text || (msg.html ? msg.html.replace(/<[^>]+>/g, ' ') : '');
  const sig = acc.signature ? `\n\n--\n${acc.signature}` : '';
  const info = await transporter.sendMail({
    from: acc.email, to: msg.to, cc: msg.cc, bcc: msg.bcc,
    subject: msg.subject, text: text + sig, html: msg.html,
    inReplyTo: msg.inReplyTo, references: msg.references,
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

export async function deleteMessage(orgSlug: string, accountId: string, folder: string, uid: number) {
  const acc = await loadAccount(orgSlug, accountId);
  const client = await openImap(acc);
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    await client.messageDelete(String(uid), { uid: true });
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
}
