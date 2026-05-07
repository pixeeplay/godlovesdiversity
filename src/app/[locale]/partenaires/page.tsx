import { prisma } from '@/lib/prisma';
import { Handshake, ExternalLink } from 'lucide-react';

export const metadata = { title: 'Partenaires — parislgbt' };

export default async function PartnersPage() {
  let partners: { id: string; name: string; url: string; logoUrl: string | null; description: string | null; category: string | null }[] = [];
  try {
    partners = await prisma.partner.findMany({
      where: { published: true },
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }]
    });
  } catch {
    partners = [];
  }

  // Regroupe par catégorie
  const byCategory = partners.reduce<Record<string, typeof partners>>((acc, p) => {
    const cat = p.category || 'Autres';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <main className="min-h-screen pt-12 pb-24">
      <div className="container-wide">
        <div className="flex items-center gap-3 mb-4">
          <Handshake className="text-brand-pink" size={36} />
          <h1 className="text-4xl md:text-5xl font-display font-bold">Nos partenaires</h1>
        </div>
        <p className="text-lg text-white/70 max-w-3xl mb-12">
          Les associations, lieux de culte, médias et créateurs qui partagent notre conviction :
          la foi et la diversité peuvent vivre ensemble, partout dans le monde.
        </p>

        {partners.length === 0 ? (
          <p className="text-white/60">Bientôt en ligne.</p>
        ) : (
          Object.entries(byCategory).map(([cat, list]) => (
            <section key={cat} className="mb-12">
              <h2 className="text-xl font-bold text-brand-pink mb-6 uppercase tracking-wider">{cat}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-white/5 hover:bg-white/10 rounded-2xl p-6 border border-white/10 hover:border-brand-pink/40 transition flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-bold group-hover:text-brand-pink transition">{p.name}</h3>
                      <ExternalLink className="text-white/40 group-hover:text-brand-pink shrink-0" size={18} />
                    </div>
                    {p.logoUrl && (
                      <img
                        src={p.logoUrl}
                        alt={p.name}
                        className="max-h-20 object-contain self-start"
                      />
                    )}
                    {p.description && (
                      <p className="text-sm text-white/70">{p.description}</p>
                    )}
                    <div className="text-xs text-brand-pink/80 mt-auto">{p.url.replace(/^https?:\/\//, '')}</div>
                  </a>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
