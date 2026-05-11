import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Auto-traduction Gemini", "icon": "✨", "description": "Génère 30+ langues en 1 clic depuis le FR", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["EN ES PT DE IT NL", "AR HE FA TR", "ZH JA KO HI", "Tone-preserving"]}]}, {"title": "DeepL Pro intégré", "icon": "🇩🇪", "description": "Meilleure qualité pour les langues européennes", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["28 langues DeepL", "Glossaire custom", "Formal/Informal toggle"]}]}, {"title": "Edit fork par langue", "icon": "✏️", "description": "Édite manuellement chaque langue", "borderColor": "#06b6d4", "accentColor": "#06b6d4", "bullets": [{"label": "FEATURES", "items": ["Diff vs original", "Validation native speaker", "Approval workflow"]}]}];

export default async function TranslationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🌍" title="Traductions IA" desc="Traduis ton site en 30+ langues automatiquement."
      cards={cards}
    />
  );
}
