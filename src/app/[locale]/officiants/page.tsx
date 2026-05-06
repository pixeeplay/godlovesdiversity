import { OfficiantsClient } from '@/components/OfficiantsClient';

export const metadata = {
  title: 'Officiants LGBT-friendly · Mariages religieux inclusifs · GLD',
  description: 'Annuaire d\'officiants religieux (prêtres, pasteurs, rabbins, imams, moines) prêts à célébrer mariages, baptêmes, funérailles inclusives.'
};
export const dynamic = 'force-dynamic';

export default function OfficiantsPage() { return <OfficiantsClient />; }
