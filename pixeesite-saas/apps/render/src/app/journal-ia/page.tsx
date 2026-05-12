import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getCurrentOrg, getCurrentTenantDb } from '@/lib/tenant';
import { PublicShell } from '@/components/PublicShell';
import { JournalIaFeed } from '@/components/JournalIaFeed';

export const dynamic = 'force-dynamic';
export const revalidate = 300;
export const metadata = {
  title: 'Journal du site — Voix éditoriale IA',
  description: 'Chaque jour, l\'IA observe l\'activité du site et la raconte à sa manière.',
};

export default async function JournalIaPage() {
  const org = await getCurrentOrg();
  if (!org) notFound();
  const db = await getCurrentTenantDb();
  if (!db) notFound();

  const h = await headers();
  const orgSlug = h.get('x-pixeesite-org-slug') || org.slug;

  const entries = await db.siteJournal.findMany({
    where: { approved: true },
    orderBy: { date: 'desc' },
    take: 60,
  });

  return (
    <PublicShell org={org}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12,
          }}>📖</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>Journal du site</h1>
          <p style={{ color: '#a1a1aa', fontSize: 14, marginTop: 8, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            La voix éditoriale du site — chaque jour, l'IA observe ce qui s'est passé et raconte sa journée.
          </p>
        </header>
        <JournalIaFeed
          orgSlug={orgSlug}
          initial={entries.map((e: any) => ({
            id: e.id,
            date: e.date.toISOString(),
            mood: e.mood,
            moodScore: e.moodScore,
            body: e.body,
            bodyShort: e.bodyShort,
            stats: e.stats,
          }))}
        />
      </div>
    </PublicShell>
  );
}
