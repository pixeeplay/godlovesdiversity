import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentOrg } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';
import { CoachIaClient } from '@/components/CoachIaClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Coach IA — Conversation guidée',
  description: 'Discute avec un assistant IA neutre pour clarifier tes pensées, préparer une conversation, ou prendre une décision.',
};

export default async function CoachIaPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();

  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug') || org.slug;

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #8b5cf6, #d946ef)',
            alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12,
          }}>🤖</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>Coach IA</h1>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 8, maxWidth: 560, marginLeft: 'auto', marginRight: 'auto' }}>
            Un assistant pour clarifier tes pensées, préparer une conversation difficile, ou affiner une décision.
            Conversation 100 % privée, ton neutre.
          </p>
        </header>
        <CoachIaClient orgSlug={orgSlug} />
      </div>
    </PublicShell>
  );
}
