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
