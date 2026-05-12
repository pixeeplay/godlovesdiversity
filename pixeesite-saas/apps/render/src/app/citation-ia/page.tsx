import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentOrg } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';
import { CitationIaClient } from '@/components/CitationIaClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Citation IA — Générateur de citations',
  description: 'Génère des citations originales, philosophiques et inspirantes sur le thème de ton choix.',
};

export default async function CitationIaPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();

  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug') || org.slug;

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #ec4899, #f59e0b)',
            alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12,
          }}>✒️</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>Citation IA</h1>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 8, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            Génère des citations originales sur le thème de ton choix. Idéal pour ton blog, tes réseaux ou ta propre inspiration.
          </p>
        </header>
        <CitationIaClient orgSlug={orgSlug} />
      </div>
    </PublicShell>
  );
}
