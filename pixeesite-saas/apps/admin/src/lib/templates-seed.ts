/**
 * Templates seed pour la marketplace.
 * Importé dans /api/admin/seed-templates pour seed direct via API.
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
          slug: '/', title: 'Accueil', isHome: true,
          blocks: [
            {
              type: 'parallax-hero', width: 'full', effect: 'wow-arrival', effectDelay: 0,
              data: {
                title: "Capturer l'amour",
                subtitle: 'Photographe de mariage chic-bohème',
                ctaLabel: 'Voir mon portfolio', ctaHref: '/portfolio',
                bgImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1920',
                floatingText: 'AMOUR',
                bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #ec4899 100%)',
                overlayColor: 'rgba(0,0,0,0.30)', height: '92vh',
              },
            },
            {
              type: 'text', width: 'full', effect: 'fade-up', effectDelay: 100,
              data: { html: "<h2>Sublimer l'instant. Éterniser l'émotion.</h2><p>Je suis Arnaud, photographe de mariage en Île-de-France. Mon style ? Naturel, lumineux, romantique. Je raconte votre histoire en images, sans pose forcée.</p>" },
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
          slug: '/', title: 'Accueil', isHome: true,
          blocks: [
            {
              type: 'parallax-hero', width: 'full', effect: 'fade-up', effectDelay: 0,
              data: {
                title: 'Le Petit Comptoir',
                subtitle: 'Cuisine de saison · Paris 11e',
                ctaLabel: 'Réserver', ctaHref: '/reservation',
                bgImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920',
                floatingText: 'GASTRO', height: '90vh',
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
          slug: '/', title: 'Accueil', isHome: true,
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
    category: 'asso', free: true, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Accueil', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: 'Notre cause', subtitle: 'Ensemble pour le changement' } }] }] },
  },
  {
    slug: 'podcast-show',
    name: 'Podcast Show',
    description: 'Site podcast avec épisodes et lecteur audio',
    category: 'podcast', free: true, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Accueil', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: 'Mon podcast' } }] }] },
  },
  {
    slug: 'link-in-bio',
    name: 'Link in Bio',
    description: 'Page Link-in-bio (style Linktree) avec liens animés',
    category: 'link-in-bio', free: true, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Mes liens', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: '@arnaud' } }] }] },
  },
  {
    slug: 'real-estate', name: 'Real Estate',
    description: 'Site agence immobilière avec listings et galerie',
    category: 'real-estate', free: false, priceCents: 4900, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Accueil', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: 'Real Estate' } }] }] },
  },
  {
    slug: 'course-academy', name: 'Course Academy',
    description: 'Plateforme de cours en ligne avec landing et catalogue',
    category: 'course', free: false, priceCents: 4900, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Accueil', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: 'Academy' } }] }] },
  },
  {
    slug: 'agency-creative', name: 'Agency Creative',
    description: 'Site agence créative avec cases studies parallax',
    category: 'agency', free: false, priceCents: 9900, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Accueil', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: 'Agency' } }] }] },
  },
  {
    slug: 'ecommerce-store', name: 'E-commerce Store',
    description: 'Boutique en ligne avec produits et panier',
    category: 'ecommerce', free: false, priceCents: 9900, approved: true,
    thumbnailUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800',
    blocksSeed: { pages: [{ slug: '/', title: 'Boutique', isHome: true, blocks: [{ type: 'hero', width: 'full', data: { title: 'Shop' } }] }] },
  },
  ...generateBulkTemplates(),
];

// ─── BULK TEMPLATES (100+ generation programmatique) ──────────────

interface BulkSeed {
  slug: string; name: string; description: string; category: string;
  free?: boolean; priceCents?: number; thumb: string;
  hero?: { title: string; subtitle?: string; bg?: string; gradient?: string };
  pages?: { slug: string; title: string }[];
}

function makeTemplate(b: BulkSeed) {
  return {
    slug: b.slug,
    name: b.name,
    description: b.description,
    category: b.category,
    free: b.free !== false,
    priceCents: b.priceCents || 0,
    approved: true,
    thumbnailUrl: `https://images.unsplash.com/photo-${b.thumb}?w=800&auto=format`,
    blocksSeed: {
      pages: [
        {
          slug: '/', title: 'Accueil', isHome: true,
          blocks: [
            {
              type: 'parallax-hero', width: 'full', effect: 'wow-arrival', effectDelay: 0,
              data: {
                title: b.hero?.title || b.name,
                subtitle: b.hero?.subtitle || b.description,
                ctaLabel: 'Découvrir', ctaHref: '/about',
                bgImage: `https://images.unsplash.com/photo-${b.hero?.bg || b.thumb}?w=1920&auto=format`,
                bgGradient: b.hero?.gradient || 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
                overlayColor: 'rgba(0,0,0,0.40)', height: '88vh',
              },
            },
            { type: 'text', width: 'full', effect: 'fade-up', effectDelay: 100,
              data: { html: `<h2>${b.hero?.title || b.name}</h2><p>${b.description}</p>` } },
            { type: 'cta', width: 'full', effect: 'bounce-in', effectDelay: 200,
              data: { label: 'Nous contacter', href: '/contact' } },
          ],
        },
        ...(b.pages || [{ slug: '/about', title: 'À propos' }, { slug: '/contact', title: 'Contact' }]).map((p) => ({
          slug: p.slug, title: p.title,
          blocks: [{ type: 'text', width: 'full',
            data: { html: `<h1>${p.title}</h1><p>Personnalisez ce contenu via le Page Builder.</p>` } }],
        })),
      ],
    },
  };
}

function generateBulkTemplates() {
  const seeds: BulkSeed[] = [
    // ─── PHOTO (12) ───
    { slug: 'photo-mariage-classique', name: 'Mariage Classique', description: 'Photographe mariage style classique élégant', category: 'photo', thumb: '1519741497674-611481863552', hero: { title: 'Votre histoire', subtitle: 'Photographie de mariage authentique' } },
    { slug: 'photo-mariage-bohème', name: 'Mariage Bohème', description: 'Photo mariage bohème naturel', category: 'photo', thumb: '1465495976277-4387d4b0e4a6' },
    { slug: 'photo-mariage-luxe', name: 'Mariage Luxe', description: 'Photo mariage haut de gamme', category: 'photo', free: false, priceCents: 4900, thumb: '1519741347686-c1e0aadf4611' },
    { slug: 'photo-portrait-studio', name: 'Portrait Studio', description: 'Studio photo portrait pro', category: 'photo', thumb: '1554080353-321e452ccf19' },
    { slug: 'photo-newborn', name: 'Photographie Nouveau-né', description: 'Photographe nouveau-nés et bébés', category: 'photo', thumb: '1544552866-6d72c7b18fff' },
    { slug: 'photo-famille', name: 'Photo Famille', description: 'Séances photo famille en extérieur', category: 'photo', thumb: '1511895426328-dc8714191300' },
    { slug: 'photo-grossesse', name: 'Photo Grossesse', description: 'Séances grossesse maternité', category: 'photo', thumb: '1518895949257-7621c3c786d7' },
    { slug: 'photo-corporate', name: 'Photo Corporate', description: 'Photographie d\'entreprise', category: 'photo', free: false, priceCents: 2900, thumb: '1551434678-e076c223a692' },
    { slug: 'photo-mode', name: 'Photo Mode', description: 'Photographe mode et lookbook', category: 'photo', thumb: '1483985988355-763728e1935b' },
    { slug: 'photo-evenementiel', name: 'Photo Événementiel', description: 'Photographe événements et concerts', category: 'photo', thumb: '1492684223066-81342ee5ff30' },
    { slug: 'photo-paysage', name: 'Photo Paysage', description: 'Photographe paysages et nature', category: 'photo', thumb: '1506905925346-21bda4d32df4' },
    { slug: 'photo-animalier', name: 'Photographe Animalier', description: 'Photographie animaux et nature', category: 'photo', thumb: '1474511320723-9a56873867b5' },

    // ─── RESTAURANT / FOOD (10) ───
    { slug: 'restaurant-bistrot', name: 'Bistrot Parisien', description: 'Bistrot français traditionnel', category: 'restaurant', thumb: '1414235077428-338989a2e8c0' },
    { slug: 'restaurant-italien', name: 'Trattoria Italienne', description: 'Restaurant italien authentique', category: 'restaurant', thumb: '1555396273-367ea4eb4db5' },
    { slug: 'restaurant-japonais', name: 'Restaurant Japonais', description: 'Sushi & ramen', category: 'restaurant', thumb: '1579871494447-9811cf80d66c' },
    { slug: 'restaurant-fastfood', name: 'Burger Joint', description: 'Burgers premium', category: 'restaurant', thumb: '1568901346375-23c9450c58cd' },
    { slug: 'restaurant-pizzeria', name: 'Pizzeria', description: 'Pizzas au feu de bois', category: 'restaurant', thumb: '1565299624946-b28f40a0ae38' },
    { slug: 'cafe-coffee-shop', name: 'Coffee Shop', description: 'Café spécialité, brunch', category: 'restaurant', thumb: '1559496417-e7f25cb247f3' },
    { slug: 'patisserie', name: 'Pâtisserie', description: 'Pâtisserie boulangerie artisanale', category: 'restaurant', thumb: '1486427944299-d1955d23e34d' },
    { slug: 'food-truck', name: 'Food Truck', description: 'Site food truck mobile', category: 'restaurant', thumb: '1565299507177-b0ac66763828' },
    { slug: 'restaurant-vegan', name: 'Restaurant Vegan', description: 'Cuisine végétale healthy', category: 'restaurant', thumb: '1540420773420-3366772f4999' },
    { slug: 'cave-vins', name: 'Cave à Vins', description: 'Cave et bar à vins', category: 'restaurant', free: false, priceCents: 2900, thumb: '1510812431401-41d2bd2722f3' },

    // ─── SAAS / TECH (12) ───
    { slug: 'saas-landing-modern', name: 'SaaS Landing Modern', description: 'Landing SaaS B2B moderne', category: 'sass', thumb: '1551434678-e076c223a692' },
    { slug: 'saas-ai-startup', name: 'AI Startup', description: 'Landing startup IA', category: 'sass', thumb: '1620712943543-bcc4688e7485' },
    { slug: 'saas-fintech', name: 'Fintech App', description: 'Application bancaire/fintech', category: 'sass', free: false, priceCents: 9900, thumb: '1563013544-824ae1b704d3' },
    { slug: 'saas-devtools', name: 'DevTools Landing', description: 'Outil développeur', category: 'sass', thumb: '1555066931-4365d14bab8c' },
    { slug: 'saas-crm', name: 'CRM Software', description: 'Solution CRM B2B', category: 'sass', free: false, priceCents: 4900, thumb: '1552581234-26160f608093' },
    { slug: 'saas-marketing', name: 'Marketing Tool', description: 'Outil marketing automation', category: 'sass', thumb: '1432888622747-4eb9a8efeb07' },
    { slug: 'saas-analytics', name: 'Analytics Dashboard', description: 'Plateforme analytics', category: 'sass', thumb: '1551288049-bebda4e38f71' },
    { slug: 'mobile-app-landing', name: 'Mobile App Landing', description: 'Landing app iOS/Android', category: 'sass', thumb: '1512941937669-90a1b58e7e9c' },
    { slug: 'saas-noco-de', name: 'No-code Tool', description: 'Outil no-code SaaS', category: 'sass', thumb: '1518709268805-4e9042af2176' },
    { slug: 'saas-cybersec', name: 'Cybersecurity', description: 'Solution cybersécurité', category: 'sass', free: false, priceCents: 9900, thumb: '1550751827-4bd374c3f58b' },
    { slug: 'saas-edtech', name: 'EdTech Platform', description: 'Plateforme éducation en ligne', category: 'sass', thumb: '1503676260728-1c00da094a0b' },
    { slug: 'saas-healthtech', name: 'HealthTech App', description: 'Application santé', category: 'sass', thumb: '1576091160399-112ba8d25d1d' },

    // ─── E-COMMERCE (10) ───
    { slug: 'ecommerce-fashion', name: 'Boutique Mode', description: 'E-commerce mode et accessoires', category: 'ecommerce', thumb: '1483985988355-763728e1935b' },
    { slug: 'ecommerce-jewelry', name: 'Bijouterie', description: 'Boutique bijoux haut de gamme', category: 'ecommerce', free: false, priceCents: 4900, thumb: '1515562141207-7a88fb7ce338' },
    { slug: 'ecommerce-cosmetics', name: 'Cosmétiques', description: 'Boutique beauté et cosmétiques', category: 'ecommerce', thumb: '1487412947147-5cebf100ffc2' },
    { slug: 'ecommerce-furniture', name: 'Meubles Design', description: 'Boutique mobilier design', category: 'ecommerce', thumb: '1555041469-a586c61ea9bc' },
    { slug: 'ecommerce-tech', name: 'Tech Store', description: 'Boutique électronique', category: 'ecommerce', thumb: '1498049794561-7780e7231661' },
    { slug: 'ecommerce-sport', name: 'Sport Store', description: 'Magasin équipement sport', category: 'ecommerce', thumb: '1556906781-9a412961c28c' },
    { slug: 'ecommerce-deco', name: 'Décoration Maison', description: 'Boutique déco intérieure', category: 'ecommerce', thumb: '1555041469-a586c61ea9bc' },
    { slug: 'ecommerce-bio', name: 'Épicerie Bio', description: 'Épicerie en ligne bio', category: 'ecommerce', thumb: '1542838132-92c53300491e' },
    { slug: 'ecommerce-handmade', name: 'Fait-main', description: 'Artisanat fait-main', category: 'ecommerce', thumb: '1452860606245-08befc0ff44b' },
    { slug: 'marketplace-multi-vendor', name: 'Marketplace', description: 'Marketplace multi-vendeurs', category: 'ecommerce', free: false, priceCents: 14900, thumb: '1607082348824-0a96f2a4b9da' },

    // ─── AGENCY / SERVICES (8) ───
    { slug: 'agency-marketing', name: 'Agence Marketing', description: 'Agence marketing digitale', category: 'agency', thumb: '1542744173-8e7e53415bb0' },
    { slug: 'agency-design', name: 'Agence Design', description: 'Studio design graphique', category: 'agency', thumb: '1561070791-2526d30994b8' },
    { slug: 'agency-dev', name: 'Agence Dev', description: 'Agence développement web', category: 'agency', thumb: '1517694712202-14dd9538aa97' },
    { slug: 'agency-seo', name: 'Agence SEO', description: 'Consultant SEO', category: 'agency', free: false, priceCents: 4900, thumb: '1432888622747-4eb9a8efeb07' },
    { slug: 'agency-video', name: 'Agence Vidéo', description: 'Production vidéo', category: 'agency', thumb: '1574717024653-ccaeb1cdcdc4' },
    { slug: 'agency-pr', name: 'Agence RP', description: 'Relations publiques', category: 'agency', thumb: '1552581234-26160f608093' },
    { slug: 'consulting-firm', name: 'Cabinet Conseil', description: 'Cabinet de conseil', category: 'agency', free: false, priceCents: 4900, thumb: '1556761175-5973dc0f32e7' },
    { slug: 'agency-events', name: 'Agence Événementiel', description: 'Organisation événements', category: 'agency', thumb: '1492684223066-81342ee5ff30' },

    // ─── ASSO / NGO (6) ───
    { slug: 'asso-environnement', name: 'Asso Environnement', description: 'ONG environnement', category: 'asso', thumb: '1542601906-0d2bbb7d7a5a' },
    { slug: 'asso-humanitaire', name: 'ONG Humanitaire', description: 'Association humanitaire', category: 'asso', thumb: '1488521787991-ed7bbaae773c' },
    { slug: 'asso-sport', name: 'Club Sportif', description: 'Site club sportif amateur', category: 'asso', thumb: '1517649763962-0c623066013b' },
    { slug: 'asso-culture', name: 'Asso Culturelle', description: 'Association culturelle', category: 'asso', thumb: '1507676184212-d03ab07a01bf' },
    { slug: 'asso-education', name: 'Asso Éducation', description: 'Association éducative', category: 'asso', thumb: '1503676260728-1c00da094a0b' },
    { slug: 'asso-animaux', name: 'Refuge Animaux', description: 'Refuge animal', category: 'asso', thumb: '1450778869180-41d0601e046e' },

    // ─── PODCAST / MEDIA (5) ───
    { slug: 'podcast-business', name: 'Podcast Business', description: 'Podcast business / entrepreneuriat', category: 'podcast', thumb: '1478737270239-2f02b77fc618' },
    { slug: 'podcast-tech', name: 'Podcast Tech', description: 'Podcast tech / dev', category: 'podcast', thumb: '1590602847861-f357a9332bbc' },
    { slug: 'podcast-wellness', name: 'Podcast Bien-être', description: 'Podcast bien-être', category: 'podcast', thumb: '1547036967-23d11aacaee0' },
    { slug: 'magazine-online', name: 'Magazine en Ligne', description: 'Magazine éditorial', category: 'blog', thumb: '1516321318423-f06f85e504b3' },
    { slug: 'newsroom', name: 'Newsroom', description: 'Site média / actu', category: 'blog', free: false, priceCents: 4900, thumb: '1504711434969-e33886168f5c' },

    // ─── COURSE / EDU (5) ───
    { slug: 'course-online', name: 'Plateforme Cours', description: 'Cours en ligne / LMS', category: 'course', free: false, priceCents: 9900, thumb: '1503676260728-1c00da094a0b' },
    { slug: 'coach-personal', name: 'Coach Personnel', description: 'Site coach de vie', category: 'course', thumb: '1552058544-f2b08422138a' },
    { slug: 'coach-business', name: 'Business Coach', description: 'Coach business', category: 'course', thumb: '1552581234-26160f608093' },
    { slug: 'language-school', name: 'École de Langues', description: 'Cours de langues en ligne', category: 'course', thumb: '1456513080510-7bf3a84b82f8' },
    { slug: 'masterclass', name: 'Masterclass', description: 'Masterclass premium', category: 'course', free: false, priceCents: 9900, thumb: '1481627834876-b7833e8f5570' },

    // ─── REAL ESTATE (4) ───
    { slug: 'realestate-luxe', name: 'Immobilier Luxe', description: 'Immobilier de luxe', category: 'real-estate', free: false, priceCents: 9900, thumb: '1564013799919-ab600027ffc6' },
    { slug: 'realestate-rental', name: 'Location Vacances', description: 'Site location vacances', category: 'real-estate', thumb: '1502672260266-1c1ef2d93688' },
    { slug: 'realestate-agency', name: 'Agence Immo', description: 'Agence immobilière', category: 'real-estate', thumb: '1568605114967-8130f3a36994' },
    { slug: 'realestate-development', name: 'Promoteur Immo', description: 'Promoteur immobilier', category: 'real-estate', free: false, priceCents: 4900, thumb: '1486325212027-8081e485255e' },

    // ─── HEALTH / FITNESS (5) ───
    { slug: 'fitness-coach', name: 'Coach Fitness', description: 'Site coach sportif', category: 'health', thumb: '1517836357463-d25dfeac3438' },
    { slug: 'yoga-studio', name: 'Studio Yoga', description: 'Studio yoga / méditation', category: 'health', thumb: '1545205597-3d9d02c29597' },
    { slug: 'crossfit-gym', name: 'Salle CrossFit', description: 'Box CrossFit', category: 'health', thumb: '1534438327276-14e5300c3a48' },
    { slug: 'osteopathe', name: 'Ostéopathe', description: 'Cabinet ostéopathie', category: 'health', thumb: '1505751172876-fa1923c5c528' },
    { slug: 'medecin-cabinet', name: 'Cabinet Médical', description: 'Site cabinet médical', category: 'health', free: false, priceCents: 2900, thumb: '1576091160399-112ba8d25d1d' },

    // ─── BEAUTY / WELLNESS (5) ───
    { slug: 'salon-coiffure', name: 'Salon Coiffure', description: 'Salon coiffure', category: 'beauty', thumb: '1560066984-138dadb4c035' },
    { slug: 'salon-beaute', name: 'Salon Beauté', description: 'Institut de beauté', category: 'beauty', thumb: '1487412947147-5cebf100ffc2' },
    { slug: 'spa-wellness', name: 'Spa Wellness', description: 'Spa et bien-être', category: 'beauty', free: false, priceCents: 4900, thumb: '1540555700478-4be289fbecef' },
    { slug: 'tatoueur', name: 'Studio Tattoo', description: 'Tatoueur professionnel', category: 'beauty', thumb: '1561839561-b13bcfe95249' },
    { slug: 'manucure-ongles', name: 'Onglerie', description: 'Salon manucure / nail art', category: 'beauty', thumb: '1604654894610-df63bc536371' },

    // ─── EVENTS / WEDDING (4) ───
    { slug: 'wedding-planner', name: 'Wedding Planner', description: 'Organisatrice de mariage', category: 'events', free: false, priceCents: 4900, thumb: '1519741497674-611481863552' },
    { slug: 'event-venue', name: 'Lieu Événements', description: 'Domaine pour événements', category: 'events', thumb: '1464366400600-7168b8af9bc3' },
    { slug: 'dj-music', name: 'DJ Mariage', description: 'DJ événementiel', category: 'events', thumb: '1493676304819-0d7a8d026dcf' },
    { slug: 'florist', name: 'Fleuriste', description: 'Fleuriste mariage / événements', category: 'events', thumb: '1487530811176-3780de880c2d' },

    // ─── CREATIVE / PORTFOLIO (5) ───
    { slug: 'portfolio-designer', name: 'Portfolio Designer', description: 'Portfolio designer / DA', category: 'portfolio', thumb: '1561070791-2526d30994b8' },
    { slug: 'portfolio-developer', name: 'Portfolio Dev', description: 'Portfolio développeur', category: 'portfolio', thumb: '1517694712202-14dd9538aa97' },
    { slug: 'portfolio-illustrator', name: 'Portfolio Illustrateur', description: 'Portfolio illustrateur', category: 'portfolio', thumb: '1513475382585-d06e58bcb0e0' },
    { slug: 'portfolio-architect', name: 'Portfolio Architecte', description: 'Portfolio architecte', category: 'portfolio', free: false, priceCents: 4900, thumb: '1486325212027-8081e485255e' },
    { slug: 'portfolio-artist', name: 'Portfolio Artiste', description: 'Portfolio artiste plasticien', category: 'portfolio', thumb: '1513475382585-d06e58bcb0e0' },

    // ─── PERSONAL / OTHER (5) ───
    { slug: 'personal-cv', name: 'CV en Ligne', description: 'CV interactif personnel', category: 'personal', thumb: '1499951360447-b19be8fe80f5' },
    { slug: 'personal-blog', name: 'Blog Perso', description: 'Blog personnel minimaliste', category: 'blog', thumb: '1486312338219-ce68d2c6f44d' },
    { slug: 'travel-blog', name: 'Blog Voyage', description: 'Blog voyage et lifestyle', category: 'blog', thumb: '1488646953014-85cb44e25828' },
    { slug: 'tech-blog', name: 'Blog Tech', description: 'Blog tech et développement', category: 'blog', thumb: '1487058792275-0ad4aaf24ca7' },
    { slug: 'food-blog', name: 'Blog Cuisine', description: 'Blog recettes et cuisine', category: 'blog', thumb: '1495521821757-a1efb6729352' },
  ];
  return seeds.map(makeTemplate);
}
