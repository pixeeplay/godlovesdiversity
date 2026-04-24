import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/routing';
import { Mail, ArrowRight, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const campaigns = await prisma.newsletterCampaign.findMany({
    where: { status: 'SENT' },
    orderBy: { sentAt: 'desc' },
    take: 50
  });

  return (
    <section className="container-tight py-20">
      <div className="mb-10">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-pink mb-3">Archive</p>
        <h1 className="font-display text-4xl md:text-6xl font-black neon-title">
          Nos newsletters
        </h1>
        <p className="text-white/60 mt-4 max-w-2xl">
          Chaque mois, nous partageons les dernières photos, les témoignages et les mobilisations
          du mouvement. Retrouve ici toutes les éditions passées.
        </p>
      </div>

      {/* CTA abonnement */}
      <div className="rounded-2xl border border-brand-pink/30 bg-gradient-to-r from-brand-pink/10 to-purple-600/10 p-6 mb-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Mail className="text-brand-pink" size={28} />
          <div>
            <div className="font-bold">Reçois la prochaine édition</div>
            <div className="text-sm text-white/70">Une fois par mois, directement dans ta boîte mail.</div>
          </div>
        </div>
        <Link href="/newsletter" className="btn-primary uppercase text-xs tracking-widest">
          S'abonner <ArrowRight size={14} />
        </Link>
      </div>

      {/* Liste */}
      {campaigns.length === 0 ? (
        <p className="text-white/50 italic text-center py-16 border border-dashed border-white/10 rounded-2xl">
          Aucune newsletter publiée pour l'instant. La première édition arrive bientôt.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/newsletters/${c.id}` as any}
              className="stained-card p-6 group transition"
            >
              <div className="flex items-center gap-2 text-xs text-white/50 mb-3">
                <Calendar size={12} />
                {c.sentAt ? new Date(c.sentAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                <span className="mx-1">•</span>
                <span>{c.recipients} envois</span>
              </div>
              <h2 className="font-display font-bold text-xl mb-2 group-hover:text-brand-pink transition">
                {c.subject}
              </h2>
              <div className="text-xs text-brand-pink uppercase tracking-widest inline-flex items-center gap-1">
                Lire <ArrowRight size={10} className="group-hover:translate-x-1 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
