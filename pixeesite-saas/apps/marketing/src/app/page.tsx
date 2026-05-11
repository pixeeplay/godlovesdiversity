const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://pixeesite.app';

const card: React.CSSProperties = {
  background: 'linear-gradient(135deg, #18181b 0%, #1c1c25 100%)',
  border: '1px solid #27272a',
  borderRadius: 16,
  padding: 24,
};

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section style={{ padding: '100px 24px 60px', textAlign: 'center', background: 'radial-gradient(ellipse at top, rgba(217,70,239,0.15), transparent 60%)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(217,70,239,0.15)', borderRadius: 999, fontSize: 13, color: '#d946ef', marginBottom: 24 }}>
            🚀 Beta · BUSL 1.1 → Apache 2.0 dans 4 ans
          </div>
          <h1 style={{ fontSize: 64, margin: '0 0 16px', lineHeight: 1.1, fontWeight: 900 }}>
            Le <span style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>builder multi-tenant</span> avec IA intégrée
          </h1>
          <p style={{ fontSize: 20, opacity: 0.7, maxWidth: 680, margin: '0 auto 32px', lineHeight: 1.5 }}>
            Crée et héberge des sites pour tes clients. 100 effets wahoo, blog, forum, e-commerce, IA Gemini/Claude/OpenAI, custom domains avec SSL auto. DB isolée par tenant.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={`${APP_URL}/signup`} style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontWeight: 700 }}>
              Commencer gratuitement →
            </a>
            <a href="#pricing" style={{ background: 'transparent', border: '1px solid #3f3f46', color: 'inherit', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontWeight: 600 }}>
              Voir les tarifs
            </a>
          </div>
          <div style={{ marginTop: 48, fontSize: 13, opacity: 0.5 }}>
            ⚡ Déploiement en 30s · 🔒 SSL auto · 🌍 Custom domains · 🤖 IA multi-provider
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 48px' }}>Tout ce qu'il faut pour vendre des sites</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { emoji: '🎨', title: 'Page Builder visuel', desc: '100 effets wahoo, parallax, drag-drop, prévisualisation iframe live' },
            { emoji: '🤖', title: 'IA multi-provider', desc: 'Gemini, Claude, OpenAI, OpenRouter, Groq, Ollama, LM Studio. Une clé par feature.' },
            { emoji: '🛒', title: 'E-commerce intégré', desc: 'Produits, paniers, Stripe Connect (commission 2%)' },
            { emoji: '📝', title: 'Blog + Forum + Newsletter', desc: 'Contenus complets, modération IA, campagnes mail Resend' },
            { emoji: '🌐', title: 'Custom domains + SSL', desc: 'CNAME → SSL auto Let\'s Encrypt. Wildcard *.pixeesite.app inclus.' },
            { emoji: '🔐', title: 'Sécurité enterprise', desc: '2FA TOTP, AES-256-GCM secrets, audit log, RBAC owner/admin/editor/viewer' },
            { emoji: '👥', title: 'Multi-équipe', desc: 'Invite ton équipe, rôles fins, audit complet' },
            { emoji: '📊', title: 'Analytics + CRM', desc: 'Leads, formulaires, Plausible/PostHog, Google Analytics' },
            { emoji: '⚡', title: 'DB isolée par tenant', desc: 'Chaque client = sa DB Postgres. Aucun risque de fuite cross-tenant.' },
          ].map((f) => (
            <div key={f.title} style={card}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>{f.emoji}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 18 }}>{f.title}</h3>
              <p style={{ opacity: 0.7, fontSize: 13, margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: '60px 24px', background: '#0d0d12' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h2 style={{ fontSize: 36, textAlign: 'center', margin: '0 0 48px' }}>Tarifs simples et transparents</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { name: 'Free', price: 0, features: ['1 site', '100 MB storage', 'Subdomain *.pixeesite.app', 'Branding Pixeesite'] },
              { name: 'Solo', price: 14, features: ['3 sites', '5 GB storage', 'Custom domain', 'Sans branding', '500 crédits IA/mois'] },
              { name: 'Pro', price: 39, popular: true, features: ['10 sites', '50 GB storage', 'Multi-domains', 'Membres équipe (3)', '5K crédits IA/mois', 'Priority support'] },
              { name: 'Agency', price: 99, features: ['Sites illimités', '500 GB storage', 'White-label complet', 'Membres équipe illimités', '50K crédits IA/mois', 'API access'] },
            ].map((p) => (
              <div key={p.name} style={{ ...card, position: 'relative', border: p.popular ? '2px solid #d946ef' : card.border }}>
                {p.popular && (
                  <div style={{ position: 'absolute', top: -12, right: 16, background: '#d946ef', color: 'white', fontSize: 11, padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>
                    POPULAIRE
                  </div>
                )}
                <h3 style={{ margin: '0 0 8px', fontSize: 22 }}>{p.name}</h3>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{p.price}€<span style={{ fontSize: 14, opacity: 0.5 }}>/mois</span></div>
                <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, opacity: 0.8, lineHeight: 2 }}>
                  {p.features.map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                <a href={`${APP_URL}/signup?plan=${p.name.toLowerCase()}`} style={{ display: 'block', textAlign: 'center', background: p.popular ? 'linear-gradient(135deg, #d946ef, #06b6d4)' : '#27272a', color: 'white', textDecoration: 'none', padding: '12px', borderRadius: 8, fontWeight: 700, marginTop: 16 }}>
                  {p.price === 0 ? 'Commencer' : 'Souscrire'}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + footer */}
      <section style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, margin: '0 0 16px' }}>Prêt à passer à l'action ?</h2>
        <p style={{ opacity: 0.7, marginBottom: 24 }}>Crée ton org en 30 secondes, sans carte bancaire.</p>
        <a href={`${APP_URL}/signup`} style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontWeight: 700, display: 'inline-block' }}>
          Créer mon compte →
        </a>
      </section>

      <footer style={{ padding: '48px 24px', borderTop: '1px solid #27272a', textAlign: 'center', fontSize: 13, opacity: 0.5 }}>
        <div style={{ marginBottom: 8 }}>
          <a href="/legal/terms" style={{ color: 'inherit', margin: '0 8px' }}>CGU</a>
          <a href="/legal/privacy" style={{ color: 'inherit', margin: '0 8px' }}>Confidentialité</a>
          <a href="https://github.com/pixeeplay/pixeesite" style={{ color: 'inherit', margin: '0 8px' }}>GitHub</a>
          <a href={`${APP_URL}/login`} style={{ color: 'inherit', margin: '0 8px' }}>Connexion</a>
        </div>
        © {new Date().getFullYear()} Pixeesite — BUSL 1.1
      </footer>
    </div>
  );
}
