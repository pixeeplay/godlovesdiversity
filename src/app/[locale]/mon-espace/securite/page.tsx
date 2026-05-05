import { MePageWrap } from '@/components/me/MePageWrap';
import { SecurityClient } from '@/components/me/SecurityClient';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sécurité — Mon espace GLD' };
export default function P() {
  return (
    <MePageWrap title="Sécurité" emoji="🔒">
      <SecurityClient />
    </MePageWrap>
  );
}
