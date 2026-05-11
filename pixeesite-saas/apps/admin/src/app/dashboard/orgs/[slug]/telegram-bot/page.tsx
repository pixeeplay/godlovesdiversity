import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Notifications push", "icon": "🔔", "description": "Alertes en temps réel sur Telegram", "borderColor": "#3b82f6", "accentColor": "#3b82f6", "bullets": [{"label": "FEATURES", "items": ["Nouvelle commande", "Nouveau lead", "Forum flagged", "Site down"]}]}, {"title": "Commandes vocales", "icon": "🎙️", "description": "Pilote ton site à la voix via Telegram", "borderColor": "#3b82f6", "accentColor": "#3b82f6", "bullets": [{"label": "FEATURES", "items": ["/stats", "/publish", "/blog new \"...\"", "/order ship 42"]}]}, {"title": "Approbations rapides", "icon": "✅", "description": "Modère depuis Telegram avec inline buttons", "borderColor": "#3b82f6", "accentColor": "#3b82f6", "bullets": [{"label": "FEATURES", "items": ["✅ Publier · ❌ Rejeter", "Réponse IA suggérée", "One-tap action"]}]}];

export default async function TelegramBotPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🤳" title="Bot Telegram" desc="Notifications push + commandes vocales vers ton dashboard."
      cards={cards}
    />
  );
}
