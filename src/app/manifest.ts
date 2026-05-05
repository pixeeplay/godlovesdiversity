import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'God Loves Diversity',
    short_name: 'GLD',
    description: 'Mouvement interreligieux pour réconcilier foi et diversité. Communauté LGBT+ inclusive.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a14',
    theme_color: '#d61b80',
    categories: ['lifestyle', 'social', 'education'],
    icons: [
      { src: '/icon-192.png',  sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
    shortcuts: [
      {
        name: 'SOS — Aide LGBT immédiate',
        short_name: 'SOS',
        url: '/?sos=1',
        description: 'Contacts d\'urgence + alarme'
      },
      {
        name: 'Mes contacts d\'urgence',
        short_name: 'Contacts',
        url: '/sos/contacts'
      },
      {
        name: 'Voyage safe',
        short_name: 'Voyage',
        url: '/voyage-safe'
      },
      {
        name: 'Crée ta carte',
        short_name: 'Partager',
        url: '/partager'
      }
    ],
    screenshots: []
  };
}
