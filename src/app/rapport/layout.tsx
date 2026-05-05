// Layout autonome /rapport — fournit <html><body> car le root layout est
// délégué à [locale]/layout.tsx qui ne s'applique pas ici.
export default function RapportLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: '#0a0a0f', color: '#fafafa' }}>
        {children}
      </body>
    </html>
  );
}
