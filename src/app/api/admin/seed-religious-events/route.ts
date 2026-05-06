import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/seed-religious-events
 *
 * Pré-remplit ReligiousEvent avec ~70 fêtes religieuses 2026 + 2027.
 * Idempotent via slug unique.
 *
 * Réservé ADMIN.
 */

interface Seed {
  slug: string;
  name: string;
  faith: 'catholic' | 'protestant' | 'orthodox' | 'muslim' | 'jewish' | 'buddhist' | 'hindu' | 'sikh' | 'interfaith';
  category: 'fete-majeure' | 'fete-mineure' | 'jeune' | 'ramadan' | 'shabbat' | 'pelerinage' | 'memorial';
  startsAt: string;
  endsAt?: string;
  duration?: number;
  description: string;
  inclusivityNote?: string;
  emoji: string;
  color: string;
}

const SEEDS: Seed[] = [
  // ============= CHRISTIANISME 2026 =============
  { slug: 'epiphanie-2026', name: 'Épiphanie 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-01-06T00:00:00Z', description: 'Célébration des Rois Mages — fête fixée au 6 janvier.', inclusivityNote: 'Plusieurs paroisses inclusives organisent une bénédiction des familles arc-en-ciel.', emoji: '⭐', color: '#fbbf24' },
  { slug: 'cendres-2026', name: 'Mercredi des Cendres 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-02-18T00:00:00Z', description: 'Début du Carême catholique.', emoji: '✝️', color: '#475569' },
  { slug: 'careme-2026', name: 'Carême 2026 (40 jours)', faith: 'catholic', category: 'jeune', startsAt: '2026-02-18T00:00:00Z', endsAt: '2026-04-04T23:59:59Z', duration: 46, description: 'Période de jeûne, prière et partage de 40 jours avant Pâques.', emoji: '✝️', color: '#7c2d12' },
  { slug: 'paques-catho-2026', name: 'Pâques catholique 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-04-05T00:00:00Z', description: 'Dimanche de la Résurrection — fête majeure.', inclusivityNote: 'Veillée pascale ouverte aux familles LGBT à St-Merry, Lourdes Inclusion, etc.', emoji: '🌅', color: '#f59e0b' },
  { slug: 'paques-orthodoxe-2026', name: 'Pâques orthodoxe 2026', faith: 'orthodox', category: 'fete-majeure', startsAt: '2026-04-12T00:00:00Z', description: 'Pascha orthodoxe — calendrier julien.', emoji: '☦️', color: '#dc2626' },
  { slug: 'pentecote-2026', name: 'Pentecôte 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-05-24T00:00:00Z', description: 'Descente du Saint-Esprit — 50 jours après Pâques.', emoji: '🕊️', color: '#dc2626' },
  { slug: 'assomption-2026', name: 'Assomption 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-08-15T00:00:00Z', description: 'Assomption de la Vierge Marie.', emoji: '👼', color: '#3b82f6' },
  { slug: 'toussaint-2026', name: 'Toussaint 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-11-01T00:00:00Z', description: 'Tous les saints — mémorial des défunts.', emoji: '🕯️', color: '#6b7280' },
  { slug: 'avent-2026', name: 'Avent 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-11-29T00:00:00Z', endsAt: '2026-12-24T23:59:59Z', duration: 26, description: 'Période de préparation à Noël (4 semaines).', emoji: '🕯️', color: '#7c3aed' },
  { slug: 'noel-2026', name: 'Noël 2026', faith: 'catholic', category: 'fete-majeure', startsAt: '2026-12-25T00:00:00Z', description: 'Naissance du Christ.', inclusivityNote: 'Messes de minuit ouvertes aux familles arc-en-ciel dans plusieurs paroisses.', emoji: '🎄', color: '#dc2626' },
  { slug: 'reformation-2026', name: 'Jour de la Réformation 2026', faith: 'protestant', category: 'fete-majeure', startsAt: '2026-10-31T00:00:00Z', description: 'Anniversaire des 95 thèses de Luther (1517).', emoji: '✠', color: '#1e40af' },

  // ============= ISLAM 2026 (dates lunaires approximatives) =============
  { slug: 'ramadan-2026', name: 'Ramadan 2026', faith: 'muslim', category: 'ramadan', startsAt: '2026-02-17T00:00:00Z', endsAt: '2026-03-18T23:59:59Z', duration: 30, description: 'Mois sacré de jeûne, prière et partage.', inclusivityNote: 'HM2F (Homosexuel·les Musulman·es de France) organise des iftar inclusifs.', emoji: '🌙', color: '#10b981' },
  { slug: 'laylat-qadr-2026', name: 'Laylat al-Qadr 2026', faith: 'muslim', category: 'fete-majeure', startsAt: '2026-03-14T00:00:00Z', description: 'Nuit du Destin — 27e nuit du Ramadan.', emoji: '✨', color: '#7c3aed' },
  { slug: 'aid-fitr-2026', name: 'Aïd al-Fitr 2026', faith: 'muslim', category: 'fete-majeure', startsAt: '2026-03-19T00:00:00Z', endsAt: '2026-03-21T23:59:59Z', duration: 3, description: 'Fête de la rupture du jeûne.', emoji: '🌙', color: '#059669' },
  { slug: 'aid-adha-2026', name: 'Aïd al-Adha 2026', faith: 'muslim', category: 'fete-majeure', startsAt: '2026-05-26T00:00:00Z', endsAt: '2026-05-28T23:59:59Z', duration: 3, description: 'Fête du sacrifice.', emoji: '🐑', color: '#dc2626' },
  { slug: 'achoura-2026', name: 'Achoura 2026', faith: 'muslim', category: 'fete-mineure', startsAt: '2026-06-25T00:00:00Z', description: '10e jour de Muharram.', emoji: '🌙', color: '#0891b2' },
  { slug: 'mawlid-2026', name: 'Mawlid an-Nabi 2026', faith: 'muslim', category: 'fete-majeure', startsAt: '2026-08-24T00:00:00Z', description: 'Naissance du Prophète Muhammad ﷺ.', emoji: '🌟', color: '#10b981' },

  // ============= JUDAÏSME 2026 =============
  { slug: 'pourim-2026', name: 'Pourim 2026', faith: 'jewish', category: 'fete-majeure', startsAt: '2026-03-03T00:00:00Z', description: 'Fête joyeuse, costumes et lecture de la Méguila d\'Esther.', emoji: '🎭', color: '#a855f7' },
  { slug: 'pessah-2026', name: 'Pessa\'h 2026 (Pâque juive)', faith: 'jewish', category: 'fete-majeure', startsAt: '2026-04-01T00:00:00Z', endsAt: '2026-04-09T23:59:59Z', duration: 7, description: 'Sortie d\'Égypte — Seder familial le 1er soir.', inclusivityNote: 'Beit Haverim organise des Sedarim inclusifs à Paris.', emoji: '🍷', color: '#dc2626' },
  { slug: 'chavouot-2026', name: 'Chavouot 2026', faith: 'jewish', category: 'fete-majeure', startsAt: '2026-05-21T00:00:00Z', endsAt: '2026-05-23T23:59:59Z', duration: 2, description: 'Don de la Torah, 50e jour après Pessa\'h.', emoji: '📜', color: '#3b82f6' },
  { slug: 'tisha-beav-2026', name: 'Tisha BeAv 2026', faith: 'jewish', category: 'jeune', startsAt: '2026-07-22T00:00:00Z', description: 'Jeûne de la destruction des temples.', emoji: '🕯️', color: '#475569' },
  { slug: 'roch-hachana-2026', name: 'Roch Hachana 2026', faith: 'jewish', category: 'fete-majeure', startsAt: '2026-09-12T00:00:00Z', endsAt: '2026-09-14T23:59:59Z', duration: 2, description: 'Nouvel an juif — début des "Jours Redoutables".', emoji: '🍯', color: '#fbbf24' },
  { slug: 'yom-kippour-2026', name: 'Yom Kippour 2026', faith: 'jewish', category: 'jeune', startsAt: '2026-09-21T00:00:00Z', description: 'Jour du Grand Pardon — jeûne de 25h.', inclusivityNote: 'Beit Haverim et Beit Simchat Torah ouvrent leurs offices à toutes identités.', emoji: '🕊️', color: '#1e40af' },
  { slug: 'soukkot-2026', name: 'Soukkot 2026', faith: 'jewish', category: 'fete-majeure', startsAt: '2026-09-26T00:00:00Z', endsAt: '2026-10-03T23:59:59Z', duration: 7, description: 'Fête des cabanes — 7 jours sous la Soukka.', emoji: '🎋', color: '#10b981' },
  { slug: 'hanouka-2026', name: 'Hanouka 2026', faith: 'jewish', category: 'fete-majeure', startsAt: '2026-12-04T00:00:00Z', endsAt: '2026-12-12T23:59:59Z', duration: 8, description: 'Fête des Lumières — allumage de la Hanoukia, 8 jours.', emoji: '🕎', color: '#3b82f6' },

  // ============= BOUDDHISME 2026 =============
  { slug: 'magha-puja-2026', name: 'Magha Puja 2026', faith: 'buddhist', category: 'fete-majeure', startsAt: '2026-02-03T00:00:00Z', description: 'Pleine lune — 1250 disciples du Bouddha.', emoji: '🪷', color: '#f97316' },
  { slug: 'losar-2026', name: 'Losar 2026', faith: 'buddhist', category: 'fete-majeure', startsAt: '2026-02-18T00:00:00Z', endsAt: '2026-02-20T23:59:59Z', duration: 3, description: 'Nouvel an tibétain.', emoji: '☸️', color: '#dc2626' },
  { slug: 'vesak-2026', name: 'Vesak 2026', faith: 'buddhist', category: 'fete-majeure', startsAt: '2026-05-01T00:00:00Z', description: 'Pleine lune — naissance, illumination et parinirvana du Bouddha.', emoji: '🪷', color: '#f59e0b' },
  { slug: 'asalha-puja-2026', name: 'Asalha Puja 2026', faith: 'buddhist', category: 'fete-majeure', startsAt: '2026-07-30T00:00:00Z', description: 'Premier sermon du Bouddha.', emoji: '☸️', color: '#fbbf24' },
  { slug: 'ulambana-2026', name: 'Ulambana / Bon 2026', faith: 'buddhist', category: 'memorial', startsAt: '2026-08-13T00:00:00Z', endsAt: '2026-08-15T23:59:59Z', duration: 3, description: 'Festival des esprits ancestraux.', emoji: '🏮', color: '#7c3aed' },

  // ============= HINDOUISME 2026 =============
  { slug: 'maha-shivaratri-2026', name: 'Maha Shivaratri 2026', faith: 'hindu', category: 'fete-majeure', startsAt: '2026-02-15T00:00:00Z', description: 'Grande Nuit de Shiva.', emoji: '🕉️', color: '#1e40af' },
  { slug: 'holi-2026', name: 'Holi 2026', faith: 'hindu', category: 'fete-majeure', startsAt: '2026-03-03T00:00:00Z', endsAt: '2026-03-04T23:59:59Z', duration: 2, description: 'Festival des couleurs — fête du printemps.', inclusivityNote: 'Festival universellement joyeux, célébré par les communautés inclusives indiennes diaspora.', emoji: '🎨', color: '#ec4899' },
  { slug: 'ramnavmi-2026', name: 'Ram Navami 2026', faith: 'hindu', category: 'fete-mineure', startsAt: '2026-03-26T00:00:00Z', description: 'Naissance de Rama.', emoji: '🏹', color: '#f97316' },
  { slug: 'krishna-jayanti-2026', name: 'Krishna Janmashtami 2026', faith: 'hindu', category: 'fete-majeure', startsAt: '2026-08-15T00:00:00Z', description: 'Naissance de Krishna.', emoji: '🪈', color: '#3b82f6' },
  { slug: 'ganesh-2026', name: 'Ganesh Chaturthi 2026', faith: 'hindu', category: 'fete-majeure', startsAt: '2026-09-14T00:00:00Z', description: 'Festival de Ganesh.', emoji: '🐘', color: '#dc2626' },
  { slug: 'navratri-2026', name: 'Navratri 2026', faith: 'hindu', category: 'fete-majeure', startsAt: '2026-10-12T00:00:00Z', endsAt: '2026-10-21T23:59:59Z', duration: 9, description: '9 nuits — festival de la Déesse.', emoji: '💃', color: '#a855f7' },
  { slug: 'diwali-2026', name: 'Diwali 2026', faith: 'hindu', category: 'fete-majeure', startsAt: '2026-11-08T00:00:00Z', description: 'Festival des Lumières.', inclusivityNote: 'Réseau Galva-108 célèbre Diwali avec un angle inclusif LGBT.', emoji: '🪔', color: '#fbbf24' },

  // ============= SIKHISME 2026 =============
  { slug: 'vaisakhi-2026', name: 'Vaisakhi 2026', faith: 'sikh', category: 'fete-majeure', startsAt: '2026-04-13T00:00:00Z', endsAt: '2026-04-14T23:59:59Z', duration: 2, description: 'Naissance du Khalsa, nouvel an sikh.', emoji: '☬', color: '#f97316' },
  { slug: 'guru-nanak-2026', name: 'Guru Nanak Jayanti 2026', faith: 'sikh', category: 'fete-majeure', startsAt: '2026-11-24T00:00:00Z', description: 'Anniversaire du fondateur Guru Nanak.', emoji: '☬', color: '#fbbf24' },

  // ============= INTER-RELIGIEUX 2026 =============
  { slug: 'interfaith-week-2026', name: 'Semaine du dialogue inter-religieux 2026', faith: 'interfaith', category: 'fete-majeure', startsAt: '2026-02-01T00:00:00Z', endsAt: '2026-02-07T23:59:59Z', duration: 7, description: 'Initiative ONU — 1ère semaine de février.', emoji: '🌍', color: '#22d3ee' },
  { slug: 'world-religion-day-2026', name: 'Journée mondiale des religions 2026', faith: 'interfaith', category: 'fete-mineure', startsAt: '2026-01-18T00:00:00Z', description: 'Initiative bahá\'íe — 3e dimanche de janvier.', emoji: '☮️', color: '#14b8a6' },

  // ============= 2027 — fêtes principales (anticipation +1 an) =============
  { slug: 'paques-catho-2027', name: 'Pâques catholique 2027', faith: 'catholic', category: 'fete-majeure', startsAt: '2027-03-28T00:00:00Z', description: 'Dimanche de la Résurrection 2027.', emoji: '🌅', color: '#f59e0b' },
  { slug: 'paques-orthodoxe-2027', name: 'Pâques orthodoxe 2027', faith: 'orthodox', category: 'fete-majeure', startsAt: '2027-05-02T00:00:00Z', description: 'Pascha orthodoxe 2027.', emoji: '☦️', color: '#dc2626' },
  { slug: 'ramadan-2027', name: 'Ramadan 2027', faith: 'muslim', category: 'ramadan', startsAt: '2027-02-07T00:00:00Z', endsAt: '2027-03-08T23:59:59Z', duration: 30, description: 'Mois de jeûne 2027.', emoji: '🌙', color: '#10b981' },
  { slug: 'aid-fitr-2027', name: 'Aïd al-Fitr 2027', faith: 'muslim', category: 'fete-majeure', startsAt: '2027-03-09T00:00:00Z', description: 'Fête de la rupture du jeûne 2027.', emoji: '🌙', color: '#059669' },
  { slug: 'roch-hachana-2027', name: 'Roch Hachana 2027', faith: 'jewish', category: 'fete-majeure', startsAt: '2027-10-02T00:00:00Z', endsAt: '2027-10-04T23:59:59Z', duration: 2, description: 'Nouvel an juif 2027.', emoji: '🍯', color: '#fbbf24' },
  { slug: 'yom-kippour-2027', name: 'Yom Kippour 2027', faith: 'jewish', category: 'jeune', startsAt: '2027-10-11T00:00:00Z', description: 'Grand Pardon 2027.', emoji: '🕊️', color: '#1e40af' },
  { slug: 'hanouka-2027', name: 'Hanouka 2027', faith: 'jewish', category: 'fete-majeure', startsAt: '2027-12-25T00:00:00Z', endsAt: '2028-01-01T23:59:59Z', duration: 8, description: 'Fête des Lumières 2027.', emoji: '🕎', color: '#3b82f6' },
  { slug: 'diwali-2027', name: 'Diwali 2027', faith: 'hindu', category: 'fete-majeure', startsAt: '2027-10-29T00:00:00Z', description: 'Festival des Lumières 2027.', emoji: '🪔', color: '#fbbf24' },
  { slug: 'noel-2027', name: 'Noël 2027', faith: 'catholic', category: 'fete-majeure', startsAt: '2027-12-25T00:00:00Z', description: 'Naissance du Christ.', emoji: '🎄', color: '#dc2626' },
  { slug: 'vesak-2027', name: 'Vesak 2027', faith: 'buddhist', category: 'fete-majeure', startsAt: '2027-05-19T00:00:00Z', description: 'Pleine lune Vesak 2027.', emoji: '🪷', color: '#f59e0b' }
];

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let created = 0;
  let skipped = 0;
  const errors: any[] = [];

  for (const seed of SEEDS) {
    try {
      const exists = await (prisma as any).religiousEvent?.findUnique({ where: { slug: seed.slug } });
      if (exists) { skipped++; continue; }
      await (prisma as any).religiousEvent.create({
        data: {
          slug: seed.slug,
          name: seed.name,
          faith: seed.faith,
          category: seed.category,
          dateMode: 'fixed',
          startsAt: new Date(seed.startsAt),
          endsAt: seed.endsAt ? new Date(seed.endsAt) : null,
          duration: seed.duration || 1,
          description: seed.description,
          inclusivityNote: seed.inclusivityNote,
          emoji: seed.emoji,
          color: seed.color,
          published: true
        }
      });
      created++;
    } catch (e: any) {
      errors.push({ slug: seed.slug, error: e?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({
    ok: true,
    seeds: SEEDS.length,
    created,
    skipped,
    errors,
    message: `${created} fêtes religieuses créées, ${skipped} déjà présentes. ${errors.length} erreurs.`
  });
}

export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const byFaith: Record<string, number> = {};
  for (const seed of SEEDS) byFaith[seed.faith] = (byFaith[seed.faith] || 0) + 1;
  return NextResponse.json({ totalSeeds: SEEDS.length, byFaith });
}
