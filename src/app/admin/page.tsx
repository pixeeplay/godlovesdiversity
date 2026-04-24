import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Image, Mail, Calendar, ShieldAlert } from 'lucide-react';

export default async function Dashboard() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  const [pending, approved, rejected, subs, scheduled, total] = await Promise.all([
    prisma.photo.count({ where: { status: 'PENDING' } }),
    prisma.photo.count({ where: { status: 'APPROVED' } }),
    prisma.photo.count({ where: { status: 'REJECTED' } }),
    prisma.newsletterSubscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.scheduledPost.count({ where: { status: 'PENDING', scheduledAt: { gte: new Date() } } }),
    prisma.photo.count()
  ]);

  const cards = [
    { label: 'Photos en attente', value: pending, icon: ShieldAlert, color: 'text-amber-400', href: '/admin/moderation' },
    { label: 'Photos publiées', value: approved, icon: Image, color: 'text-emerald-400', href: '/admin/moderation?status=APPROVED' },
    { label: 'Photos rejetées', value: rejected, icon: Image, color: 'text-red-400', href: '/admin/moderation?status=REJECTED' },
    { label: 'Abonnés newsletter', value: subs, icon: Mail, color: 'text-brand-pink', href: '/admin/newsletter' },
    { label: 'Posts programmés', value: scheduled, icon: Calendar, color: 'text-violet-400', href: '/admin/calendar' },
    { label: 'Total contributions', value: total, icon: Image, color: 'text-blue-400', href: '/admin/moderation' }
  ];

  return (
    <div className="p-8">
      <h1 className="text-3xl font-display font-bold mb-2">Tableau de bord</h1>
      <p className="text-zinc-400 mb-10">Bienvenue, {s.user?.name || s.user?.email}.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const I = c.icon;
          return (
            <a key={c.label} href={c.href}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-brand-pink transition group">
              <div className="flex items-center justify-between mb-3">
                <I className={c.color} size={22} />
                <span className="text-3xl font-bold">{c.value}</span>
              </div>
              <div className="text-zinc-400 text-sm">{c.label}</div>
            </a>
          );
        })}
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold mb-4">Raccourcis</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/moderation" className="btn-primary">Modérer les photos</a>
          <a href="/admin/calendar" className="btn-ghost">Programmer un post</a>
          <a href="/admin/newsletter" className="btn-ghost">Créer une newsletter</a>
          <a href="/admin/ai" className="btn-ghost">Studio IA</a>
        </div>
      </section>
    </div>
  );
}
