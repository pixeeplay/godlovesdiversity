import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/**
 * Headers de sécurité HTTP appliqués à toutes les pages.
 * - HSTS : force HTTPS (1 an + sous-domaines)
 * - X-Frame-Options : empêche le clickjacking
 * - X-Content-Type-Options : empêche le MIME sniffing
 * - Referrer-Policy : limite les fuites d'URL référente
 * - Permissions-Policy : limite l'accès aux APIs sensibles
 * - poweredByHeader=false : n'expose pas "X-Powered-By: Next.js"
 *
 * NB : la CSP est en mode report-only car le projet utilise YouTube embed,
 *      Stripe iframe, pdf.js depuis CDN, OpenStreetMap, Square hosted, etc.
 */
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'X-Frame-Options',           value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control',    value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(self), payment=(self), usb=(), interest-cohort=()'
  },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://js.stripe.com https://www.youtube.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://generativelanguage.googleapis.com https://api.stripe.com https://connect.squareup.com https://connect.squareupsandbox.com https://nominatim.openstreetmap.org",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com https://www.helloasso.com https://checkout.square.site",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com https://www.helloasso.com"
    ].join('; ')
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'minio' },
      { protocol: 'https', hostname: '**' }
    ]
  },
  experimental: {
    serverActions: { bodySizeLimit: '20mb' }
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};

export default withNextIntl(nextConfig);
