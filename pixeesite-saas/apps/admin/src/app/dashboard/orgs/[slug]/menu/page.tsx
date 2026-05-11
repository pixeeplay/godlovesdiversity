import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Drag-drop ordering", "icon": "🔀", "description": "Réordonne les items à la souris", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Sub-menus illimités", "Hide/show par device", "Live preview"]}]}, {"title": "Mega menu", "icon": "🍔", "description": "Layout multi-colonnes avec descriptions", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Featured links", "Images inline", "Mobile responsive"]}]}, {"title": "CTA highlighted", "icon": "⭐", "description": "Bouton \"Commencer\" mis en évidence", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Style override", "Sticky on scroll", "A/B test wording"]}]}];

export default async function MenuPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="☰" title="Menu nav" desc="Édite le menu du site public."
      cards={cards}
    />
  );
}
