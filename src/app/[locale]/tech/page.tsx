import { useTranslations } from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';

export default function TechPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);
  const t = useTranslations('tech');
  return (
    <main className="max-w-4xl mx-auto px-6 py-16 prose dark:prose-invert">
      <h1>{t('title')}</h1>
      <p className="lead">{t('subtitle')}</p>
      <h2>{t('stack')}</h2>
      <ul>
        <li><strong>Next.js 14</strong> (App Router, Server Components)</li>
        <li><strong>PostgreSQL + PostGIS</strong> (lieux + géolocalisation)</li>
        <li><strong>Prisma 5</strong> (ORM)</li>
        <li><strong>Redis + BullMQ</strong> (queues async, scheduled posts)</li>
        <li><strong>MinIO / S3</strong> (storage photos + audio)</li>
        <li><strong>NextAuth</strong> (auth, magic link, SMS, 2FA TOTP)</li>
        <li><strong>Tailwind CSS</strong> (styles, 9 themes switchables en BO)</li>
        <li><strong>next-intl</strong> (i18n FR/EN, ES/PT en V2)</li>
        <li><strong>Gemini AI</strong> (textes, images, modération)</li>
        <li><strong>Resend</strong> (emails transactionnels)</li>
        <li><strong>Stripe</strong> (premium Connect + boutique)</li>
        <li><strong>Leaflet</strong> (carte interactive)</li>
      </ul>
      <h2>{t('self_host')}</h2>
      <p>Le projet est <strong>open source</strong>, 100 % auto-hébergeable. Voir le README sur <a href="https://github.com/pixeeplay/parislgbt-platform" rel="noopener">GitHub</a>.</p>
      <h2>{t('contribute')}</h2>
      <p>PRs welcomes ! Issues, traductions, contenus de lieux/événements. Code de conduite : tolérance zéro pour la haine, contributions queer-friendly.</p>
    </main>
  );
}
