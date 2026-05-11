import Link from 'next/link';
import { colors, gradients, shadows, radii } from '@/lib/design-tokens';

export const metadata = {
  title: 'Pixeesite — Site builder AI-first européen',
  description: 'Crée ton site web en 5 minutes avec l\'IA. 106 templates, page builder drag&drop, e-commerce, blog, forum, newsletter. RGPD, self-hostable.',
};

// ── DATA ─────────────────────────────────────────────────────────────────

const TEMPLATES_SHOWCASE = [
  { name: 'Studio Photo', cat: 'Photographie', img: 'https://images.unsplash.com/photo-1554048612-b6a482b224b8?w=600&q=80&auto=format', tag: '📸', color: '#ec4899' },
  { name: 'Restaurant Lumière', cat: 'Restauration', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80&auto=format', tag: '🍽', color: '#f59e0b' },
  { name: 'SaaS Linear', cat: 'Tech', img: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=80&auto=format', tag: '💻', color: '#06b6d4' },
  { name: 'Asso Solidaire', cat: 'Association', img: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80&auto=format', tag: '🤝', color: '#10b981' },
  { name: 'Podcast Cosmos', cat: 'Podcast', img: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&q=80&auto=format', tag: '🎙', color: '#8b5cf6' },
  { name: 'École Code', cat: 'Formation', img: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80&auto=format', tag: '🎓', color: '#3b82f6' },
];

const FEATURES = [
  {
    icon: '🪄', emoji: '✨', title: 'Studio IA — Génération de thème',
    desc: 'Décris ton activité. L\'IA crée tout : palette de couleurs, polices, hero, contenu de chaque page, illustrations.',
    bullets: ['12 providers IA (Claude, GPT, Gemini…)', 'Génération bloc-par-bloc personnalisée', 'Brand kit automatique'],
    accent: '#d946ef',
    img: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=900&q=80&auto=format',
  },
  {
    icon: '🎨', emoji: '🧱', title: 'Page Builder pro',
    desc: '50+ effets visuels prêts à l\'emploi : parallax, slider, marquee, glassmorphism, particles. Drag & drop natif.',
    bullets: ['Composants animés au scroll', 'Mobile-first responsive', 'Code clean exporté'],
    accent: '#06b6d4',
    img: 'https://images.unsplash.com/photo-1559028012-481c04fa702d?w=900&q=80&auto=format',
  },
  {
    icon: '🛒', emoji: '💳', title: 'E-commerce intégré',
    desc: 'Produits, variantes, panier, checkout Stripe, dropshipping. Plus besoin de plug-in Shopify externe.',
    bullets: ['Stripe + Apple Pay + SEPA', 'Dropshipping multi-fournisseurs', 'Gestion stock + variantes'],
    accent: '#10b981',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80&auto=format',
  },
  {
    icon: '📝', emoji: '✏️', title: 'Blog, forum, newsletter',
    desc: 'Articles SEO, forum modéré par IA Telegram, newsletter visuelle avec A/B testing et segmentation CRM.',
    bullets: ['Modération IA Telegram', 'Editor visuel WYSIWYG', 'A/B testing intégré'],
    accent: '#f59e0b',
    img: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=80&auto=format',
  },
];

const HOW_STEPS = [
  { step: '01', emoji: '💬', title: 'Brief en 2 phrases', desc: 'Tu décris ton activité. L\'IA pose 4 questions intelligentes pour cerner audience, ton, valeurs.', color: '#ec4899' },
  { step: '02', emoji: '🎨', title: 'Choix du style', desc: 'Couleur dominante, police, logo. Preview live pendant que tu choisis.', color: '#8b5cf6' },
  { step: '03', emoji: '⚙️', title: 'Modules activés', desc: 'Blog, shop, forum, contact, newsletter — tu coches, l\'IA configure tout.', color: '#06b6d4' },
  { step: '04', emoji: '🚀', title: 'Live en 60 sec', desc: 'L\'IA personnalise chaque page selon ton brief. Tu vois le résultat se générer en direct.', color: '#10b981' },
];

const PRICING = [
  { plan: 'Free', price: '0', priceUnit: '€/mois', desc: 'Pour explorer', highlight: false, badge: '', items: ['1 site', '50 pages', 'Sous-domaine pixeeplay.com', '1 000 crédits IA / mois', 'Templates gratuits', 'Communauté Discord'] },
  { plan: 'Solo', price: '12', priceUnit: '€/mois', desc: 'Freelance', highlight: false, badge: '', items: ['3 sites', '200 pages / site', '1 domaine custom + SSL', '10 000 crédits IA', 'Tous les templates', 'Support email'] },
  { plan: 'Pro', price: '39', priceUnit: '€/mois', desc: 'Petites entreprises', highlight: true, badge: '⭐ Populaire', items: ['10 sites', 'Pages illimitées', '5 domaines + SSL auto', '50 000 crédits IA', 'E-commerce + Stripe', 'Multi-langue (30)', 'Modération IA', 'Support prioritaire'] },
  { plan: 'Agency', price: '149', priceUnit: '€/mois', desc: 'Agences', highlight: false, badge: '', items: ['Sites illimités', 'Pages illimitées', 'Domaines illimités', '500 000 crédits IA', 'White-label complet', 'Équipe + rôles + audit', 'API + webhooks', 'SLA 99.9 %'] },
  { plan: 'Enterprise', price: 'Sur devis', priceUnit: '', desc: 'Grands comptes', highlight: false, badge: '', items: ['Tout Agency', 'Self-hosted on-prem', 'SAML / SCIM', 'SLA garanti contractuel', 'Customer Success dédié', 'Migration assistée'] },
];

const TESTIMONIALS = [
  { name: 'Léa Martin', role: 'Photographe mariage', initials: 'LM', color: '#ec4899', quote: 'En 4 minutes mon site était en ligne. L\'IA a rédigé mes textes mieux que moi, et j\'ai gagné 3 clients la première semaine.' },
  { name: 'Karim El-Amri', role: 'Restaurateur, Lyon', initials: 'KE', color: '#f59e0b', quote: 'J\'ai remplacé Squarespace + Mailchimp + Shopify d\'un coup. Et ça coûte 1/4 du prix mensuel.' },
  { name: 'Studio Pixelle', role: 'Agence web (12 clients)', initials: 'SP', color: '#8b5cf6', quote: 'White-label parfait. On livre 3× plus vite, les clients sont bluffés par les effets parallax et les générateurs IA.' },
  { name: 'Maxime Renard', role: 'Coach business', initials: 'MR', color: '#06b6d4', quote: 'Le forum + newsletter intégrés ont changé ma vie. Plus besoin de jongler entre 4 outils, tout est ici.' },
];

const FAQ = [
  { q: 'Combien de temps pour avoir un site en ligne ?', a: 'En moyenne 5 à 10 minutes du wizard à la mise en ligne. L\'IA génère tout le contenu personnalisé pendant que tu choisis ton style.' },
  { q: 'Mes données sont où ?', a: 'Hébergées en France (OVH Roubaix) par défaut. Tu peux self-host sur ton propre serveur (Docker Compose en 5 min). RGPD natif, audit logs, chiffrement AES-256.' },
  { q: 'Je peux annuler à tout moment ?', a: 'Oui, en 1 clic dans /billing. Pas d\'engagement, pas de pénalité. Tes données restent disponibles 30 jours après pour export.' },
  { q: 'C\'est open source ?', a: 'Licence BUSL (Business Source License). Le code est ouvert, tu peux le forker, le self-host. Restrictions uniquement sur la revente en SaaS concurrent.' },
  { q: 'Y a-t-il une API ?', a: 'Oui, REST + webhooks dès le plan Agency. SDK TypeScript et Python disponibles. Documentation OpenAPI.' },
  { q: 'Compatible avec mon nom de domaine perso ?', a: 'Oui dès le plan Solo. Tu pointes ton DNS (CNAME), Pixeesite gère le certificat HTTPS automatiquement via Let\'s Encrypt.' },
];

const BRAND_LOGOS = [
  'Studio Pixelle', 'Café Lumière', 'École Code', 'Atelier Mosaïk', 'Cosmos FM', 'Studio Cirque',
];

// ── COMPONENTS HELPERS ────────────────────────────────────────────────────

function BrowserFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)', background: '#0a0a0f' }}>
      <div style={{ background: '#18181b', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #27272a' }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
        <span style={{ marginLeft: 16, fontSize: 11, opacity: 0.5, fontFamily: 'monospace' }}>nono.pixeeplay.com/photo-cirque</span>
      </div>
      {children}
    </div>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main style={{ background: colors.bg, color: colors.text, fontFamily: 'Inter, -apple-system, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(20px) saturate(180%)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: gradients.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 14px rgba(217,70,239,0.5)' }}>✨</span>
            <span style={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.5 }}>Pixeesite</span>
          </Link>
          <div style={{ display: 'flex', gap: 28, alignItems: 'center', fontSize: 14 }}>
            <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Fonctions</a>
            <a href="#templates" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Templates</a>
            <a href="#pricing" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Tarifs</a>
            <a href="#faq" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>FAQ</a>
            <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Connexion</Link>
            <Link href="/signup" style={{ background: gradients.brand, color: 'white', padding: '9px 18px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 13, boxShadow: '0 6px 20px rgba(217,70,239,0.4)' }}>
              Démarrer →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', padding: '90px 24px 60px', overflow: 'hidden' }}>
        {/* Animated gradient mesh background */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,70,239,0.35) 0%, transparent 60%)', filter: 'blur(60px)' }} />
          <div style={{ position: 'absolute', top: '10%', right: '-10%', width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, transparent 60%)', filter: 'blur(70px)' }} />
          <div style={{ position: 'absolute', bottom: '-30%', left: '30%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 60%)', filter: 'blur(80px)' }} />
          {/* Noise overlay */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.03, mixBlendMode: 'overlay' }}>
            <filter id="noise"><feTurbulence baseFrequency="0.9" /></filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', maxWidth: 920, margin: '0 auto' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '7px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, fontWeight: 600, marginBottom: 28, backdropFilter: 'blur(10px)' }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              Beta 2026 — 12 providers IA · open source BUSL
            </div>
            <h1 style={{ fontSize: 'clamp(44px, 8vw, 92px)', fontWeight: 900, lineHeight: 1.02, margin: 0, letterSpacing: -2.5 }}>
              Le site builder qui<br />
              <span style={{ background: 'linear-gradient(135deg, #d946ef 0%, #8b5cf6 35%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundSize: '200% 200%' }}>
                comprend ton business.
              </span>
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: 'rgba(255,255,255,0.65)', maxWidth: 660, margin: '28px auto 0', lineHeight: 1.5, fontWeight: 400 }}>
              5 minutes pour créer un site complet. Pages, blog, forum, boutique, newsletter — l'IA personnalise chaque bloc selon ton métier. Self-hostable, RGPD, 100 % EU.
            </p>
            <div style={{ marginTop: 44, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/signup" style={{ background: gradients.brand, color: 'white', padding: '16px 32px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 16, boxShadow: '0 12px 40px rgba(217,70,239,0.45), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                Commencer gratuitement →
              </Link>
              <a href="#how" style={{ background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', padding: '16px 32px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 16, backdropFilter: 'blur(10px)' }}>
                ▶ Voir la démo (90 sec)
              </a>
            </div>
            <div style={{ marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,0.45)', display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <span>✓ Sans carte bancaire</span>
              <span>✓ 14 jours d'essai Pro</span>
              <span>✓ Annulable en 1 clic</span>
            </div>
          </div>

          {/* Hero product showcase mockup */}
          <div style={{ marginTop: 70, maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', position: 'relative' }}>
            <div aria-hidden style={{ position: 'absolute', top: '40%', left: 0, right: 0, height: 200, background: 'radial-gradient(ellipse at center, rgba(217,70,239,0.35) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <BrowserFrame>
              <div style={{ aspectRatio: '16/9', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)', position: 'relative', overflow: 'hidden' }}>
                <img src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1600&q=85&auto=format" alt="Hero" style={{ width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'overlay', opacity: 0.6 }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8%', color: 'white' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, marginBottom: 8 }}>Studio Cirque · Photographie</div>
                  <div style={{ fontSize: 'clamp(28px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.05, maxWidth: 600, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
                    Des images qui<br />racontent ton histoire.
                  </div>
                  <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                    <button style={{ background: 'white', color: '#1e1b4b', border: 0, padding: '12px 22px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}>Voir le portfolio</button>
                    <button style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', padding: '12px 22px', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>Devis</button>
                  </div>
                </div>
              </div>
            </BrowserFrame>
            <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              ↑ Site généré par IA depuis le brief "studio photo cirque & mariage à Lyon"
            </div>
          </div>

          {/* Logo wall */}
          <div style={{ marginTop: 80, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Ils ont déjà lancé leur site</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px 50px', opacity: 0.55 }}>
              {BRAND_LOGOS.map((b) => (
                <span key={b} style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.5 }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── KEY METRICS ─────────────────────────────────────────── */}
      <section style={{ padding: '40px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {[
            { v: '106', l: 'Templates pro', g: gradients.purple },
            { v: '50+', l: 'Effets visuels', g: gradients.blue },
            { v: '12', l: 'Providers IA', g: gradients.pink },
            { v: '30', l: 'Langues', g: gradients.green },
            { v: '5 min', l: 'Setup moyen', g: gradients.orange },
          ].map((s) => (
            <div key={s.l} style={{ background: s.g, borderRadius: 16, padding: 22, color: 'white', minHeight: 130, position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
              <div style={{ position: 'relative', fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>{s.v}</div>
              <div style={{ position: 'relative', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.95, marginTop: 32 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES (alternating big sections) ─────────────────── */}
      <section id="features" style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto 80px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: colors.primary, opacity: 0.9 }}>Tout-en-un</div>
          <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, margin: '12px 0 14px', letterSpacing: -1.5, lineHeight: 1.1 }}>
            Une plateforme. <span style={{ background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Zéro plug-in.</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', maxWidth: 680, margin: '0 auto', lineHeight: 1.5 }}>
            Tout ce dont t'as besoin pour faire vivre ton site, sans empiler 12 outils différents.
          </p>
        </div>

        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 80 }}>
          {FEATURES.map((f, i) => (
            <div key={f.title} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 50, alignItems: 'center' }}>
              <div style={{ order: i % 2 === 0 ? 0 : 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: `${f.accent}22`, color: f.accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 18 }}>
                  <span>{f.icon}</span> Feature
                </div>
                <h3 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: -1, lineHeight: 1.15 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, margin: '0 0 24px' }}>{f.desc}</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {f.bullets.map((b) => (
                    <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${f.accent}22`, color: f.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>✓</span>
                      <span style={{ color: 'rgba(255,255,255,0.85)' }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ order: i % 2 === 0 ? 1 : 0, position: 'relative' }}>
                <div aria-hidden style={{ position: 'absolute', inset: -30, background: `radial-gradient(circle at center, ${f.accent}33 0%, transparent 60%)`, filter: 'blur(30px)' }} />
                <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 30px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}>
                  <img src={f.img} alt={f.title} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${f.accent}33 0%, transparent 100%)` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────── */}
      <section id="how" style={{ padding: '120px 24px', background: 'radial-gradient(ellipse at center, rgba(217,70,239,0.08) 0%, transparent 70%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 70px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: colors.secondary, opacity: 0.9 }}>Comment ça marche</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, margin: '12px 0 14px', letterSpacing: -1.5, lineHeight: 1.1 }}>
              De l'idée au site live en <span style={{ background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>4 étapes</span>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)' }}>Pas de blank page syndrome. L'IA te guide, tu choisis.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, position: 'relative' }}>
            {HOW_STEPS.map((s) => (
              <div key={s.step} style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28, transition: 'transform .3s' }}>
                <div aria-hidden style={{ position: 'absolute', top: -2, left: 24, right: 24, height: 2, background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <span style={{ fontSize: 36, fontWeight: 900, color: s.color, opacity: 0.9, letterSpacing: -2 }}>{s.step}</span>
                  <span style={{ fontSize: 36 }}>{s.emoji}</span>
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.3 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 50, textAlign: 'center' }}>
            <Link href="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: gradients.brand, color: 'white', padding: '16px 36px', borderRadius: 999, fontWeight: 700, textDecoration: 'none', fontSize: 15, boxShadow: '0 12px 40px rgba(217,70,239,0.45)' }}>
              🪄 Lancer le wizard maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* ── TEMPLATES SHOWCASE ──────────────────────────────────── */}
      <section id="templates" style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: 20, marginBottom: 50 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ec4899', opacity: 0.9 }}>Templates</div>
              <h2 style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, margin: '12px 0 6px', letterSpacing: -1.5, lineHeight: 1.1 }}>
                106 templates <span style={{ background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>professionnels</span>
              </h2>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', maxWidth: 500, margin: 0 }}>Démarre depuis un design fini. L'IA personnalise chaque template selon ton brief.</p>
            </div>
            <Link href="/signup" style={{ color: colors.primary, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>Voir tous les templates →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 18 }}>
            {TEMPLATES_SHOWCASE.map((t) => (
              <div key={t.name} style={{ position: 'relative', background: '#18181b', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'transform .3s' }}>
                <div style={{ aspectRatio: '4/3', overflow: 'hidden', position: 'relative' }}>
                  <img src={t.img} alt={t.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, transparent 60%, rgba(0,0,0,0.8) 100%)' }} />
                  <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', borderRadius: 999, background: t.color, color: 'white', fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
                    {t.tag} {t.cat}
                  </div>
                  <div style={{ position: 'absolute', bottom: 14, left: 14, right: 14, color: 'white' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>{t.name}</div>
                  </div>
                </div>
                <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Premium · 8 pages</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: colors.primary }}>Utiliser →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '120px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.06) 0%, transparent 70%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: colors.success, opacity: 0.9 }}>Tarifs simples</div>
            <h2 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, margin: '12px 0 14px', letterSpacing: -1.5, lineHeight: 1.1 }}>
              Choisis ton <span style={{ background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>plan</span>
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.6)' }}>Annulable en 1 clic, sans engagement. Tous les prix HT en €/mois.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 16, alignItems: 'stretch' }}>
            {PRICING.map((p) => (
              <div key={p.plan} style={{
                position: 'relative',
                background: p.highlight ? 'linear-gradient(180deg, rgba(217,70,239,0.15) 0%, rgba(6,182,212,0.1) 100%)' : 'rgba(255,255,255,0.03)',
                border: p.highlight ? '2px solid rgba(217,70,239,0.5)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: 26,
                boxShadow: p.highlight ? '0 20px 50px rgba(217,70,239,0.25)' : 'none',
                transform: p.highlight ? 'scale(1.04)' : 'scale(1)',
                display: 'flex', flexDirection: 'column',
              }}>
                {p.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: gradients.brand, color: 'white', fontSize: 10, fontWeight: 800, letterSpacing: 1, padding: '5px 14px', borderRadius: 999, textTransform: 'uppercase', boxShadow: '0 6px 14px rgba(217,70,239,0.4)' }}>{p.badge}</div>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{p.plan}</div>
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: p.price === 'Sur devis' ? 26 : 42, fontWeight: 900, lineHeight: 1, letterSpacing: -1.5 }}>{p.price === 'Sur devis' ? 'Sur devis' : `€${p.price}`}</span>
                  {p.priceUnit && <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{p.priceUnit}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 6, marginBottom: 22 }}>{p.desc}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {p.items.map((it) => (
                    <li key={it} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.4, color: 'rgba(255,255,255,0.8)' }}>
                      <span style={{ color: p.highlight ? colors.primary : colors.success, flexShrink: 0 }}>✓</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" style={{
                  display: 'block', textAlign: 'center', padding: '13px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none',
                  background: p.highlight ? gradients.brand : 'rgba(255,255,255,0.06)',
                  color: 'white',
                  border: p.highlight ? 'none' : '1px solid rgba(255,255,255,0.12)',
                  boxShadow: p.highlight ? '0 8px 24px rgba(217,70,239,0.4)' : 'none',
                }}>
                  {p.price === 'Sur devis' ? 'Nous contacter' : `Commencer ${p.plan}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: 700, margin: '0 auto 60px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: colors.pink, opacity: 0.9 }}>Témoignages</div>
            <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 800, margin: '12px 0 14px', letterSpacing: -1.2, lineHeight: 1.15 }}>
              Ce qu'en disent <span style={{ background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>nos clients</span>
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18 }}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 28, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 24, color: colors.primary, lineHeight: 1, fontWeight: 900 }}>"</div>
                <p style={{ fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.85)', margin: '12px 0 24px', flex: 1 }}>{t.quote}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'white' }}>{t.initials}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '100px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: colors.info, opacity: 0.9 }}>FAQ</div>
            <h2 style={{ fontSize: 'clamp(30px, 4.5vw, 48px)', fontWeight: 800, margin: '12px 0 14px', letterSpacing: -1.2, lineHeight: 1.15 }}>
              Questions <span style={{ background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>fréquentes</span>
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQ.map((item) => (
              <details key={item.q} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '18px 22px', cursor: 'pointer' }}>
                <summary style={{ fontSize: 15, fontWeight: 700, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <span>{item.q}</span>
                  <span style={{ color: colors.primary, fontSize: 20, fontWeight: 400 }}>+</span>
                </summary>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: '12px 0 0' }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────── */}
      <section style={{ padding: '120px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', borderRadius: 28, padding: 'clamp(50px, 8vw, 90px) 24px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #4c1d95 0%, #d946ef 50%, #06b6d4 100%)', boxShadow: '0 40px 100px rgba(217,70,239,0.4)' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 0%, rgba(255,255,255,0.2) 0%, transparent 50%)', pointerEvents: 'none' }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.1 }}>
            <svg width="100%" height="100%"><filter id="n"><feTurbulence baseFrequency="0.65" /></filter><rect width="100%" height="100%" filter="url(#n)" /></svg>
          </div>
          <h2 style={{ position: 'relative', fontSize: 'clamp(32px, 5.5vw, 60px)', fontWeight: 900, color: 'white', margin: '0 0 18px', letterSpacing: -1.5, lineHeight: 1.05 }}>
            Prêt à lancer ton site ?
          </h2>
          <p style={{ position: 'relative', fontSize: 18, color: 'rgba(255,255,255,0.92)', margin: '0 auto 36px', maxWidth: 580, lineHeight: 1.5 }}>
            14 jours d'essai Pro gratuit. Aucune carte bancaire requise. L'IA fait 90 % du travail pour toi.
          </p>
          <div style={{ position: 'relative', display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" style={{ background: 'white', color: '#1e1b4b', padding: '16px 36px', borderRadius: 999, fontWeight: 800, fontSize: 16, textDecoration: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
              🚀 Créer mon compte gratuit
            </Link>
            <Link href="/login" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', padding: '16px 36px', borderRadius: 999, fontWeight: 700, fontSize: 16, textDecoration: 'none' }}>
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer style={{ padding: '60px 24px 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}>
          <div>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', marginBottom: 14 }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, background: gradients.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✨</span>
              <span style={{ fontWeight: 800, fontSize: 16 }}>Pixeesite</span>
            </Link>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0 }}>
              Le site builder AI-first européen.<br />Made with 💜 in France · BUSL.
            </p>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Produit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <a href="#features" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Fonctions</a>
              <a href="#templates" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Templates</a>
              <a href="#pricing" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Tarifs</a>
              <a href="#faq" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>FAQ</a>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Compte</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <Link href="/signup" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Inscription</Link>
              <Link href="/login" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Connexion</Link>
              <Link href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Dashboard</Link>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>Ressources</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
              <a href="https://github.com/pixeeplay/pixeesite" target="_blank" rel="noopener" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>GitHub</a>
              <a href="https://pixeesite.pixeeplay.com/docs" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Documentation</a>
              <a href="mailto:hello@pixeeplay.com" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>Contact</a>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 1280, margin: '40px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          <div>© 2026 Pixeeplay · Tous droits réservés</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>🇪🇺 Hébergé en France</span>
            <span>🛡️ RGPD natif</span>
            <span>⚖️ BUSL License</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
