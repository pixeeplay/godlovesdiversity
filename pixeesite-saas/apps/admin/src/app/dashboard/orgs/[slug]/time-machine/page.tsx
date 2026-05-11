import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Snapshots auto", "icon": "📸", "description": "Avant chaque publish, on snapshot tout le site (pages + theme + settings)", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Conservation 30j (Free) / 1 an (Pro) / illimité (Agency)", "Stocké en JSON dans SiteVersion", "Diff visuelle entre versions"]}]}, {"title": "Rollback 1-clic", "icon": "⏪", "description": "Restaure n'importe quelle version", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Preview avant restore", "Restore atomique", "Crée un snapshot du présent avant de rollback"]}]}, {"title": "Comparateur", "icon": "🔀", "description": "Compare 2 versions côte-à-côte", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Diff JSON blocks", "Diff visuel iframe", "Highlights des changements"]}]}];

export default async function TimeMachinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="⏱️" title="Time Machine" desc="Restaure ton site à un état antérieur. Chaque publish crée un snapshot automatique."
      cards={cards}
    />
  );
}
