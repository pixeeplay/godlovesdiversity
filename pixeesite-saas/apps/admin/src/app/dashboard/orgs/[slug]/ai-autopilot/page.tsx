import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Blog autopilot", "icon": "📝", "description": "Génère 1 article SEO / jour", "borderColor": "#10b981", "accentColor": "#10b981", "bullets": [{"label": "FEATURES", "items": ["Topic mining", "Rédaction Claude", "Image cover fal.ai"]}]}, {"title": "Newsletter autopilot", "icon": "✉️", "description": "Email mensuel automatique", "borderColor": "#10b981", "accentColor": "#10b981", "bullets": [{"label": "FEATURES", "items": ["Best content", "Templates", "Send Resend"]}]}, {"title": "Social autopilot", "icon": "📱", "description": "Posts auto sur 5 réseaux", "borderColor": "#10b981", "accentColor": "#10b981", "bullets": [{"label": "FEATURES", "items": ["LinkedIn", "X", "Insta", "FB", "Threads"]}]}];

export default async function AiAutopilotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🚁" title="AI Autopilot" desc="Laisse l IA générer ton contenu automatiquement chaque jour"
      cards={cards}
    />
  );
}
