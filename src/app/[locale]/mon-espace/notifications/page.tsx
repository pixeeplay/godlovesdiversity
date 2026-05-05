import { MeNotifs } from '@/components/me/MeNotifs';
export const dynamic = 'force-dynamic';
export default function P() {
  return <div><h1 className="font-display font-bold text-2xl mb-4">🔔 Notifications</h1><MeNotifs /></div>;
}
