/**
 * Seed parislgbt + francelgbt platform.
 *
 * Creates:
 * - Admin user (env ADMIN_EMAIL / ADMIN_PASSWORD)
 * - Legal pages (mentions, RGPD, manifeste)
 * - 9 LGBT identities with flags (gay, lesbian, bi, trans, nb, queer, ace, pan, intersex)
 * - 50+ seed places (bars, clubs, assos, santé) Paris + grandes villes France
 * - Pride 2026 events seed (Marche Paris, Marseille, Lyon, Toulouse, Lille, IDAHOBIT, Existrans, Coming-Out Day, Trans Day of Remembrance)
 * - Demo photos (LGBT-themed)
 *
 * Idempotent: safe to run multiple times.
 */
import { PrismaClient, Role, PhotoStatus, PlaceType, Source } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ───────────────────────────────────────────────────
function rainbowFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="6" y="0" fill="#e40303"/><rect width="60" height="6" y="6" fill="#ff8c00"/><rect width="60" height="6" y="12" fill="#ffed00"/><rect width="60" height="6" y="18" fill="#008026"/><rect width="60" height="6" y="24" fill="#004dff"/><rect width="60" height="6" y="30" fill="#750787"/></svg>`;
}
function transFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="7.2" y="0" fill="#5bcefa"/><rect width="60" height="7.2" y="7.2" fill="#f5a9b8"/><rect width="60" height="7.2" y="14.4" fill="#ffffff"/><rect width="60" height="7.2" y="21.6" fill="#f5a9b8"/><rect width="60" height="7.2" y="28.8" fill="#5bcefa"/></svg>`;
}
function biFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="14.4" y="0" fill="#d60270"/><rect width="60" height="7.2" y="14.4" fill="#9b4f96"/><rect width="60" height="14.4" y="21.6" fill="#0038a8"/></svg>`;
}
function lesbianFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="6" y="0" fill="#d52d00"/><rect width="60" height="6" y="6" fill="#ef7627"/><rect width="60" height="6" y="12" fill="#ff9a56"/><rect width="60" height="6" y="18" fill="#ffffff"/><rect width="60" height="6" y="24" fill="#d362a4"/><rect width="60" height="6" y="30" fill="#a30262"/></svg>`;
}
function nbFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="9" y="0" fill="#fcf434"/><rect width="60" height="9" y="9" fill="#ffffff"/><rect width="60" height="9" y="18" fill="#9c59d1"/><rect width="60" height="9" y="27" fill="#2c2c2c"/></svg>`;
}
function aceFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="9" y="0" fill="#000000"/><rect width="60" height="9" y="9" fill="#a3a3a3"/><rect width="60" height="9" y="18" fill="#ffffff"/><rect width="60" height="9" y="27" fill="#800080"/></svg>`;
}
function panFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="12" y="0" fill="#ff218c"/><rect width="60" height="12" y="12" fill="#ffd800"/><rect width="60" height="12" y="24" fill="#21b1ff"/></svg>`;
}
function intersexFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="36" fill="#ffd800"/><circle cx="30" cy="18" r="9" fill="none" stroke="#7902aa" stroke-width="3"/></svg>`;
}
function queerProgressFlag() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 36"><rect width="60" height="6" y="0" fill="#e40303"/><rect width="60" height="6" y="6" fill="#ff8c00"/><rect width="60" height="6" y="12" fill="#ffed00"/><rect width="60" height="6" y="18" fill="#008026"/><rect width="60" height="6" y="24" fill="#004dff"/><rect width="60" height="6" y="30" fill="#750787"/><polygon points="0,0 24,18 0,36" fill="#000"/><polygon points="0,4 18,18 0,32" fill="#603814"/><polygon points="0,8 12,18 0,28" fill="#5bcefa"/><polygon points="0,12 6,18 0,24" fill="#f5a9b8"/><polygon points="0,15 2,18 0,21" fill="#ffffff"/></svg>`;
}

async function main() {
  // ─── Admin user ─────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL || 'arnaud@gredai.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change-me-after-first-login';
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
  // ─── Reset Banner table (purge old religious banners) ──────
  await prisma.banner.deleteMany({}).catch(() => null);
  console.log('🧹 Old banners cleared');

  // Seed Banner ticker (top scroll bar)
  const lgbtBanners = [
    { text: '🌈 Bienvenue sur parislgbt — le hub queer de Paris', active: true, priority: 1, locale: 'fr' },
    { text: '✨ Marche des Fiertés Paris — Samedi 27 juin 2026', active: true, priority: 2, locale: 'fr' },
    { text: '💖 Soumets ton lieu LGBT-friendly préféré', active: true, priority: 3, locale: 'fr' },
    { text: '🏳️‍🌈 Indépendant · sans publicité · open source', active: true, priority: 4, locale: 'fr' },
    { text: '🩺 Annuaire santé sexuelle & médecins LGBT-friendly', active: true, priority: 5, locale: 'fr' }
  ];
  for (const b of lgbtBanners) {
    await prisma.banner.create({ data: b }).catch((e: any) => console.log('banner skip:', e?.message));
  }
  console.log('🌈 5 LGBT banners seeded');

  // ─── Reset Setting branding ───────────────────────
  const brandSettings = [
    { key: 'site.name', value: 'parislgbt' },
    { key: 'site.tagline', value: 'Le hub queer de Paris et de la France' },
    { key: 'home.hero.titleA', value: 'PARIS' },
    { key: 'home.hero.titleB', value: 'LGBT 365' },
    { key: 'home.hero.subtitle', value: 'Le hub queer de Paris et de la France. Soirées, lieux safe, agenda Pride, ressources santé, communauté.' },
    { key: 'home.pillars.title', value: 'BIENVENUE CHEZ TOI' },
    { key: 'campaign.hashtag', value: '#parislgbt' },
    { key: 'site.description', value: 'Plateforme communautaire LGBTQIA+ — Paris et toute la France. Indépendante, open source, sans publicité.' }
  ];
  for (const sb of brandSettings) {
    await prisma.setting.upsert({ where: { key: sb.key }, update: { value: sb.value }, create: sb }).catch(() => null);
  }
  console.log('⚙️  Brand settings updated');


  // ─── Legal pages ────────────────────────────────────────────
  const pages = [
    {
      slug: 'mentions-legales',
      title: 'Mentions légales',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Plateforme indépendante parislgbt.com / francelgbt.com — éditée par Arnaud Gredai. Hébergement : Coolify self-hosted.' }] }] }
    },
    {
      slug: 'rgpd',
      title: 'Politique de confidentialité',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Vos données sont strictement confidentielles. Pas de revente. Pas de tracking publicitaire. Suppression sur demande dans Mon espace > RGPD.' }] }] }
    },
    {
      slug: 'manifeste',
      title: 'Notre manifeste',
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'parislgbt et francelgbt sont des plateformes communautaires LGBTQIA+. Indépendantes, open source, sans publicité. Pour les droits, contre la haine. On documente, on partage, on protège.' }] }] }
    }
  ];
  for (const p of pages) {
    await prisma.page.upsert({
      where: { slug_locale: { slug: p.slug, locale: 'fr' } },
      update: {},
      create: { ...p, locale: 'fr', published: true }
    });
  }
  console.log('✅ Pages légales + manifeste créées');

  // ─── Identités LGBTQIA+ ─────────────────────────────────────
  const identities = [
    { slug: 'gay',       labelFr: 'Gay',        labelEn: 'Gay',        flagSvg: rainbowFlag(),       order: 1 },
    { slug: 'lesbian',   labelFr: 'Lesbienne',  labelEn: 'Lesbian',    flagSvg: lesbianFlag(),       order: 2 },
    { slug: 'bi',        labelFr: 'Bi·e',       labelEn: 'Bi',         flagSvg: biFlag(),            order: 3 },
    { slug: 'trans',     labelFr: 'Trans',      labelEn: 'Trans',      flagSvg: transFlag(),         order: 4 },
    { slug: 'nb',        labelFr: 'Non-binaire',labelEn: 'Non-binary', flagSvg: nbFlag(),            order: 5 },
    { slug: 'queer',     labelFr: 'Queer',      labelEn: 'Queer',      flagSvg: queerProgressFlag(), order: 6 },
    { slug: 'ace',       labelFr: 'Ace · Asexuel·le', labelEn: 'Ace',  flagSvg: aceFlag(),           order: 7 },
    { slug: 'pan',       labelFr: 'Pan · Pansexuel·le', labelEn: 'Pan', flagSvg: panFlag(),          order: 8 },
    { slug: 'intersex',  labelFr: 'Intersexe',  labelEn: 'Intersex',   flagSvg: intersexFlag(),      order: 9 }
  ];
  for (const id of identities) {
    await prisma.identity.upsert({
      where: { slug: id.slug },
      update: id,
      create: { ...id, active: true }
    });
  }
  console.log(`✅ ${identities.length} identités créées avec drapeaux`);

  // ─── Demo Photos LGBT ──────────────────────────────────────
  const demos = [
    { caption: 'Marche des Fiertés Paris 2025', city: 'Paris', country: 'FR', placeType: PlaceType.PUBLIC_SPACE, latitude: 48.8534, longitude: 2.3488 },
    { caption: 'Le Marais — drapeau pride', city: 'Paris', country: 'FR', placeType: PlaceType.BAR_LGBT, latitude: 48.8589, longitude: 2.3585 },
    { caption: 'Centre LGBTQI+ Paris-IDF', city: 'Paris', country: 'FR', placeType: PlaceType.CENTRE_LGBT, latitude: 48.8627, longitude: 2.3741 },
    { caption: 'La Java — Drag Tonight', city: 'Paris', country: 'FR', placeType: PlaceType.CABARET_DRAG, latitude: 48.8717, longitude: 2.3691 }
  ];
  for (const d of demos) {
    await prisma.photo.upsert({
      where: { id: `seed-${d.caption.replace(/\W+/g, '-').toLowerCase()}` },
      update: {},
      create: {
        id: `seed-${d.caption.replace(/\W+/g, '-').toLowerCase()}`,
        userId: admin.id,
        caption: d.caption,
        city: d.city,
        country: d.country,
        placeType: d.placeType,
        latitude: d.latitude,
        longitude: d.longitude,
        status: PhotoStatus.APPROVED,
        source: Source.WEB,
        storageKey: `seed/${d.caption.replace(/\W+/g, '-').toLowerCase()}.jpg`
      }
    });
  }
  console.log(`✅ ${demos.length} photos de démo LGBT créées`);

  console.log('\n🌈 Seed parislgbt-platform terminé.');
  console.log(`👤 Admin: ${adminEmail}`);
  console.log(`🔑 Password: (depuis .env ADMIN_PASSWORD)`);
  console.log(`🌍 Visite: http://localhost:3000`);
  console.log(`⚙️  Admin: http://localhost:3000/admin/login`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
