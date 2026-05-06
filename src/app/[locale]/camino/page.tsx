import { CaminoClient } from '@/components/CaminoClient';

export const metadata = {
  title: 'Camino virtuel collectif · Pèlerinages spirituels · GLD',
  description: 'Avance avec la communauté sur 5 chemins de pèlerinage : Compostelle, Jérusalem, Bénarès, Shikoku, Hajj symbolique. Chaque prière fait avancer le groupe d\'un kilomètre.'
};
export const dynamic = 'force-dynamic';

export default function CaminoPage() { return <CaminoClient />; }
