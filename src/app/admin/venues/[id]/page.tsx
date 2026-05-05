import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { VenueEditor } from '@/components/admin/VenueEditor';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Édition établissement — GLD' };

export default async function P({ params }: { params: Promise<{ id: string }> }) {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login');
  const { id } = await params;

  // Tente avec includes complets, fallback findUnique simple, fallback null
  let venue: any = null;
  let loadError = '';
  try {
    venue = await prisma.venue.findUnique({
      where: { id },
      include: {
        _count: { select: { events: true, coupons: true } },
        owner: { select: { id: true, name: true, email: true } },
        events: { orderBy: { startsAt: 'desc' }, take: 10, select: { id: true, title: true, startsAt: true, published: true } },
        coupons: { orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, code: true, description: true, expiresAt: true } }
      }
    });
  } catch (e: any) {
    loadError = `Include error: ${e?.message || e}`;
    // Fallback : juste le venue de base sans relations
    try {
      venue = await prisma.venue.findUnique({ where: { id } });
      if (venue) venue._count = { events: 0, coupons: 0 };
    } catch (e2: any) {
      loadError += ` | Basic findUnique: ${e2?.message || e2}`;
    }
  }

  if (!venue) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-2xl font-bold mb-2">Établissement introuvable</h1>
        <p className="text-zinc-400 mb-2 text-sm">ID : <code className="text-cyan-300">{id}</code></p>
        {loadError && (
          <pre className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 p-3 rounded mt-3 mb-3 text-left overflow-x-auto whitespace-pre-wrap">{loadError}</pre>
        )}
        <p className="text-xs text-zinc-500 mb-4">
          Cet établissement n'existe pas (ou plus) en base. Il a peut-être été supprimé lors d'un Wipe.
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/admin/establishments" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-full text-sm">← Retour annuaire</Link>
          <a href={`/api/admin/venues/${id}/debug`} target="_blank" className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-full text-sm">Voir debug JSON</a>
        </div>
      </div>
    );
  }

  return <VenueEditor venue={venue} />;
}
