import { CompagnonSpirituelClient } from '@/components/CompagnonSpirituelClient';

export const metadata = {
  title: 'Compagnon spirituel IA — 4 personas inclusives · GLD',
  description: 'Mère Marie, Sœur Khadija, Rav Yossef, Maître Tenku — 4 personas IA pour t\'accompagner dans ta foi inclusive.'
};
export const dynamic = 'force-dynamic';

export default function CompagnonPage() {
  return <CompagnonSpirituelClient />;
}
