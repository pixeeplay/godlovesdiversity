import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/seed-camino
 * Pré-remplit 5 chemins de pèlerinage avec leurs étapes principales.
 * Idempotent (slug unique).
 */

interface PathSeed {
  slug: string;
  name: string;
  faith: string;
  totalKm: number;
  description: string;
  emoji: string;
  color: string;
  startCity: string;
  endCity: string;
  steps: { order: number; name: string; kmFromStart: number; description: string; scriptureQuote?: string }[];
}

const PATHS: PathSeed[] = [
  {
    slug: 'compostelle',
    name: 'Compostelle — Camino Francés',
    faith: 'catholic',
    totalKm: 800,
    description: 'Le plus emblématique des chemins de pèlerinage chrétien. 800 km depuis Saint-Jean-Pied-de-Port jusqu\'à Saint-Jacques-de-Compostelle.',
    emoji: '🌟',
    color: '#fbbf24',
    startCity: 'Saint-Jean-Pied-de-Port',
    endCity: 'Santiago de Compostela',
    steps: [
      { order: 1, name: 'Saint-Jean-Pied-de-Port', kmFromStart: 0, description: 'Point de départ traditionnel français.', scriptureQuote: 'Marche en ma présence et sois sans reproche. — Genèse 17,1' },
      { order: 2, name: 'Roncesvalles', kmFromStart: 27, description: 'Premier monastère après les Pyrénées.', scriptureQuote: 'Le Seigneur est mon berger, je ne manque de rien. — Psaume 23' },
      { order: 3, name: 'Pamplona', kmFromStart: 75, description: 'Capitale de la Navarre.', scriptureQuote: 'Heureux ceux qui ont faim et soif de la justice. — Mt 5,6' },
      { order: 4, name: 'Logroño', kmFromStart: 168, description: 'Capitale de La Rioja, terre des vins.', scriptureQuote: 'Que la paix de Dieu garde vos cœurs. — Ph 4,7' },
      { order: 5, name: 'Burgos', kmFromStart: 280, description: 'Cathédrale gothique majeure.', scriptureQuote: 'Mes pensées ne sont pas vos pensées. — Is 55,8' },
      { order: 6, name: 'León', kmFromStart: 489, description: 'Mi-parcours, ville historique.', scriptureQuote: 'Aimez-vous les uns les autres. — Jn 13,34' },
      { order: 7, name: 'Astorga', kmFromStart: 535, description: 'Palais épiscopal de Gaudí.', scriptureQuote: 'Il n\'y a plus ni Juif ni Grec, ni homme ni femme — Ga 3,28' },
      { order: 8, name: 'O Cebreiro', kmFromStart: 632, description: 'Entrée en Galice, montagnes brumeuses.', scriptureQuote: 'Marche dans la lumière. — 1 Jn 1,7' },
      { order: 9, name: 'Sarria', kmFromStart: 695, description: 'Étape clé pour la Compostela (100 derniers km).', scriptureQuote: 'Cherchez et vous trouverez. — Mt 7,7' },
      { order: 10, name: 'Santiago de Compostela', kmFromStart: 800, description: 'Tombeau de l\'apôtre Jacques. Cathédrale baroque.', scriptureQuote: 'J\'ai combattu le bon combat, j\'ai achevé la course. — 2 Tm 4,7' }
    ]
  },
  {
    slug: 'jerusalem',
    name: 'Pèlerinage de Jérusalem',
    faith: 'interfaith',
    totalKm: 200,
    description: 'Pèlerinage symbolique inter-religieux dans la Vieille Ville : Mur des Lamentations, Saint-Sépulcre, Esplanade des Mosquées.',
    emoji: '🕊️',
    color: '#3b82f6',
    startCity: 'Mont des Oliviers',
    endCity: 'Mur des Lamentations',
    steps: [
      { order: 1, name: 'Mont des Oliviers', kmFromStart: 0, description: 'Vue panoramique sur la Vieille Ville.', scriptureQuote: 'Trois religions, un même Dieu de l\'amour.' },
      { order: 2, name: 'Jardin de Gethsémani', kmFromStart: 5, description: 'Lieu de la prière de Jésus.', scriptureQuote: 'Que ta volonté soit faite. — Mt 26,42' },
      { order: 3, name: 'Saint-Sépulcre', kmFromStart: 30, description: 'Tombeau du Christ.', scriptureQuote: 'Il est ressuscité, il n\'est pas ici. — Mc 16,6' },
      { order: 4, name: 'Via Dolorosa', kmFromStart: 60, description: '14 stations du chemin de croix.' },
      { order: 5, name: 'Esplanade des Mosquées (Haram al-Sharif)', kmFromStart: 100, description: 'Dôme du Rocher + Mosquée al-Aqsa.', scriptureQuote: 'Pas de contrainte en religion. — Coran 2,256' },
      { order: 6, name: 'Mur des Lamentations (Kotel)', kmFromStart: 150, description: 'Vestige du Second Temple.', scriptureQuote: 'Aime ton prochain comme toi-même. — Vayikra 19,18' },
      { order: 7, name: 'Cénacle (Mont Sion)', kmFromStart: 200, description: 'Lieu de la dernière Cène. Inter-religieux.', scriptureQuote: 'Là où deux ou trois sont rassemblés en mon nom, je suis au milieu d\'eux. — Mt 18,20' }
    ]
  },
  {
    slug: 'benares',
    name: 'Bénarès — Sept Lieux Saints',
    faith: 'hindu',
    totalKm: 50,
    description: 'Bénarès (Varanasi), la ville la plus sacrée de l\'hindouisme, sur les rives du Gange.',
    emoji: '🕉️',
    color: '#ec4899',
    startCity: 'Assi Ghat',
    endCity: 'Manikarnika Ghat',
    steps: [
      { order: 1, name: 'Assi Ghat', kmFromStart: 0, description: 'Confluence Assi+Ganga, ghat sacré.' },
      { order: 2, name: 'Tulsi Ghat', kmFromStart: 8, description: 'Lieu de Tulsidas, poète du Ramayana.' },
      { order: 3, name: 'Dashashwamedh Ghat', kmFromStart: 20, description: 'Aarti quotidienne — cérémonie du feu au crépuscule.' },
      { order: 4, name: 'Vishwanath Temple', kmFromStart: 30, description: 'Temple d\'Or, dédié à Shiva.' },
      { order: 5, name: 'Kashi Vishwanath', kmFromStart: 40, description: 'L\'un des 12 Jyotirlingas.' },
      { order: 6, name: 'Manikarnika Ghat', kmFromStart: 50, description: 'Crémations sacrées — moksha (libération).' }
    ]
  },
  {
    slug: 'shikoku',
    name: 'Shikoku — Pèlerinage des 88 temples',
    faith: 'buddhist',
    totalKm: 1200,
    description: 'Pèlerinage bouddhiste japonais traditionnel — 88 temples sur l\'île de Shikoku, sur les pas de Kūkai.',
    emoji: '☸️',
    color: '#f59e0b',
    startCity: 'Ryōzen-ji',
    endCity: 'Ōkubo-ji',
    steps: [
      { order: 1, name: 'Ryōzen-ji (1er temple)', kmFromStart: 0, description: 'Mont sacré du départ, près de Tokushima.', scriptureQuote: 'Qui regarde une fleur entre dans le silence du Bouddha.' },
      { order: 2, name: 'Anraku-ji (6e temple)', kmFromStart: 50, description: 'Temple "tranquillité paisible".' },
      { order: 3, name: 'Iyadani-ji (71e temple)', kmFromStart: 800, description: 'Cascades sacrées.' },
      { order: 4, name: 'Zentsū-ji (75e temple)', kmFromStart: 950, description: 'Lieu de naissance de Kūkai.', scriptureQuote: 'La forme est vide, le vide est forme. — Sutra du Cœur' },
      { order: 5, name: 'Ōkubo-ji (88e temple)', kmFromStart: 1200, description: 'Achèvement du pèlerinage.', scriptureQuote: 'Toutes les choses naissent et passent. Cherchez votre propre libération avec diligence. — Bouddha' }
    ]
  },
  {
    slug: 'mecque-virtuelle',
    name: 'Hajj symbolique — Pèlerinage de la Mecque',
    faith: 'muslim',
    totalKm: 100,
    description: 'Pèlerinage virtuel inclusif — étapes symboliques du Hajj. (Le Hajj physique est réservé aux musulmans, ce parcours est purement spirituel et inter-religieux d\'apprentissage.)',
    emoji: '☪️',
    color: '#059669',
    startCity: 'Mecque',
    endCity: 'Médine',
    steps: [
      { order: 1, name: 'Tawaf — Kaaba', kmFromStart: 0, description: '7 tours autour de la Kaaba.', scriptureQuote: 'Tournez vos visages vers la Mosquée Sacrée. — Coran 2,144' },
      { order: 2, name: 'Sa\'i — Safa et Marwa', kmFromStart: 5, description: 'Marche entre les deux collines.', scriptureQuote: 'En vérité, Safa et Marwa sont parmi les rites de Dieu. — Coran 2,158' },
      { order: 3, name: 'Mont Arafat', kmFromStart: 25, description: 'Wuquf — station principale du Hajj.', scriptureQuote: 'Aujourd\'hui J\'ai parachevé pour vous votre religion. — Coran 5,3' },
      { order: 4, name: 'Muzdalifah', kmFromStart: 50, description: 'Nuit en plein air.' },
      { order: 5, name: 'Mina — Jamarat', kmFromStart: 70, description: 'Lapidation symbolique de Satan.' },
      { order: 6, name: 'Médine — Mosquée du Prophète', kmFromStart: 100, description: 'Tombeau du Prophète Muhammad ﷺ.', scriptureQuote: 'Le meilleur d\'entre vous est celui qui est le meilleur envers les autres. — Hadith' }
    ]
  }
];

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let createdPaths = 0, createdSteps = 0, skipped = 0;
  for (const p of PATHS) {
    try {
      const exists = await (prisma as any).caminoPath.findUnique({ where: { slug: p.slug } });
      if (exists) { skipped++; continue; }
      const created = await (prisma as any).caminoPath.create({
        data: {
          slug: p.slug, name: p.name, faith: p.faith, totalKm: p.totalKm,
          description: p.description, emoji: p.emoji, color: p.color,
          startCity: p.startCity, endCity: p.endCity, published: true
        }
      });
      createdPaths++;
      for (const s of p.steps) {
        await (prisma as any).caminoStep.create({
          data: {
            pathId: created.id, order: s.order, name: s.name,
            kmFromStart: s.kmFromStart, description: s.description,
            scriptureQuote: s.scriptureQuote
          }
        });
        createdSteps++;
      }
    } catch {}
  }

  return NextResponse.json({ ok: true, createdPaths, createdSteps, skipped, total: PATHS.length });
}
