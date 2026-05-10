/**
 * Templates de démarrage pour la marketplace.
 * Chaque template = un blob JSON de { pages: [{ slug, title, blocks }] }
 * qui sera cloné dans la tenant DB quand un user "Use template".
 */

export const TEMPLATE_SEEDS = [
  {
    slug: 'photo-portfolio-chic',
    name: 'Portfolio Photo Chic',
    description: 'Template chic-bohème pour photographe de mariage',
    category: 'photo',
    free: true,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    blocksSeed: {
      pages: [
        {
          slug: '/',
          title: 'Accueil',
          isHome: true,
          blocks: [
            {
              type: 'parallax-hero', width: 'full', effect: 'wow-arrival', effectDelay: 0,
              data: {
                title: 'Capturer l\'amour',
                subtitle: 'Photographe de mariage chic-bohème',
                ctaLabel: 'Voir mon portfolio',
                ctaHref: '/portfolio',
                bgImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920',
                floatingText: 'AMOUR',
                bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #ec4899 100%)',
                overlayColor: 'rgba(0,0,0,0.30)',
                height: '92vh',
              },
            },
            {
              type: 'text', width: 'full', effect: 'fade-up', effectDelay: 100,
              data: { html: '<h2>Sublimer l\'instant. Éterniser l\'émotion.</h2><p>Je suis Arnaud, photographe de mariage en Île-de-France. Mon style ? Naturel, lumineux, romantique. Je raconte votre histoire en images, sans pose forcée.</p>' },
            },
            { type: 'cta', width: 'full', effect: 'bounce-in', effectDelay: 200, data: { label: 'Demander un devis', href: '/contact' } },
          ],
        },
        { slug: '/portfolio', title: 'Portfolio', blocks: [{ type: 'text', width: 'full', data: { html: '<h1>Portfolio</h1><p>À remplir avec tes plus belles images.</p>' } }] },
        { slug: '/contact', title: 'Contact', blocks: [{ type: 'text', width: 'full', data: { html: '<h1>Contactez-moi</h1><p>Pour un devis personnalisé.</p>' } }] },
      ],
    },
  },
  {
    slug: 'restaurant-elegant',
    name: 'Restaurant Élégant',
    description: 'Site restaurant gastronomique avec menu et réservation',
    category: 'restaurant',
    free: true,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    blocksSeed: {
      pages: [
        {
          slug: '/',
          title: 'Accueil',
          isHome: true,
          blocks: [
            {
              type: 'parallax-hero', width: 'full', effect: 'fade-up', effectDelay: 0,
              data: {
                title: 'Le Petit Comptoir',
                subtitle: 'Cuisine de saison · Paris 11e',
                ctaLabel: 'Réserver',
                ctaHref: '/reservation',
                bgImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920',
                floatingText: 'GASTRO',
                height: '90vh',
                overlayColor: 'rgba(0,0,0,0.45)',
              },
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'saas-landing',
    name: 'SaaS Landing',
    description: 'Landing produit SaaS avec hero + features + pricing + CTA',
    category: 'saas',
    free: true,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800',
    blocksSeed: {
      pages: [
        {
          slug: '/',
          title: 'Accueil',
          isHome: true,
          blocks: [
            {
              type: 'hero', width: 'full', effect: 'fade-up', effectDelay: 0,
              data: { title: 'Build faster.', subtitle: 'Ton produit, livré 10x plus vite.', cta: { label: 'Essai gratuit', href: '/signup' } },
            },
          ],
        },
      ],
    },
  },
  {
    slug: 'asso-cause',
    name: 'Association Cause',
    description: 'Site asso militante avec mission, équipe, dons',
    category: 'asso',
    free: true,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
    blocksSeed: { pages: [] },
  },
  {
    slug: 'podcast-show',
    name: 'Podcast Show',
    description: 'Site podcast avec épisodes et lecteur audio',
    category: 'podcast',
    free: true,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
    blocksSeed: { pages: [] },
  },
  {
    slug: 'link-in-bio',
    name: 'Link in Bio',
    description: 'Page Link-in-bio (style Linktree) avec liens animés',
    category: 'link-in-bio',
    free: true,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800',
    blocksSeed: { pages: [] },
  },
  {
    slug: 'real-estate',
    name: 'Real Estate',
    description: 'Site agence immobilière avec listings et galerie',
    category: 'real-estate',
    free: false,
    priceCents: 4900,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    blocksSeed: { pages: [] },
  },
  {
    slug: 'course-academy',
    name: 'Course Academy',
    description: 'Plateforme de cours en ligne avec landing et catalogue',
    category: 'course',
    free: false,
    priceCents: 4900,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    blocksSeed: { pages: [] },
  },
  {
    slug: 'agency-creative',
    name: 'Agency Creative',
    description: 'Site agence créative avec cases studies parallax',
    category: 'agency',
    free: false,
    priceCents: 9900,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800',
    blocksSeed: { pages: [] },
  },
  {
    slug: 'ecommerce-store',
    name: 'E-commerce Store',
    description: 'Boutique en ligne avec produits et panier',
    category: 'ecommerce',
    free: false,
    priceCents: 9900,
    approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
    blocksSeed: { pages: [] },
  },
];
