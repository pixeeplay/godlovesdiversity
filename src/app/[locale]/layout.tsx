import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AskAssistantWidget } from '@/components/AskAssistantWidget';
import { TickerDonate } from '@/components/TickerDonate';
import { AmbientPlayer } from '@/components/AmbientPlayer';
import { PageTracker } from '@/components/PageTracker';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeApplier } from '@/components/ThemeApplier';
import { SOSFloatingButton } from '@/components/SOSFloatingButton';
import { AccessibilityToggle } from '@/components/AccessibilityToggle';
import { Providers } from '@/components/Providers';
import { LangSetter } from '@/components/LangSetter';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  // Note : <html>/<body> sont définis UNE SEULE FOIS dans app/layout.tsx (root).
  // Sinon, Next.js 14 lève HierarchyRequestError (page noire). On utilise <LangSetter>
  // pour mettre à jour document.documentElement.lang côté client selon la locale.
  return (
    <Providers>
      <ThemeProvider>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <LangSetter locale={locale} />
          <div className="min-h-screen flex flex-col">
            <div className="sticky top-0 z-50 shadow-xl shadow-black/40">
              <TickerDonate />
              <Navbar />
            </div>
            <main className="flex-1">{children}</main>
            <Footer />
            <AskAssistantWidget />
            <AmbientPlayer />
            <PageTracker />
            <ThemeApplier />
            <SOSFloatingButton />
            <AccessibilityToggle />
          </div>
        </NextIntlClientProvider>
      </ThemeProvider>
    </Providers>
  );
}
