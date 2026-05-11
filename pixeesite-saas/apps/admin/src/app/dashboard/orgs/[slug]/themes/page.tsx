import { ThemesClient } from '@/components/ThemesClient';

export default async function ThemesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ThemesClient orgSlug={slug} />;
}
