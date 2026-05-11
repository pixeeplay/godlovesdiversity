import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Documents indexés", "icon": "📚", "description": "Ajoute des PDFs, MD, URLs", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Chunking", "Embeddings", "Postgres pgvector"]}]}, {"title": "Recherche sémantique", "icon": "🔍", "description": "Trouve du contenu par sens", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Top-K", "Reranking", "Citations"]}]}];

export default async function RagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🧠" title="Cerveau RAG" desc="Knowledge base sémantique avec embeddings (Gemini text-embedding-004)"
      cards={cards}
    />
  );
}
