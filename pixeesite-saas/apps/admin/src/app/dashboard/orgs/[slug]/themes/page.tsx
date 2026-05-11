import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Halloween 🎃", "icon": "🎃", "description": "Sombre, orange, citrouilles", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Du 01 au 31 octobre"]}]}, {"title": "Noël 🎄", "icon": "🎄", "description": "Rouge, vert, neige", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Du 15/11 au 06/01"]}]}, {"title": "Pride 🌈", "icon": "🌈", "description": "Arc-en-ciel, inclusif", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Juin = mois Pride"]}]}, {"title": "Été ☀️", "icon": "☀️", "description": "Tropical, vif, plage", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Juin-Août"]}]}];

export default async function ThemesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🎨" title="Thèmes saisonniers" desc="Change l ambiance de ton site selon la saison/fête"
      cards={cards}
    />
  );
}
