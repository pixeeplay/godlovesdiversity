import { MeProfileForm } from '@/components/me/MeProfileForm';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon profil — GLD' };
export default function P() {
  return (
    <div>
      <h1 className="font-display font-bold text-2xl mb-4">👤 Mon profil</h1>
      <MeProfileForm />
    </div>
  );
}
