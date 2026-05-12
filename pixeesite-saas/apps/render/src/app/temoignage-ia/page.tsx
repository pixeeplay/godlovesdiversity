import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentOrg } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';
import { TemoignageIaClient } from '@/components/TemoignageIaClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Témoignage guidé par IA',
  description: 'L\'IA t\'interview pas à pas pour transformer ton expérience en témoignage publiable.',
};

export default async function TemoignageIaPage() {
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
            background: 'linear-gradient(135deg, #d946ef, #ec4899)',
            alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12,
          }}>🎤</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>Témoignage guidé par IA</h1>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 8, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            5 questions, 5 minutes — l'IA t'interview puis transforme tes réponses en un témoignage prêt à publier.
          </p>
        </header>
        <TemoignageIaClient orgSlug={orgSlug} />
      </div>
    </PublicShell>
  );
}
