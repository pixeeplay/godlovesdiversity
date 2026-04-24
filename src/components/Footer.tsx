import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Heart } from 'lucide-react';

export function Footer() {
  const t = useTranslations('footer');
  return (
    <footer className="border-t border-[color:var(--border)] mt-24">
      <div className="container-wide py-10 grid gap-6 md:grid-cols-3 text-sm" style={{ color: 'var(--fg-muted)' }}>
        <div>
          <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--fg)' }}>
            <Heart className="text-[color:var(--accent)]" size={18} />
            <span className="font-display font-bold">God Loves Diversity</span>
          </div>
          <p>{t('tagline')}</p>
        </div>
        <div className="flex md:justify-center gap-6">
          <Link href="/mentions-legales" className="hover:text-[color:var(--accent)]">{t('legal')}</Link>
          <Link href="/rgpd" className="hover:text-[color:var(--accent)]">{t('privacy')}</Link>
          <Link href="/contact" className="hover:text-[color:var(--accent)]">{t('contact')}</Link>
        </div>
        <div className="md:text-right">
          © {new Date().getFullYear()} — {t('rights')}
        </div>
      </div>
    </footer>
  );
}
