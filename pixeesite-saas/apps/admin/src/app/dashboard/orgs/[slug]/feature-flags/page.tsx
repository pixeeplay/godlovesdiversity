import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Flags par rôle", "icon": "👥", "description": "Active seulement pour certains rôles", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["owner/admin/editor/viewer", "Targeted rollout", "A/B testing"]}]}, {"title": "Flags par % users", "icon": "🎲", "description": "Rollout progressif 1% → 100%", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Canary release", "Sticky bucketing", "Kill switch instant"]}]}, {"title": "Flags par tenant", "icon": "🏢", "description": "Activer feature seulement pour certains clients", "borderColor": "#f59e0b", "accentColor": "#f59e0b", "bullets": [{"label": "FEATURES", "items": ["Whitelist tenants", "Plan-based gating", "Beta program"]}]}];

export default async function FeatureFlagsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🚦" title="Feature flags" desc="Active/désactive des features sans redéployer le site."
      cards={cards}
    />
  );
}
