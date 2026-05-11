import { AiThemeStudio } from '@/components/AiThemeStudio';

export default async function AiThemePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <AiThemeStudio orgSlug={slug} />;
}
