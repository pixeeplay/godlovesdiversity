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
    <section className="py-20 border-t border-[color:var(--border)]" style={{ background: 'var(--bg)' }}>
      <div className="container-wide">
        <div className="flex items-center gap-3 mb-10">
          <Handshake className="text-brand-pink" size={22} />
          <h2 className="text-xs uppercase tracking-[0.4em] text-white/70 font-bold">Nos partenaires</h2>
          <Link href="/partenaires" className="ml-auto text-xs text-white/60 hover:text-brand-pink transition">
            Voir tous →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-8 gap-y-10 items-center">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center text-center gap-2 aspect-[3/2]"
              title={p.description || p.name}
            >
              {p.logoUrl ? (
                <img
                  src={p.logoUrl.startsWith('http') ? p.logoUrl : p.logoUrl}
                  alt={p.name}
                  className="gld-partner-logo max-h-12 max-w-full object-contain"
                />
              ) : (
                <div className="gld-partner-logo text-base font-bold text-white/90">
                  {p.name}
                </div>
              )}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
