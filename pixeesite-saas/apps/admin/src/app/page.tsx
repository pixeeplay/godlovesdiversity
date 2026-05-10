export default function HomePage() {
  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center', fontFamily: 'system-ui', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 64, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>
        Pixeesite
      </h1>
      <p style={{ fontSize: 20, opacity: 0.8, marginTop: 16 }}>
        Le site builder AI-first européen.
      </p>
      <p style={{ opacity: 0.6, marginTop: 8 }}>
        Crée ton site, parallax, vidéos IA, e-commerce. RGPD. Self-hostable.
      </p>
      <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <a href="/signup" style={{ background: '#d946ef', color: '#fff', padding: '12px 24px', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>
          Essai gratuit 14 jours
        </a>
        <a href="/login" style={{ border: '1px solid #d946ef', color: '#d946ef', padding: '12px 24px', borderRadius: 999, fontWeight: 700, textDecoration: 'none' }}>
          Se connecter
        </a>
      </div>
      <p style={{ marginTop: 48, fontSize: 12, opacity: 0.4 }}>
        🚧 Pixeesite est en cours de développement. <a href="/admin">Admin SaaS</a>
      </p>
    </main>
  );
}
