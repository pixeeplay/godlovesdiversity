import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { JournalClient } from '@/components/prayers/JournalClient';

export const metadata = {
  title: 'Mon journal de prières · God Loves Diversity',
  description: 'Enregistre tes prières vocales en privé. L\'IA les transcrit automatiquement.'
};
export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    redirect('/admin/login?next=/journal');
  }

  const [user, prayers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { vocalPrayerConsent: true, vocalPrayerConsentedAt: true, name: true }
    }),
    prisma.vocalPrayer.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, audioMime: true, durationSec: true, language: true,
        transcription: true, title: true, mood: true,
        status: true, errorMessage: true, isPublic: true,
        transcribedAt: true, createdAt: true
      }
    })
  ]);

  const initialPrayers = prayers.map((p) => ({
    ...p,
    audioUrl: `/api/prayers/vocal/${p.id}/audio`,
    createdAt: p.createdAt.toISOString(),
    transcribedAt: p.transcribedAt?.toISOString() || null
  }));

  return (
    <main className="container-wide py-10 max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display font-bold text-3xl md:text-4xl">Mon journal de prières</h1>
        <p className="text-zinc-400 text-sm mt-2">
          Enregistre tes prières à voix haute. L'IA les transcrit automatiquement, et toi seul·e peut les
          écouter et les lire. Tu peux les supprimer à tout moment.
        </p>
      </header>

      <JournalClient
        initialConsent={!!user?.vocalPrayerConsent}
        initialPrayers={initialPrayers as any}
      />
    </main>
  );
}
