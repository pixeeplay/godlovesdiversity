import { notFound } from 'next/navigation';
import { getCurrentOrg } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';
import { ContactForm } from './ContactForm';

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();
  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 42, margin: '0 0 8px', color: org.primaryColor }}>Contact</h1>
        <p style={{ opacity: 0.6, marginBottom: 32 }}>Envoie-nous un message — on revient vers toi.</p>
        <ContactForm orgSlug={org.slug} primaryColor={org.primaryColor} />
      </div>
    </PublicShell>
  );
}
