import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/seed-officiants
 * Pré-remplit ~12 officiants LGBT-friendly publics et historiques.
 * Idempotent (par name unique).
 */

interface OfficiantSeed {
  name: string;
  faith: string;
  role: string;
  affiliations: string[];
  city?: string;
  country?: string;
  email?: string;
  website?: string;
  bio: string;
  servicesOffered: string[];
  languages: string[];
  verified: boolean;
}

const SEEDS: OfficiantSeed[] = [
  {
    name: 'Père James Martin SJ',
    faith: 'catholic',
    role: 'Prêtre jésuite',
    affiliations: ['New Ways Ministry', 'Outreach (LGBT Catholic ministry)'],
    city: 'New York',
    country: 'US',
    website: 'https://outreach.faith',
    bio: 'Auteur de "Building a Bridge" (2017) sur l\'accueil pastoral des personnes LGBT+ dans l\'Église catholique. Conseiller du Vatican depuis 2017.',
    servicesOffered: ['bénédiction', 'accompagnement', 'rite-passage'],
    languages: ['en', 'es'],
    verified: true
  },
  {
    name: 'Père Krzysztof Charamsa',
    faith: 'catholic',
    role: 'Théologien',
    affiliations: [],
    country: 'IT',
    bio: 'Théologien polonais, ancien congrégation pour la doctrine de la foi. Coming-out public 2015. Auteur "La première pierre".',
    servicesOffered: ['bénédiction', 'accompagnement'],
    languages: ['it', 'pl', 'en'],
    verified: true
  },
  {
    name: 'David et Jonathan',
    faith: 'catholic',
    role: 'Mouvement chrétien LGBT',
    affiliations: ['David & Jonathan'],
    city: 'Paris',
    country: 'FR',
    website: 'https://www.davidetjonathan.com',
    bio: 'Mouvement chrétien LGBT français fondé en 1972. Cercle de prière catholique inclusif chaque mardi 20h. Bénédictions de couples.',
    servicesOffered: ['bénédiction', 'accompagnement', 'rite-passage'],
    languages: ['fr'],
    verified: true
  },
  {
    name: 'Carrefour des Chrétiens Inclusifs (CCI)',
    faith: 'protestant',
    role: 'Réseau pasteurs protestants',
    affiliations: ['CCI', 'Église protestante unie de France'],
    city: 'Paris',
    country: 'FR',
    website: 'https://www.carrefour-cci.org',
    bio: 'Réseau de pasteurs protestants inclusifs en France. Bénissent les unions LGBT depuis 2015 dans la lignée de l\'EPUdF.',
    servicesOffered: ['mariage', 'baptême', 'funérailles', 'bénédiction'],
    languages: ['fr'],
    verified: true
  },
  {
    name: 'Rabbi Steven Greenberg',
    faith: 'jewish',
    role: 'Rabbin orthodoxe',
    affiliations: ['Eshel', 'Reconstructionist Rabbinical College'],
    city: 'Boston',
    country: 'US',
    website: 'https://www.eshelonline.org',
    bio: 'Premier rabbin orthodoxe ouvertement gay, auteur de "Wrestling with God and Men". Co-fondateur d\'Eshel pour les juifs orthodoxes LGBT+.',
    servicesOffered: ['mariage', 'rite-passage', 'accompagnement'],
    languages: ['en', 'he'],
    verified: true
  },
  {
    name: 'Beit Haverim',
    faith: 'jewish',
    role: 'Communauté juive LGBT française',
    affiliations: ['Beit Haverim'],
    city: 'Paris',
    country: 'FR',
    website: 'https://beit-haverim.com',
    bio: 'Plus ancienne communauté juive LGBT de France (1977). Offices Shabbat inclusifs, mariages, conversions, bar/bat mitzvah accessibles à toutes identités.',
    servicesOffered: ['mariage', 'baptême', 'rite-passage', 'conversion'],
    languages: ['fr', 'he'],
    verified: true
  },
  {
    name: 'Beit Simchat Torah',
    faith: 'jewish',
    role: 'Synagogue LGBT',
    affiliations: ['Congregation Beit Simchat Torah'],
    city: 'New York',
    country: 'US',
    website: 'https://cbst.org',
    bio: 'Synagogue mondiale LGBT fondée en 1973. Mariages, bar/bat mitzvah, conversions. Plus de 1000 membres.',
    servicesOffered: ['mariage', 'rite-passage', 'conversion', 'funérailles'],
    languages: ['en', 'he'],
    verified: true
  },
  {
    name: 'HM2F (Homosexuel·les Musulman·es de France)',
    faith: 'muslim',
    role: 'Imam·e progressistes',
    affiliations: ['HM2F'],
    city: 'Paris',
    country: 'FR',
    website: 'https://hm2f.org',
    bio: 'Association musulmane LGBT française. Cercles de prière inclusifs chaque vendredi 21h. Imam·es progressistes pour mariages, conseils spirituels.',
    servicesOffered: ['mariage', 'bénédiction', 'accompagnement'],
    languages: ['fr', 'ar'],
    verified: true
  },
  {
    name: 'Imam Ludovic-Mohamed Zahed',
    faith: 'muslim',
    role: 'Imam',
    affiliations: ['Mosquée Ibn Rushd-Goethe', 'CALEM'],
    city: 'Marseille',
    country: 'FR',
    bio: 'Premier imam ouvertement gay en France et Europe (2012). Fondateur du CALEM (Conseil des Associations LGBT Musulmanes). Co-officie mariages mixtes et inclusifs.',
    servicesOffered: ['mariage', 'bénédiction', 'rite-passage'],
    languages: ['fr', 'ar', 'en'],
    verified: true
  },
  {
    name: 'Imame Seyran Ateş',
    faith: 'muslim',
    role: 'Imame',
    affiliations: ['Mosquée Ibn Rushd-Goethe Berlin'],
    city: 'Berlin',
    country: 'DE',
    bio: 'Imame turco-allemande, fondatrice de la première mosquée libérale d\'Europe (2017). Mixité hommes-femmes, accueil LGBT, lecture critique du Coran.',
    servicesOffered: ['mariage', 'bénédiction'],
    languages: ['de', 'tr', 'en'],
    verified: true
  },
  {
    name: 'Réseau Galva-108',
    faith: 'hindu',
    role: 'Référents hindous LGBT',
    affiliations: ['Galva-108', 'Trikone'],
    country: 'IN',
    website: 'https://galva108.org',
    bio: 'Réseau international hindou LGBT. Cercles de prière mercredi 20h. Mariages hindous inclusifs, rituels samskar.',
    servicesOffered: ['mariage', 'rite-passage', 'bénédiction'],
    languages: ['en', 'hi', 'fr'],
    verified: true
  },
  {
    name: 'Sangha Inclusive Européenne',
    faith: 'buddhist',
    role: 'Maître·sse zen',
    affiliations: ['Sangha Inclusive Européenne', 'Shasta Abbey'],
    country: 'FR',
    bio: 'Maître·sses zen et vipassana enseignant le Dharma dans une perspective inclusive LGBT. Méditations en visio dimanche 19h.',
    servicesOffered: ['bénédiction', 'rite-passage', 'accompagnement'],
    languages: ['fr', 'en'],
    verified: true
  }
];

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let created = 0;
  let skipped = 0;
  for (const seed of SEEDS) {
    try {
      const exists = await (prisma as any).inclusiveOfficiant.findFirst({ where: { name: seed.name } });
      if (exists) { skipped++; continue; }
      await (prisma as any).inclusiveOfficiant.create({
        data: { ...seed, published: true }
      });
      created++;
    } catch {}
  }
  return NextResponse.json({
    ok: true,
    seeds: SEEDS.length,
    created,
    skipped,
    message: `${created} officiant·es créé·es, ${skipped} déjà présent·es.`
  });
}
