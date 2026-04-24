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
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
