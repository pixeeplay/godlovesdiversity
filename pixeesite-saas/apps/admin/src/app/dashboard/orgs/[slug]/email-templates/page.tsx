import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Cold mail outreach", "icon": "🎯", "description": "10 templates rodés pour B2B", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Intro / Follow-up / Break-up", "Variables {firstName}", "A/B subject lines"]}]}, {"title": "Transactionnels", "icon": "📦", "description": "Confirmation, expédition, livraison, refund", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Branded design", "i18n FR/EN", "Resend templates"]}]}, {"title": "Drip campaigns", "icon": "💧", "description": "Séquences d'emails automatisées", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Onboarding 7j", "Win-back 30j", "Re-engagement"]}]}];

export default async function EmailTemplatesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="📧" title="Templates emails" desc="Cold mail + transactionnels."
      cards={cards}
    />
  );
}
