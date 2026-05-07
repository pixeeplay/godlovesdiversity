import { MeJournal } from '@/components/me/MeJournal';
export const dynamic = 'force-dynamic';
export default function P() {
  return <div><h1 className="font-display font-bold text-2xl mb-4">📔 Mon journal intime</h1><MeJournal /></div>;
}
