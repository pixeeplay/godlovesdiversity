import { SimpleListClient } from '@/components/SimpleListClient';

export default async function LeadsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <SimpleListClient
      orgSlug={slug} emoji="🎯" title="Leads CRM" desc="Tes prospects + clients" entity="leads"
      fields={[
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'firstName', label: 'Prénom' },
        { name: 'lastName', label: 'Nom' },
        { name: 'phone', label: 'Téléphone' },
        { name: 'company', label: 'Entreprise' },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
    />
  );
}
