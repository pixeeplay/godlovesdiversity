import { WebcamsLiveClient } from '@/components/WebcamsLiveClient';

export const metadata = {
  title: 'Webcams live · Lieux saints du monde · GLD',
  description: 'Suis en direct les offices et célébrations dans les grandes basiliques, mosquées, synagogues, temples bouddhistes, hindous et sikhs du monde.'
};
export const dynamic = 'force-dynamic';

export default function WebcamsLivePage() { return <WebcamsLiveClient />; }
