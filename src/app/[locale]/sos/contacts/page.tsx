import { EmergencyContactsClient } from '@/components/EmergencyContactsClient';

export const dynamic = 'force-static';
export const metadata = { title: 'Mes contacts d\'urgence — GLD' };

export default function EmergencyContactsPage() {
  return <EmergencyContactsClient />;
}
