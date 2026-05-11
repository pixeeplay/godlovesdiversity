export const metadata = {
  title: 'Pixeesite — Le créateur de sites multi-tenant',
  description: 'Crée, héberge et vend des sites web pour tes clients. 100 effets wahoo, IA intégrée, marketplace de templates.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0f', color: '#fafafa' }}>
        {children}
      </body>
    </html>
  );
}
