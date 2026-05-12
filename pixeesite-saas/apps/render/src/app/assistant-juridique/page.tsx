import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentOrg } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';
import { AssistantJuridiqueClient } from '@/components/AssistantJuridiqueClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Assistant juridique IA — Analyse de contrats',
  description: 'Analyse rapide d\'un contrat, CGV, CGU ou politique RGPD via IA. Identifie clauses à risque et recommandations.',
};

export default async function AssistantJuridiquePage() {
  const org = await getCurrentOrg();
  if (!org) notFound();

  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug') || org.slug;

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12,
          }}>⚖️</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>Assistant juridique IA</h1>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 8, maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
            Colle un contrat, des CGV/CGU, ou une politique RGPD — l'IA identifie les clauses à risque et te suggère des améliorations.
            Note : ceci n'est pas un avis juridique formel.
          </p>
        </header>
        <AssistantJuridiqueClient orgSlug={orgSlug} />
      </div>
    </PublicShell>
  );
}
