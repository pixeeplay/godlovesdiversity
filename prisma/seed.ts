import { PrismaClient, Role, PhotoStatus, PlaceType, Source } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'arnaud@gredai.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'GodLoves2026!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email: adminEmail,
      name: 'Admin',
      role: Role.ADMIN,
      passwordHash
    }
  });
  console.log('✅ Admin créé :', admin.email);

  // Pages de base
  const pages = [
    {
      slug: 'mentions-legales',
      title: 'Mentions légales',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Site édité par...' }] }] }
    },
    {
      slug: 'rgpd',
      title: 'Politique de confidentialité',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vos données sont protégées...' }] }] }
    }
  ];
  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: p.slug, locale: 'fr' } },
      update: {},
      create: { ...p, locale: 'fr', published: true }
    });
  }
  console.log('✅ Pages légales créées');

  // Photos de démo
  const demos = [
    { caption: 'Devant Notre-Dame de Paris', city: 'Paris', country: 'FR', placeType: PlaceType.CHURCH, latitude: 48.8530, longitude: 2.3499 },
    { caption: 'Mosquée de Paris', city: 'Paris', country: 'FR', placeType: PlaceType.MOSQUE, latitude: 48.8421, longitude: 2.3553 },
    { caption: 'Synagogue de la Victoire', city: 'Paris', country: 'FR', placeType: PlaceType.SYNAGOGUE, latitude: 48.8753, longitude: 2.3392 },
    { caption: 'Pagode de Vincennes', city: 'Paris', country: 'FR', placeType: PlaceType.TEMPLE, latitude: 48.8350, longitude: 2.4338 }
  ];
  for (const [i, d] of demos.entries()) {
    await prisma.photo.upsert({
      where: { id: `demo-${i}` },
      update: {},
      create: {
        id: `demo-${i}`,
        storageKey: `demo/photo-${i + 1}.jpg`,
        caption: d.caption,
        authorName: 'Démo',
        status: PhotoStatus.APPROVED,
        latitude: d.latitude,
        longitude: d.longitude,
        city: d.city,
        country: d.country,
        placeType: d.placeType,
        source: Source.WEB,
        likes: Math.floor(Math.random() * 200)
      }
    });
  }
  console.log('✅ 4 photos de démo créées');

  // ─── Sections riches pour /argumentaire et /message ───
  const sections = [
    { pageSlug: 'message', order: 1, layout: 'banner', title: 'Le message', subtitle: 'Manifeste',
      body: 'Dieu n\'est pas opposé aux personnes LGBT. Ce rejet est le produit d\'interprétations historiques et humaines des textes sacrés. L\'amour, la justice et la compassion sont au cœur de toutes les grandes traditions monothéistes.',
      accentColor: '#FF2BB1' },
    { pageSlug: 'message', order: 2, layout: 'text-image', title: 'L\'amour avant tout',
      body: 'Aucune lecture des textes sacrés ne saurait justifier l\'exclusion de qui que ce soit. Au cœur de chaque tradition spirituelle, on retrouve un même fil rouge : aimer son prochain comme soi-même.',
      accentColor: '#FF2BB1' },
    { pageSlug: 'message', order: 3, layout: 'quote',
      body: '« Là où il y a de l\'amour, il y a Dieu. » — Léon Tolstoï', accentColor: '#FBBF24' },
    { pageSlug: 'message', order: 4, layout: 'image-text', title: 'Réconcilier foi et identité',
      body: 'Beaucoup de croyants LGBT vivent dans la souffrance d\'un faux dilemme. Ce mouvement existe pour leur dire : votre foi et votre identité ne sont pas en contradiction.',
      accentColor: '#8B5CF6' },
    { pageSlug: 'argumentaire', order: 1, layout: 'banner', title: 'L\'argumentaire', subtitle: 'Quatre vérités simples',
      body: 'Une lecture inclusive des textes sacrés repose sur quatre fondations solides, partagées par les théologiens contemporains des trois religions monothéistes.',
      accentColor: '#FF2BB1' },
    { pageSlug: 'argumentaire', order: 2, layout: 'text-image', title: '01. Dieu est amour universel',
      body: 'Les grandes religions monothéistes reposent sur l\'amour, la compassion et la justice. Aucune condamnation explicite de l\'homosexualité n\'est formulée par Jésus, qui prône l\'inclusion des marginaux et l\'accueil sans condition.',
      accentColor: '#FF2BB1' },
    { pageSlug: 'argumentaire', order: 3, layout: 'image-text', title: '02. Les textes sont contextualisés',
      body: 'Les passages utilisés contre les personnes LGBT doivent être compris dans leur contexte historique : rites païens, normes sociales antiques, codes de pureté tribaux. Lire ces textes hors contexte trahit leur intention spirituelle.',
      accentColor: '#FBBF24' },
    { pageSlug: 'argumentaire', order: 4, layout: 'text-image', title: '03. L\'interprétation est humaine',
      body: 'Les lectures religieuses ont été influencées par des normes culturelles : patriarcat, hétérocentrisme, structures de pouvoir. Reconnaître la dimension humaine de l\'interprétation, c\'est ouvrir la voie à des relectures fidèles à l\'esprit des textes.',
      accentColor: '#34D399' },
    { pageSlug: 'argumentaire', order: 5, layout: 'image-text', title: '04. Foi et diversité sont compatibles',
      body: 'De nombreuses communautés religieuses inclusives existent partout dans le monde : paroisses ouvertes, synagogues réformées, mosquées progressistes. Chaque jour, des théologiens publient des relectures inclusives saluées.',
      accentColor: '#8B5CF6' },
    { pageSlug: 'argumentaire', order: 6, layout: 'quote',
      body: '« Je vous donne un commandement nouveau : aimez-vous les uns les autres comme je vous ai aimés. » — Évangile de Jean 13:34',
      accentColor: '#FF2BB1' }
  ];
  for (const sec of sections) {
    const existing = await prisma.section.findFirst({
      where: { pageSlug: sec.pageSlug, order: sec.order, locale: 'fr' }
    });
    if (!existing) await prisma.section.create({ data: { ...sec, locale: 'fr', published: true } });
  }
  console.log('✅ Sections riches créées');

  // ─── 5 bannières par défaut ───
  const banners = [
    {
      eyebrow: 'Mouvement interreligieux • 2026',
      title: 'GOD LOVES DIVERSITY',
      subtitle: 'Dieu n\'est pas opposé aux personnes LGBT. L\'amour, la justice et la compassion sont au cœur des grandes religions monothéistes.',
      cta1Text: 'COMPRENDRE LE MESSAGE', cta1Url: '/argumentaire',
      cta2Text: 'VOIR LES PHOTOS', cta2Url: '/galerie',
      accentColor: '#FF2BB1', order: 1
    },
    {
      eyebrow: 'Manifeste',
      title: 'L\'AMOUR EST UNIVERSEL',
      subtitle: 'Chaque tradition spirituelle l\'enseigne : aimer son prochain comme soi-même. C\'est le fil rouge qui relie toutes les religions du monde.',
      cta1Text: 'LIRE LE MESSAGE', cta1Url: '/message',
      accentColor: '#FBBF24', order: 2
    },
    {
      eyebrow: 'Galerie mondiale',
      title: 'PARTAGEZ VOTRE LUMIÈRE',
      subtitle: 'Photographiez-vous devant un lieu de culte avec l\'affiche, et rejoignez des centaines de croyants partout dans le monde.',
      cta1Text: 'PARTICIPER', cta1Url: '/participer',
      cta2Text: 'VOIR LA CARTE', cta2Url: '/galerie',
      accentColor: '#34D399', order: 3
    },
    {
      eyebrow: 'Argumentaire',
      title: 'QUATRE VÉRITÉS SIMPLES',
      subtitle: 'Une lecture inclusive des textes sacrés ne combat aucune religion : elle redonne aux croyants LGBT la place que les principes fondateurs leur ont toujours promise.',
      cta1Text: 'DÉCOUVRIR', cta1Url: '/argumentaire',
      accentColor: '#22D3EE', order: 4
    },
    {
      eyebrow: 'Affiches',
      title: 'TÉLÉCHARGEZ. IMPRIMEZ. PARTAGEZ.',
      subtitle: 'Affiche officielle disponible en plusieurs formats. Imprimez-la, posez-la, photographiez-vous avec, devenez acteur du changement.',
      cta1Text: 'TÉLÉCHARGER L\'AFFICHE', cta1Url: '/affiches',
      accentColor: '#8B5CF6', order: 5
    }
  ];
  for (const b of banners) {
    const existing = await prisma.banner.findFirst({ where: { order: b.order, locale: 'fr' } });
    if (!existing) await prisma.banner.create({ data: { ...b, locale: 'fr', published: true } });
  }
  console.log('✅ 5 bannières créées');

  // ─── Menu de navigation ───
  const menu = [
    { label: 'LE MESSAGE', href: '/message', order: 1 },
    { label: 'ARGUMENTAIRE', href: '/argumentaire', order: 2 },
    { label: 'PHOTOS', href: '/galerie', order: 3 },
    { label: 'AFFICHES', href: '/affiches', order: 4 },
    { label: 'À PROPOS', href: '/a-propos', order: 5 },
    { label: 'BLOG', href: '/blog', order: 6 },
    { label: 'NEWSLETTERS', href: '/newsletters', order: 7 }
  ];
  for (const m of menu) {
    const existing = await prisma.menuItem.findFirst({ where: { href: m.href, locale: 'fr' } });
    if (!existing) await prisma.menuItem.create({ data: { ...m, locale: 'fr', published: true } });
  }
  console.log('✅ Menu de navigation créé');

  // Settings par défaut
  const settings = [
    { key: 'site.title', value: 'God Loves Diversity' },
    { key: 'site.tagline', value: 'Dieu est amour. La foi se conjugue au pluriel.' },
    { key: 'campaign.hashtag', value: '#GodLovesDiversity' }
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log('✅ Réglages par défaut');

  // Partenaires de base — visibles dès le 1er déploiement
  const partners = [
    {
      name: 'Arc-en-Ciel',
      url: 'https://www.arc-en-ciel.com',
      description: 'Association inclusive pour les chrétiens LGBT+.',
      category: 'Association',
      order: 1
    },
    {
      name: 'Beit Haverim',
      url: 'https://www.beit-haverim.com',
      description: 'Communauté juive LGBT+ de France.',
      category: 'Association',
      order: 2
    },
    {
      name: '1946 — The Movie',
      url: 'https://www.1946themovie.com',
      description: 'Documentaire sur l\'origine de la traduction biblique du mot "homosexuel".',
      category: 'Film',
      order: 3
    }
  ];
  for (const p of partners) {
    const exists = await prisma.partner.findFirst({ where: { url: p.url } });
    if (!exists) await prisma.partner.create({ data: p });
  }
  console.log('✅ Partenaires par défaut');

  // ───────── 5 PRODUITS DÉRIVÉS DE DÉMO ─────────
  const products = [
    {
      slug: 't-shirt-arc-en-ciel',
      title: 'T-shirt arc-en-ciel "God Loves Diversity"',
      description: `T-shirt unisexe en coton bio (180 g/m²), imprimé en France.
Devant : grand cœur arc-en-ciel rainbow shift au feutre néon, signé "God Loves Diversity".
Dos : verset inclusif minimaliste « Aimez-vous les uns les autres » en typographie cathédrale dorée.

Tailles disponibles : XS à 3XL — coupe ample, manches mi-longues. Lavage 30°C, séchage à plat.
100 % des bénéfices reversés au mouvement (impression d'affiches, animations dans les paroisses inclusives).`,
      priceCents: 2500,
      currency: 'EUR',
      images: [
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
        'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80'
      ],
      stock: 50,
      category: 'Vêtement',
      variants: { Taille: ['XS', 'S', 'M', 'L', 'XL', 'XXL'], Couleur: ['Blanc', 'Noir', 'Rose pastel'] },
      order: 1
    },
    {
      slug: 'bougie-vitrail',
      title: 'Bougie parfumée "Vitrail" — Encens & Oud',
      description: `Bougie en cire de soja 100 % végétale, coulée à la main en France.
Verre teinté façon vitrail (rouge rubis, bleu cobalt, vert émeraude — au choix), capacité 230 g, durée de combustion 50 h.
Parfum : encens d'église, oud précieux, note de bois sacré — composé en Provence.
Mèche en coton naturel, sans phtalate, sans paraffine.

Allume-la pendant ta lecture, ta prière ou ta méditation. Idéale pour créer un espace sacré chez toi.
Boîte cadeau cartonnée incluse, avec un mot écrit à la main.`,
      priceCents: 2800,
      currency: 'EUR',
      images: [
        'https://images.unsplash.com/photo-1602874801007-aa20f6566c75?w=800&q=80',
        'https://images.unsplash.com/photo-1601312378427-822b2b41da35?w=800&q=80'
      ],
      stock: 30,
      category: 'Accessoire',
      variants: { Couleur: ['Rouge rubis', 'Bleu cobalt', 'Vert émeraude'] },
      order: 2
    },
    {
      slug: 'mug-foi-inclusive',
      title: 'Mug céramique "Foi & Diversité"',
      description: `Mug en céramique fine émaillée (350 ml), résistant au lave-vaisselle et au micro-ondes.
Décor : cœur arc-en-ciel + croix/croissant/étoile/mandala stylisés en couronne — un même cercle, plusieurs traditions.
Citation à l'intérieur du fond : « L'amour ne fait pas de différence. »

Idéal pour ton café du dimanche matin, ton thé de retraite spirituelle, ou pour offrir.
Emballage carton recyclé.`,
      priceCents: 1500,
      currency: 'EUR',
      images: [
        'https://images.unsplash.com/photo-1572119003128-d110c07af847?w=800&q=80',
        'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80'
      ],
      stock: 80,
      category: 'Accessoire',
      variants: { Couleur: ['Blanc', 'Noir mat'] },
      order: 3
    },
    {
      slug: 'tote-bag-gld',
      title: 'Tote bag canvas "GLD"',
      description: `Tote bag en toile de coton bio 240 g/m², anses solides 70 cm, fond renforcé.
Logo "GOD LOVES DIVERSITY" en typographie cathédrale dorée + cœur arc-en-ciel imprimé écran.
Format 38 × 42 cm, supporte jusqu'à 8 kg.

Parfait pour aller au marché, à la fac, à la marche des fiertés ou tout simplement pour porter le message au quotidien.`,
      priceCents: 1800,
      currency: 'EUR',
      images: [
        'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=800&q=80',
        'https://images.unsplash.com/photo-1591196702196-58c41e9d345f?w=800&q=80'
      ],
      stock: 60,
      category: 'Accessoire',
      variants: { Couleur: ['Naturel', 'Noir', 'Rose poudré'] },
      order: 4
    },
    {
      slug: 'affiche-cathedrale-lumiere',
      title: 'Affiche A2 "Cathédrale de Lumière"',
      description: `Affiche au format A2 (42 × 59,4 cm), papier mat 250 g/m² certifié FSC, impression haute définition à Paris.
Visuel original : silhouette devant un vitrail rosace gothique baigné d'un faisceau de lumière arc-en-ciel descendante, particules dorées en suspension.

Cadre non inclus. Livraison roulée dans un tube en carton recyclé.
Édition signée et numérotée — la première série est limitée à 200 exemplaires.`,
      priceCents: 1200,
      currency: 'EUR',
      images: [
        'https://images.unsplash.com/photo-1577720580479-7d839d829c73?w=800&q=80',
        'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=800&q=80'
      ],
      stock: 200,
      category: 'Affiche',
      variants: { Format: ['A2 (42×59cm)', 'A1 (59×84cm)'] },
      order: 5
    }
  ];
  for (const p of products) {
    const exists = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!exists) {
      await prisma.product.create({ data: p as any });
    }
  }
  console.log('✅ 5 produits boutique seedés');

  // ───── 3 commandes de démo (uniquement si aucune commande n'existe encore) ─────
  const ordersCount = await prisma.order.count().catch(() => -1);
  if (ordersCount === 0) {
    const seededProducts = await prisma.product.findMany({ where: { slug: { in: ['t-shirt-arc-en-ciel', 'bougie-vitrail', 'mug-foi-inclusive', 'tote-bag-gld', 'affiche-cathedrale-lumiere'] } } });
    if (seededProducts.length >= 3) {
      const find = (slug: string) => seededProducts.find((p) => p.slug === slug)!;

      // Commande 1 : PAID, prête à expédier (la démo principale)
      await prisma.order.create({
        data: {
          email: 'sophie.martin@example.com',
          name: 'Sophie Martin',
          phone: '+33612345678',
          shippingAddress: '12 rue de la République',
          shippingCity: 'Lyon',
          shippingZip: '69001',
          shippingCountry: 'FR',
          totalCents: find('t-shirt-arc-en-ciel').priceCents + find('mug-foi-inclusive').priceCents,
          currency: 'EUR',
          status: 'PAID',
          paymentProvider: 'STRIPE',
          paymentId: 'cs_demo_001',
          weightGrams: 620,
          notes: 'Commande de démonstration #1 — Cliquer pour ouvrir l\'éditeur Colissimo et générer l\'étiquette.',
          items: {
            create: [
              { productId: find('t-shirt-arc-en-ciel').id, quantity: 1, priceCents: find('t-shirt-arc-en-ciel').priceCents, variant: { Taille: 'M', Couleur: 'Rose pastel' } },
              { productId: find('mug-foi-inclusive').id, quantity: 1, priceCents: find('mug-foi-inclusive').priceCents, variant: { Couleur: 'Blanc' } }
            ]
          }
        }
      });

      // Commande 2 : SHIPPED (avec tracking pour montrer le suivi client)
      await prisma.order.create({
        data: {
          email: 'paul.durand@example.com',
          name: 'Paul Durand',
          phone: '+33687654321',
          shippingAddress: '47 boulevard Saint-Germain',
          shippingCity: 'Paris',
          shippingZip: '75005',
          shippingCountry: 'FR',
          totalCents: find('bougie-vitrail').priceCents * 2 + find('affiche-cathedrale-lumiere').priceCents,
          currency: 'EUR',
          status: 'SHIPPED',
          paymentProvider: 'SQUARE',
          paymentId: 'sq_demo_002',
          weightGrams: 850,
          carrier: 'colissimo',
          shippingCost: 870,
          trackingNumber: '6A12345678901',
          trackingUrl: 'https://www.laposte.fr/outils/suivre-vos-envois?code=6A12345678901',
          shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          notes: 'Commande de démonstration #2 — Déjà expédiée. Le client a reçu email + SMS.',
          items: {
            create: [
              { productId: find('bougie-vitrail').id, quantity: 2, priceCents: find('bougie-vitrail').priceCents, variant: { Couleur: 'Rouge rubis' } },
              { productId: find('affiche-cathedrale-lumiere').id, quantity: 1, priceCents: find('affiche-cathedrale-lumiere').priceCents, variant: { Format: 'A2 (42×59cm)' } }
            ]
          }
        }
      });

      // Commande 3 : PENDING (en attente de paiement, pour la démo)
      await prisma.order.create({
        data: {
          email: 'amina.berkani@example.com',
          name: 'Amina Berkani',
          phone: '+33756789012',
          shippingAddress: '8 rue Victor Hugo, Bât B, Apt 4',
          shippingCity: 'Marseille',
          shippingZip: '13002',
          shippingCountry: 'FR',
          totalCents: find('tote-bag-gld').priceCents + find('mug-foi-inclusive').priceCents * 2,
          currency: 'EUR',
          status: 'PENDING',
          paymentProvider: 'STRIPE',
          weightGrams: 980,
          notes: 'Commande de démonstration #3 — En attente de confirmation paiement.',
          items: {
            create: [
              { productId: find('tote-bag-gld').id, quantity: 1, priceCents: find('tote-bag-gld').priceCents, variant: { Couleur: 'Naturel' } },
              { productId: find('mug-foi-inclusive').id, quantity: 2, priceCents: find('mug-foi-inclusive').priceCents, variant: { Couleur: 'Noir mat' } }
            ]
          }
        }
      });

      console.log('✅ 3 commandes de démo seedées (PAID / SHIPPED / PENDING)');
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
