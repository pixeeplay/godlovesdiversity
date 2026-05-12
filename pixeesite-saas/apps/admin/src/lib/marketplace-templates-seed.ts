/**
 * Phase 20 — Marketplace Templates (11 themed templates, iso-GLD but neutral).
 *
 * Each template = a complete, opinionated "site starter kit" with:
 *  - palette (primary/secondary/fonts)
 *  - pages (with blocks: parallax-hero, text, image, columns, cta, embed, hero, video, spacer)
 *  - features (modules activated: shop, blog, forum, newsletter, events, testimonials, gallery,
 *    booking, agenda, community, crowdfunding, articles, partners, leads, map, dropshipping,
 *    rag, social-calendar)
 *  - seedData (initial business data: products, articles, events, testimonials, etc.)
 *
 * Picked up by `seed-marketplace-templates` and consumed by the wizard route
 * which fans the seedData into the tenant DB (Product/Article/Event/Testimonial).
 *
 * NO religious vocabulary anywhere — strictly business / lifestyle / pro.
 */
import { platformDb } from '@pixeesite/database';

// ─── TYPES ─────────────────────────────────────────────────────────

export interface TemplateBlock {
  type: string;
  width?: string;
  height?: string;
  effect?: string;
  effectDelay?: number;
  data: Record<string, any>;
}

export interface TemplatePage {
  slug: string;
  title: string;
  isHome?: boolean;
  meta?: { description?: string; ogImage?: string };
  blocks: TemplateBlock[];
}

export interface TemplatePalette {
  primary: string;
  secondary: string;
  accent?: string;
  fontHeading: string;
  fontBody: string;
}

export interface TemplateSeedProduct {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: 'EUR';
  images: string[];
  inventory: number;
  category?: string;
}

export interface TemplateSeedArticle {
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  coverImage?: string;
  tags?: string[];
  authorName?: string;
  status?: 'draft' | 'published';
}

export interface TemplateSeedEvent {
  slug: string;
  title: string;
  description: string;
  startsAt: string; // ISO date string
  endsAt?: string;
  location?: string;
  coverImage?: string;
  category?: string;
}

export interface TemplateSeedTestimonial {
  authorName: string;
  authorTitle?: string;
  quote: string;
  rating?: number;
  authorAvatar?: string;
  featured?: boolean;
}

export interface TemplateSeedNewsletter {
  subject: string;
  bodyHtml: string;
  status?: 'draft' | 'scheduled';
}

export interface TemplateSeedData {
  products?: TemplateSeedProduct[];
  articles?: TemplateSeedArticle[];
  events?: TemplateSeedEvent[];
  testimonials?: TemplateSeedTestimonial[];
  newsletters?: TemplateSeedNewsletter[];
}

export interface MarketplaceTemplate {
  slug: string;
  name: string;
  description: string;
  category: string;
  thumbnailUrl: string;
  free: boolean;
  priceCents: number;
  approved: boolean;
  tags: string[];
  blocksSeed: {
    version: 1;
    palette: TemplatePalette;
    pages: TemplatePage[];
    features: string[];
    seedData: TemplateSeedData;
  };
}

// ─── HELPERS ───────────────────────────────────────────────────────

const U = (id: string, w = 1920) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
};

// ════════════════════════════════════════════════════════════════════
// 1. PHOTOGRAPHE PRO — black & gold, gallery-driven, booking-ready
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_PHOTOGRAPHE: MarketplaceTemplate = {
  slug: 'photographe-pro',
  name: 'Photographe Pro — Noir & Or',
  description:
    "Portfolio premium pour photographe pro : gallery filtrable mariage / portrait / corporate, tarifs, réservation, blog, shop tirages fine art.",
  category: 'photo',
  thumbnailUrl: U('1519741497674-611481863552', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['photo', 'portfolio', 'booking', 'gallery', 'shop', 'fine-art'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#D4AF37',
      secondary: '#0a0a0a',
      accent: '#FFD700',
      fontHeading: 'Playfair Display',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: {
          description:
            'Photographe pro — portraits, mariages, corporate. Atelier studio Paris.',
        },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            effect: 'fade-up',
            data: {
              title: 'L\'image qui reste.',
              subtitle:
                'Photographe pro — mariage, portrait, corporate. Tirages fine art en édition limitée.',
              ctaLabel: 'Réserver une séance',
              ctaHref: '/contact',
              bgImage: U('1519741497674-611481863552'),
              floatingText: 'PHOTO',
              bgGradient:
                'linear-gradient(180deg, #0a0a0a 0%, #1a1410 50%, #0a0a0a 100%)',
              overlayColor: 'rgba(0,0,0,0.55)',
              height: '95vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            effect: 'fade-up',
            effectDelay: 100,
            data: {
              html:
                '<h2 style="text-align:center">Trois univers, une signature.</h2><p style="text-align:center;max-width:680px;margin:0 auto;opacity:.85">Je raconte vos moments avec une lumière naturelle, un grain doux, et une retouche fine main. Studio à Paris 11e, déplacements France & Europe.</p>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            effect: 'fade-up',
            effectDelay: 200,
            data: {
              columns: [
                {
                  html:
                    '<img src="' +
                    U('1519741497674-611481863552', 800) +
                    '" style="width:100%;border-radius:8px;aspect-ratio:3/4;object-fit:cover" /><h3 style="margin-top:1em">Mariages</h3><p>Reportage complet, du préparatif au dernier verre. Tirages album premium inclus.</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1554080353-321e452ccf19', 800) +
                    '" style="width:100%;border-radius:8px;aspect-ratio:3/4;object-fit:cover" /><h3 style="margin-top:1em">Portraits</h3><p>Studio ou extérieur. Lumière naturelle, direction guidée. Pour vous, votre couple, votre famille.</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1551434678-e076c223a692', 800) +
                    '" style="width:100%;border-radius:8px;aspect-ratio:3/4;object-fit:cover" /><h3 style="margin-top:1em">Corporate</h3><p>Identité visuelle d\'entreprise, headshots équipe, événementiel pro. Délais courts.</p>',
                },
              ],
            },
          },
          {
            type: 'text',
            width: 'full',
            effect: 'fade-up',
            data: {
              html:
                '<h2 style="text-align:center">Ils me font confiance</h2>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            effect: 'fade-up',
            data: {
              columns: [
                {
                  html:
                    '<blockquote style="font-style:italic">« Un regard, une justesse, une humanité. Les photos de notre mariage sont devenues des œuvres. »</blockquote><p style="font-weight:600">— Camille & Antoine</p>',
                },
                {
                  html:
                    '<blockquote style="font-style:italic">« Headshots équipe livrés en 48h, qualité éditoriale. On retravaillera. »</blockquote><p style="font-weight:600">— Marine, DRH</p>',
                },
                {
                  html:
                    '<blockquote style="font-style:italic">« Séance famille douce, naturelle. Mes enfants étaient à l\'aise tout de suite. »</blockquote><p style="font-weight:600">— Sophie, maman</p>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            effect: 'bounce-in',
            data: {
              label: 'Voir le portfolio',
              href: '/portfolio',
            },
          },
        ],
      },
      {
        slug: '/portfolio',
        title: 'Portfolio',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Portfolio',
              subtitle:
                'Trois ans de production. Filtrez par catégorie : mariage, portrait, corporate.',
              bgImage: U('1465495976277-4387d4b0e4a6'),
              overlayColor: 'rgba(0,0,0,0.55)',
              height: '60vh',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<img src="' +
                    U('1519741497674-611481863552', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Mariage · Domaine de Villesavin</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1465495976277-4387d4b0e4a6', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Mariage · Bohème · Provence</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1519741347686-c1e0aadf4611', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Mariage · Château · Loire</p>',
                },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<img src="' +
                    U('1554080353-321e452ccf19', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Portrait studio</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1544552866-6d72c7b18fff', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Nouveau-né</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1511895426328-dc8714191300', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Famille</p>',
                },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<img src="' +
                    U('1551434678-e076c223a692', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Corporate · headshots</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1556761175-5973dc0f32e7', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Corporate · équipe</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1552581234-26160f608093', 800) +
                    '" style="width:100%;border-radius:8px" /><p style="margin-top:6px;opacity:.7;font-size:13px">Événementiel pro</p>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/tarifs',
        title: 'Tarifs',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Trois packs, transparence totale.',
              subtitle:
                'Choisissez ce qui correspond, on personnalise le reste.',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(212,175,55,.3);border-radius:12px"><h3>Essentiel</h3><p style="font-size:32px;font-weight:700;color:#D4AF37">450 €</p><ul><li>Séance 1h en studio</li><li>20 photos retouchées HD</li><li>Galerie privée en ligne</li><li>Livraison sous 7 jours</li></ul></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:2px solid #D4AF37;border-radius:12px;background:rgba(212,175,55,.08)"><span style="background:#D4AF37;color:#000;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700">PLUS DEMANDÉ</span><h3 style="margin-top:12px">Signature</h3><p style="font-size:32px;font-weight:700;color:#D4AF37">1 200 €</p><ul><li>Séance 3h, lieu au choix</li><li>50 photos retouchées HD</li><li>Tirage 30×40 fine art offert</li><li>Album souvenir 20 pages</li><li>Livraison sous 14 jours</li></ul></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(212,175,55,.3);border-radius:12px"><h3>Reportage complet</h3><p style="font-size:32px;font-weight:700;color:#D4AF37">2 900 €</p><ul><li>Couverture 8h (mariage…)</li><li>200+ photos retouchées</li><li>Album premium cuir</li><li>2 tirages 30×40 fine art</li><li>Diaporama vidéo bonus</li></ul></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Discutons de votre projet', href: '/contact' },
          },
        ],
      },
      {
        slug: '/a-propos',
        title: 'À propos',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Derrière l\'objectif',
              subtitle: '10 ans d\'images, 400 mariages, 1 obsession : la lumière.',
              bgImage: U('1554080353-321e452ccf19'),
              overlayColor: 'rgba(0,0,0,0.55)',
              height: '65vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Mon parcours</h2><p><strong>2015</strong> — Sortie École des Gobelins, section photo.</p><p><strong>2017</strong> — Premier mariage shooté. Et un truc se déclenche.</p><p><strong>2020</strong> — Ouverture du studio Paris 11e, 80m² lumière naturelle.</p><p><strong>2023</strong> — Publication dans Vogue, lauréat Sony World Photography Awards (catégorie portrait).</p><p><strong>2026</strong> — 400 mariages au compteur, 60 clients corporate fidèles.</p>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<h3>Le matériel</h3><ul><li>2× Sony A7R V (boîtiers full-frame)</li><li>24-70mm f/2.8 GM</li><li>85mm f/1.4 GM (portrait signature)</li><li>16-35mm f/2.8 GM (ambiances)</li><li>Profoto B10 Plus ×3</li><li>Lecteurs CFexpress + sauvegarde redondante</li></ul>',
                },
                {
                  html:
                    '<h3>Le studio</h3><p>80m² rue de Charonne, Paris 11e.</p><ul><li>Verrière nord, lumière douce H+0 → H+18</li><li>3 fonds (blanc, gris, noir)</li><li>Cabine maquillage</li><li>Salon client + galerie projection 4K</li></ul>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/blog',
        title: 'Blog',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Conseils & coulisses',
              subtitle:
                'Tout ce que vous devez savoir avant de booker un photographe.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<p>Articles synchronisés depuis le module Blog du tenant.</p>' },
          },
        ],
      },
      {
        slug: '/contact',
        title: 'Contact',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Réservons votre séance.',
              subtitle:
                'Un message, je réponds sous 24h. Devis personnalisé gratuit.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h3>Studio</h3><p>22 rue de Charonne, 75011 Paris</p><h3>Téléphone</h3><p>06 12 34 56 78</p><h3>Email</h3><p>contact@photographe.fr</p>',
            },
          },
          {
            type: 'embed',
            width: 'full',
            data: {
              html:
                '<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=2.380,48.852,2.388,48.857&layer=mapnik" style="width:100%;height:400px;border:0;border-radius:8px"></iframe>',
            },
          },
        ],
      },
    ],
    features: ['gallery', 'booking', 'blog', 'testimonials', 'shop', 'leads', 'articles'],
    seedData: {
      products: [
        {
          slug: 'tirage-30x40-fine-art',
          name: 'Tirage 30×40 cm — fine art',
          description:
            "Tirage Hahnemühle Photo Rag 308g, signé numéroté. Édition limitée à 30 exemplaires par image. Livré sous tube rigide.",
          priceCents: 4500,
          currency: 'EUR',
          images: [U('1519741497674-611481863552', 800)],
          inventory: 30,
          category: 'tirage',
        },
        {
          slug: 'album-mariage-premium',
          name: 'Album mariage premium — cuir 30×30',
          description:
            "Album souvenir 40 pages, couverture cuir véritable, papier mat 300g. Maquette personnalisée. Livraison 4 semaines.",
          priceCents: 49000,
          currency: 'EUR',
          images: [U('1519741347686-c1e0aadf4611', 800)],
          inventory: 99,
          category: 'album',
        },
        {
          slug: 'seance-portrait-studio-1h',
          name: 'Séance portrait studio — 1h',
          description:
            "1h en studio Paris 11e, 20 photos retouchées HD livrées en 7 jours, galerie privée. Bon cadeau valable 1 an.",
          priceCents: 15000,
          currency: 'EUR',
          images: [U('1554080353-321e452ccf19', 800)],
          inventory: 99,
          category: 'seance',
        },
      ],
      articles: [
        {
          slug: 'comment-choisir-son-photographe-mariage',
          title: 'Comment choisir son photographe mariage en 2026',
          excerpt:
            "5 questions à poser AVANT de signer. Spoiler : le prix n\'est pas la première.",
          bodyHtml:
            '<h2>1. Demandez à voir 3 mariages COMPLETS</h2><p>Pas juste le best-of Instagram. Un mariage entier, du préparatif à la fin. Vous verrez la régularité.</p><h2>2. Vérifiez le contrat</h2><p>Délais de livraison, nombre de photos, cession de droits, clause d\'annulation : tout doit être écrit.</p><h2>3. Faites un appel visio</h2><p>Le feeling humain compte autant que le talent. Vous passerez 10h avec cette personne le jour J.</p><h2>4. Posez la question du backup</h2><p>Double boîtier ? Sauvegarde immédiate sur 2 cartes ? Que se passe-t-il si une carte plante ?</p><h2>5. Méfiez-vous des prix cassés</h2><p>Un mariage = 8h de shoot + 40h de post-prod. En dessous de 1500€, quelque chose va craquer.</p>',
          coverImage: U('1519741497674-611481863552', 1200),
          tags: ['mariage', 'conseils', 'photographe'],
          authorName: 'L\'équipe',
          status: 'published',
        },
        {
          slug: '5-conseils-seance-portrait-reussie',
          title: '5 conseils pour une séance portrait réussie',
          excerpt:
            "Comment être à l\'aise devant l\'objectif quand on n\'y est pas habitué.",
          bodyHtml:
            '<h2>1. Dormez bien la veille</h2><p>Sérieusement. La peau, les yeux, l\'énergie : tout vient du repos.</p><h2>2. Apportez 3 tenues</h2><p>Une neutre, une colorée, une un peu plus habillée. Évitez les motifs trop chargés.</p><h2>3. Hydratez-vous depuis 2 jours</h2><p>La peau le rendra à l\'image. Évitez le sel et l\'alcool la veille.</p><h2>4. Bougez, ne posez pas</h2><p>Marchez, riez, regardez ailleurs. Les meilleures photos arrivent entre 2 poses.</p><h2>5. Faites confiance</h2><p>Votre photographe vous dirigera. Lâchez prise, vous n\'êtes pas en charge.</p>',
          coverImage: U('1554080353-321e452ccf19', 1200),
          tags: ['portrait', 'conseils', 'studio'],
          authorName: 'L\'équipe',
          status: 'published',
        },
      ],
      testimonials: [
        {
          authorName: 'Camille & Antoine',
          authorTitle: 'Mariés en juin 2025',
          quote:
            "Un regard, une justesse, une humanité. Les photos de notre mariage sont devenues des œuvres qu\'on accroche au mur.",
          rating: 5,
          featured: true,
        },
        {
          authorName: 'Marine D.',
          authorTitle: 'DRH, scale-up parisienne',
          quote:
            "Headshots équipe (40 personnes) livrés en 48h, qualité éditoriale. On retravaillera dès le prochain recrutement de masse.",
          rating: 5,
          featured: true,
        },
        {
          authorName: 'Sophie L.',
          authorTitle: 'Maman de 2 enfants',
          quote:
            "Séance famille douce, naturelle. Mes enfants étaient à l\'aise tout de suite. Les photos respirent la joie.",
          rating: 5,
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 2. RESTAURANT TRENDY — terracotta & cream, menu-driven, events
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_RESTAURANT: MarketplaceTemplate = {
  slug: 'restaurant-trendy',
  name: 'Restaurant Trendy — Terracotta & Crème',
  description:
    "Site restaurant chaleureux : menu photo, réservation, événements (brunchs, dégustations), avis clients en forum, newsletter.",
  category: 'restaurant',
  thumbnailUrl: U('1517248135467-4c7edcad34c4', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['restaurant', 'menu', 'réservation', 'events', 'avis'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#C65D3A',
      secondary: '#F5E6D3',
      accent: '#8B3A1F',
      fontHeading: 'Cormorant Garamond',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: {
          description:
            'Restaurant trendy à Paris — cuisine de saison, produits sourcés, brunchs et dégustations.',
        },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            effect: 'fade-up',
            data: {
              title: 'La table qui change tout.',
              subtitle:
                'Cuisine de saison, produits ultra-sourcés, soirées vins nature.',
              ctaLabel: 'Réserver une table',
              ctaHref: '/reservation',
              bgImage: U('1517248135467-4c7edcad34c4'),
              floatingText: 'GOÛTER',
              bgGradient:
                'linear-gradient(180deg, #2a1810 0%, #5a2f1f 100%)',
              overlayColor: 'rgba(0,0,0,0.45)',
              height: '92vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            effect: 'fade-up',
            data: {
              html:
                '<h2 style="text-align:center">La carte du jour</h2><p style="text-align:center;opacity:.8">Renouvelée chaque mardi selon le marché.</p>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<img src="' +
                    U('1565299624946-b28f40a0ae38', 800) +
                    '" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover" /><h3>Entrée</h3><p><strong>Burrata des Pouilles, tomates anciennes, basilic.</strong></p><p style="color:#C65D3A;font-weight:700">14 €</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1414235077428-338989a2e8c0', 800) +
                    '" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover" /><h3>Plat</h3><p><strong>Cabillaud rôti, légumes du moment, beurre blanc.</strong></p><p style="color:#C65D3A;font-weight:700">26 €</p>',
                },
                {
                  html:
                    '<img src="' +
                    U('1486427944299-d1955d23e34d', 800) +
                    '" style="width:100%;border-radius:8px;aspect-ratio:4/3;object-fit:cover" /><h3>Dessert</h3><p><strong>Tarte tatin tiède, glace vanille bourbon.</strong></p><p style="color:#C65D3A;font-weight:700">10 €</p>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Voir le menu complet', href: '/menu' },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">Ce qu\'ils disent</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<blockquote>« Un coup de cœur. Carte courte mais chaque plat est juste. La sélection vin nature est top. »</blockquote><p>— Le Figaro Gastronomie, ★★★★½</p>',
                },
                {
                  html:
                    '<blockquote>« Le service est attentionné sans être pompeux. On revient. »</blockquote><p>— TimeOut Paris</p>',
                },
                {
                  html:
                    '<blockquote>« Le brunch dominical avec jazz live = pépite du 11e. »</blockquote><p>— @parisfoodie sur Instagram</p>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/menu',
        title: 'Menu',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'La carte',
              subtitle:
                'Cuisine de saison, ingrédients locaux. Mise à jour chaque mardi.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Entrées</h2><ul><li><strong>Burrata, tomates anciennes</strong> — 14 €</li><li><strong>Tartare de bœuf, jaune confit</strong> — 16 €</li><li><strong>Velouté de butternut, châtaignes grillées</strong> — 11 €</li><li><strong>Œuf parfait, poireau brûlé, vinaigrette truffe</strong> — 13 €</li></ul>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Plats</h2><ul><li><strong>Cabillaud rôti, légumes du moment</strong> — 26 €</li><li><strong>Magret de canard, purée de panais</strong> — 28 €</li><li><strong>Risotto cèpes, parmesan 24 mois</strong> — 22 €</li><li><strong>Bavette d\'aloyau, frites maison</strong> — 24 €</li></ul>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Desserts</h2><ul><li><strong>Tarte tatin tiède</strong> — 10 €</li><li><strong>Mi-cuit chocolat noir 70%</strong> — 11 €</li><li><strong>Mont-blanc revisité</strong> — 12 €</li><li><strong>Sélection fromages affineur</strong> — 14 €</li></ul>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Boissons</h2><p>Carte des vins nature 80 références, sélection sans alcool maison (kombucha, jus pressés). Demandez le sommelier.</p>',
            },
          },
        ],
      },
      {
        slug: '/evenements',
        title: 'Événements',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Soirées & événements',
              subtitle:
                'Brunchs jazz, dégustations vins, ateliers cuisine. Réservation obligatoire.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<p>Liste synchronisée depuis le module Événements (agenda automatique).</p>',
            },
          },
        ],
      },
      {
        slug: '/reservation',
        title: 'Réservation',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Réserver une table',
              subtitle:
                'Service midi 12h-14h30, soir 19h-22h30. Fermé dimanche soir et lundi.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<p>Formulaire de réservation connecté au système TheFork / OpenTable. Pour les groupes de +8 personnes : <a href="mailto:reservation@restaurant.fr">reservation@restaurant.fr</a> ou 01 23 45 67 89.</p>',
            },
          },
        ],
      },
      {
        slug: '/a-propos',
        title: 'À propos',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'L\'équipe',
              subtitle: 'Une cheffe, deux sous-chefs, un sommelier passionné.',
              bgImage: U('1414235077428-338989a2e8c0'),
              overlayColor: 'rgba(0,0,0,0.5)',
              height: '60vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Notre cheffe</h2><p><strong>Léa Marchand</strong> — passée par Le Clarence, Septime, puis 2 ans en Sicile avant d\'ouvrir ici en 2023. Sa signature : la simplicité qui n\'a l\'air de rien.</p><h2>Le sourcing</h2><p>Légumes : Joël Thiébault (Yvelines). Poissons : criée de Boulogne, livrée le matin même. Viande : maison Lassoulet (Béarn). Pain : Du Pain et des Idées (Paris 10e).</p><h2>Le sommelier</h2><p><strong>Marc T.</strong>, ex-Tour d\'Argent, spécialiste vins nature et oranges. La cave compte 80 références, 70% bio ou biodynamie.</p>',
            },
          },
        ],
      },
      {
        slug: '/contact',
        title: 'Contact & horaires',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Nous trouver', subtitle: 'On vous attend.' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<h3>Adresse</h3><p>42 rue Oberkampf<br>75011 Paris<br>Métro Parmentier (3) ou Saint-Ambroise (9)</p>',
                },
                {
                  html:
                    '<h3>Horaires</h3><p>Mardi → samedi<br>12h - 14h30 / 19h - 22h30<br>Dimanche : brunch 11h - 16h<br><strong>Fermé dimanche soir & lundi.</strong></p>',
                },
                {
                  html:
                    '<h3>Contact</h3><p>01 23 45 67 89<br>contact@restaurant.fr<br>@restaurant_trendy</p>',
                },
              ],
            },
          },
        ],
      },
    ],
    features: ['events', 'gallery', 'newsletter', 'forum', 'leads', 'testimonials'],
    seedData: {
      events: [
        {
          slug: 'brunch-dominical-jazz',
          title: 'Brunch dominical jazz — chaque dimanche',
          description:
            "Brunch buffet + trio jazz live de 12h à 14h. 35€/personne, demi-tarif -12 ans. Réservation obligatoire (45 couverts max).",
          startsAt: inDays(7),
          endsAt: inDays(7),
          location: '42 rue Oberkampf, 75011 Paris',
          coverImage: U('1559496417-e7f25cb247f3', 1200),
          category: 'brunch',
        },
        {
          slug: 'degustation-vins-nature',
          title: 'Dégustation vins nature — premier jeudi du mois',
          description:
            "Le sommelier présente 6 cuvées vins nature (3 blancs, 3 rouges), accompagnées de planches charcuterie/fromages. 45€/personne, 20 places.",
          startsAt: inDays(14),
          endsAt: inDays(14),
          location: '42 rue Oberkampf, 75011 Paris',
          coverImage: U('1510812431401-41d2bd2722f3', 1200),
          category: 'degustation',
        },
        {
          slug: 'atelier-cuisine-chef',
          title: 'Atelier cuisine — La cheffe vous apprend ses signatures',
          description:
            "3h en cuisine avec Léa. Vous repartez avec 3 plats cuisinés + les recettes papier signées. 95€/personne, 8 places max.",
          startsAt: inDays(21),
          endsAt: inDays(21),
          location: '42 rue Oberkampf, 75011 Paris',
          coverImage: U('1556909114-f6e7ad7d3136', 1200),
          category: 'atelier',
        },
      ],
      newsletters: [
        {
          subject: 'La nouvelle carte d\'automne est arrivée 🍂',
          bodyHtml:
            '<h1>Nouvelle carte automne</h1><p>Bonjour,</p><p>Ce mardi, on a renouvelé la carte. Au menu : courge musquée rôtie, joue de bœuf au vin de Bandol, mont-blanc revisité.</p><p>On a aussi 3 nouvelles cuvées nature à découvrir, dont un Pet Nat de Loire qui nous a tous mis d\'accord.</p><p>À très vite,<br>Léa & l\'équipe</p>',
          status: 'draft',
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 3. COACH / THÉRAPEUTE — sage, cream, soft
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_COACH: MarketplaceTemplate = {
  slug: 'coach-therapeute',
  name: 'Coach / Thérapeute — Sage & Crème',
  description:
    "Site coach professionnel : services, méthode, témoignages de transformation, réservation Calendly-like, blog ressources, cercles privés.",
  category: 'coach',
  thumbnailUrl: U('1545205597-3d9d02c29597', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['coach', 'thérapie', 'bien-être', 'booking', 'cercles', 'newsletter'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#7C8471',
      secondary: '#F5EDE3',
      accent: '#D4A5A5',
      fontHeading: 'Cormorant Garamond',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: {
          description: 'Coach professionnel — accompagnement individuel, couple, groupe.',
        },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            effect: 'fade-up',
            data: {
              title: 'Et si vous repreniez la main ?',
              subtitle:
                'Accompagnement individuel, couple, groupe. Méthode douce, résultats concrets.',
              ctaLabel: 'Premier rdv offert',
              ctaHref: '/reservation',
              bgImage: U('1545205597-3d9d02c29597'),
              bgGradient:
                'linear-gradient(180deg, #2c2e23 0%, #4a4f3e 100%)',
              overlayColor: 'rgba(45,55,40,0.45)',
              height: '88vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2 style="text-align:center">Ce que vous gagnez en 3 mois</h2>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="text-align:center;padding:24px"><div style="font-size:48px">🧭</div><h3>Clarté</h3><p>Vous savez ce que vous voulez vraiment. Plus de zigzag mental.</p></div>',
                },
                {
                  html:
                    '<div style="text-align:center;padding:24px"><div style="font-size:48px">🌿</div><h3>Apaisement</h3><p>Les boucles anxieuses descendent. Le sommeil revient. Le corps respire.</p></div>',
                },
                {
                  html:
                    '<div style="text-align:center;padding:24px"><div style="font-size:48px">⚡</div><h3>Action</h3><p>Vous passez à l\'acte sur ce que vous repoussez depuis 2 ans.</p></div>',
                },
              ],
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">Ma méthode</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<h3>1. Écoute profonde</h3><p>Une heure pour comprendre votre situation. Pas de jugement, pas de conseil prématuré. On pose les bases.</p>',
                },
                {
                  html:
                    '<h3>2. Cartographie</h3><p>On identifie les schémas qui se répètent, les ressources que vous avez déjà, et le cap.</p>',
                },
                {
                  html:
                    '<h3>3. Mise en mouvement</h3><p>Petits pas concrets entre les séances. Vous bougez, le monde vous répond, on ajuste.</p>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: {
              label: 'Premier appel découverte (gratuit)',
              href: '/reservation',
            },
          },
        ],
      },
      {
        slug: '/services',
        title: 'Services',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Trois formats, votre rythme.',
              subtitle:
                "Choisissez ce qui correspond à votre moment de vie.",
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(124,132,113,.3);border-radius:12px"><h3>Individuel</h3><p style="font-size:24px;font-weight:700;color:#7C8471">120 €/séance</p><p>1h, en cabinet ou visio. Idéal pour reprendre le cap perso ou pro.</p><p><strong>Pack 5 séances : 550 €</strong> (économie 50 €)</p></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:2px solid #7C8471;border-radius:12px;background:rgba(124,132,113,.08)"><h3>Couple</h3><p style="font-size:24px;font-weight:700;color:#7C8471">180 €/séance</p><p>1h30, en cabinet uniquement. Reprise du dialogue, sortie de l\'impasse.</p><p><strong>Pack 5 séances : 850 €</strong></p></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(124,132,113,.3);border-radius:12px"><h3>Groupe (cercle)</h3><p style="font-size:24px;font-weight:700;color:#7C8471">60 €/séance</p><p>2h, 6 personnes max. Thème par saison (anxiété, confiance, transitions).</p><p><strong>Cycle 8 séances : 420 €</strong></p></div>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/methode',
        title: 'Méthode',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Approche intégrative',
              subtitle:
                'TCC, Gestalt, ACT, neurosciences. Le bon outil au bon moment.',
              bgImage: U('1505751172876-fa1923c5c528'),
              overlayColor: 'rgba(45,55,40,0.55)',
              height: '60vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Formation</h2><p><strong>Psychologie clinique</strong> — Master 2 Paris Descartes, 2014.</p><p><strong>TCC</strong> — formation continue AFTCC, 2016-2018.</p><p><strong>Thérapie ACT</strong> — Russ Harris, 2020.</p><p><strong>Approche corporelle</strong> — méthode Feldenkrais, en cours.</p><h2>Cadre</h2><p>Membre AFTCC + supervision mensuelle. Secret professionnel strict. Cabinet à 5min métro Saint-Paul, accessible PMR.</p>',
            },
          },
        ],
      },
      {
        slug: '/temoignages',
        title: 'Témoignages',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Transformations',
              subtitle: 'Anonymisés, validés par les concerné·e·s.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<p>Témoignages synchronisés depuis le module Témoignages du tenant.</p>' },
          },
        ],
      },
      {
        slug: '/blog',
        title: 'Ressources',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Ressources gratuites',
              subtitle:
                'Articles, exercices, méditations guidées. Recevez les nouveautés par email.',
            },
          },
        ],
      },
      {
        slug: '/reservation',
        title: 'Réserver',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Réservons un premier échange.',
              subtitle:
                '30 minutes au téléphone, gratuit, sans engagement. On voit si on est alignés.',
            },
          },
          {
            type: 'embed',
            width: 'full',
            data: {
              html:
                '<div style="text-align:center;padding:40px;background:rgba(124,132,113,.08);border-radius:12px"><h3>Module booking</h3><p>Calendrier de disponibilités connecté à Calendly / Google Calendar.</p></div>',
            },
          },
        ],
      },
    ],
    features: ['booking', 'blog', 'articles', 'testimonials', 'newsletter', 'community', 'leads'],
    seedData: {
      articles: [
        {
          slug: '5-etapes-reprendre-confiance',
          title: '5 étapes pour reprendre confiance après une période difficile',
          excerpt:
            "Reconstruire la confiance, pas la performance. La nuance change tout.",
          bodyHtml:
            '<h2>1. Nommez ce qui s\'est passé</h2><p>Avec précision. Pas « ça a été dur ». « J\'ai été licenciée le 14 mars, j\'ai mal dormi 3 mois, j\'ai évité mes amis. » Les mots posent.</p><h2>2. Honorez le coût</h2><p>Ce que ça a coûté : énergie, sommeil, relations, image de soi. Reconnaître le coût, ce n\'est pas se complaire — c\'est valider l\'effort.</p><h2>3. Reprenez UN petit truc</h2><p>Un seul. Pas tout. La douche le matin. Une marche de 10 min. Un café avec une seule personne. La micro-victoire enclenche.</p><h2>4. Cartographiez les ressources</h2><p>Qui vous a aidé, même un peu ? Quel acte symbolique vous fait du bien ? Quelle activité oubliée vous rendait vivant·e ? On capitalise.</p><h2>5. Engagez un pas un peu plus grand</h2><p>Postuler à un truc qui fait peur. Reprendre la guitare. Tester un café de quartier. La confiance se reconstruit par l\'action, pas par la pensée.</p>',
          coverImage: U('1545205597-3d9d02c29597', 1200),
          tags: ['confiance', 'transitions', 'pratique'],
          authorName: 'Le cabinet',
          status: 'published',
        },
        {
          slug: 'routine-matinale-anti-stress',
          title: 'Routine matinale anti-stress en 12 minutes',
          excerpt:
            "Ce que la neuroscience dit du matin, et 4 micro-rituels qui marchent.",
          bodyHtml:
            '<h2>Pourquoi le matin compte</h2><p>Le cortisol monte naturellement entre 6h et 9h. Si vous le surchargez avec les notifs, vous payez toute la journée. L\'idée : créer 12 min de "tampon" entre le réveil et le monde.</p><h2>1. Pas de téléphone pendant 30 min après le réveil</h2><p>Ni mail ni Insta. Le téléphone reste loin du lit (chambre = sanctuaire).</p><h2>2. Eau + lumière naturelle</h2><p>Un grand verre d\'eau tiède. 5 min à la fenêtre ou dehors si possible. La lumière cale l\'horloge interne.</p><h2>3. 5 min de respiration carré</h2><p>4-4-4-4 (inspirer 4s, retenir 4s, expirer 4s, retenir 4s). Active le parasympathique. Gratuit, gratuit, gratuit.</p><h2>4. 3 intentions, écrites à la main</h2><p>Pas "to do". Intentions : "Aujourd\'hui je veux rester calme dans la réunion de 14h." Le cerveau s\'oriente.</p>',
          coverImage: U('1518709268805-4e9042af2176', 1200),
          tags: ['routine', 'stress', 'matin', 'pratique'],
          authorName: 'Le cabinet',
          status: 'published',
        },
      ],
      testimonials: [
        {
          authorName: 'Élodie M.',
          authorTitle: 'Cadre, 38 ans',
          quote:
            "Je suis venue après 6 mois d\'épuisement. En 4 mois, j\'ai retrouvé le sommeil et changé de poste. Le travail avec [coach] est doux mais costaud.",
          rating: 5,
          featured: true,
        },
        {
          authorName: 'Thomas & Léa',
          authorTitle: 'En couple depuis 7 ans',
          quote:
            "On a évité une rupture qu\'on regrette désormais d\'avoir failli faire. Les outils restent, on les utilise encore 1 an après.",
          rating: 5,
          featured: true,
        },
        {
          authorName: 'Sarah K.',
          authorTitle: 'Entrepreneure, 32 ans',
          quote:
            "Le cercle confiance m\'a sortie de l\'isolement post-burnout. Sentir que je n\'étais pas seule a tout changé.",
          rating: 5,
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 4. PODCAST — indigo, violet, neon night
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_PODCAST: MarketplaceTemplate = {
  slug: 'podcast-show',
  name: 'Podcast Show — Indigo Néon',
  description:
    "Site podcast immersif : player Spotify embed, épisodes filtrables par saison, transcriptions articles, sponsors, wall fans, newsletter.",
  category: 'podcast',
  thumbnailUrl: U('1478737270239-2f02b77fc618', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['podcast', 'audio', 'newsletter', 'sponsors', 'community'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#8B5CF6',
      secondary: '#1E1B4B',
      accent: '#EC4899',
      fontHeading: 'Space Grotesk',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: {
          description:
            'Podcast — conversations longues, sans bullshit, avec ceux qui font.',
        },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Le podcast qui prend le temps.',
              subtitle:
                'Conversations de 90 minutes avec ceux qui construisent vraiment.',
              ctaLabel: 'Écouter le dernier épisode',
              ctaHref: '/episodes',
              bgImage: U('1478737270239-2f02b77fc618'),
              floatingText: 'AUDIO',
              bgGradient:
                'linear-gradient(180deg, #1E1B4B 0%, #5B21B6 50%, #1E1B4B 100%)',
              overlayColor: 'rgba(30,27,75,0.55)',
              height: '92vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2 style="text-align:center">Le dernier épisode</h2><p style="text-align:center;opacity:.85">Disponible sur Spotify, Apple Podcasts, Deezer.</p>',
            },
          },
          {
            type: 'embed',
            width: 'full',
            data: {
              html:
                '<iframe style="border-radius:12px" src="https://open.spotify.com/embed/episode/4rOoJ6Egrf8K2IrywzwOMk" width="100%" height="232" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">Les 6 derniers épisodes</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:16px;background:rgba(139,92,246,.1);border-radius:12px;border:1px solid rgba(139,92,246,.3)"><span style="font-size:11px;opacity:.6">EP 47 · 1h 24min</span><h3 style="margin-top:6px">Construire en public sans burner — avec Léa, fondatrice solo</h3><p style="opacity:.8;font-size:14px">3 ans, 0 fundraising, 80k€/mois ARR. Le vrai prix de la croissance organique.</p></div>',
                },
                {
                  html:
                    '<div style="padding:16px;background:rgba(139,92,246,.1);border-radius:12px;border:1px solid rgba(139,92,246,.3)"><span style="font-size:11px;opacity:.6">EP 46 · 1h 38min</span><h3 style="margin-top:6px">La fin du SEO ? — débat avec deux growth seniors</h3><p style="opacity:.8;font-size:14px">L\'IA générative bouge tout. Ce qu\'on perd, ce qu\'on gagne, comment on s\'adapte.</p></div>',
                },
                {
                  html:
                    '<div style="padding:16px;background:rgba(139,92,246,.1);border-radius:12px;border:1px solid rgba(139,92,246,.3)"><span style="font-size:11px;opacity:.6">EP 45 · 1h 12min</span><h3 style="margin-top:6px">J\'ai quitté Google pour faire du freelance</h3><p style="opacity:.8;font-size:14px">2x plus libre, 1.5x mieux payée. Le récit honnête, y compris les premiers 6 mois durs.</p></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Voir tous les épisodes', href: '/episodes' },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<div style="padding:32px;background:rgba(139,92,246,.1);border-radius:16px;text-align:center"><h2>Newsletter hebdo</h2><p>Chaque vendredi : résumé de l\'épisode + 3 idées creuses à digérer le week-end.</p><p style="opacity:.7;font-size:14px">12 000 abonnés, 0 spam.</p></div>',
            },
          },
        ],
      },
      {
        slug: '/episodes',
        title: 'Épisodes',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Tous les épisodes',
              subtitle: 'Saison 4 en cours. Filtrez par thème ou saison.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<p>Liste des 47 épisodes synchronisée depuis le module Articles (transcriptions) du tenant.</p>' },
          },
        ],
      },
      {
        slug: '/a-propos',
        title: 'À propos',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'L\'hôte',
              subtitle: '10 ans dans la tech, 4 ans à poser les bonnes questions.',
              bgImage: U('1590602847861-f357a9332bbc'),
              overlayColor: 'rgba(30,27,75,0.6)',
              height: '60vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>L\'idée du podcast</h2><p>Les formats courts ont gagné. Les formats lents manquent. Ce podcast, c\'est 90 min minimum, avec UNE personne, qui a fait UN truc, qu\'on creuse vraiment. Pas de selfie. Pas de personal branding. De la matière.</p><h2>Audience</h2><p>12 000 abonnés newsletter. 45 000 écoutes par épisode en moyenne. Audience à 70% fondateurs, makers, créateurs indé. Top 50 podcast Tech France.</p><h2>Devenir sponsor</h2><p>2 slots par épisode (mid-roll). Audience qualifiée, payable par CB ou virement. <a href="/sponsors">Détails ici</a>.</p>',
            },
          },
        ],
      },
      {
        slug: '/sponsors',
        title: 'Sponsors',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Devenir partenaire',
              subtitle: '45k écoutes/épisode, audience tech & maker indé.',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(139,92,246,.3);border-radius:12px"><h3>Mid-roll</h3><p style="font-size:28px;font-weight:700;color:#8B5CF6">1 500 €/épisode</p><ul><li>60s lus par l\'hôte</li><li>Brief discuté à l\'avance</li><li>Position après 25min d\'écoute</li></ul></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:2px solid #8B5CF6;border-radius:12px;background:rgba(139,92,246,.08)"><h3>Pack 4 épisodes</h3><p style="font-size:28px;font-weight:700;color:#8B5CF6">5 000 €</p><ul><li>4 mid-rolls</li><li>1 mention newsletter</li><li>Logo footer site</li><li>Économie 1000€</li></ul></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(139,92,246,.3);border-radius:12px"><h3>Saison complète</h3><p style="font-size:28px;font-weight:700;color:#8B5CF6">12 000 €</p><ul><li>12 épisodes</li><li>Mentions newsletter</li><li>Logo top homepage</li><li>1 épisode "deep dive" produit</li></ul></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Demander le media kit', href: 'mailto:sponsors@podcast.fr' },
          },
        ],
      },
      {
        slug: '/newsletter',
        title: 'Newsletter',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Reçois les résumés hebdo',
              subtitle: 'Chaque vendredi, 5 min de lecture, 0 spam.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Ce qu\'il y a dedans</h2><ul><li>Résumé 3 takeaways de l\'épisode de la semaine</li><li>Une question creuse pour le week-end</li><li>Une ressource (livre, article, outil) qui m\'a marqué</li><li>Un coup de cœur d\'auditeur (parfois)</li></ul><p>Pas de pub déguisée. Les sponsors sont annoncés clairement.</p>',
            },
          },
        ],
      },
    ],
    features: ['articles', 'newsletter', 'community', 'partners', 'leads'],
    seedData: {
      articles: [
        {
          slug: 'ep-47-construire-en-public-sans-burner',
          title: 'EP 47 — Construire en public sans burner — avec Léa, fondatrice solo',
          excerpt:
            "3 ans, 0 fundraising, 80k€/mois ARR. Le vrai prix de la croissance organique.",
          bodyHtml:
            '<h2>Transcription complète (1h24)</h2><p><strong>[00:00]</strong> Bienvenue Léa. Tu lances ton produit en 2022, solo, sans levée. Aujourd\'hui 80k MRR. Premier réflexe : c\'est trop beau pour être vrai ?</p><p><strong>Léa [00:18]</strong> Ahah. Si ça l\'était, je serais pas en train de te parler à 22h après ma journée. On va dérouler honnêtement.</p><p><strong>[01:30]</strong> Le démarrage. Tu lances quoi exactement ?</p><p><strong>Léa</strong> Un SaaS B2B pour automatiser les rapprochements bancaires des comptables freelance. Niche, vraiment niche. C\'est ce qui m\'a sauvée.</p><p><em>... transcription complète disponible aux abonnés newsletter</em></p>',
          coverImage: U('1478737270239-2f02b77fc618', 1200),
          tags: ['build-in-public', 'bootstrapping', 'saas'],
          authorName: 'Hôte',
          status: 'published',
        },
        {
          slug: 'ep-46-fin-du-seo',
          title: 'EP 46 — La fin du SEO ? — débat avec deux growth seniors',
          excerpt:
            "L\'IA générative bouge tout. Ce qu\'on perd, ce qu\'on gagne, comment on s\'adapte.",
          bodyHtml:
            '<h2>Le débat (1h38)</h2><p>On reçoit Marc (15 ans SEO, ex-LeBonCoin) et Camille (growth lead scale-up). Spoiler : ils ne sont pas d\'accord.</p><p>3 thèses sur la table :</p><ol><li>Le SEO meurt — Google AI Overview tue les CTR</li><li>Le SEO mute — il faut produire pour les LLMs, pas Google</li><li>Le SEO devient luxe — moins de pages mais 10x mieux travaillées</li></ol><p>Et notre conclusion ? Spoiler dans la newsletter.</p>',
          coverImage: U('1432888622747-4eb9a8efeb07', 1200),
          tags: ['seo', 'ia', 'growth'],
          authorName: 'Hôte',
          status: 'published',
        },
        {
          slug: 'ep-45-quitte-google-pour-freelance',
          title: 'EP 45 — J\'ai quitté Google pour faire du freelance',
          excerpt:
            "2x plus libre, 1.5x mieux payée. Le récit honnête, y compris les premiers 6 mois durs.",
          bodyHtml:
            '<h2>L\'histoire</h2><p>Sophie, 31 ans, ex-Product Manager Google Paris. 6 mois après son départ, elle facture 1100€/jour, travaille 4 jours/semaine, gère 3 clients récurrents.</p><p>Mais les 6 premiers mois ont été durs. On les explore : doute, fluctuation de revenus, isolement, syndrome imposteur. Et comment elle s\'en est sortie.</p>',
          coverImage: U('1551434678-e076c223a692', 1200),
          tags: ['freelance', 'transition', 'tech'],
          authorName: 'Hôte',
          status: 'published',
        },
      ],
      newsletters: [
        {
          subject: 'EP 47 : 80k MRR en solo · 3 takeaways',
          bodyHtml:
            '<h1>Cette semaine : Léa, fondatrice solo, 80k MRR</h1><p>Salut,</p><p>Conversation longue avec Léa. 3 trucs qui m\'ont marqué :</p><ol><li><strong>Le pricing par valeur, pas par feature</strong>. Elle facture 89€/mois alors que les concurrents sont à 19€. Sa thèse : les comptables freelance veulent UN truc qui marche, pas le moins cher.</li><li><strong>Le burn-out évité de justesse</strong>. Janvier 2024, 70h/semaine, 38°C. Elle a coupé pendant 3 semaines, perdu 2 clients, et tout est reparti plus sainement.</li><li><strong>Le no-fundraising comme choix de vie</strong>. Pas une posture. Elle voulait pas du rythme VC. Aujourd\'hui elle gagne mieux qu\'à Doctolib en travaillant moins.</li></ol><p>Bonne semaine,<br>L\'hôte</p>',
          status: 'draft',
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 5. ASSOCIATION — institutional warm
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_ASSOCIATION: MarketplaceTemplate = {
  slug: 'association-cause',
  name: 'Association — Cause Engagée',
  description:
    "Site association militante : mission, chiffres clés, programmes, campagne de dons crowdfunding, agenda événements, membres, chapitres locaux.",
  category: 'asso',
  thumbnailUrl: U('1488521787991-ed7bbaae773c', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['association', 'don', 'crowdfunding', 'événements', 'membres', 'forum'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#2D5F3F',
      secondary: '#F5F5DC',
      accent: '#E63946',
      fontHeading: 'Lora',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: { description: 'Association engagée pour l\'environnement et la justice sociale.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Ensemble, on agit.',
              subtitle:
                'Depuis 2018, l\'association mène 3 programmes terrain. 12 000 bénéficiaires en 2025.',
              ctaLabel: 'Faire un don',
              ctaHref: '/don',
              bgImage: U('1488521787991-ed7bbaae773c'),
              floatingText: 'AGIR',
              bgGradient:
                'linear-gradient(180deg, #1a3024 0%, #2D5F3F 100%)',
              overlayColor: 'rgba(26,48,36,0.5)',
              height: '88vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">L\'impact en 2025</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#2D5F3F">12 000</div><p>Bénéficiaires directs</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#2D5F3F">340</div><p>Bénévoles actifs</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#2D5F3F">28</div><p>Chapitres locaux</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#2D5F3F">85%</div><p>Des fonds vont au terrain</p></div>' },
              ],
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">Nos 3 programmes</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(45,95,63,.3);border-radius:12px"><h3>🌱 Reforestation</h3><p>Plantation et entretien de 50 000 arbres/an en France métropolitaine. Partenariats avec ONF et collectivités.</p></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(45,95,63,.3);border-radius:12px"><h3>🏠 Accueil d\'urgence</h3><p>Hébergement temporaire pour 200 familles/an, accompagnement vers logement durable.</p></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(45,95,63,.3);border-radius:12px"><h3>📚 Éducation</h3><p>Soutien scolaire et formation pro pour 800 jeunes/an en territoires défavorisés.</p></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Soutenir la prochaine campagne', href: '/don' },
          },
        ],
      },
      {
        slug: '/actions',
        title: 'Nos actions',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Sur le terrain',
              subtitle: 'Trois programmes phares, des dizaines d\'actions ciblées.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>🌱 Reforestation</h2><p><strong>Depuis 2019</strong>, plantation de 50 000 arbres/an en France métropolitaine. Essences locales (chênes, hêtres, érables), suivi sur 5 ans avec relevés terrain trimestriels.</p><p>Partenariats actifs : Office National des Forêts, 12 collectivités. Bilan : 250 000 arbres plantés, 87% de reprise.</p>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>🏠 Accueil d\'urgence</h2><p>Hébergement temporaire 0-90 jours pour familles en rupture (violences conjugales, expulsions, sortie hôpital). Accompagnement social : santé, scolarité, accès droits, vers le logement durable.</p><p>3 maisons d\'accueil (Lyon, Marseille, Lille). 200 familles/an, 78% relogées durablement dans l\'année.</p>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>📚 Éducation</h2><p>Soutien scolaire gratuit pour 800 jeunes (collège-lycée) en QPV. Mentorat 1-à-1 avec étudiants/pros bénévoles. Stages d\'observation. Formations digitales gratuites pour 200 adultes/an.</p>',
            },
          },
        ],
      },
      {
        slug: '/don',
        title: 'Faire un don',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Votre don, multiplié.',
              subtitle: '66% déductibles. 85% des fonds vont directement au terrain.',
              bgImage: U('1542601906-0d2bbb7d7a5a'),
              overlayColor: 'rgba(26,48,36,0.55)',
              height: '60vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2 style="text-align:center">Campagne en cours : "100 000 arbres pour 2026"</h2><p style="text-align:center">Objectif : 100 000 € · Levé à ce jour : 38 450 € · 487 donateurs</p><div style="background:rgba(45,95,63,.15);height:14px;border-radius:999px;overflow:hidden;margin:24px auto;max-width:500px"><div style="background:#2D5F3F;height:100%;width:38.45%"></div></div>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="text-align:center;padding:24px;border:1px solid rgba(45,95,63,.3);border-radius:12px"><h3>20 €</h3><p style="font-size:14px;opacity:.8">soit 6,80€ après réduction d\'impôt</p><p><strong>10 arbres plantés et suivis sur 5 ans.</strong></p></div>',
                },
                {
                  html:
                    '<div style="text-align:center;padding:24px;border:2px solid #2D5F3F;border-radius:12px;background:rgba(45,95,63,.08)"><h3>50 €</h3><p style="font-size:14px;opacity:.8">soit 17€ après réduction d\'impôt</p><p><strong>1 nuit d\'hébergement d\'urgence + repas.</strong></p></div>',
                },
                {
                  html:
                    '<div style="text-align:center;padding:24px;border:1px solid rgba(45,95,63,.3);border-radius:12px"><h3>100 €</h3><p style="font-size:14px;opacity:.8">soit 34€ après réduction d\'impôt</p><p><strong>1 mois de mentorat scolaire pour un jeune.</strong></p></div>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/membre',
        title: 'Devenir membre',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Rejoindre l\'association',
              subtitle: 'Bénévole, adhérent·e, donateur·rice mensuel·le : choisissez votre engagement.',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<h3>Adhésion (30€/an)</h3><ul><li>Vote en AG</li><li>Newsletter mensuelle exclusive</li><li>Invitations événements internes</li><li>Reçu fiscal CERFA</li></ul>',
                },
                {
                  html:
                    '<h3>Bénévole terrain</h3><ul><li>2h/semaine ou 1 weekend/mois</li><li>Formation gratuite incluse</li><li>Communauté d\'engagé·e·s</li><li>Couverture assurance</li></ul>',
                },
                {
                  html:
                    '<h3>Mentor·e</h3><ul><li>1 jeune accompagné/an</li><li>Engagement 9 mois</li><li>Formation pédagogique</li><li>Suivi par référent·e</li></ul>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/agenda',
        title: 'Agenda',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Événements à venir',
              subtitle: 'AG, journées plantation, formations bénévoles, ventes solidaires.',
            },
          },
        ],
      },
      {
        slug: '/chapitres',
        title: 'Chapitres locaux',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: '28 chapitres en France', subtitle: 'Trouvez le vôtre sur la carte.' },
          },
          {
            type: 'embed',
            width: 'full',
            data: {
              html:
                '<div style="text-align:center;padding:40px;background:rgba(45,95,63,.08);border-radius:12px"><h3>Carte interactive</h3><p>Affichage des chapitres locaux via le module Map du tenant.</p></div>',
            },
          },
        ],
      },
      {
        slug: '/blog',
        title: 'Rapports & Blog',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Transparence & terrain',
              subtitle: 'Rapports annuels, billets terrain, prises de position.',
            },
          },
        ],
      },
      {
        slug: '/contact',
        title: 'Contact',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Nous contacter', subtitle: 'Presse, partenariats, info générale.' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<h3>Siège</h3><p>15 rue de la Solidarité<br>69001 Lyon<br>04 78 00 00 00</p>' },
                { html: '<h3>Email</h3><p>contact@association.fr<br>presse@association.fr<br>partenariats@association.fr</p>' },
                { html: '<h3>Suivez-nous</h3><p>@association_engagee<br>LinkedIn<br>YouTube</p>' },
              ],
            },
          },
        ],
      },
    ],
    features: ['events', 'crowdfunding', 'community', 'forum', 'partners', 'gallery', 'leads', 'articles'],
    seedData: {
      events: [
        {
          slug: 'ag-2026',
          title: 'Assemblée Générale 2026',
          description:
            "AG annuelle, ouverte aux adhérent·e·s. Bilan moral, financier, vote sur l\'orientation 2026-2028. Buffet apéritif après.",
          startsAt: inDays(45),
          endsAt: inDays(45),
          location: 'Maison des Associations, Lyon 3e',
          coverImage: U('1492684223066-81342ee5ff30', 1200),
          category: 'ag',
        },
        {
          slug: 'journee-plantation-printemps',
          title: 'Journée plantation printemps — Forêt de Fontainebleau',
          description:
            "Journée bénévole : 5 000 arbres à planter, encadrement ONF. RDV 9h gare RER, retour 18h. Repas inclus.",
          startsAt: inDays(60),
          endsAt: inDays(60),
          location: 'Forêt de Fontainebleau, point GPS communiqué J-7',
          coverImage: U('1488521787991-ed7bbaae773c', 1200),
          category: 'benevolat',
        },
      ],
      articles: [
        {
          slug: 'rapport-2025',
          title: 'Rapport d\'activité 2025 — chiffres et terrain',
          excerpt: '12 000 bénéficiaires, 250 000 arbres, 78% de relogement durable. Détails.',
          bodyHtml:
            '<h2>Programmes 2025</h2><p>L\'année 2025 a été marquée par une croissance forte de notre programme Accueil d\'urgence (+45%)...</p>',
          coverImage: U('1488521787991-ed7bbaae773c', 1200),
          tags: ['rapport', 'transparence'],
          authorName: 'Bureau',
          status: 'published',
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 6. ÉCOLE / FORMATION — bleu marine / or
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_ECOLE: MarketplaceTemplate = {
  slug: 'ecole-formation',
  name: 'École / Formation — Bleu Marine & Or',
  description:
    "Plateforme d\'apprentissage : catalogue cours, formateurs, RAG cerveau IA pour élèves, parrainage, JPO, témoignages anciens.",
  category: 'course',
  thumbnailUrl: U('1503676260728-1c00da094a0b', 600),
  free: false,
  priceCents: 4900,
  approved: true,
  tags: ['école', 'formation', 'cours', 'rag', 'mentors', 'shop'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#1E3A8A',
      secondary: '#D4AF37',
      accent: '#FBBF24',
      fontHeading: 'Merriweather',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: { description: 'École de formation pro — 6 parcours, IA tutrice, 94% de placement.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Apprendre, et placer.',
              subtitle:
                '6 parcours, formateurs experts en activité, IA tutrice 24/7. 94% de placement à 6 mois.',
              ctaLabel: 'Catalogue des cours',
              ctaHref: '/catalogue',
              bgImage: U('1503676260728-1c00da094a0b'),
              floatingText: 'APPRENDRE',
              bgGradient: 'linear-gradient(180deg, #1e3a8a 0%, #0f1f4d 100%)',
              overlayColor: 'rgba(15,31,77,0.5)',
              height: '90vh',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#D4AF37">2 400</div><p>Apprenant·e·s actif·ve·s</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#D4AF37">94%</div><p>Placement à 6 mois</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#D4AF37">120+</div><p>Formateurs en activité</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px;font-weight:900;color:#D4AF37">4.8/5</div><p>Satisfaction Trustpilot</p></div>' },
              ],
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">Trois parcours phares</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(212,175,55,.3);border-radius:12px"><span style="background:#1E3A8A;color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">BOOTCAMP</span><h3>Développeur Full-Stack</h3><p>16 semaines · 3 promos/an<br>Placement 96%<br><strong>5 900 €</strong> (financement CPF possible)</p></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:2px solid #D4AF37;border-radius:12px;background:rgba(212,175,55,.06)"><span style="background:#D4AF37;color:#1E3A8A;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">STAR</span><h3>Product Manager</h3><p>12 semaines · 4 promos/an<br>Placement 94%<br><strong>4 900 €</strong> (financement CPF possible)</p></div>',
                },
                {
                  html:
                    '<div style="padding:24px;border:1px solid rgba(212,175,55,.3);border-radius:12px"><span style="background:#1E3A8A;color:white;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700">NOUVEAU</span><h3>AI Engineer</h3><p>20 semaines · 2 promos/an<br>1ère promo : 12 placements/15<br><strong>7 900 €</strong></p></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Voir le catalogue complet', href: '/catalogue' },
          },
        ],
      },
      {
        slug: '/catalogue',
        title: 'Catalogue',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Tous nos cours', subtitle: 'Filtrez par niveau, domaine, durée.' },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<p>Liste des 30+ cours synchronisée depuis le module Shop (chaque cours = un produit).</p>' },
          },
        ],
      },
      {
        slug: '/formateurs',
        title: 'Formateurs',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: '120 formateurs en activité',
              subtitle: 'Pas de prof à plein temps — que des pros qui enseignent en plus.',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="padding:16px;text-align:center"><img src="' + U('1551434678-e076c223a692', 600) + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover" /><h3>Marc D.</h3><p style="opacity:.7;font-size:14px">Senior Eng @Doctolib · 12 ans Backend</p></div>',
                },
                {
                  html:
                    '<div style="padding:16px;text-align:center"><img src="' + U('1554080353-321e452ccf19', 600) + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover" /><h3>Sophie L.</h3><p style="opacity:.7;font-size:14px">Head of Product @Qonto · Ex-Google</p></div>',
                },
                {
                  html:
                    '<div style="padding:16px;text-align:center"><img src="' + U('1556761175-5973dc0f32e7', 600) + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover" /><h3>Karim B.</h3><p style="opacity:.7;font-size:14px">Lead AI @Mistral · PhD ML</p></div>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/ressources',
        title: 'Ressources IA',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Le cerveau IA de l\'école',
              subtitle:
                '24/7, votre tutrice IA répond à toutes vos questions de cours. Documents, transcriptions vidéo, code-source : tout est indexé.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Comment ça marche</h2><ul><li><strong>Indexation continue</strong> — chaque cours, chaque vidéo, chaque code-source est ajouté au RAG.</li><li><strong>Réponses sourcées</strong> — l\'IA cite toujours le cours et le timestamp d\'où vient l\'info.</li><li><strong>Privé</strong> — vos conversations restent confidentielles. Aucun apprenant ne voit les questions des autres.</li></ul>',
            },
          },
        ],
      },
      {
        slug: '/parrainage',
        title: 'Parrainage',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Mentor / mentoré·e',
              subtitle:
                'Chaque apprenant·e est mis·e en lien avec un·e ancien·ne sur le même parcours.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Format</h2><p>1h/mois pendant la formation, puis 30min/mois pendant 6 mois après. Le mentor répond aux questions concrètes : "comment je négocie cette offre", "ce projet est-il représentatif du quotidien", "comment je passe les techniques".</p>',
            },
          },
        ],
      },
      {
        slug: '/temoignages',
        title: 'Anciens',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Ils sont passés par là',
              subtitle: 'Promo 2023, 2024, 2025. Témoignages vidéo + texte.',
            },
          },
        ],
      },
      {
        slug: '/contact',
        title: 'JPO & Contact',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Journées Portes Ouvertes',
              subtitle: 'Tous les 1ers mercredi du mois, 18h-21h. Présentiel + visio.',
            },
          },
        ],
      },
    ],
    features: ['articles', 'shop', 'community', 'testimonials', 'events', 'rag', 'leads', 'booking'],
    seedData: {
      products: [
        { slug: 'cours-dev-fullstack', name: 'Bootcamp Développeur Full-Stack', description: '16 semaines, 3 promos/an. Plein temps, présentiel ou hybride.', priceCents: 590000, currency: 'EUR', images: [U('1517694712202-14dd9538aa97', 800)], inventory: 30, category: 'bootcamp' },
        { slug: 'cours-pm', name: 'Bootcamp Product Manager', description: '12 semaines, 4 promos/an. Pour développeurs/designers qui veulent passer côté produit.', priceCents: 490000, currency: 'EUR', images: [U('1552581234-26160f608093', 800)], inventory: 25, category: 'bootcamp' },
        { slug: 'cours-ai-engineer', name: 'Bootcamp AI Engineer', description: '20 semaines, 2 promos/an. ML, LLM, MLOps, déploiement.', priceCents: 790000, currency: 'EUR', images: [U('1620712943543-bcc4688e7485', 800)], inventory: 15, category: 'bootcamp' },
        { slug: 'cours-data-analyst', name: 'Bootcamp Data Analyst', description: '10 semaines, plein temps. Python, SQL, dataviz, business cases.', priceCents: 380000, currency: 'EUR', images: [U('1551288049-bebda4e38f71', 800)], inventory: 20, category: 'bootcamp' },
        { slug: 'cours-ux-design', name: 'Bootcamp UX Design', description: '12 semaines. Research, prototyping, design system, portfolio.', priceCents: 420000, currency: 'EUR', images: [U('1561070791-2526d30994b8', 800)], inventory: 22, category: 'bootcamp' },
        { slug: 'cours-cybersecurity', name: 'Bootcamp Cybersécurité', description: '18 semaines. Defensive + offensive, certif eJPT préparée.', priceCents: 690000, currency: 'EUR', images: [U('1550751827-4bd374c3f58b', 800)], inventory: 18, category: 'bootcamp' },
      ],
      testimonials: [
        { authorName: 'Léa T.', authorTitle: 'Promo 2024 — Dev Full-Stack, junior @Qonto', quote: "Reconversion à 32 ans, embauchée 3 semaines après la fin. Le mentorat post-formation a fait la différence.", rating: 5, featured: true },
        { authorName: 'Mehdi A.', authorTitle: 'Promo 2024 — PM, embauché @BlaBlaCar', quote: "Le bootcamp PM est intense mais le ratio prof:élève est top. Et les vrais cas issus de scale-ups changent tout.", rating: 5, featured: true },
      ],
      events: [
        {
          slug: 'jpo-fevrier',
          title: 'Journée Portes Ouvertes — mercredi 4',
          description: 'Présentation des 6 parcours, rencontre avec des formateurs et anciens. Visite des locaux. 18h-21h.',
          startsAt: inDays(5),
          endsAt: inDays(5),
          location: 'Campus Paris 11e',
          category: 'jpo',
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 7. AGENCE CRÉATIVE — bold minimal
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_AGENCE: MarketplaceTemplate = {
  slug: 'agence-creative',
  name: 'Agence Créative — Bold Yellow',
  description:
    "Site agence créative bold : case studies parallax, wall clients, équipe, Lab R&D, recrutement, brief form entrant.",
  category: 'agency',
  thumbnailUrl: U('1542744173-8e7e53415bb0', 600),
  free: false,
  priceCents: 9900,
  approved: true,
  tags: ['agency', 'design', 'case-studies', 'team', 'recrutement', 'leads'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#0a0a0a',
      secondary: '#FFFFFF',
      accent: '#F1FF4D',
      fontHeading: 'Space Grotesk',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: { description: 'Agence créative indépendante — branding, digital, motion. Paris.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'On fait des trucs.\nDe bons trucs.',
              subtitle:
                'Studio créatif indépendant · Branding · Digital · Motion · Paris',
              ctaLabel: 'Voir nos cases',
              ctaHref: '/cases',
              bgImage: U('1542744173-8e7e53415bb0'),
              floatingText: 'STUDIO',
              bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%)',
              overlayColor: 'rgba(0,0,0,0.45)',
              height: '95vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2 style="text-align:center;color:#F1FF4D">3 cases qu\'on aime montrer</h2>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div><img src="' + U('1561070791-2526d30994b8', 800) + '" style="width:100%;aspect-ratio:4/5;object-fit:cover" /><h3 style="margin-top:12px">Rebrand Yuka</h3><p>+340% notoriété en 6 mois. Nouveau logo, nouveau ton, nouvelle stack.</p></div>',
                },
                {
                  html:
                    '<div><img src="' + U('1574717024653-ccaeb1cdcdc4', 800) + '" style="width:100%;aspect-ratio:4/5;object-fit:cover" /><h3 style="margin-top:12px">Site BackMarket</h3><p>+22% conversion. Refonte UX complète, design system maison, 4 langues.</p></div>',
                },
                {
                  html:
                    '<div><img src="' + U('1517694712202-14dd9538aa97', 800) + '" style="width:100%;aspect-ratio:4/5;object-fit:cover" /><h3 style="margin-top:12px">Identité Sorare</h3><p>Wordmark, motion logo, guidelines 80 pages, kit social cross-réseaux.</p></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Voir les 12 cases', href: '/cases' },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">Avec qui on a bossé</h2><p style="text-align:center;opacity:.7">Yuka · BackMarket · Sorare · Doctolib · Qonto · Alan · Pennylane · BlaBlaCar · Mirakl · Aircall · Spendesk · Welcome to the Jungle</p>' },
          },
        ],
      },
      {
        slug: '/cases',
        title: 'Case studies',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Toutes nos missions', subtitle: '12 cases · 4 ans · 0 NDA cachant le bullshit.' },
          },
        ],
      },
      {
        slug: '/equipe',
        title: 'Équipe',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: '12 humains, 3 chats de bureau.',
              subtitle: 'Designers, devs, motion, strats. Pas de junior pour les pitches, pas de senior absent.',
              bgImage: U('1517694712202-14dd9538aa97'),
              overlayColor: 'rgba(0,0,0,0.5)',
              height: '60vh',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<div style="text-align:center"><img src="' + U('1554080353-321e452ccf19', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Léa M.</h3><p style="opacity:.7;font-size:13px">Co-fondatrice · Direction artistique</p></div>' },
                { html: '<div style="text-align:center"><img src="' + U('1551434678-e076c223a692', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Tom B.</h3><p style="opacity:.7;font-size:13px">Co-fondateur · Tech lead</p></div>' },
                { html: '<div style="text-align:center"><img src="' + U('1556761175-5973dc0f32e7', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Sam K.</h3><p style="opacity:.7;font-size:13px">Stratégie de marque</p></div>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<div style="text-align:center"><img src="' + U('1544552866-6d72c7b18fff', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Anna L.</h3><p style="opacity:.7;font-size:13px">Designer · UI</p></div>' },
                { html: '<div style="text-align:center"><img src="' + U('1483985988355-763728e1935b', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Marc D.</h3><p style="opacity:.7;font-size:13px">Motion designer</p></div>' },
                { html: '<div style="text-align:center"><img src="' + U('1492684223066-81342ee5ff30', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Yuki T.</h3><p style="opacity:.7;font-size:13px">Dev front · React</p></div>' },
              ],
            },
          },
        ],
      },
      {
        slug: '/services',
        title: 'Services',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Trois pôles', subtitle: 'On choisit nos missions. Pas de tout-faire mou.' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<h2 style="color:#F1FF4D">Branding</h2><p>Identité visuelle, stratégie de marque, naming, guidelines, déclinaisons.</p><p style="opacity:.7;font-size:14px">Budget moyen : 40k - 120k €</p>',
                },
                {
                  html:
                    '<h2 style="color:#F1FF4D">Digital</h2><p>Site, app, design system, dashboards. Stack React/Next, design tokens.</p><p style="opacity:.7;font-size:14px">Budget moyen : 60k - 250k €</p>',
                },
                {
                  html:
                    '<h2 style="color:#F1FF4D">Motion</h2><p>Logo animé, vidéos produit, social cuts, motion graphics campaign.</p><p style="opacity:.7;font-size:14px">Budget moyen : 15k - 80k €</p>',
                },
              ],
            },
          },
        ],
      },
      {
        slug: '/lab',
        title: 'Lab',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Le Lab',
              subtitle: 'R&D, expérimentations, side-projects. Ce qu\'on bricole quand on n\'est pas en mission.',
            },
          },
        ],
      },
      {
        slug: '/carrieres',
        title: 'Carrières',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'On recrute (parfois).',
              subtitle: 'On ouvre 2-3 postes par an. Pas de open candidature, pas de RH.',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Postes ouverts</h2><ul><li><strong>Senior Designer Produit</strong> (Paris ou remote France) — CDI, 65-90k</li><li><strong>Lead Motion Designer</strong> (Paris) — CDI, 70-95k</li></ul><p>Écris-nous : <a href="mailto:join@agence.fr">join@agence.fr</a>. Mets ton portfolio, dis-nous pourquoi nous.</p>',
            },
          },
        ],
      },
      {
        slug: '/contact',
        title: 'Brief',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Envoie ton brief.',
              subtitle: 'On répond sous 48h. Si on prend la mission, premier call sous 1 semaine.',
              bgImage: U('1542744173-8e7e53415bb0'),
              overlayColor: 'rgba(0,0,0,0.65)',
              height: '50vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h3>Ce qu\'on veut savoir</h3><ul><li>Ta boîte, ton produit, ton stade</li><li>Le problème à résoudre (pas la solution déjà décidée)</li><li>Budget approximatif (oui même approximatif)</li><li>Deadline réaliste</li></ul><p>Email direct : <strong>hello@agence.fr</strong></p>',
            },
          },
        ],
      },
    ],
    features: ['articles', 'leads', 'community', 'newsletter', 'testimonials', 'partners'],
    seedData: {
      articles: [
        {
          slug: 'case-yuka-rebrand',
          title: 'Case · Yuka — rebrand 2024',
          excerpt: '+340% notoriété en 6 mois. Le full process en 12 minutes de lecture.',
          bodyHtml: '<h2>Le contexte</h2><p>Yuka voulait passer de "app utilitaire" à "marque de confiance grand public". On a refondu logo, ton, charte, kit social...</p>',
          coverImage: U('1561070791-2526d30994b8', 1200),
          tags: ['case', 'branding', 'food-tech'],
          authorName: 'Léa M.',
          status: 'published',
        },
        {
          slug: 'case-backmarket-refonte',
          title: 'Case · BackMarket — refonte UX 2024',
          excerpt: '+22% conversion · -34% abandon panier · design system maison.',
          bodyHtml: '<h2>Le brief</h2><p>BackMarket en 4 langues, 8 marchés, friction énorme sur le checkout...</p>',
          coverImage: U('1574717024653-ccaeb1cdcdc4', 1200),
          tags: ['case', 'ux', 'e-commerce'],
          authorName: 'Tom B.',
          status: 'published',
        },
        {
          slug: 'case-sorare-identite',
          title: 'Case · Sorare — identité visuelle 2023',
          excerpt: 'Wordmark, motion logo, guidelines 80 pages.',
          bodyHtml: '<h2>Le challenge</h2><p>Une marque tech, mais qui doit parler aux fans de foot...</p>',
          coverImage: U('1517694712202-14dd9538aa97', 1200),
          tags: ['case', 'branding', 'web3'],
          authorName: 'Sam K.',
          status: 'published',
        },
      ],
      testimonials: [
        { authorName: 'Lucas M.', authorTitle: 'Head of Brand · Yuka', quote: "On a vu le travail avant la presse. C\'est rare et précieux. Et le résultat a fait son chemin tout seul.", rating: 5, featured: true },
        { authorName: 'Élise R.', authorTitle: 'CPO · BackMarket', quote: "L\'équipe a vraiment compris notre stack tech. Pas de jolis Figma déconnectés de la réalité.", rating: 5, featured: true },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 8. IMMOBILIER — trust premium
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_IMMOBILIER: MarketplaceTemplate = {
  slug: 'immobilier-agence',
  name: 'Immobilier — Agence Premium',
  description:
    "Site agence immo : recherche listings, fiches détaillées avec map, estimation gratuite, simulateur crédit, agents, blog conseils, visites events.",
  category: 'real-estate',
  thumbnailUrl: U('1502672260266-1c1ef2d93688', 600),
  free: false,
  priceCents: 9900,
  approved: true,
  tags: ['immobilier', 'listings', 'map', 'leads', 'estimation', 'crédit'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#0F4C81',
      secondary: '#F8F8F8',
      accent: '#2A2A2A',
      fontHeading: 'Inter',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: { description: 'Agence immobilière indépendante Paris & Île-de-France. Achat, vente, location.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Trouvez chez vous.',
              subtitle:
                '180 biens en portefeuille · Estimation gratuite en 48h · Accompagnement complet jusqu\'au notaire.',
              ctaLabel: 'Voir les annonces',
              ctaHref: '/annonces',
              bgImage: U('1502672260266-1c1ef2d93688'),
              floatingText: 'CHEZ VOUS',
              bgGradient: 'linear-gradient(180deg, #0a2540 0%, #0F4C81 100%)',
              overlayColor: 'rgba(10,37,64,0.5)',
              height: '92vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<div style="max-width:600px;margin:0 auto;padding:24px;background:#fff;color:#0a2540;border-radius:12px"><h3 style="margin-top:0">Recherche rapide</h3><p style="display:flex;gap:8px;flex-wrap:wrap"><span style="padding:8px 16px;background:#f0f4f8;border-radius:999px">Type : Appartement</span><span style="padding:8px 16px;background:#f0f4f8;border-radius:999px">Ville : Paris</span><span style="padding:8px 16px;background:#f0f4f8;border-radius:999px">Budget : 400k - 700k</span></p></div>',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">3 biens du moment</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><img src="' + U('1564013799919-ab600027ffc6', 800) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover" /><div style="padding:16px;color:#0a2540"><span style="font-size:11px;background:#0F4C81;color:white;padding:2px 8px;border-radius:4px">EXCLUSIVITÉ</span><h3 style="margin:8px 0">Appartement 3P · Paris 11e</h3><p style="margin:0;font-size:14px">72m² · 2 chambres · 3e étage avec asc.</p><p style="font-size:24px;font-weight:700;color:#0F4C81;margin:8px 0 0">685 000 €</p></div></div>',
                },
                {
                  html:
                    '<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><img src="' + U('1568605114967-8130f3a36994', 800) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover" /><div style="padding:16px;color:#0a2540"><h3 style="margin:8px 0">Maison · Boulogne</h3><p style="margin:0;font-size:14px">140m² · 4 chambres · jardin 80m²</p><p style="font-size:24px;font-weight:700;color:#0F4C81;margin:8px 0 0">1 250 000 €</p></div></div>',
                },
                {
                  html:
                    '<div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden"><img src="' + U('1486325212027-8081e485255e', 800) + '" style="width:100%;aspect-ratio:4/3;object-fit:cover" /><div style="padding:16px;color:#0a2540"><span style="font-size:11px;background:#dc2626;color:white;padding:2px 8px;border-radius:4px">BAISSE PRIX</span><h3 style="margin:8px 0">Loft · Bagnolet</h3><p style="margin:0;font-size:14px">95m² · 1 chambre · terrasse 25m²</p><p style="font-size:24px;font-weight:700;color:#0F4C81;margin:8px 0 0">520 000 €</p></div></div>',
                },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Faire estimer mon bien (gratuit)', href: '/vendre' },
          },
        ],
      },
      {
        slug: '/annonces',
        title: 'Annonces',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: '180 biens disponibles', subtitle: 'Filtrez par prix, surface, ville, type, m².' },
          },
          {
            type: 'embed',
            width: 'full',
            data: {
              html:
                '<div style="padding:40px;background:#f0f4f8;border-radius:12px;text-align:center;color:#0a2540"><h3>Carte interactive 180 biens</h3><p>Affichage liste + carte via module Map.</p></div>',
            },
          },
        ],
      },
      {
        slug: '/vendre',
        title: 'Vendre',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Estimation gratuite, 48h.',
              subtitle: 'Visite + comparables marché + prix recommandé. Sans engagement.',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<div style="text-align:center"><div style="font-size:48px">📞</div><h3>1. Vous nous appelez</h3><p>Premier échange 15 min. On comprend votre projet.</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px">🏠</div><h3>2. On vient visiter</h3><p>Visite du bien, photos, métrés. 1h sur place.</p></div>' },
                { html: '<div style="text-align:center"><div style="font-size:48px">📊</div><h3>3. Estimation chiffrée</h3><p>Rapport écrit + comparables vendus. Sous 48h.</p></div>' },
              ],
            },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Demander une estimation', href: '/contact' },
          },
        ],
      },
      {
        slug: '/acheter',
        title: 'Acheter',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Acheter sereinement', subtitle: 'Guide acheteur + simulateur crédit + accompagnement notaire.' },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Simulateur crédit</h2><p>Outil intégré : capacité d\'emprunt, mensualité, durée, taux moyens marché en temps réel.</p><h2>Guide acheteur (PDF)</h2><p>32 pages, mis à jour 2026 : étapes, frais, fiscalité, négociation, pièges. <a href="#">Télécharger gratuitement</a>.</p>',
            },
          },
        ],
      },
      {
        slug: '/agents',
        title: 'Agents',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: '8 conseillers expérimentés', subtitle: 'Tous diplômés BTS Pro Immo · 10 ans d\'ancienneté moyenne.' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<div style="text-align:center"><img src="' + U('1551434678-e076c223a692', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Marc D.</h3><p style="opacity:.7;font-size:14px">Directeur · Spécialiste Paris 11/12</p></div>' },
                { html: '<div style="text-align:center"><img src="' + U('1554080353-321e452ccf19', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Sophie L.</h3><p style="opacity:.7;font-size:14px">Spécialiste banlieue ouest</p></div>' },
                { html: '<div style="text-align:center"><img src="' + U('1556761175-5973dc0f32e7', 600) + '" style="width:140px;height:140px;border-radius:50%;object-fit:cover" /><h3>Karim B.</h3><p style="opacity:.7;font-size:14px">Spécialiste investissement locatif</p></div>' },
              ],
            },
          },
        ],
      },
      {
        slug: '/blog',
        title: 'Conseils',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Le blog conseils', subtitle: 'Marché, fiscalité, négociation, travaux. Articles longs et chiffrés.' },
          },
        ],
      },
    ],
    features: ['map', 'articles', 'leads', 'events', 'testimonials', 'shop'],
    seedData: {
      products: [
        { slug: 'appart-paris11-72m', name: 'Appartement 3P · Paris 11e', description: '72m² · 2 chambres · 3e étage avec ascenseur · refait à neuf · DPE C', priceCents: 68500000, currency: 'EUR', images: [U('1564013799919-ab600027ffc6', 800)], inventory: 1, category: 'appartement' },
        { slug: 'maison-boulogne-140m', name: 'Maison · Boulogne-Billancourt', description: '140m² · 4 chambres · jardin 80m² · proche écoles · DPE B', priceCents: 125000000, currency: 'EUR', images: [U('1568605114967-8130f3a36994', 800)], inventory: 1, category: 'maison' },
        { slug: 'loft-bagnolet-95m', name: 'Loft · Bagnolet', description: '95m² · 1 chambre · terrasse 25m² · plafonds 4m · DPE D', priceCents: 52000000, currency: 'EUR', images: [U('1486325212027-8081e485255e', 800)], inventory: 1, category: 'loft' },
      ],
      articles: [
        { slug: 'guide-vendre-2026', title: 'Vendre en 2026 — les 7 leviers pour faire monter le prix', excerpt: 'Marché en correction, mais ces 7 actions font 5-15% de différence.', bodyHtml: '<p>Article long de référence...</p>', coverImage: U('1564013799919-ab600027ffc6', 1200), tags: ['conseils', 'vendre'], authorName: 'Marc D.', status: 'published' },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 9. E-COMMERCE — black & white & hot pink
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_ECOMMERCE: MarketplaceTemplate = {
  slug: 'ecommerce-modern',
  name: 'E-commerce — Modern Minimal',
  description:
    "Boutique en ligne moderne : grid filtrable produits + variants couleur/taille, reviews, cross-sell, panier, checkout, blog, forum clients.",
  category: 'ecommerce',
  thumbnailUrl: U('1607082348824-0a96f2a4b9da', 600),
  free: false,
  priceCents: 9900,
  approved: true,
  tags: ['ecommerce', 'shop', 'variants', 'reviews', 'newsletter', 'community'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#0a0a0a',
      secondary: '#FFFFFF',
      accent: '#FF1F8F',
      fontHeading: 'Inter',
      fontBody: 'Inter',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: { description: 'Boutique mode contemporaine — pièces signature, éditions limitées, made in Portugal.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'AW26 · Drop 03',
              subtitle: 'Nouvelle collection. Édition limitée. Production Portugal.',
              ctaLabel: 'Découvrir',
              ctaHref: '/shop',
              bgImage: U('1483985988355-763728e1935b'),
              floatingText: 'AW26',
              bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #1f1f1f 100%)',
              overlayColor: 'rgba(0,0,0,0.4)',
              height: '95vh',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<div><img src="' + U('1556906781-9a412961c28c', 800) + '" style="width:100%;aspect-ratio:3/4;object-fit:cover" /><h3 style="margin-top:12px">Manteau Oversize</h3><p style="color:#FF1F8F;font-weight:700">295 €</p></div>',
                },
                {
                  html:
                    '<div><img src="' + U('1487412947147-5cebf100ffc2', 800) + '" style="width:100%;aspect-ratio:3/4;object-fit:cover" /><h3 style="margin-top:12px">Pull Cachemire</h3><p style="color:#FF1F8F;font-weight:700">189 €</p></div>',
                },
                {
                  html:
                    '<div><img src="' + U('1515562141207-7a88fb7ce338', 800) + '" style="width:100%;aspect-ratio:3/4;object-fit:cover" /><h3 style="margin-top:12px">Boucle d\'oreille Gold</h3><p style="color:#FF1F8F;font-weight:700">85 €</p></div>',
                },
              ],
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center">★★★★★ 2 800 avis</h2><p style="text-align:center;opacity:.8;max-width:600px;margin:0 auto">"Qualité au-dessus du prix. Coupes parfaites. Livraison ultra rapide."</p>' },
          },
          {
            type: 'cta',
            width: 'full',
            data: { label: 'Voir la boutique', href: '/shop' },
          },
        ],
      },
      {
        slug: '/shop',
        title: 'Boutique',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Tous les produits', subtitle: 'Filtrez par catégorie, taille, couleur, prix.' },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<p>Grid produits synchronisée depuis le module Shop du tenant (Product).</p>' },
          },
        ],
      },
      {
        slug: '/blog',
        title: 'Blog',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: { title: 'Lookbook & coulisses', subtitle: 'Inspirations, savoir-faire, regards.' },
          },
        ],
      },
      {
        slug: '/contact',
        title: 'Contact',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Service client',
              subtitle: 'Réponse sous 24h ouvrées. Retours gratuits 30 jours.',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<h3>Email</h3><p>contact@boutique.fr</p>' },
                { html: '<h3>Téléphone</h3><p>01 23 45 67 89<br>Lun-Ven 10h-18h</p>' },
                { html: '<h3>Réseaux</h3><p>@boutique<br>TikTok @boutique</p>' },
              ],
            },
          },
        ],
      },
    ],
    features: ['shop', 'dropshipping', 'testimonials', 'newsletter', 'community', 'articles', 'forum'],
    seedData: {
      products: [
        {
          slug: 'manteau-oversize-aw26',
          name: 'Manteau Oversize AW26',
          description: 'Laine et cachemire 80/20, doublure 100% viscose. Coupe oversize, ceinture amovible. Production Porto.',
          priceCents: 29500,
          currency: 'EUR',
          images: [U('1556906781-9a412961c28c', 800)],
          inventory: 24,
          category: 'manteaux',
        },
        {
          slug: 'pull-cachemire-col-rond',
          name: 'Pull Cachemire col rond',
          description: '100% cachemire Mongolie, 2 fils. 6 coloris. Maille 18 jauges. Lavage main ou pressing.',
          priceCents: 18900,
          currency: 'EUR',
          images: [U('1487412947147-5cebf100ffc2', 800)],
          inventory: 60,
          category: 'pulls',
        },
        {
          slug: 'boucles-oreille-gold',
          name: 'Boucles d\'oreille mini hoops Gold',
          description: 'Argent 925 plaqué or 18 carats. Fait main Lisbonne. Garantie 2 ans non-allergique.',
          priceCents: 8500,
          currency: 'EUR',
          images: [U('1515562141207-7a88fb7ce338', 800)],
          inventory: 80,
          category: 'bijoux',
        },
        {
          slug: 'chemise-popline-blanche',
          name: 'Chemise popline blanche',
          description: 'Popline 120 fils, coton GOTS. Coupe relaxed, col français. Production Porto.',
          priceCents: 11900,
          currency: 'EUR',
          images: [U('1485518882345-15568b007407', 800)],
          inventory: 45,
          category: 'chemises',
        },
        {
          slug: 'jean-droit-brut',
          name: 'Jean droit brut Selvedge',
          description: 'Denim Kuroki Selvedge 14oz, Japon. Coupe droite mid-rise. Pas de stretch.',
          priceCents: 16500,
          currency: 'EUR',
          images: [U('1542272604-787c3835535d', 800)],
          inventory: 35,
          category: 'jeans',
        },
        {
          slug: 'sneakers-cuir-blanc',
          name: 'Sneakers cuir blanc',
          description: 'Cuir pleine fleur tanné Italie. Semelle Vibram. Production Marche, Italie.',
          priceCents: 22500,
          currency: 'EUR',
          images: [U('1542291026-7eec264c27ff', 800)],
          inventory: 28,
          category: 'chaussures',
        },
      ],
      testimonials: [
        { authorName: 'Camille T.', authorTitle: 'Cliente depuis 2 ans', quote: "La qualité parle d\'elle-même. Et le SAV répond en 2h, c\'est incroyable.", rating: 5, featured: true },
        { authorName: 'Marc L.', authorTitle: 'Premier achat', quote: "Reçu en 48h. Coupe parfaite. Je ne vois pas comment revenir aux marques de masse.", rating: 5 },
      ],
      newsletters: [
        {
          subject: 'AW26 Drop 03 · Disponible vendredi 18h',
          bodyHtml: '<h1>AW26 Drop 03 vendredi 18h</h1><p>5 pièces, éditions très limitées. La newsletter vous donne 1h d\'avance.</p>',
          status: 'draft',
        },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 10. LINK IN BIO — gradient violet rose
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_LINKINBIO: MarketplaceTemplate = {
  slug: 'link-in-bio-creator',
  name: 'Link-in-Bio — Creator',
  description:
    "Page unique style Linktree avec 10 liens animés, avatar, mini-shop 3 produits stars, signup newsletter inline, prochain live.",
  category: 'link-in-bio',
  thumbnailUrl: U('1611162617213-7d7a39e9b1d7', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['link-in-bio', 'creator', 'mini-shop', 'newsletter'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#A855F7',
      secondary: '#EC4899',
      accent: '#FB923C',
      fontHeading: 'Poppins',
      fontBody: 'Poppins',
    },
    pages: [
      {
        slug: '/',
        title: 'Mes liens',
        isHome: true,
        meta: { description: 'Tous mes liens : YouTube, Instagram, TikTok, Spotify, shop, contact.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: '@creator',
              subtitle: 'Créateur · 220k abonnés · Lifestyle / Tech / Travel',
              bgGradient: 'linear-gradient(135deg, #A855F7 0%, #EC4899 100%)',
              overlayColor: 'rgba(0,0,0,0.0)',
              height: '50vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<div style="text-align:center;padding:24px"><img src="' + U('1554080353-321e452ccf19', 400) + '" style="width:120px;height:120px;border-radius:50%;object-fit:cover;border:4px solid white" /><h2 style="margin:16px 0 4px">Camille R.</h2><p style="opacity:.85;max-width:400px;margin:0 auto">Créateur de contenu lifestyle · tech · voyages. Newsletter hebdo, podcast bi-mensuel.</p></div>',
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://youtube.com/@creator" style="display:block;padding:18px;background:linear-gradient(135deg,#A855F7,#EC4899);color:white;border-radius:14px;text-align:center;text-decoration:none;font-weight:700">▶ YouTube · 220k abonnés</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://instagram.com/creator" style="display:block;padding:18px;background:linear-gradient(135deg,#A855F7,#EC4899);color:white;border-radius:14px;text-align:center;text-decoration:none;font-weight:700">📷 Instagram · 88k</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://tiktok.com/@creator" style="display:block;padding:18px;background:linear-gradient(135deg,#A855F7,#EC4899);color:white;border-radius:14px;text-align:center;text-decoration:none;font-weight:700">🎵 TikTok · 540k</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://open.spotify.com/show/xyz" style="display:block;padding:18px;background:linear-gradient(135deg,#A855F7,#EC4899);color:white;border-radius:14px;text-align:center;text-decoration:none;font-weight:700">🎙 Mon podcast · Spotify</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="/newsletter" style="display:block;padding:18px;background:linear-gradient(135deg,#FB923C,#EC4899);color:white;border-radius:14px;text-align:center;text-decoration:none;font-weight:700">📩 Newsletter hebdo · 12k abonnés</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="/shop" style="display:block;padding:18px;background:linear-gradient(135deg,#A855F7,#FB923C);color:white;border-radius:14px;text-align:center;text-decoration:none;font-weight:700">🛍 Mini-shop · 3 produits stars</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://twitch.tv/creator" style="display:block;padding:18px;background:rgba(255,255,255,.1);color:white;border:1px solid rgba(255,255,255,.3);border-radius:14px;text-align:center;text-decoration:none;font-weight:700">🎮 Twitch · Live lundi 20h</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://twitter.com/creator" style="display:block;padding:18px;background:rgba(255,255,255,.1);color:white;border:1px solid rgba(255,255,255,.3);border-radius:14px;text-align:center;text-decoration:none;font-weight:700">🐦 Twitter / X</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="https://linkedin.com/in/creator" style="display:block;padding:18px;background:rgba(255,255,255,.1);color:white;border:1px solid rgba(255,255,255,.3);border-radius:14px;text-align:center;text-decoration:none;font-weight:700">💼 LinkedIn</a>' },
              ],
            },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                { html: '<a href="mailto:hello@creator.fr" style="display:block;padding:18px;background:rgba(255,255,255,.1);color:white;border:1px solid rgba(255,255,255,.3);border-radius:14px;text-align:center;text-decoration:none;font-weight:700">📧 Contact pro</a>' },
              ],
            },
          },
          {
            type: 'spacer',
            width: 'full',
            data: { height: 40 },
          },
        ],
      },
      {
        slug: '/a-propos',
        title: 'À propos',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Hello, moi c\'est Camille.',
              subtitle: '32 ans · Paris · Créateur depuis 2020',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>L\'histoire courte</h2><p>Ex-PM dans une scale-up parisienne, j\'ai lancé ma chaîne YouTube en 2020 par curiosité. 4 ans plus tard, c\'est mon métier à plein temps. 220k abonnés YT, 88k Insta, 540k TikTok.</p><h2>Le contenu</h2><p>Lifestyle · tech · voyages. Vidéos longues (15-25 min) sur YouTube, formats verticaux sur Insta/TikTok, podcast bi-mensuel.</p><h2>Pour les marques</h2><p>Brand kit + tarifs sur demande à hello@creator.fr. Je suis sélective. Je ne fais pas de placement pour ce que je n\'aime pas.</p>',
            },
          },
        ],
      },
      {
        slug: '/shop',
        title: 'Shop',
        blocks: [
          {
            type: 'hero',
            width: 'full',
            data: {
              title: 'Mini-shop',
              subtitle: '3 produits que j\'utilise vraiment au quotidien.',
            },
          },
        ],
      },
    ],
    features: ['shop', 'newsletter', 'events', 'social-calendar', 'leads'],
    seedData: {
      products: [
        { slug: 'preset-lightroom-creator', name: 'Preset Lightroom · Pack Creator (10 presets)', description: 'Mes 10 presets utilisés sur Instagram. Compatible Lightroom mobile + desktop. Mise à jour à vie.', priceCents: 2900, currency: 'EUR', images: [U('1554080353-321e452ccf19', 800)], inventory: 999, category: 'preset' },
      ],
      events: [
        { slug: 'live-twitch-lundi', title: 'Live Twitch · Q&A spécial newsletter', description: 'Lundi 20h, 1h en live. Je réponds aux questions des abonnés.', startsAt: inDays(3), endsAt: inDays(3), category: 'live' },
      ],
    },
  },
};

// ════════════════════════════════════════════════════════════════════
// 11. BLOG / MEDIA — éditorial magazine
// ════════════════════════════════════════════════════════════════════

const TEMPLATE_BLOG: MarketplaceTemplate = {
  slug: 'blog-media',
  name: 'Blog / Media — Éditorial Magazine',
  description:
    "Magazine en ligne style éditorial : hero feature, grille articles, catégories, auteurs, reading mode, comments forum, newsletter, sponsors.",
  category: 'blog',
  thumbnailUrl: U('1504711434969-e33886168f5c', 600),
  free: true,
  priceCents: 0,
  approved: true,
  tags: ['blog', 'media', 'articles', 'forum', 'newsletter', 'sponsors'],
  blocksSeed: {
    version: 1,
    palette: {
      primary: '#DC2626',
      secondary: '#F5F0E6',
      accent: '#0a0a0a',
      fontHeading: 'Playfair Display',
      fontBody: 'Source Serif Pro',
    },
    pages: [
      {
        slug: '/',
        title: 'Accueil',
        isHome: true,
        meta: { description: 'Magazine indépendant — culture, idées, longs formats.' },
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Le magazine qui prend son temps.',
              subtitle: 'Longs formats, enquêtes, regards. Publié chaque mardi.',
              ctaLabel: 'Tous les articles',
              ctaHref: '/articles',
              bgImage: U('1504711434969-e33886168f5c'),
              bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #2a2a2a 100%)',
              overlayColor: 'rgba(0,0,0,0.55)',
              floatingText: 'MAG',
              height: '85vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center;font-family:Playfair Display">À la une</h2>' },
          },
          {
            type: 'columns',
            width: 'full',
            data: {
              columns: [
                {
                  html:
                    '<article><img src="' + U('1488646953014-85cb44e25828', 800) + '" style="width:100%;aspect-ratio:16/10;object-fit:cover" /><span style="font-size:11px;color:#DC2626;font-weight:700;letter-spacing:1px;text-transform:uppercase">ENQUÊTE</span><h3 style="font-family:Playfair Display">L\'industrie textile portugaise renaît</h3><p style="opacity:.8">Comment 200 ateliers ont réinventé le made in Europe. 4 mois d\'enquête.</p></article>',
                },
                {
                  html:
                    '<article><img src="' + U('1486325212027-8081e485255e', 800) + '" style="width:100%;aspect-ratio:16/10;object-fit:cover" /><span style="font-size:11px;color:#DC2626;font-weight:700;letter-spacing:1px;text-transform:uppercase">LONG FORMAT</span><h3 style="font-family:Playfair Display">Petites villes, grandes vies</h3><p style="opacity:.8">Récit collectif de l\'exode urbain post-2020. 12 trajectoires, 8000 mots.</p></article>',
                },
                {
                  html:
                    '<article><img src="' + U('1561070791-2526d30994b8', 800) + '" style="width:100%;aspect-ratio:16/10;object-fit:cover" /><span style="font-size:11px;color:#DC2626;font-weight:700;letter-spacing:1px;text-transform:uppercase">PORTRAIT</span><h3 style="font-family:Playfair Display">Laure, archiviste du web</h3><p style="opacity:.8">Elle archive depuis 15 ans les sites qui disparaissent. Portrait.</p></article>',
                },
              ],
            },
          },
          {
            type: 'text',
            width: 'full',
            data: { html: '<h2 style="text-align:center;font-family:Playfair Display">Catégories</h2><p style="text-align:center;opacity:.7">Culture · Idées · Récits · Reportage · Portrait · Tribune</p>' },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<div style="padding:32px;background:rgba(220,38,38,.08);border-radius:16px;text-align:center;max-width:700px;margin:0 auto"><h2 style="font-family:Playfair Display;margin-top:0">La newsletter</h2><p>Chaque mardi matin, l\'article phare envoyé en avant-première à 18 000 abonnés.</p></div>',
            },
          },
        ],
      },
      {
        slug: '/articles',
        title: 'Articles',
        blocks: [
          { type: 'hero', width: 'full', data: { title: 'Tous les articles', subtitle: 'Filtrez par catégorie, auteur, date.' } },
        ],
      },
      {
        slug: '/categories',
        title: 'Catégories',
        blocks: [
          { type: 'hero', width: 'full', data: { title: '6 catégories', subtitle: 'Culture · Idées · Récits · Reportage · Portrait · Tribune' } },
        ],
      },
      {
        slug: '/auteurs',
        title: 'Auteurs',
        blocks: [
          { type: 'hero', width: 'full', data: { title: 'La rédaction', subtitle: '8 plumes régulières, 30+ contributeur·rice·s.' } },
        ],
      },
      {
        slug: '/newsletter',
        title: 'Newsletter',
        blocks: [
          { type: 'hero', width: 'full', data: { title: 'Newsletter', subtitle: '18 000 abonnés · Chaque mardi matin · Archive accessible.' } },
        ],
      },
      {
        slug: '/sponsors',
        title: 'Sponsors',
        blocks: [
          { type: 'hero', width: 'full', data: { title: 'Devenir partenaire', subtitle: '18k abonnés newsletter, 220k visiteurs uniques/mois.' } },
        ],
      },
      {
        slug: '/a-propos',
        title: 'À propos',
        blocks: [
          {
            type: 'parallax-hero',
            width: 'full',
            data: {
              title: 'Indépendant depuis 2019.',
              subtitle: 'Financé par les lecteurs (40%), sponsors transparents (35%), événements (25%).',
              bgImage: U('1504711434969-e33886168f5c'),
              overlayColor: 'rgba(0,0,0,0.55)',
              height: '60vh',
            },
          },
          {
            type: 'text',
            width: 'full',
            data: {
              html:
                '<h2>Notre charte</h2><p><strong>1. Indépendance éditoriale stricte.</strong> Aucun sponsor ne lit un article avant publication.</p><p><strong>2. Transparence financière.</strong> Bilan annuel publié en mars, à l\'euro près.</p><p><strong>3. Sources protégées.</strong> Nous respectons l\'anonymat des sources, même en référé.</p><p><strong>4. Droit de réponse garanti.</strong> Toute personne citée peut répondre dans nos colonnes.</p><h2>L\'équipe</h2><p>4 rédacteurs permanents, 1 rédactrice en chef, 1 graphiste, 1 dev. Bureau Paris 11e. Tous salariés CDI à temps plein.</p>',
            },
          },
        ],
      },
    ],
    features: ['articles', 'newsletter', 'forum', 'partners', 'community', 'leads'],
    seedData: {
      articles: [
        { slug: 'industrie-textile-portugaise', title: 'L\'industrie textile portugaise renaît', excerpt: 'Comment 200 ateliers ont réinventé le made in Europe.', bodyHtml: '<p>Enquête 4 mois...</p>', coverImage: U('1488646953014-85cb44e25828', 1200), tags: ['enquete', 'mode', 'industrie'], authorName: 'Léa M.', status: 'draft' },
        { slug: 'petites-villes-grandes-vies', title: 'Petites villes, grandes vies', excerpt: 'Récit collectif de l\'exode urbain post-2020.', bodyHtml: '<p>Long format 8000 mots...</p>', coverImage: U('1486325212027-8081e485255e', 1200), tags: ['long-format', 'societe'], authorName: 'Tom R.', status: 'draft' },
        { slug: 'laure-archiviste-web', title: 'Laure, archiviste du web', excerpt: 'Elle archive depuis 15 ans les sites qui disparaissent.', bodyHtml: '<p>Portrait...</p>', coverImage: U('1561070791-2526d30994b8', 1200), tags: ['portrait', 'numerique'], authorName: 'Sam K.', status: 'draft' },
        { slug: 'crise-du-livre', title: 'Le livre n\'est pas mort, il mute', excerpt: 'Enquête sur 5 maisons d\'édition indépendantes qui inventent un autre modèle.', bodyHtml: '<p>Enquête...</p>', coverImage: U('1481627834876-b7833e8f5570', 1200), tags: ['enquete', 'culture', 'livre'], authorName: 'Anna L.', status: 'draft' },
        { slug: 'tribune-ia-art', title: 'Tribune · L\'IA et l\'art, ce qu\'on perd vraiment', excerpt: 'Trois artistes répondent. Sans nostalgie ni emballement.', bodyHtml: '<p>Tribune...</p>', coverImage: U('1620712943543-bcc4688e7485', 1200), tags: ['tribune', 'ia', 'culture'], authorName: 'Tribune', status: 'draft' },
        { slug: 'reportage-marche-poissonniers', title: 'Reportage · La nuit aux halles', excerpt: '4h du matin à Rungis. Les derniers grossistes.', bodyHtml: '<p>Reportage...</p>', coverImage: U('1414235077428-338989a2e8c0', 1200), tags: ['reportage', 'paris', 'societe'], authorName: 'Mehdi A.', status: 'draft' },
      ],
      newsletters: [
        {
          subject: 'Cette semaine · L\'industrie textile portugaise renaît',
          bodyHtml: '<h1>Édition #143</h1><p>Salut,</p><p>Cette semaine, on publie 4 mois d\'enquête sur la renaissance de l\'industrie textile portugaise. 200 ateliers, 4 régions, 35 interviews. Spoiler : c\'est plus complexe qu\'on ne le pense.</p><p>Bonne lecture,<br>La rédaction</p>',
          status: 'draft',
        },
      ],
    },
  },
};

// ─── EXPORT ────────────────────────────────────────────────────────

export const MARKETPLACE_TEMPLATES: MarketplaceTemplate[] = [
  TEMPLATE_PHOTOGRAPHE,
  TEMPLATE_RESTAURANT,
  TEMPLATE_COACH,
  TEMPLATE_PODCAST,
  TEMPLATE_ASSOCIATION,
  TEMPLATE_ECOLE,
  TEMPLATE_AGENCE,
  TEMPLATE_IMMOBILIER,
  TEMPLATE_ECOMMERCE,
  TEMPLATE_LINKINBIO,
  TEMPLATE_BLOG,
];

// ─── SEEDER ────────────────────────────────────────────────────────
// Upserts the 11 templates above into the platform Template table.
// Used by /api/admin/seed-marketplace-templates and by scripts/seed-marketplace-templates.ts.

export interface MarketplaceSeedReport {
  ok: boolean;
  total: number;
  created: number;
  updated: number;
  errors: { slug: string; error: string }[];
  details: {
    slug: string;
    action: 'created' | 'updated' | 'failed';
    pages: number;
    features: string[];
  }[];
}

export async function seedMarketplaceTemplates(): Promise<MarketplaceSeedReport> {
  const report: MarketplaceSeedReport = {
    ok: true,
    total: MARKETPLACE_TEMPLATES.length,
    created: 0,
    updated: 0,
    errors: [],
    details: [],
  };

  for (const t of MARKETPLACE_TEMPLATES) {
    try {
      const existing = await platformDb.template.findUnique({ where: { slug: t.slug } });
      const data = {
        slug: t.slug,
        name: t.name,
        description: t.description,
        category: t.category,
        thumbnailUrl: t.thumbnailUrl,
        blocksSeed: t.blocksSeed as any,
        free: t.free,
        priceCents: t.priceCents,
        approved: t.approved,
      };
      if (existing) {
        await platformDb.template.update({ where: { slug: t.slug }, data });
        report.updated++;
        report.details.push({
          slug: t.slug,
          action: 'updated',
          pages: t.blocksSeed.pages.length,
          features: t.blocksSeed.features,
        });
      } else {
        await platformDb.template.create({ data });
        report.created++;
        report.details.push({
          slug: t.slug,
          action: 'created',
          pages: t.blocksSeed.pages.length,
          features: t.blocksSeed.features,
        });
      }
    } catch (e: any) {
      report.ok = false;
      report.errors.push({ slug: t.slug, error: e?.message?.slice(0, 300) || 'unknown' });
      report.details.push({
        slug: t.slug,
        action: 'failed',
        pages: t.blocksSeed.pages.length,
        features: t.blocksSeed.features,
      });
    }
  }

  return report;
}
