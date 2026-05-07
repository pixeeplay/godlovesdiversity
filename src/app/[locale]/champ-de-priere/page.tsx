import { ChampDePriereClient } from '@/components/ChampDePriereClient';

export const metadata = {
  title: 'Champ de prières mondial · Bougies en direct · GLD',
  description: 'Allume une bougie virtuelle pour 24h. Visualise la lumière des prières mondiales en direct.'
};
export const dynamic = 'force-dynamic';

export default function ChampPage() { return <ChampDePriereClient />; }
