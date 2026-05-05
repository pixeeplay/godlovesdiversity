import { PrayerChatClient } from '@/components/PrayerChatClient';

const TITLES: Record<string, string> = {
  catholique: '✝️ Cercle catholique inclusif',
  protestant: '✝️ Cercle protestant inclusif',
  musulman:   '☪️ Cercle musulman·e LGBT',
  juif:       '✡️ Cercle juif·ves LGBT',
  bouddhiste: '☸️ Cercle bouddhiste LGBT',
  hindou:     '🕉 Cercle hindou·es LGBT',
  interreligieux: '🌍 Cercle inter-religieux'
};

export default async function P({ params }: { params: Promise<{ circle: string }> }) {
  const { circle } = await params;
  return <PrayerChatClient circle={circle} title={TITLES[circle] || `Cercle ${circle}`} />;
}
