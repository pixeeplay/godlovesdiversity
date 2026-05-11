import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Logo wall", "icon": "🖼️", "description": "Grille de logos auto-balancée", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Tri par priorité", "Hover = nom partner", "Click → site externe"]}]}, {"title": "Tiers (Gold/Silver)", "icon": "🏆", "description": "Hiérarchie visuelle selon contribution", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Tier badges", "Display size scaling", "Sponsor page dédiée"]}]}, {"title": "Co-marketing", "icon": "📢", "description": "Posts cross-promo automatisés", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Featured du mois", "Backlinks reciproques", "UTM tracking"]}]}];

export default async function PartnersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🤝" title="Partenaires" desc="Logos + liens partenaires sur ta home."
      cards={cards}
    />
  );
}
