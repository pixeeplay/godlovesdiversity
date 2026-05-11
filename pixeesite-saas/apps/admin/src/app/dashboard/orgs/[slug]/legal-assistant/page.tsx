import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Générateur CGU/CGV", "icon": "📄", "description": "Documents légaux conformes", "borderColor": "#ef4444", "accentColor": "#ef4444", "bullets": [{"label": "FEATURES", "items": ["CGU site", "CGV ecommerce", "Mentions légales"]}]}, {"title": "RGPD compliance", "icon": "🛡️", "description": "Audit + cookies banner", "borderColor": "#ef4444", "accentColor": "#ef4444", "bullets": [{"label": "FEATURES", "items": ["DPA", "Cookie consent", "Audit"]}]}];

export default async function LegalAssistantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="⚖️" title="Assistant juridique FR" desc="Pose des questions juridiques (CGU, CGV, RGPD, mentions légales)"
      cards={cards}
    />
  );
}
