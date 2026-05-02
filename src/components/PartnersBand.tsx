import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Handshake } from 'lucide-react';

/**
 * Bandeau Partenaires affiché sur la home (entre les sections principales).
 * Affiche les partenaires publiés en logos cliquables.
 */
export async function PartnersBand() {
  let partners: { id: string; name: string; url: string; logoUrl: string | null; description: string | null }[] = [];
  try {
    partners = await prisma.partner.findMany({
      where: { published: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      take: 12
    });
  } catch {
    return null;
  }
  if (partners.length === 0) return null;

  return (
    <section className="py-16 border-t border-white/5">
      <div className="container-wide">
        <div className="flex items-center gap-3 mb-8">
          <Handshake className="text-brand-pink" size={28} />
          <h2 className="text-2xl md:text-3xl font-display font-bold">Nos partenaires</h2>
          <Link href="/partenaires" className="ml-auto text-sm text-brand-pink hover:underline">
            Voir tous →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-white/5 hover:bg-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 border border-white/10 hover:border-brand-pink/40 transition aspect-[3/2]"
              title={p.description || p.name}
            >
              {p.logoUrl ? (
                <img
                  src={p.logoUrl.startsWith('http') ? p.logoUrl : p.logoUrl}
                  alt={p.name}
                  className="max-h-14 max-w-full object-contain group-hover:scale-105 transition"
                />
              ) : (
                <div className="text-lg font-bold text-white/90 group-hover:text-brand-pink">
                  {p.name}
                </div>
              )}
              <div className="text-xs text-white/60 truncate w-full">{p.name}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
