import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Par rôle", "icon": "👥", "description": "Show/hide chaque item selon rôle", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Owner / Admin / Editor / Viewer", "Public / Connected / Premium", "Custom rules"]}]}, {"title": "Par plan", "icon": "💎", "description": "Gating selon abonnement", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Free / Solo / Pro / Agency", "Upsell sur clic locked", "Coming soon badge"]}]}, {"title": "Override per-user", "icon": "🔧", "description": "Active manuellement pour un user", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Beta testers list", "VIP access", "Audit qui a accès"]}]}];

export default async function MenuVisibilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="👁️" title="Visibilité menu" desc="Qui voit quoi dans le menu (rôles)."
      cards={cards}
    />
  );
}
