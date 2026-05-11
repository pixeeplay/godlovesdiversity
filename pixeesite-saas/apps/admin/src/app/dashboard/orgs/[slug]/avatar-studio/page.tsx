import { FeaturePage } from '@/components/FeaturePage';

const cards = [{"title": "HeyGen v5", "icon": "🎬", "description": "Avatars hyper-réalistes", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["200+ avatars", "40 langues", "Custom avatar"]}], "cta": {"label": "Découvrir", "href": "https://www.heygen.com"}}, {"title": "Seedance 2.0", "icon": "🎥", "description": "Text-to-video ByteDance", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Cinematic", "Image-to-video", "10s clips"]}]}, {"title": "Runway Gen-4", "icon": "🎞️", "description": "Vidéo Hollywood-grade", "borderColor": "#d946ef", "accentColor": "#d946ef", "bullets": [{"label": "FEATURES", "items": ["Image-to-video", "Motion brush", "Camera control"]}], "cta": {"label": "Découvrir", "href": "https://runwayml.com"}}];

export default async function AvatarStudioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <FeaturePage
      orgSlug={slug} emoji="🎭" title="Avatar Studio" desc="Génère des vidéos avec avatars IA (HeyGen v5 / D-ID / Synthesia)"
      cards={cards}
    />
  );
}
