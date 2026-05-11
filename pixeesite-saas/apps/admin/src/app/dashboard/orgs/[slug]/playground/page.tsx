import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Prompt tester", "icon": "🧪", "description": "Entre un prompt, vois les top-K chunks récupérés + la réponse finale", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Tweak temperature/top-K", "Compare providers", "Save snapshots"]}]}, {"title": "Eval suite", "icon": "📊", "description": "Liste de questions golden + scoring auto", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Recall@K", "MRR", "F1", "Faithfulness LLM-judge"]}]}, {"title": "Cost simulator", "icon": "💸", "description": "Simule le coût mensuel selon volume", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Tokens/req moyen", "Provider mix", "Cache hit rate"]}]}];

export default async function PlaygroundPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🎮" title="Playground RAG" desc="Teste tes prompts directement sur ton cerveau RAG. Réservé super-admin."
      cards={cards}
    />
  );
}
