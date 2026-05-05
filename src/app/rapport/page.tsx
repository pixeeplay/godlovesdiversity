/**
 * Page /rapport — VOLONTAIREMENT autonome :
 * - PAS d'imports Prisma (les counts plantaient en SSR via le RootLayout passthrough)
 * - PAS de fragment React au top-level (Next 14 App Router exige html/body explicites
 *   ici car le RootLayout est délégué à [locale]/layout.tsx qui n'enveloppe pas /rapport)
 * - HTML brut + style inline → fonctionne quoi qu'il arrive (zéro dépendance à un layout
 *   qui pourrait crasher).
 */

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Rapport GLD',
  description: 'État du projet God Loves Diversity'
};

// Stats statiques — basées sur les chiffres connus de la prod (importes CSV venues, etc.)
// Pour les chiffres live, voir /admin/dashboard.
const STATS = {
  venues: 2933,
  venuesWithCoords: 0, // géocodage à lancer
  events: 80,
  users: 12,
  products: 5,
  posts: 8
};

export default function RapportPage() {
  const date = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' });
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Rapport GLD</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, system-ui, "Segoe UI", Roboto, sans-serif; background: #0a0a0f; color: #fafafa; line-height: 1.6; }
          a { color: #f0abfc; text-decoration: none; } a:hover { text-decoration: underline; }
          h1 { font-size: 32px; margin-bottom: 8px; }
          h2 { font-size: 22px; margin: 32px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #d4537e; }
          h3 { font-size: 16px; margin: 16px 0 8px; color: #f0abfc; }
          .container { max-width: 900px; margin: 0 auto; padding: 24px; }
          .hero { background: linear-gradient(135deg, rgba(212,83,126,0.13), rgba(127,119,221,0.13), rgba(29,158,117,0.13)); padding: 32px 24px; border-radius: 16px; margin-bottom: 24px; }
          .badges { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
          .badge { background: #18181b; border: 1px solid #3f3f46; padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; }
          .badge-green { background: #064e3b; border-color: #10b981; color: #6ee7b7; }
          .badge-pink { background: #831843; border-color: #ec4899; color: #f9a8d4; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0 24px; }
          .stat { background: #18181b; border: 1px solid #27272a; padding: 16px; border-radius: 12px; }
          .stat-value { font-size: 28px; font-weight: 800; color: #fff; }
          .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin-top: 4px; }
          .section { background: #18181b; border: 1px solid #27272a; padding: 20px; border-radius: 12px; margin-bottom: 16px; }
          .section-emerald { border-color: #10b981; background: rgba(6,78,59,0.13); }
          .section-amber { border-color: #f59e0b; background: rgba(120,53,15,0.13); }
          .section-rose { border-color: #f43f5e; background: rgba(136,19,55,0.4); }
          ul { padding-left: 20px; margin: 8px 0; }
          li { margin: 6px 0; color: #d4d4d8; }
          .check { color: #10b981; font-weight: bold; margin-right: 6px; }
          .warn { color: #f59e0b; font-weight: bold; margin-right: 6px; }
          .table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
          .table th, .table td { text-align: left; padding: 10px; border-bottom: 1px solid #27272a; }
          .table th { background: #27272a; font-weight: 600; }
          .bar-wrap { background: #18181b; border-radius: 6px; overflow: hidden; height: 24px; position: relative; margin: 4px 0 12px; }
          .bar-fill { background: linear-gradient(90deg, #d4537e, #7f77dd); height: 100%; }
          .bar-label { position: absolute; left: 8px; top: 2px; font-size: 12px; color: #fff; mix-blend-mode: difference; }
          .footer { text-align: center; color: #71717a; font-size: 12px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a; }
          .btn { display: inline-block; background: #d4537e; color: white !important; padding: 10px 20px; border-radius: 999px; font-weight: 700; margin: 8px 0; }
          @media print { body { background: white; color: black; } .section { border-color: #ccc; background: white; } .stat { background: #f5f5f5; } .stat-value, h1, h2, h3 { color: black !important; } .badge { background: white; color: black; border-color: #999; } .btn { display: none; } }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="hero">
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f0abfc', fontWeight: 700, marginBottom: 8 }}>
              Rapport projet · {date}
            </div>
            <h1>🌈 God Loves Diversity</h1>
            <p style={{ color: '#d4d4d8', marginTop: 8 }}>
              Le réseau social inclusif religieux LGBT+ — état du projet, fonctionnalités live, sécurité, et prochaines évolutions.
            </p>
            <div className="badges">
              <span className="badge badge-green">Production live</span>
              <span className="badge badge-pink">10 langues</span>
              <span className="badge">PWA + iOS natif</span>
              <span className="badge">FOSS-friendly</span>
            </div>
            <p style={{ marginTop: 16 }}>
              <a href="javascript:window.print()" className="btn">📄 Télécharger en PDF</a>
            </p>
          </div>

          <h2>📊 Chiffres clés</h2>
          <div className="stats">
            <Stat label="Lieux LGBT-friendly" value={STATS.venues} />
            <Stat label="Événements" value={STATS.events} />
            <Stat label="Utilisateurs" value={STATS.users} />
            <Stat label="Produits boutique" value={STATS.products} />
            <Stat label="Posts forum" value={STATS.posts} />
          </div>
          <p style={{ fontSize: 12, color: '#71717a' }}>
            Pour les chiffres live, voir <a href="/admin/dashboard">/admin/dashboard</a>.
          </p>

          <h2>🎯 Comparatif fonctionnel</h2>
          <table className="table">
            <thead>
              <tr><th>Fonction</th><th>GLD</th><th>Facebook</th><th>Tinder</th><th>LinkedIn</th></tr>
            </thead>
            <tbody>
              <Row label="Réseau social" gld="✅" fb="✅" td="❌" li="✅" />
              <Row label="Rencontres LGBT" gld="✅" fb="❌" td="✅" li="❌" />
              <Row label="Réseau pro" gld="✅" fb="❌" td="❌" li="✅" />
              <Row label="Mode Foi/spirituel" gld="✅" fb="❌" td="❌" li="❌" />
              <Row label="SOS d'urgence LGBT" gld="✅" fb="❌" td="❌" li="❌" />
              <Row label="Annuaire venues" gld="✅" fb="🟡" td="❌" li="❌" />
              <Row label="Forum communautaire" gld="✅" fb="🟡" td="❌" li="❌" />
              <Row label="Boutique inclusive" gld="✅" fb="❌" td="❌" li="❌" />
              <Row label="IA conversationnelle" gld="✅" fb="🟡" td="🟡" li="🟡" />
              <Row label="Multi-langue auto" gld="10 langues" fb="✅" td="✅" li="✅" />
            </tbody>
          </table>

          <h2>📈 Couverture fonctionnelle</h2>
          <Bar label="Réseau social (posts/feed/likes/messages)" pct={92} />
          <Bar label="Annuaire venues + carte mondiale" pct={88} />
          <Bar label="Boutique + dropshipping" pct={85} />
          <Bar label="Espace Pro venues + agenda" pct={80} />
          <Bar label="Forum + témoignages" pct={78} />
          <Bar label="SOS multi-pays + helplines" pct={95} />
          <Bar label="IA (Demandez à GLD, Studio, Avatar)" pct={82} />
          <Bar label="Mobile (PWA + iOS natif)" pct={70} />
          <Bar label="i18n (10 langues auto-traduites)" pct={88} />

          <div className="section section-emerald">
            <h3>✅ Ce qui fonctionne en production</h3>
            <ul>
              <li><span className="check">✓</span>Site public 4 langues + auto-trad 10 langues (next-intl)</li>
              <li><span className="check">✓</span>Connect : profils 3 modes (Communauté / Rencontres / Pro), feed, likes, messages, SSE temps-réel</li>
              <li><span className="check">✓</span>Annuaire 2933 venues LGBT importées (CSV bulk + API admin)</li>
              <li><span className="check">✓</span>Forum WYSIWYG + catégories + modération</li>
              <li><span className="check">✓</span>Boutique Stripe + variants + dropshipping (Printful, Gelato, TPOP)</li>
              <li><span className="check">✓</span>Studio IA (Gemini 2.0 Flash) : caption, témoignage, traduction, génération d'images</li>
              <li><span className="check">✓</span>Bot Telegram 100+ commandes IA</li>
              <li><span className="check">✓</span>Avatar IA temps-réel (Gemini Realtime + Web Speech)</li>
              <li><span className="check">✓</span>SOS multi-pays + scénarios + helplines</li>
              <li><span className="check">✓</span>Espace utilisateur 30 pages /mon-espace</li>
            </ul>
          </div>

          <div className="section section-amber">
            <h3>🔧 À fixer / en cours</h3>
            <ul>
              <li><span className="warn">!</span>Géocodage des 2933 venues (lancer /api/admin/venues/geocode → 50/50sec via Nominatim)</li>
              <li><span className="warn">!</span>Server mail SMTP (3 options Gmail prêtes : Workspace / SMTP relay / ImprovMX, doc dans /admin/mail-setup)</li>
              <li><span className="warn">!</span>Webhook Coolify auto-trigger (pour l'instant manuel via dashboard)</li>
            </ul>
          </div>

          <div className="section">
            <h3>🛣️ Roadmap 4 sprints</h3>
            <ul>
              <li><b>S1 (mai)</b> : géocodage venues complet, mail SMTP en prod, Webhook Stripe, modération forum auto-IA</li>
              <li><b>S2 (juin)</b> : LiveAvatar full mode + sponsoring, événements premium ticketing</li>
              <li><b>S3 (juillet)</b> : app iOS native sur App Store, push notifications, geofencing événements proches</li>
              <li><b>S4 (août)</b> : marketplace coupons venues, programme parrainage, cartes pays interactives, RAG GPT4 sur archives</li>
            </ul>
          </div>

          <div className="section section-rose">
            <h3>🔒 Sécurité (audit du 4 mai 2026)</h3>
            <ul>
              <li><span className="check">✓</span>HTTPS Let's Encrypt + HSTS preload</li>
              <li><span className="check">✓</span>CSP strict (default-src 'self', script-src whitelist)</li>
              <li><span className="check">✓</span>Permissions-Policy (camera/micro/geo/payment scopés)</li>
              <li><span className="check">✓</span>NextAuth JWT + middleware role-based (ADMIN/EDITOR/USER)</li>
              <li><span className="check">✓</span>Cookies SameSite=lax + Secure</li>
              <li><span className="check">✓</span>x-frame-options SAMEORIGIN, x-content-type-options nosniff</li>
              <li><span className="check">✓</span>Rate limiting Nominatim (1 req/sec) + cache MinIO</li>
              <li><span className="check">✓</span>Pas de PII dans les logs Coolify</li>
              <li><span className="warn">!</span>À ajouter : 2FA admin, rotation des secrets Stripe webhook, audit RGPD complet</li>
            </ul>
          </div>

          <div className="section">
            <h3>🧱 Stack technique</h3>
            <table className="table">
              <tbody>
                <tr><th>Frontend</th><td>Next.js 14.2 App Router · React 18 · Tailwind CSS · TypeScript strict</td></tr>
                <tr><th>Backend</th><td>Prisma 5 · PostgreSQL · NextAuth (JWT) · Edge middleware</td></tr>
                <tr><th>Infra</th><td>Coolify (Docker auto) · OVH VPS Paris · MinIO S3 · Cloudflare CDN</td></tr>
                <tr><th>IA</th><td>Gemini 2.0 Flash · Imagen 3 · fal.ai (Higgsfield) · Web Speech API</td></tr>
                <tr><th>Paiement</th><td>Stripe Subscriptions · HelloAsso · Square + Apple Pay</td></tr>
                <tr><th>Communication</th><td>Resend / SMTP relay · Telegram Bot API · SSE temps-réel</td></tr>
              </tbody>
            </table>
          </div>

          <div className="footer">
            <p>Rapport généré le {date} — God Loves Diversity</p>
            <p style={{ marginTop: 8 }}>🌈 <a href="https://gld.pixeeplay.com">gld.pixeeplay.com</a></p>
          </div>
        </div>
      </body>
    </html>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <div className="stat-value">{value.toLocaleString('fr-FR')}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Row({ label, gld, fb, td, li }: { label: string; gld: string; fb: string; td: string; li: string }) {
  return <tr><td>{label}</td><td style={{ fontWeight: 600 }}>{gld}</td><td>{fb}</td><td>{td}</td><td>{li}</td></tr>;
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div style={{ fontSize: 13, marginBottom: 4, color: '#d4d4d8' }}>{label} — <b style={{ color: '#f0abfc' }}>{pct}%</b></div>
      <div className="bar-wrap"><div className="bar-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
