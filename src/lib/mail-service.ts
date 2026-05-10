/**
 * Service de connexion IMAP + SMTP pour le webmail back-office.
 *
 * - listFolders(accountId)
 * - listMessages(accountId, folder, { page, pageSize, search })
 * - getMessage(accountId, folder, uid)
 * - sendEmail(accountId, { to, subject, body, html, replyTo })
 * - markRead / markUnread / moveToFolder / deleteMessage
 *
 * Cache léger pour éviter de re-créer la connexion à chaque appel.
 */
import { prisma } from './prisma';

export interface MailAccount {
  id: string;
  email: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  signature: string | null;
}

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

async function loadAccount(accountId: string): Promise<MailAccount> {
  const acc = await (prisma as any).mailAccount.findUnique({ where: { id: accountId } });
  if (!acc) throw new Error('mail-account-not-found');
  return acc as MailAccount;
}

/**
 * Liste les dossiers IMAP avec leurs counts (unread + total).
 */
export async function listFolders(accountId: string): Promise<MailFolder[]> {
  const acc = await loadAccount(accountId);
  const { ImapFlow } = await import('imapflow').catch(() => ({ ImapFlow: null as any }));
  if (!ImapFlow) throw new Error('imapflow-not-installed');

  const client = new ImapFlow({
    host: acc.imapHost,
    port: acc.imapPort,
    secure: acc.imapSecure,
    auth: { user: acc.imapUser, pass: acc.imapPassword },
    logger: false
  });
  await client.connect();
  const folders: MailFolder[] = [];
  try {
    const list = await client.list();
    for (const f of list) {
      let unread = 0;
      let total = 0;
      try {
        const status = await client.status(f.path, { unseen: true, messages: true } as any);
        unread = (status as any).unseen || 0;
        total = (status as any).messages || 0;
      } catch {}
      folders.push({
        path: f.path,
        name: f.name,
        delimiter: f.delimiter,
        flags: Array.from(f.flags || []),
        specialUse: f.specialUse,
        unread,
        total
      });
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return folders;
}

/**
 * Liste les messages d'un dossier (paginé, du plus récent au plus ancien).
 */
export async function listMessages(
  accountId: string,
  folder: string,
  { page = 1, pageSize = 30, search = '' }: { page?: number; pageSize?: number; search?: string } = {}
) {
  const acc = await loadAccount(accountId);
  const { ImapFlow } = await import('imapflow').catch(() => ({ ImapFlow: null as any }));
  if (!ImapFlow) throw new Error('imapflow-not-installed');

  const client = new ImapFlow({
    host: acc.imapHost,
    port: acc.imapPort,
    secure: acc.imapSecure,
    auth: { user: acc.imapUser, pass: acc.imapPassword },
    logger: false
  });
  await client.connect();

  const out: { messages: MailMessage[]; total: number; folder: string } = {
    messages: [],
    total: 0,
    folder
  };

  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    const status = client.mailbox as any;
    out.total = status?.exists || 0;

    if (out.total === 0) return out;

    // Calcul des seq # à fetch (du plus récent au plus ancien)
    const start = Math.max(1, out.total - page * pageSize + 1);
    const end = out.total - (page - 1) * pageSize;
    if (start > end) return out;

    let searchUids: number[] | null = null;
    if (search.trim()) {
      try {
        const r = await client.search({
          or: [
            { subject: search },
            { from: search },
            { body: search }
          ]
        });
        searchUids = (r as any) || [];
      } catch {}
    }

    const range = `${start}:${end}`;
    const messages: MailMessage[] = [];
    for await (const msg of client.fetch(range, {
      uid: true,
      flags: true,
      envelope: true,
      bodyStructure: true,
      bodyParts: ['1', 'TEXT']
    } as any)) {
      if (searchUids && !searchUids.includes(msg.uid)) continue;
      const env: any = msg.envelope || {};
      const m: MailMessage = {
        uid: msg.uid as number,
        seq: msg.seq as number,
        messageId: env.messageId || '',
        from: (env.from || []).map((a: any) => ({ name: a.name || '', address: a.address || '' })),
        to: (env.to || []).map((a: any) => ({ name: a.name || '', address: a.address || '' })),
        cc: (env.cc || []).map((a: any) => ({ name: a.name || '', address: a.address || '' })),
        subject: env.subject || '(sans sujet)',
        date: env.date ? new Date(env.date).toISOString() : '',
        flags: Array.from((msg.flags || []) as any),
        hasAttachments: detectHasAttachments(msg.bodyStructure as any),
        preview: ''
      };
      messages.push(m);
    }
    // Tri du plus récent au plus ancien
    out.messages = messages.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
  return out;
}

/**
 * Récupère le contenu complet d'un message (texte + html).
 */
export async function getMessage(accountId: string, folder: string, uid: number): Promise<MailMessage | null> {
  const acc = await loadAccount(accountId);
  const { ImapFlow } = await import('imapflow').catch(() => ({ ImapFlow: null as any }));
  if (!ImapFlow) throw new Error('imapflow-not-installed');
  const { simpleParser } = await import('mailparser').catch(() => ({ simpleParser: null as any }));

  const client = new ImapFlow({
    host: acc.imapHost, port: acc.imapPort, secure: acc.imapSecure,
    auth: { user: acc.imapUser, pass: acc.imapPassword },
    logger: false
  });
  await client.connect();

  let result: MailMessage | null = null;
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    const dl = await client.download(String(uid), undefined, { uid: true });
    if (!dl?.content) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of dl.content as any) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks);
    const parsed: any = simpleParser ? await simpleParser(raw) : null;

    const env = await client.fetchOne(String(uid), {
      uid: true, envelope: true, flags: true, bodyStructure: true
    } as any, { uid: true });
    const e: any = (env as any)?.envelope || {};

    result = {
      uid,
      messageId: e.messageId || (parsed?.messageId || ''),
      from: parsed?.from?.value?.map((a: any) => ({ name: a.name || '', address: a.address || '' })) || [],
      to: parsed?.to?.value?.map((a: any) => ({ name: a.name || '', address: a.address || '' })) || [],
      cc: parsed?.cc?.value?.map((a: any) => ({ name: a.name || '', address: a.address || '' })) || [],
      subject: parsed?.subject || e.subject || '(sans sujet)',
      date: parsed?.date ? new Date(parsed.date).toISOString() : (e.date ? new Date(e.date).toISOString() : ''),
      flags: Array.from(((env as any)?.flags || []) as any),
      hasAttachments: !!parsed?.attachments?.length,
      preview: (parsed?.text || '').slice(0, 200),
      bodyText: parsed?.text || '',
      bodyHtml: parsed?.html || ''
    };

    // Marque comme lu si pas déjà
    try {
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
    } catch {}
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
  return result;
}

/**
 * Envoie un email via SMTP de l'account.
 */
export async function sendEmail(
  accountId: string,
  msg: { to: string[]; cc?: string[]; bcc?: string[]; subject: string; text?: string; html?: string; inReplyTo?: string; references?: string[] }
) {
  const acc = await loadAccount(accountId);
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: acc.smtpHost,
    port: acc.smtpPort,
    secure: acc.smtpSecure,
    auth: { user: acc.smtpUser, pass: acc.smtpPassword }
  });

  const text = msg.text || (msg.html ? msg.html.replace(/<[^>]+>/g, ' ') : '');
  const sigSep = '\n\n--\n';
  const fullText = acc.signature ? `${text}${sigSep}${acc.signature}` : text;
  const fullHtml = msg.html ? (acc.signature ? `${msg.html}<br><br>--<br>${acc.signature.replace(/\n/g, '<br>')}` : msg.html) : undefined;

  const info = await transporter.sendMail({
    from: acc.email,
    to: msg.to,
    cc: msg.cc,
    bcc: msg.bcc,
    subject: msg.subject,
    text: fullText,
    html: fullHtml,
    inReplyTo: msg.inReplyTo,
    references: msg.references
  });

  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

/**
 * Met le flag \Seen ou \Flagged sur un message.
 */
export async function setFlag(accountId: string, folder: string, uid: number, flag: string, enable: boolean) {
  const acc = await loadAccount(accountId);
  const { ImapFlow } = await import('imapflow').catch(() => ({ ImapFlow: null as any }));
  if (!ImapFlow) throw new Error('imapflow-not-installed');
  const client = new ImapFlow({
    host: acc.imapHost, port: acc.imapPort, secure: acc.imapSecure,
    auth: { user: acc.imapUser, pass: acc.imapPassword },
    logger: false
  });
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    if (enable) {
      await client.messageFlagsAdd(String(uid), [flag], { uid: true });
    } else {
      await client.messageFlagsRemove(String(uid), [flag], { uid: true });
    }
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
}

export async function deleteMessage(accountId: string, folder: string, uid: number) {
  const acc = await loadAccount(accountId);
  const { ImapFlow } = await import('imapflow').catch(() => ({ ImapFlow: null as any }));
  if (!ImapFlow) throw new Error('imapflow-not-installed');
  const client = new ImapFlow({
    host: acc.imapHost, port: acc.imapPort, secure: acc.imapSecure,
    auth: { user: acc.imapUser, pass: acc.imapPassword },
    logger: false
  });
  await client.connect();
  let lock;
  try {
    lock = await client.getMailboxLock(folder);
    await client.messageDelete(String(uid), { uid: true });
  } finally {
    if (lock) lock.release();
    await client.logout().catch(() => {});
  }
}

function detectHasAttachments(bs: any): boolean {
  if (!bs) return false;
  if (Array.isArray(bs.childNodes)) {
    return bs.childNodes.some((c: any) => c.disposition === 'attachment' || detectHasAttachments(c));
  }
  return bs.disposition === 'attachment';
}
