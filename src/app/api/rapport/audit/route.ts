import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/rapport/audit
 * Audit COMPLET du site GLD :
 *  - Inventaire des modules ACTIFS (avec stats)
 *  - Liste des modules NON IMPLÉMENTÉS / EN COURS / À VENIR
 *  - Roadmap par sprint
 *  - Plan d'actions priorisé
 */

interface Module {
  category: string;
  name: string;
  status: 'live' | 'partial' | 'planned' | 'broken';
  stats?: string;
  notes?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  routes?: string[];
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

async function loadModules(): Promise<Module[]> {
  const p = prisma as any;

  const venues = await safe(() => p.venue.count(), 0);
  const venuesGeo = await safe(() => p.venue.count({ where: { lat: { not: null } } }), 0);
  const venuesEnriched = await safe(() => p.venue.count({ where: { enrichedAt: { not: null } } }), 0);
  const events = await safe(() => p.event.count(), 0);
  const eventsUp = await safe(() => p.event.count({ where: { startsAt: { gte: new Date() }, published: true } }), 0);
  const users = await safe(() => p.user.count(), 0);
  const usersAdmin = await safe(() => p.user.count({ where: { role: 'ADMIN' } }), 0);
  const products = await safe(() => p.product.count(), 0);
  const orders = await safe(() => p.order.count(), 0);
  const ordersPaid = await safe(() => p.order.count({ where: { status: 'PAID' } }), 0);
  const posts = await safe(() => p.forumPost.count(), 0);
  const photos = await safe(() => p.photo.count(), 0);
  const testimonies = await safe(() => p.videoTestimony.count(), 0);
  const subs = await safe(() => p.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }), 0);
  const subsAll = await safe(() => p.newsletterSubscriber.count(), 0);
  const campaigns = await safe(() => p.newsletterCampaign.count(), 0);
  const campaignsSent = await safe(() => p.newsletterCampaign.count({ where: { status: 'SENT' } }), 0);
  const campaignsDraft = await safe(() => p.newsletterCampaign.count({ where: { status: 'DRAFT' } }), 0);
  const campaignsScheduled = await safe(() => p.newsletterCampaign.count({ where: { status: 'SCHEDULED' } }), 0);
  const connectProf = await safe(() => p.connectProfile.count(), 0);
  const connectPosts = await safe(() => p.connectPost.count(), 0);
  const helplines = await safe(() => p.helpline.count(), 0);
  const partners = await safe(() => p.partner.count(), 0);
  const posters = await safe(() => p.poster.count(), 0);
  const coupons = await safe(() => p.coupon.count(), 0);
  const venueCoupons = await safe(() => p.venueCoupon.count({ where: { active: true } }), 0);
  const manuals = await safe(() => p.manual.count(), 0);
  const newsletterPlans = await safe(() => p.newsletterPlan.count(), 0);
  const moderationDecisions = await safe(() => p.moderationDecision.count(), 0);
  const soulEntries = await safe(() => 0, 0);

  return [
    /* ─── PUBLIC SITE ─── */
    { category: 'Site public', name: 'Page d\'accueil', status: 'live', stats: 'hero + ticker dons + témoignages + partenaires', routes: ['/'] },
    { category: 'Site public', name: 'i18n auto-traduction', status: 'live', stats: '10 langues : FR/EN/ES/PT/DE/IT/NL/PL/AR/ZH', notes: 'Détection locale via middleware next-intl' },
    { category: 'Site public', name: 'Argumentaire & Message', status: 'live', routes: ['/argumentaire', '/message'] },
    { category: 'Site public', name: 'Galerie photos', status: 'live', stats: `${photos} photos`, routes: ['/galerie'] },
    { category: 'Site public', name: 'Témoignages vidéo', status: 'live', stats: `${testimonies} vidéos`, routes: ['/temoignages'] },
    { category: 'Site public', name: 'Affiches PDF', status: 'live', stats: `${posters} affiches`, routes: ['/affiches'] },
    { category: 'Site public', name: 'Mentor', status: 'live', routes: ['/mentor'] },
    { category: 'Site public', name: 'Mode calculatrice (parental)', status: 'live', routes: ['/mode-calculatrice'] },

    /* ─── LIEUX (Annuaire) ─── */
    { category: 'Lieux', name: 'Annuaire mondial venues', status: 'live', stats: `${venues} lieux référencés`, routes: ['/lieux'] },
    { category: 'Lieux', name: 'Géocodage GPS', status: 'partial', stats: `${venuesGeo}/${venues} (${Math.round(venuesGeo/Math.max(1,venues)*100)}%)`, notes: `${venues - venuesGeo} venues sans coordonnées`, priority: 'P1' },
    { category: 'Lieux', name: 'Enrichissement IA Gemini', status: 'partial', stats: `${venuesEnriched}/${venues} enrichis (${Math.round(venuesEnriched/Math.max(1,venues)*100)}%)`, notes: 'Bulk multi-select dispo dans /admin/establishments', priority: 'P1' },
    { category: 'Lieux', name: 'Carte interactive Leaflet', status: 'live', stats: '3 tile layers (dark/osm/satellite) · markers personnalisés' },
    { category: 'Lieux', name: 'Mini-site venue (tabs)', status: 'live', stats: '6 onglets : Résumé/Photos/Vidéos/Events/Infos/Carte', notes: 'Logo avatar + carousel auto + lightbox', routes: ['/lieux/[slug]'] },
    { category: 'Lieux', name: 'Espace Pro venues', status: 'live', stats: 'CRUD complet, IA enrich bulk, freshness score', routes: ['/admin/pro/venues'] },
    { category: 'Lieux', name: 'Coupons promos venues', status: 'live', stats: `${venueCoupons} coupons actifs` },
    { category: 'Lieux', name: 'Sync Facebook events auto', status: 'partial', notes: 'Code prêt, Page Token chiffrement à faire', priority: 'P2' },

    /* ─── ÉVÉNEMENTS ─── */
    { category: 'Événements', name: 'Événements (CRUD)', status: 'live', stats: `${events} events au total · ${eventsUp} à venir`, routes: ['/agenda', '/admin/events'] },
    { category: 'Événements', name: 'Calendrier macOS-style', status: 'live' },
    { category: 'Événements', name: 'Import CSV/iCal', status: 'partial', notes: 'CSV OK, iCal à finaliser', priority: 'P2' },

    /* ─── COMMUNAUTÉ ─── */
    { category: 'Communauté', name: 'Forum (catégories/threads)', status: 'live', stats: `${posts} posts`, routes: ['/forum'] },
    { category: 'Communauté', name: 'Modération IA forum', status: 'live', stats: `${moderationDecisions} décisions IA loggées`, notes: 'AiAutopilot peut auto-cacher contenus toxiques' },
    { category: 'Communauté', name: 'Connect (réseau social)', status: 'live', stats: `${connectProf} profils · ${connectPosts} posts`, routes: ['/connect'] },
    { category: 'Communauté', name: 'Messagerie temps-réel SSE', status: 'live' },
    { category: 'Communauté', name: 'Modes Connect (3)', status: 'live', stats: 'Communauté · Rencontres · Pro' },

    /* ─── BOUTIQUE ─── */
    { category: 'Boutique', name: 'Catalogue produits', status: 'live', stats: `${products} produits`, routes: ['/boutique'] },
    { category: 'Boutique', name: 'Paiement Stripe', status: 'live', stats: `${ordersPaid}/${orders} commandes payées` },
    { category: 'Boutique', name: 'Paiement HelloAsso', status: 'live' },
    { category: 'Boutique', name: 'Paiement Square + Apple Pay', status: 'live' },
    { category: 'Boutique', name: 'Dropshipping', status: 'live', stats: 'Printful · Gelato · TPOP' },
    { category: 'Boutique', name: 'Coupons globaux', status: 'live', stats: `${coupons} coupons` },
    { category: 'Boutique', name: 'Webhook Stripe (audit)', status: 'partial', notes: 'À vérifier : signing secret en place ?', priority: 'P1' },

    /* ─── NEWSLETTER ─── */
    { category: 'Newsletter', name: 'Inscription + double opt-in', status: 'live', stats: `${subs}/${subsAll} actifs (${Math.round(subs/Math.max(1,subsAll)*100)}%)` },
    { category: 'Newsletter', name: 'Composer + envoi', status: 'live', stats: `${campaignsSent} envoyées · ${campaignsDraft} drafts · ${campaignsScheduled} programmées` },
    { category: 'Newsletter', name: 'Preview HTML iframe', status: 'live' },
    { category: 'Newsletter', name: 'Send-test', status: 'live' },
    { category: 'Newsletter', name: 'Scheduling + cron auto', status: 'live', notes: '/api/cron/newsletter-scheduled toutes les 5 min' },
    { category: 'Newsletter', name: 'Plan annuel calendrier', status: 'live', stats: `${newsletterPlans} plans · 52 semaines/an` },
    { category: 'Newsletter', name: 'Segments / listes', status: 'planned', notes: 'Tags subscribers à ajouter pour segments', priority: 'P2' },

    /* ─── IA ─── */
    { category: 'IA', name: 'Studio IA Gemini', status: 'live', stats: 'Texte (Gemini 2.0 Flash) + Image (Imagen 3) + Vidéo (fal.ai)', routes: ['/admin/ai-studio'] },
    { category: 'IA', name: 'Assistant queer (chat)', status: 'live', stats: 'Widget chat avec RAG sur knowledge base' },
    { category: 'IA', name: 'AI Autopilot', status: 'live', stats: `Mood, Modération, Newsletter auto`, routes: ['/admin/ai-autopilot'] },
    { category: 'IA', name: 'AI Text Helper inline', status: 'live', stats: '8 actions : fix, rewrite, shorter, longer, inclusive, punchy, warm, pro' },
    { category: 'IA', name: 'Avatar IA temps-réel', status: 'live', stats: 'Vidéo HeyGen + Live Gemini Realtime', routes: ['/admin/avatar'] },
    { category: 'IA', name: 'Manuel auto IA (3 audiences)', status: 'live', stats: `${manuals} manuels générés`, notes: 'user/admin/superadmin · régénération 2×/jour' },
    { category: 'IA', name: 'Modération auto contenus', status: 'live' },

    /* ─── COMMUNICATION ─── */
    { category: 'Communication', name: 'Email Resend + SMTP fallback', status: 'live' },
    { category: 'Communication', name: 'Bot Telegram (100+ cmds)', status: 'live', routes: ['/admin/telegram'] },
    { category: 'Communication', name: 'Push notifications PWA', status: 'partial', notes: 'Service Worker en place, à finaliser', priority: 'P2' },
    { category: 'Communication', name: 'Webhook GitHub → Coolify', status: 'live', notes: 'Auto-deploy main branch' },

    /* ─── ADMIN BACK-OFFICE ─── */
    { category: 'Admin', name: 'Dashboard global', status: 'live', stats: `${usersAdmin} admins`, routes: ['/admin'] },
    { category: 'Admin', name: 'Mega Search (⌘K)', status: 'live', notes: 'Inline + Dynamic Island sur public Navbar' },
    { category: 'Admin', name: 'Espace Pro (vue partenaire)', status: 'live', routes: ['/admin/pro'] },
    { category: 'Admin', name: 'Manuels téléchargeables', status: 'live', stats: '3 audiences', routes: ['/api/manuals/user'] },
    { category: 'Admin', name: 'Rapport live /rapport', status: 'live' },
    { category: 'Admin', name: 'Rapport sécurité', status: 'live', routes: ['/api/rapport/securite'] },
    { category: 'Admin', name: 'Rapport audit', status: 'live', routes: ['/api/rapport/audit'] },
    { category: 'Admin', name: 'Studio carte de partage', status: 'live', stats: '3 styles : classique, photo, IA · QR scannable + logo + URL' },
    { category: 'Admin', name: 'Thèmes saisonniers', status: 'live', stats: '50 thèmes auto-activés' },

    /* ─── SOS ─── */
    { category: 'SOS', name: 'Bouton urgence', status: 'live', stats: `${helplines} helplines internationales`, routes: ['/urgence', '/sos'] },

    /* ─── MOBILE ─── */
    { category: 'Mobile', name: 'PWA installable', status: 'live', stats: 'Manifest + service worker + offline' },
    { category: 'Mobile', name: 'App iOS Xcode native', status: 'partial', notes: 'WebView + push, à publier sur App Store', priority: 'P2' },
    { category: 'Mobile', name: 'App Android', status: 'planned', priority: 'P3' },

    /* ─── INFRA ─── */
    { category: 'Infra', name: 'Docker Coolify', status: 'live' },
    { category: 'Infra', name: 'PostgreSQL + Prisma', status: 'live' },
    { category: 'Infra', name: 'MinIO S3 médias', status: 'live' },
    { category: 'Infra', name: 'Cloudflare CDN', status: 'live' },
    { category: 'Infra', name: 'Crons Coolify', status: 'live', stats: '6+ tâches : geocode, enrich, i18n-audit, refresh-tracking, connect-digest, facebook-sync, newsletter-scheduled' },
    { category: 'Infra', name: 'Backups DB auto', status: 'partial', notes: 'À CONFIRMER dans Coolify Database settings', priority: 'P0' },
    { category: 'Infra', name: 'Monitoring Sentry/UptimeRobot', status: 'planned', priority: 'P1' },

    /* ─── RGPD / SÉCURITÉ ─── */
    { category: 'RGPD', name: 'Consentement cookies', status: 'live' },
    { category: 'RGPD', name: 'Export données user', status: 'planned', notes: 'Endpoint /api/me/export à créer', priority: 'P1' },
    { category: 'RGPD', name: 'Suppression compte', status: 'planned', notes: 'Endpoint /api/me/delete à créer', priority: 'P1' },
    { category: 'Sécurité', name: '2FA admin', status: 'planned', priority: 'P0' },
    { category: 'Sécurité', name: 'Lockout brute-force', status: 'planned', priority: 'P0' },
    { category: 'Sécurité', name: 'Chiffrement Facebook tokens', status: 'planned', priority: 'P1' },
    { category: 'Sécurité', name: 'Audit pentest externe', status: 'planned', priority: 'P3' }
  ];
}

function generateHtml(modules: Module[]): string {
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const counts = {
    live:    modules.filter(m => m.status === 'live').length,
    partial: modules.filter(m => m.status === 'partial').length,
    planned: modules.filter(m => m.status === 'planned').length,
    broken:  modules.filter(m => m.status === 'broken').length
  };
  const completion = Math.round(((counts.live + counts.partial * 0.5) / modules.length) * 100);

  const byCat = modules.reduce<Record<string, Module[]>>((acc, m) => {
    (acc[m.category] = acc[m.category] || []).push(m);
    return acc;
  }, {});

  const STATUS_COLOR: Record<string, { bg: string; text: string; emoji: string; label: string }> = {
    live:    { bg: '#064e3b', text: '#6ee7b7', emoji: '✅', label: 'En production' },
    partial: { bg: '#78350f', text: '#fbbf24', emoji: '🟡', label: 'Partiel / à améliorer' },
    planned: { bg: '#1e3a8a', text: '#93c5fd', emoji: '📅', label: 'Planifié' },
    broken:  { bg: '#7f1d1d', text: '#fca5a5', emoji: '❌', label: 'Cassé' }
  };

  const PRIO_COLOR: Record<string, string> = {
    P0: '#ef4444', P1: '#f59e0b', P2: '#3b82f6', P3: '#8b5cf6'
  };

  // Plan d'action priorisé
  const actionPlan = modules
    .filter(m => m.priority && m.status !== 'live')
    .sort((a, b) => (a.priority || 'P9').localeCompare(b.priority || 'P9'));

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>📊 Audit GLD complet · ${completion}% complétion</title>
<meta name="robots" content="noindex"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:#0a0a0f;color:#fafafa;line-height:1.6;padding:24px}
.container{max-width:1100px;margin:0 auto}
h1{font-size:32px}
h2{font-size:18px;margin:32px 0 12px;padding-bottom:6px;border-bottom:2px solid #d4537e}
.live-pill{display:inline-block;background:#064e3b;border:1px solid #10b981;color:#6ee7b7;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase}
.live-pill::before{content:"● ";animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.hero{background:linear-gradient(135deg,#7c3aed,#ec4899,#f97316);padding:32px 24px;border-radius:16px;margin-bottom:24px}
.scores{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:16px 0}
.score{background:rgba(0,0,0,0.3);border-radius:12px;padding:12px;text-align:center;backdrop-filter:blur(10px)}
.score-num{font-size:24px;font-weight:bold}
.score-lab{font-size:10px;text-transform:uppercase;opacity:0.85;letter-spacing:0.05em}
.btn{display:inline-block;background:#d4537e;color:white;padding:10px 20px;border-radius:99px;font-weight:bold;text-decoration:none;margin:4px 8px 4px 0}
.cat-section{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:16px 20px;margin-bottom:12px}
.cat-section h3{font-size:14px;color:#f0abfc;margin-bottom:12px}
.module{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:8px 0;border-bottom:1px solid #27272a}
.module:last-child{border-bottom:none}
.m-emoji{font-size:18px;line-height:1.4}
.m-name{font-weight:600;font-size:13px}
.m-stats{font-size:11px;color:#10b981;margin-top:2px;font-family:monospace}
.m-notes{font-size:11px;color:#a1a1aa;margin-top:2px;font-style:italic}
.m-routes{font-size:10px;color:#6366f1;margin-top:2px;font-family:monospace}
.m-tag{display:inline-block;font-size:9px;padding:2px 8px;border-radius:99px;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase;white-space:nowrap}
.action{padding:8px 12px;border-left:3px solid;margin:6px 0;background:#18181b;border-radius:0 6px 6px 0}
.footer{text-align:center;color:#71717a;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #27272a}
@media print{body{background:white;color:black}.cat-section,.action{background:#fff;border-color:#ccc}}
</style></head><body><div class="container">

<div class="hero">
  <div style="margin-bottom:12px"><span class="live-pill">Live · ${date}</span></div>
  <h1>📊 Audit GLD complet</h1>
  <p style="font-size:14px;opacity:0.95;margin-top:8px">État live des ${modules.length} modules du site, plan d'action priorisé.</p>
  <div class="scores">
    <div class="score"><div class="score-num">${completion}%</div><div class="score-lab">Complétion</div></div>
    <div class="score" style="color:#6ee7b7"><div class="score-num">${counts.live}</div><div class="score-lab">✅ Live</div></div>
    <div class="score" style="color:#fbbf24"><div class="score-num">${counts.partial}</div><div class="score-lab">🟡 Partiel</div></div>
    <div class="score" style="color:#93c5fd"><div class="score-num">${counts.planned}</div><div class="score-lab">📅 Planifié</div></div>
    <div class="score" style="color:#fca5a5"><div class="score-num">${counts.broken}</div><div class="score-lab">❌ Cassé</div></div>
  </div>
  <div style="margin-top:16px">
    <a class="btn" href="javascript:window.print()">📄 PDF</a>
    <a class="btn" href="javascript:location.reload()" style="background:#7f77dd">🔄 Refresh</a>
    <a class="btn" href="/api/rapport/securite" style="background:#dc2626">🔒 Sécurité</a>
    <a class="btn" href="/rapport" style="background:#1d9e75">📈 Live</a>
  </div>
</div>

${Object.entries(byCat).map(([cat, items]) => `
<h2>${cat} (${items.length})</h2>
<div class="cat-section">
  ${items.map(m => {
    const sc = STATUS_COLOR[m.status];
    return `
      <div class="module">
        <div class="m-emoji">${sc.emoji}</div>
        <div>
          <div class="m-name">${m.name}</div>
          ${m.stats ? `<div class="m-stats">${m.stats}</div>` : ''}
          ${m.notes ? `<div class="m-notes">${m.notes}</div>` : ''}
          ${m.routes?.length ? `<div class="m-routes">${m.routes.join(' · ')}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span class="m-tag" style="background:${sc.bg};color:${sc.text}">${m.status}</span>
          ${m.priority ? `<span class="m-tag" style="background:${PRIO_COLOR[m.priority]}30;color:${PRIO_COLOR[m.priority]}">${m.priority}</span>` : ''}
        </div>
      </div>
    `;
  }).join('')}
</div>
`).join('')}

<h2>🛣 Plan d'action priorisé (${actionPlan.length} actions)</h2>
<div class="cat-section">
  ${actionPlan.length === 0 ? '<p style="color:#a1a1aa">Aucune action prioritaire en attente.</p>' : actionPlan.map(m => `
    <div class="action" style="border-color:${PRIO_COLOR[m.priority || 'P3']}">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <strong>${m.priority} · ${m.name}</strong>
        <span class="m-tag" style="background:${STATUS_COLOR[m.status].bg};color:${STATUS_COLOR[m.status].text}">${m.status}</span>
      </div>
      ${m.notes ? `<div style="font-size:12px;color:#a1a1aa;margin-top:4px">${m.notes}</div>` : ''}
    </div>
  `).join('')}
</div>

<h2>📅 Roadmap 4 sprints</h2>
<div class="cat-section">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
    <div style="background:#18181b;border:1px solid #ef4444;border-radius:8px;padding:12px">
      <div style="font-size:11px;color:#fca5a5;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase">Sprint 1 · Sécurité</div>
      <ul style="margin-top:8px;padding-left:18px;font-size:13px">
        <li>2FA admin (TOTP)</li>
        <li>Lockout brute-force login</li>
        <li>Confirmer backups Coolify</li>
        <li>Webhook Stripe signing</li>
      </ul>
    </div>
    <div style="background:#18181b;border:1px solid #f59e0b;border-radius:8px;padding:12px">
      <div style="font-size:11px;color:#fbbf24;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase">Sprint 2 · RGPD</div>
      <ul style="margin-top:8px;padding-left:18px;font-size:13px">
        <li>Endpoint /api/me/export</li>
        <li>Endpoint /api/me/delete</li>
        <li>Chiffrement Facebook tokens</li>
        <li>Géocodage venues complet</li>
      </ul>
    </div>
    <div style="background:#18181b;border:1px solid #3b82f6;border-radius:8px;padding:12px">
      <div style="font-size:11px;color:#93c5fd;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase">Sprint 3 · Mobile + Monitoring</div>
      <ul style="margin-top:8px;padding-left:18px;font-size:13px">
        <li>App iOS sur App Store</li>
        <li>Sentry / UptimeRobot</li>
        <li>Push notifs PWA finalisées</li>
        <li>Segments newsletter (tags)</li>
      </ul>
    </div>
    <div style="background:#18181b;border:1px solid #8b5cf6;border-radius:8px;padding:12px">
      <div style="font-size:11px;color:#c4b5fd;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase">Sprint 4 · Croissance</div>
      <ul style="margin-top:8px;padding-left:18px;font-size:13px">
        <li>App Android</li>
        <li>Marketplace coupons venues</li>
        <li>Programme parrainage</li>
        <li>Audit pentest externe</li>
      </ul>
    </div>
  </div>
</div>

<div class="footer">
  Audit régénéré à chaque visite · <b>${date}</b><br/>
  🌈 gld.pixeeplay.com
</div>

</div></body></html>`;
}

export async function GET() {
  try {
    const modules = await loadModules();
    const html = generateHtml(modules);
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600',
        'x-rapport-audit-generated-at': new Date().toISOString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'rapport-audit-failed', message: e?.message }, { status: 500 });
  }
}
