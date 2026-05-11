import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Comptes clients", "icon": "🛒", "description": "Inscriptions depuis le site public", "borderColor": "#3b82f6", "accentColor": "#3b82f6", "bullets": [{"label": "FEATURES", "items": ["Email + password OR magic link", "Profil + préférences", "Historique commandes"]}]}, {"title": "Segments", "icon": "🎯", "description": "Segments dynamiques par comportement", "borderColor": "#3b82f6", "accentColor": "#3b82f6", "bullets": [{"label": "FEATURES", "items": ["VIP (>1000€)", "Inactive 6 mois", "Newsletter opt-in"]}]}, {"title": "GDPR export/delete", "icon": "🛡️", "description": "Conformité RGPD 1-clic", "borderColor": "#3b82f6", "accentColor": "#3b82f6", "bullets": [{"label": "FEATURES", "items": ["Export ZIP toutes data", "Suppression compte", "Audit log access"]}]}];

export default async function UsersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="👤" title="Utilisateurs" desc="Comptes utilisateurs du site (différent de l'équipe org)."
      cards={cards}
    />
  );
}
