import { TestimonialsClient } from '@/components/TestimonialsClient';

export default async function TestimonialsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TestimonialsClient orgSlug={slug} />;
}
