import { SimpleListClient } from '@/components/SimpleListClient';

export default async function FormsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <SimpleListClient
      orgSlug={slug} emoji="📝" title="Formulaires" desc="Capture les leads via tes formulaires personnalisés" entity="forms"
      fields={[
        { name: 'name', label: 'Nom du formulaire', required: true },
        { name: 'slug', label: 'Slug (utilisé dans le URL)' },
      ]}
    />
  );
}
