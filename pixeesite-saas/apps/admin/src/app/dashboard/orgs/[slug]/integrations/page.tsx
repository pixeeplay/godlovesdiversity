import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Zapier", "icon": "⚡", "description": "6000+ apps via webhooks", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Triggers", "Actions"]}], "cta": {"label": "Découvrir", "href": "https://zapier.com"}}, {"title": "Make.com", "icon": "🔄", "description": "Automation visuelle", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Scenarios", "Branching"]}], "cta": {"label": "Découvrir", "href": "https://make.com"}}, {"title": "n8n", "icon": "🟢", "description": "Self-hosted automation", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Open-source", "Workflows"]}], "cta": {"label": "Découvrir", "href": "https://n8n.io"}}, {"title": "Slack", "icon": "💬", "description": "Notifications team", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Webhook", "Slash commands"]}]}, {"title": "Discord", "icon": "🎮", "description": "Community sync", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Webhook", "Bot"]}]}, {"title": "GitHub", "icon": "🐙", "description": "Sync deploy + issues", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["PRs", "Issues", "Releases"]}]}];

export default async function IntegrationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🔌" title="Intégrations" desc="Connecte Pixeesite à tes outils favoris"
      cards={cards}
    />
  );
}
