import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Claude Code", "icon": "🤖", "description": "CLI agentic dans le terminal", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Edit fichiers", "Run tests", "Refactor multi-fichiers"]}], "cta": {"label": "Découvrir", "href": "https://claude.com/code"}}, {"title": "Claude API", "icon": "📡", "description": "Anthropic API direct depuis tes apps", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Models 4.6", "Tool use", "Vision"]}], "cta": {"label": "Découvrir", "href": "https://docs.claude.com"}}, {"title": "Cowork mode", "icon": "👥", "description": "Claude collaboratif sur ton bureau Mac", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["File access", "Skills", "MCP servers"]}], "cta": {"label": "Découvrir", "href": "https://claude.com/cowork"}}];

export default async function ClaudeWorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🤖" title="Claude Workspace" desc="Code avec Claude Sonnet 4.6 dans ton navigateur"
      cards={cards}
    />
  );
}
