import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Templates juridiques", "icon": "⚖️", "description": "Mentions légales + CGU + CGV + Cookies générés", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Conformes FR", "Variables auto (raison sociale, RCS)", "Mise à jour avec changement loi"]}]}, {"title": "FAQ avec recherche", "icon": "❓", "description": "Catégories + recherche instantanée + AI answer", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Accordéon", "Anchor links", "Schema.org FAQPage SEO"]}]}, {"title": "About + équipe", "icon": "👨‍👩‍👧", "description": "Page équipe avec photos + bios + réseaux", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Grid responsive", "Hover effects", "LinkedIn auto-link"]}]}];

export default async function PagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="📄" title="Pages riches" desc="Pages statiques : About, Mentions légales, FAQ, CGV."
      cards={cards}
    />
  );
}
