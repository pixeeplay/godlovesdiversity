import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "Web scrape (Jina + Gemini)", "icon": "🌐", "description": "Extrait emails+téléphones depuis URLs", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Crawl depth=2", "Validation MX", "Auto-dedup leads"]}]}, {"title": "Google Maps Business", "icon": "📍", "description": "Scrape entreprises par zone + secteur", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Places API", "Adresse + téléphone + site", "Pagination auto"]}]}, {"title": "LinkedIn Sales Nav", "icon": "💼", "description": "Export depuis recherche Sales Nav", "borderColor": "#8b5cf6", "accentColor": "#8b5cf6", "bullets": [{"label": "FEATURES", "items": ["Phantombuster intégré", "Email finder Apollo", "GDPR opt-out auto"]}]}];

export default async function ScraperPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🕷️" title="Scraper leads" desc="Wizard scraper contacts depuis URLs / Maps / LinkedIn."
      cards={cards}
    />
  );
}
