import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { AskGldWidget } from '@/components/AskGldWidget';
import { TickerDonate } from '@/components/TickerDonate';
import { AmbientPlayer } from '@/components/AmbientPlayer';
import { PageTracker } from '@/components/PageTracker';
import { ThemeProvider, themeInitScript } from '@/components/ThemeProvider';
import { ThemeApplier } from '@/components/ThemeApplier';

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

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <ThemeProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            {/* Bandeau sticky : ticker DON + navbar empilés, jamais de chevauchement */}
            <div className="sticky top-0 z-50 shadow-xl shadow-black/40">
              <TickerDonate />
              <Navbar />
            </div>
            <main className="flex-1">{children}</main>
            <Footer />
            <AskGldWidget />
            <AmbientPlayer />
            <PageTracker />
            <ThemeApplier />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
