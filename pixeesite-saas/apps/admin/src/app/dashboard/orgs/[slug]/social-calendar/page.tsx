import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Vue calendrier", "icon": "📅", "description": "Drag-drop posts entre jours", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Mois/semaine/jour", "Color par réseau", "Filter par status"]}]}, {"title": "Génération IA bulk", "icon": "✨", "description": "Brief → 30 posts en 1 clic", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Variations par plateforme", "Hashtags suggérés", "Image accompagnante"]}]}, {"title": "Cross-posting", "icon": "📡", "description": "Publish auto sur LinkedIn/X/Insta", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Buffer/Hootsuite API", "Native APIs", "Best time AI"]}]}];

export default async function SocialCalendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="📆" title="Calendrier social" desc="Planifie tes posts LinkedIn / X / Insta sur 30 jours."
      cards={cards}
    />
  );
}
