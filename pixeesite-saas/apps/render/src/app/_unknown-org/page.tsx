export default function UnknownOrg() {
  return (
    <main style={{ padding: '4rem 2rem', textAlign: 'center', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 48 }}>🌐 Pixeesite</h1>
      <p style={{ opacity: 0.7, marginTop: 16 }}>
        Aucun site n'est associé à ce domaine.
      </p>
      <p style={{ opacity: 0.5, marginTop: 24, fontSize: 14 }}>
        Si tu es propriétaire de ce domaine, vérifie le pointage CNAME dans
        ton dashboard sur <a href="https://app.pixeesite.com">app.pixeesite.com</a>.
      </p>
    </main>
  );
}
