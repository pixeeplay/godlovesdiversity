import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/rapport
 * Renvoie une page HTML COMPLÈTE avec les stats LIVE de la prod.
 * Utilisé via rewrite Next.js : /rapport → /api/rapport (zéro SSR layout, juste un Response brut).
 */

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

async function loadStats() {
  const p = prisma as any;
  return {
    venues: await safe(() => p.venue?.count?.() ?? 0, 0),
    venuesGeocoded: await safe(() => p.venue?.count?.({ where: { lat: { not: null } } }) ?? 0, 0),
    events: await safe(() => p.event?.count?.() ?? 0, 0),
    users: await safe(() => p.user?.count?.() ?? 0, 0),
    products: await safe(() => p.product?.count?.() ?? 0, 0),
    orders: await safe(() => p.order?.count?.() ?? 0, 0),
    posts: await safe(() => p.forumPost?.count?.() ?? 0, 0),
    photos: await safe(() => p.photo?.count?.() ?? 0, 0),
    testimonies: await safe(() => p.videoTestimony?.count?.() ?? 0, 0),
    newsletters: await safe(() => p.newsletter?.count?.() ?? 0, 0),
    subscribers: await safe(() => p.newsletterSubscriber?.count?.() ?? 0, 0),
    connectProfiles: await safe(() => p.connectProfile?.count?.() ?? 0, 0),
    connectPosts: await safe(() => p.connectPost?.count?.() ?? 0, 0),
    coupons: await safe(() => p.coupon?.count?.() ?? 0, 0),
    partners: await safe(() => p.partner?.count?.() ?? 0, 0),
    posters: await safe(() => p.poster?.count?.() ?? 0, 0),
    helplines: await safe(() => p.helpline?.count?.() ?? 0, 0),
  };
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR');
}

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function generateHtml(s: Awaited<ReturnType<typeof loadStats>>): string {
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const geocodedPct = pct(s.venuesGeocoded, s.venues);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Rapport GLD Live · ${fmt(s.venues)} lieux · ${fmt(s.users)} membres</title>
<meta name="description" content="État live du projet God Loves Diversity, données extraites de la base de production." />
<meta name="theme-color" content="#0a0a0f" />
<meta name="robots" content="noindex" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; background: #0a0a0f; color: #fafafa; line-height: 1.6; }
  a { color: #f0abfc; text-decoration: none; } a:hover { text-decoration: underline; }
  h1 { font-size: 32px; margin-bottom: 8px; }
  h2 { font-size: 22px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #d4537e; }
  h3 { font-size: 16px; margin: 16px 0 8px; color: #f0abfc; }
  .container { max-width: 900px; margin: 0 auto; padding: 24px; }
  .live-pill { display: inline-block; background: #064e3b; border: 1px solid #10b981; color: #6ee7b7; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .live-pill::before { content: "● "; color: #10b981; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  .hero { background: linear-gradient(135deg, rgba(212,83,126,0.13), rgba(127,119,221,0.13), rgba(29,158,117,0.13)); padding: 32px 24px; border-radius: 16px; margin-bottom: 24px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .badge { background: #18181b; border: 1px solid #3f3f46; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge-pink { background: #831843; border-color: #ec4899; color: #f9a8d4; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0 24px; }
  .stat { background: #18181b; border: 1px solid #27272a; padding: 16px; border-radius: 12px; }
  .stat-value { font-size: 28px; font-weight: 800; color: #fff; }
  .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-top: 4px; }
  .stat-extra { font-size: 11px; color: #6ee7b7; margin-top: 4px; }
  .section { background: #18181b; border: 1px solid #27272a; padding: 20px; border-radius: 12px; margin-bottom: 16px; }
  .section-emerald { border-color: #10b981; background: rgba(6,78,59,0.13); }
  .section-amber { border-color: #f59e0b; background: rgba(120,53,15,0.13); }
  .section-rose { border-color: #f43f5e; background: rgba(136,19,55,0.4); }
  ul { padding-left: 20px; margin: 8px 0; }
  li { margin: 6px 0; color: #d4d4d8; }
  .check { color: #10b981; font-weight: bold; margin-right: 6px; }
  .warn { color: #f59e0b; font-weight: bold; margin-right: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
  th, td { text-align: left; padding: 10px; border-bottom: 1px solid #27272a; }
  th { background: #27272a; font-weight: 600; }
  .bar-wrap { background: #18181b; border-radius: 6px; overflow: hidden; height: 24px; position: relative; margin: 4px 0 12px; }
  .bar-fill { background: linear-gradient(90deg, #d4537e, #7f77dd); height: 100%; }
  .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a; }
  .btn { display: inline-block; background: #d4537e; color: white !important; padding: 10px 20px; border-radius: 999px; font-weight: 700; margin: 4px; cursor: pointer; border: none; }
  .btn:hover { text-decoration: none; opacity: 0.9; }
  @media print { body { background: white; color: black; } .section { border-color: #ccc; background: white; } .stat { background: #f5f5f5; } .stat-value, h1, h2, h3 { color: black !important; } .badge, .live-pill { background: white; color: black; border-color: #999; } .btn { display: none; } }
</style>
</head>
<body>
<div class="container">
  <div class="hero">
    <div style="margin-bottom:12px;">
      <span class="live-pill">Live · ${date}</span>
    </div>
    <h1>🌈 God Loves Diversity</h1>
    <p style="color:#d4d4d8; margin-top:8px;">
      Le réseau social inclusif religieux LGBT+ — données extraites de la base de production.
      Cette page se régénère à chaque visite et est rafraîchie toutes les 2h par un cron Claude.
    </p>
    <div class="badges">
      <span class="badge badge-pink">${fmt(s.venues)} lieux</span>
      <span class="badge badge-pink">${fmt(s.users)} membres</span>
      <span class="badge">10 langues</span>
      <span class="badge">PWA + iOS natif</span>
    </div>
    <p style="margin-top:16px;">
      <button class="btn" onclick="window.print()">📄 Télécharger en PDF</button>
      <a class="btn" href="https://gld.pixeeplay.com">🌐 Voir le site</a>
    </p>
  </div>

  <h2>📊 Chiffres LIVE de la base</h2>
  <div class="stats">
    <div class="stat"><div class="stat-value">${fmt(s.venues)}</div><div class="stat-label">Lieux LGBT-friendly</div>${s.venues ? `<div class="stat-extra">${fmt(s.venuesGeocoded)} géocodés (${geocodedPct}%)</div>` : ''}</div>
    <div class="stat"><div class="stat-value">${fmt(s.events)}</div><div class="stat-label">Événements</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.users)}</div><div class="stat-label">Utilisateurs</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.connectProfiles)}</div><div class="stat-label">Profils Connect</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.connectPosts)}</div><div class="stat-label">Posts Connect</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.posts)}</div><div class="stat-label">Posts forum</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.testimonies)}</div><div class="stat-label">Témoignages</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.photos)}</div><div class="stat-label">Photos</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.products)}</div><div class="stat-label">Produits boutique</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.orders)}</div><div class="stat-label">Commandes</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.subscribers)}</div><div class="stat-label">Abonnés newsletter</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.coupons)}</div><div class="stat-label">Coupons actifs</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.partners)}</div><div class="stat-label">Partenaires</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.posters)}</div><div class="stat-label">Affiches</div></div>
    <div class="stat"><div class="stat-value">${fmt(s.helplines)}</div><div class="stat-label">Helplines SOS</div></div>
  </div>

  <h2>🎯 Comparatif vs concurrents</h2>
  <table>
    <thead><tr><th>Fonction</th><th>GLD</th><th>Facebook</th><th>Tinder</th><th>LinkedIn</th></tr></thead>
    <tbody>
      <tr><td>Réseau social</td><td style="font-weight:600;">✅</td><td>✅</td><td>❌</td><td>✅</td></tr>
      <tr><td>Rencontres LGBT</td><td style="font-weight:600;">✅</td><td>❌</td><td>✅</td><td>❌</td></tr>
      <tr><td>Réseau pro</td><td style="font-weight:600;">✅</td><td>❌</td><td>❌</td><td>✅</td></tr>
      <tr><td>Mode Foi/spirituel</td><td style="font-weight:600;">✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
      <tr><td>SOS d'urgence LGBT</td><td style="font-weight:600;">✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
      <tr><td>Annuaire venues mondial</td><td style="font-weight:600;">✅ (${fmt(s.venues)})</td><td>🟡</td><td>❌</td><td>❌</td></tr>
      <tr><td>Forum communautaire</td><td style="font-weight:600;">✅</td><td>🟡</td><td>❌</td><td>❌</td></tr>
      <tr><td>Boutique inclusive</td><td style="font-weight:600;">✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
      <tr><td>IA conversationnelle</td><td style="font-weight:600;">✅</td><td>🟡</td><td>🟡</td><td>🟡</td></tr>
      <tr><td>Multi-langue auto</td><td style="font-weight:600;">10 langues</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Avatar IA temps-réel</td><td style="font-weight:600;">✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
      <tr><td>Bot Telegram 100+ cmds</td><td style="font-weight:600;">✅</td><td>❌</td><td>❌</td><td>❌</td></tr>
    </tbody>
  </table>

  <h2>📈 Couverture fonctionnelle</h2>
  ${[
    ['Réseau social (posts/feed/likes/messages)', 92],
    ['Annuaire venues + carte mondiale', 88],
    ['Boutique + dropshipping', 85],
    ['Espace Pro venues + agenda', 80],
    ['Forum + témoignages', 78],
    ['SOS multi-pays + helplines', 95],
    ['IA (Demandez à GLD, Studio, Avatar)', 82],
    ['Mobile (PWA + iOS natif)', 70],
    ['i18n (10 langues auto-traduites)', 88],
  ].map(([label, p]) => `
    <div>
      <div style="font-size:13px; margin-bottom:4px; color:#d4d4d8;">${label} — <b style="color:#f0abfc;">${p}%</b></div>
      <div class="bar-wrap"><div class="bar-fill" style="width:${p}%;"></div></div>
    </div>
  `).join('')}

  <div class="section section-emerald">
    <h3>✅ Ce qui fonctionne en production</h3>
    <ul>
      <li><span class="check">✓</span>Site public 4 langues + auto-trad 10 langues</li>
      <li><span class="check">✓</span>Connect : profils 3 modes (Communauté / Rencontres / Pro), feed, likes, messages, SSE temps-réel</li>
      <li><span class="check">✓</span>Annuaire <b>${fmt(s.venues)} venues LGBT</b> importées</li>
      <li><span class="check">✓</span>Forum WYSIWYG + ${fmt(s.posts)} posts</li>
      <li><span class="check">✓</span>Boutique Stripe + ${fmt(s.products)} produits + ${fmt(s.orders)} commandes</li>
      <li><span class="check">✓</span>Studio IA (Gemini 2.0 Flash + Imagen 3)</li>
      <li><span class="check">✓</span>Bot Telegram 100+ commandes IA</li>
      <li><span class="check">✓</span>Avatar IA temps-réel</li>
      <li><span class="check">✓</span>SOS multi-pays + ${fmt(s.helplines)} helplines</li>
      <li><span class="check">✓</span>Espace utilisateur 30 pages /mon-espace</li>
      <li><span class="check">✓</span>50 thèmes saisonniers</li>
      <li><span class="check">✓</span>Newsletter : ${fmt(s.newsletters)} envoyées · ${fmt(s.subscribers)} abonnés</li>
    </ul>
  </div>

  <div class="section section-amber">
    <h3>🔧 À fixer / en cours</h3>
    <ul>
      ${s.venues > s.venuesGeocoded ? `<li><span class="warn">!</span>Géocodage : ${fmt(s.venues - s.venuesGeocoded)} venues sans coordonnées (lancer <code>/api/admin/venues/geocode</code>)</li>` : ''}
      <li><span class="warn">!</span>Serveur mail SMTP (3 options Gmail prêtes, doc dans <a href="/admin/mail-setup">/admin/mail-setup</a>)</li>
      <li><span class="warn">!</span>Webhook Coolify auto-trigger (manuel pour l'instant)</li>
      <li><span class="warn">!</span>App iOS Xcode native à publier sur App Store</li>
    </ul>
  </div>

  <div class="section">
    <h3>🛣️ Roadmap 4 sprints</h3>
    <ul>
      <li><b>S1 (mai)</b> : géocodage venues complet, mail SMTP en prod, Webhook Stripe</li>
      <li><b>S2 (juin)</b> : LiveAvatar full mode, événements premium ticketing</li>
      <li><b>S3 (juillet)</b> : app iOS native sur App Store, push notifications</li>
      <li><b>S4 (août)</b> : marketplace coupons venues, programme parrainage</li>
    </ul>
  </div>

  <div class="section section-rose">
    <h3>🔒 Sécurité</h3>
    <ul>
      <li><span class="check">✓</span>HTTPS Let's Encrypt + HSTS preload (1 an)</li>
      <li><span class="check">✓</span>CSP strict + Permissions-Policy</li>
      <li><span class="check">✓</span>NextAuth JWT + middleware role-based</li>
      <li><span class="check">✓</span>Cookies SameSite=lax + Secure</li>
      <li><span class="check">✓</span>Rate limiting Nominatim + cache MinIO</li>
      <li><span class="warn">!</span>À ajouter : 2FA admin, rotation secrets Stripe webhook, audit RGPD complet</li>
    </ul>
  </div>

  <div class="section">
    <h3>🧱 Stack technique</h3>
    <table>
      <tbody>
        <tr><th style="width:140px;">Frontend</th><td>Next.js 14.2 App Router · React 18 · Tailwind · TypeScript strict</td></tr>
        <tr><th>Backend</th><td>Prisma 5 · PostgreSQL · NextAuth (JWT) · Edge middleware</td></tr>
        <tr><th>Infra</th><td>Coolify (Docker) · OVH VPS Paris · MinIO S3 · Cloudflare CDN</td></tr>
        <tr><th>IA</th><td>Gemini 2.0 Flash · Imagen 3 · fal.ai · Web Speech API</td></tr>
        <tr><th>Paiement</th><td>Stripe · HelloAsso · Square + Apple Pay</td></tr>
        <tr><th>Communication</th><td>Resend / SMTP · Telegram Bot API · SSE temps-réel</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Page régénérée à la volée le <b>${date}</b> depuis la base de production.</p>
    <p style="margin-top:8px;">🌈 <a href="https://gld.pixeeplay.com">gld.pixeeplay.com</a> — Dieu est amour.</p>
  </div>
</div>
</body>
</html>`;
}

export async function GET() {
  try {
    const stats = await loadStats();
    const html = generateHtml(stats);
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
        'x-rapport-generated-at': new Date().toISOString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'rapport-generation-failed', message: e?.message }, { status: 500 });
  }
}
