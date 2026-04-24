import { setRequestLocale } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Link } from '@/i18n/routing';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Page({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const c = await prisma.newsletterCampaign.findUnique({ where: { id } });
  if (!c || c.status !== 'SENT') notFound();

  return (
    <article className="container-tight py-12 max-w-3xl">
      <Link href="/newsletters" className="inline-flex items-center gap-1 text-sm text-brand-pink hover:underline mb-6">
        <ArrowLeft size={14} /> Toutes les newsletters
      </Link>

      <header className="mb-10 pb-8 border-b border-white/10">
        <div className="flex items-center gap-3 text-xs text-white/50 mb-4">
          <Calendar size={12} />
          {c.sentAt ? new Date(c.sentAt).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          <span>•</span>
          <Mail size={12} /> {c.recipients} destinataires
        </div>
        <h1 className="font-display text-3xl md:text-5xl font-black leading-tight">
          {c.subject}
        </h1>
      </header>

      {/* Contenu HTML envoyé par email */}
      <div
        className="prose prose-invert prose-pink max-w-none newsletter-content"
        dangerouslySetInnerHTML={{ __html: c.htmlContent }}
      />

      <div className="mt-12 pt-8 border-t border-white/10 text-center">
        <p className="text-white/70 mb-4">Envie de recevoir la prochaine édition ?</p>
        <Link href="/newsletter" className="btn-primary uppercase text-xs tracking-widest">
          S'abonner à la newsletter
        </Link>
      </div>
    </article>
  );
}
