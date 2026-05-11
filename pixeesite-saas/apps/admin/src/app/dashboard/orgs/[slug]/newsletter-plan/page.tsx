import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Thématiques annuelles", "icon": "🎯", "description": "IA propose 52 thèmes selon ton secteur", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Saisonnalité auto", "Marronniers (Black Friday, Saint-Valentin)", "Tendances secteur"]}]}, {"title": "Brouillons générés", "icon": "📝", "description": "52 brouillons rédigés Claude Sonnet 4.6", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["~400 mots / news", "Style aligné brand", "Editable individuellement"]}]}, {"title": "Schedule auto", "icon": "⏰", "description": "Envoi planifié chaque jeudi 10h", "borderColor": "#ec4899", "accentColor": "#ec4899", "bullets": [{"label": "FEATURES", "items": ["Pause vacances configurable", "Skip si pas prêt", "Send manual override"]}]}];

export default async function NewsletterPlanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🗓️" title="Plan newsletter annuel" desc="Planifie 52 newsletters d'un coup avec l'IA."
      cards={cards}
    />
  );
}
