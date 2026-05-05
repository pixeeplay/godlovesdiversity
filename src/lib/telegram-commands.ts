/**
 * Router de commandes Telegram pour le bot GLD.
 * Reçoit un message du webhook, le parse, exécute la commande et répond.
 */
import { prisma } from './prisma';
import { sendMessage, sendPhoto, escHtml, type TgInlineButton } from './telegram-bot';

export type TgUpdate = {
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: 'private' | 'group' | 'supergroup'; title?: string };
    text?: string;
    caption?: string;
    voice?: { file_id: string; duration: number; mime_type?: string };
    photo?: Array<{ file_id: string; width: number; height: number; file_size?: number }>;
    video?: { file_id: string; duration: number; width: number; height: number; file_size?: number };
    audio?: { file_id: string; duration: number; mime_type?: string; title?: string };
    document?: { file_id: string; file_name?: string; mime_type?: string };
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number };
    data?: string;
  };
};

/**
 * Dispatch d'une commande texte.
 * Renvoie une promesse — tous les sends sont awaités.
 */
export async function handleCommand(chatId: number, userId: number, text: string): Promise<void> {
  const cmd = (text.trim().split(/\s+/)[0] || '').replace(/^\//, '').toLowerCase().split('@')[0];
  const args = text.trim().split(/\s+/).slice(1);

  switch (cmd) {
    case 'start':
    case 'help':
      return cmdHelp(chatId, userId);
    case 'stats':
      return cmdStats(chatId);
    case 'commandes':
    case 'orders':
      return cmdOrders(chatId);
    case 'photos':
      return cmdPhotos(chatId, args);
    case 'agenda':
    case 'events':
      return cmdAgenda(chatId);
    case 'dons':
    case 'donations':
      return cmdDonations(chatId);
    case 'newsletter':
      return cmdNewsletter(chatId);
    case 'healthcheck':
    case 'ping':
      return cmdHealthcheck(chatId);
    case 'whoami':
      return cmdWhoami(chatId, userId);
    default:
      await sendMessage(chatId,
        `❓ Commande inconnue : <code>/${escHtml(cmd)}</code>\nTape <code>/help</code> pour voir la liste.`);
  }
}

/** Click sur un bouton inline (callback_query). */
export async function handleCallback(chatId: number, _userId: number, data: string, callbackQueryId: string): Promise<{ alert?: string }> {
  // Format conventionnel : "action:resource:id"
  const [action, resource, id] = data.split(':');

  if (resource === 'photo' && id) {
    if (action === 'approve') {
      await prisma.photo.update({ where: { id }, data: { status: 'APPROVED' } }).catch(() => null);
      await sendMessage(chatId, `✅ Photo <code>${escHtml(id.slice(0, 8))}</code> approuvée.`);
      return { alert: 'Photo approuvée ✓' };
    }
    if (action === 'reject') {
      await prisma.photo.update({ where: { id }, data: { status: 'REJECTED', rejectionReason: 'Refusée via Telegram' } }).catch(() => null);
      await sendMessage(chatId, `🚫 Photo <code>${escHtml(id.slice(0, 8))}</code> refusée.`);
      return { alert: 'Photo refusée ✗' };
    }
  }

  return { alert: 'Action inconnue' };
}

// ============================================================
// IMPLÉMENTATIONS DES COMMANDES
// ============================================================

async function cmdHelp(chatId: number, userId: number) {
  const text = `<b>🌈 Bot GLD — 40+ commandes</b>

📊 <b>Lecture &amp; stats</b>
/stats — Stats jour/semaine/mois
/commandes — 5 dernières commandes
/dons — Total dons + récents
/agenda — Événements à venir
/newsletter — Dernière campagne
/forum — Derniers sujets
/temoignages — Témoignages vidéo
/lieux — Lieux LGBT-friendly
/peerhelp — Demandes entraide
/meetups — Meetups à venir
/mentor — Matchings mentor
/users — Derniers inscrits
/subscribers — Abonnés newsletter
/sosalerts — Alertes SOS
/shelters — Demandes hébergement
/reports — Signalements
/products — Catalogue boutique
/stock — État stock
/topproducts — Top ventes
/logs — Logs récents

✏️ <b>Création</b>
/addvenue Nom, Ville
/addevent Titre, Date
/addpost Sujet
/addbanner Texte
/addcoupon CODE -X%
/addtemoignage (depuis ce message)
/sendnewsletter

🤖 <b>IA Gemini</b>
/aitext sujet
/aiimage description
/aivideo description
/translate fr→en texte
/verse Romains 1:26
/legal pacs
/voicecoach (simulation coming-out)

📢 <b>Communication</b>
/broadcast message
/notify abonnés

🎨 <b>Thèmes &amp; flags</b>
/theme · /pridemode · /noelmode · /features

⚙️ <b>Système</b>
/backup · /photos pending
/healthcheck · /whoami · /help

📤 <b>Uploads</b>
🎤 Vocal · 📷 Photo · 🎥 Vidéo (envoie le fichier directement)

💬 <b>Tu peux aussi écrire en français naturel</b> — l'IA Gemini comprend (ex : « combien de commandes cette semaine ? » → /stats).

<i>Ton user_id : <code>${userId}</code> · Chat_id : <code>${chatId}</code></i>`;
  await sendMessage(chatId, text);
}

async function cmdStats(chatId: number) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [orders24h, orders7d, orders30d, abos, photosPending, photosTotal] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: dayAgo } } }).catch(() => 0),
    prisma.order.count({ where: { createdAt: { gte: weekAgo } } }).catch(() => 0),
    prisma.order.count({ where: { createdAt: { gte: monthAgo } } }).catch(() => 0),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' as any } }).catch(() => 0),
    prisma.photo.count({ where: { status: 'PENDING' as any } }).catch(() => 0),
    prisma.photo.count({ where: { status: 'APPROVED' as any } }).catch(() => 0)
  ]);

  const revenue24h = await prisma.order.aggregate({
    where: { createdAt: { gte: dayAgo }, status: 'PAID' as any },
    _sum: { totalCents: true }
  }).catch(() => ({ _sum: { totalCents: 0 } }));

  const r24 = ((revenue24h._sum.totalCents || 0) / 100).toFixed(2);

  await sendMessage(chatId,
`<b>📊 Stats GLD</b>

🛒 <b>Commandes</b>
• 24 h : ${orders24h} (${r24} €)
• 7 j : ${orders7d}
• 30 j : ${orders30d}

💌 <b>Newsletter</b>
• ${abos} abonnés actifs

📸 <b>Photos</b>
• ${photosPending} en attente
• ${photosTotal} approuvées au total`);
}

async function cmdOrders(chatId: number) {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { items: true }
  }).catch(() => []);

  if (orders.length === 0) {
    return void await sendMessage(chatId, '🛒 Aucune commande pour le moment.');
  }

  const lines = orders.map((o) => {
    const date = new Date(o.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    const eur = (o.totalCents / 100).toFixed(2);
    const status = { PENDING: '⏳', PAID: '💸', SHIPPED: '📦', CANCELLED: '❌', REFUNDED: '↩' }[o.status as any] || '?';
    return `${status} <b>${escHtml(o.email)}</b> · ${eur} € · ${o.items.length} art. · ${date}`;
  }).join('\n\n');

  await sendMessage(chatId, `<b>🛒 5 dernières commandes</b>\n\n${lines}`);
}

async function cmdPhotos(chatId: number, args: string[]) {
  const sub = (args[0] || 'pending').toLowerCase();
  if (sub !== 'pending') {
    return void await sendMessage(chatId, 'Usage : <code>/photos pending</code>');
  }

  const photos = await prisma.photo.findMany({
    where: { status: 'PENDING' as any },
    orderBy: { createdAt: 'desc' },
    take: 5
  }).catch(() => []);

  if (photos.length === 0) {
    return void await sendMessage(chatId, '✨ Aucune photo en attente de modération.');
  }

  await sendMessage(chatId, `<b>📸 ${photos.length} photo(s) à modérer</b>`);

  for (const p of photos) {
    const caption = `<b>${escHtml(p.authorName || 'Anonyme')}</b>${p.placeName ? ` · ${escHtml(p.placeName)}` : ''}${p.country ? ` (${escHtml(p.country)})` : ''}\n${p.caption ? escHtml(p.caption.slice(0, 200)) : ''}`;
    const buttons: TgInlineButton[][] = [[
      { text: '✅ Approuver', callback_data: `approve:photo:${p.id}` },
      { text: '🚫 Refuser', callback_data: `reject:photo:${p.id}` }
    ]];
    try {
      // Construire l'URL absolue de la photo
      const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com';
      const url = p.thumbnailKey ? `${origin}/api/storage/${p.thumbnailKey}` : `${origin}/api/storage/${p.storageKey}`;
      await sendPhoto(chatId, url, caption, { inline_keyboard: buttons });
    } catch (e: any) {
      // Fallback message texte si l'image plante
      await sendMessage(chatId, `${caption}\n\n<a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://gld.pixeeplay.com'}/admin/photos/${p.id}">Voir dans l'admin</a>`, { inline_keyboard: buttons });
    }
  }
}

async function cmdAgenda(chatId: number) {
  let events: any[] = [];
  try {
    events = await prisma.event.findMany({
      where: { published: true, startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      take: 5
    });
  } catch { events = []; }

  if (events.length === 0) {
    return void await sendMessage(chatId, '📅 Aucun événement à venir.');
  }

  const lines = events.map((e) => {
    const date = new Date(e.startsAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
    const where = e.location ? ` · 📍 ${escHtml(e.location)}${e.city ? `, ${escHtml(e.city)}` : ''}` : '';
    return `🗓 <b>${escHtml(e.title)}</b>\n${date}${where}`;
  }).join('\n\n');

  await sendMessage(chatId, `<b>📅 Prochains événements</b>\n\n${lines}`);
}

async function cmdDonations(chatId: number) {
  // Pas de model Donation propre — on agrège les Order paymentProvider HELLOASSO
  const dons = await prisma.order.findMany({
    where: { paymentProvider: 'HELLOASSO' as any, status: 'PAID' as any },
    orderBy: { createdAt: 'desc' },
    take: 5
  }).catch(() => []);

  const total = await prisma.order.aggregate({
    where: { paymentProvider: 'HELLOASSO' as any, status: 'PAID' as any },
    _sum: { totalCents: true }
  }).catch(() => ({ _sum: { totalCents: 0 } }));

  const totalEur = ((total._sum.totalCents || 0) / 100).toFixed(2);
  const recent = dons.length > 0
    ? dons.map((d) => `💖 ${escHtml(d.email)} · ${(d.totalCents / 100).toFixed(2)} €`).join('\n')
    : 'Aucun don récent.';

  await sendMessage(chatId, `<b>💖 Dons</b>\n\nTotal cumulé : <b>${totalEur} €</b>\n\n${recent}`);
}

async function cmdNewsletter(chatId: number) {
  const last = await prisma.newsletterCampaign.findFirst({
    orderBy: { createdAt: 'desc' }
  }).catch(() => null);

  if (!last) {
    return void await sendMessage(chatId, '💌 Aucune campagne créée pour le moment.');
  }

  const sentCount = (last as any).sentCount || last.recipients;
  const failedCount = (last as any).failedCount || 0;
  await sendMessage(chatId,
`<b>💌 Dernière newsletter</b>

<b>${escHtml(last.subject)}</b>
Statut : ${last.status}
Envoyés : ${sentCount} / ${last.recipients} ${failedCount > 0 ? `(${failedCount} échecs)` : ''}
${last.sentAt ? `Date : ${new Date(last.sentAt).toLocaleString('fr-FR')}` : ''}`);
}

async function cmdHealthcheck(chatId: number) {
  const checks: { name: string; ok: boolean; detail?: string }[] = [];

  // DB
  try { await prisma.$queryRaw`SELECT 1`; checks.push({ name: 'PostgreSQL', ok: true }); }
  catch (e: any) { checks.push({ name: 'PostgreSQL', ok: false, detail: e?.message?.slice(0, 80) }); }

  // Settings keys présents
  try {
    const cfg = await (await import('./settings')).getSettings([
      'integrations.gemini.apiKey',
      'integrations.heygen.apiKey',
      'integrations.elevenlabs.apiKey',
      'integrations.liveavatar.apiKey',
      'integrations.stripe.secretKey',
      'integrations.resend.apiKey',
      'integrations.gelato.apiKey',
      'integrations.sendcloud.publicKey'
    ]);
    const services = [
      ['Gemini IA', !!cfg['integrations.gemini.apiKey']],
      ['HeyGen', !!cfg['integrations.heygen.apiKey']],
      ['ElevenLabs', !!cfg['integrations.elevenlabs.apiKey']],
      ['LiveAvatar', !!cfg['integrations.liveavatar.apiKey']],
      ['Stripe', !!cfg['integrations.stripe.secretKey']],
      ['Resend (mail)', !!cfg['integrations.resend.apiKey']],
      ['Gelato', !!cfg['integrations.gelato.apiKey']],
      ['Sendcloud', !!cfg['integrations.sendcloud.publicKey']]
    ] as [string, boolean][];
    for (const [name, ok] of services) checks.push({ name, ok });
  } catch (e: any) {
    checks.push({ name: 'Settings', ok: false, detail: e?.message?.slice(0, 80) });
  }

  const lines = checks.map((c) => `${c.ok ? '✅' : '⚠️'} ${escHtml(c.name)}${c.detail ? ` — <i>${escHtml(c.detail)}</i>` : ''}`).join('\n');
  const okCount = checks.filter((c) => c.ok).length;
  await sendMessage(chatId, `<b>🔧 Healthcheck — ${okCount}/${checks.length} OK</b>\n\n${lines}`);
}

async function cmdWhoami(chatId: number, userId: number) {
  await sendMessage(chatId,
`<b>🪪 Tes identifiants Telegram</b>

User ID : <code>${userId}</code>
Chat ID : <code>${chatId}</code>

Pour autoriser cet utilisateur dans la whitelist du bot, va dans <b>Admin → Paramètres → Telegram</b> et ajoute ce user_id à <code>allowedUserIds</code> (séparés par virgule).`);
}
