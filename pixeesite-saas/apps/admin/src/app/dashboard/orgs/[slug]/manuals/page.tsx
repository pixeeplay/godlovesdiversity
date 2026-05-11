import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Débutants", "icon": "🌱", "description": "Manuel accessible avec captures, glossaire, pas-à-pas", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Langue claire", "Captures auto via Playwright", "Glossaire technique", "Export PDF + epub"]}]}, {"title": "Pros", "icon": "💼", "description": "Guide opérationnel orienté tâches métier", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Use-cases business", "Workflows complets", "Best practices", "Export DOCX"]}]}, {"title": "Experts", "icon": "🧑‍💻", "description": "Doc technique architecture + API + intégrations", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["API reference", "Diagrammes Mermaid", "Exemples curl + SDKs", "Export MD + HTML"]}]}];

export default async function ManualsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="📗" title="Manuels auto IA" desc="Génère des manuels d'utilisation IA pour 3 audiences (débutants, pros, experts) à partir de ton site."
      cards={cards}
    />
  );
}
