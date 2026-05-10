import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEEDS = [
  {
    name: 'B2B — Salon mariage (cold email)',
    type: 'b2b-email',
    category: 'wedding-b2b',
    subject: 'Partenariat photo — Salon Mariage [city]',
    body: `Bonjour {{firstName}},

Je suis Arnaud, photographe de mariage basé à {{city}}.
J'ai vu que vous êtes {{jobTitle}} chez {{company}} —
on se croise sûrement au Salon du Mariage de {{city}} le {{eventDate}}.

J'aurais aimé vous proposer un partenariat photo pour vos clients :
{{portfolioLink}} — offre exclusive partenaire.

Au plaisir de vous rencontrer,
Arnaud — {{phone}} — {{instagramUrl}}

(Si vous préférez ne plus recevoir de mes emails : {{unsubscribeUrl}})`,
    variables: ['firstName', 'jobTitle', 'company', 'city', 'eventDate', 'portfolioLink', 'phone', 'instagramUrl', 'unsubscribeUrl']
  },
  {
    name: 'B2C — DM Instagram futur marié',
    type: 'b2c-dm-insta',
    category: 'wedding-b2c',
    subject: null,
    body: `Coucou {{firstName}} 💍

J'ai vu votre annonce de mariage pour {{weddingDate}} — félicitations !
Je suis photographe de mariage à {{city}}, je serais ravi de vous montrer mon style en 30 sec : {{portfolioReel}}
Si jamais vous cherchez encore un photographe ✨`,
    variables: ['firstName', 'weddingDate', 'city', 'portfolioReel']
  },
  {
    name: 'B2B — Reply après salon',
    type: 'b2b-email',
    category: 'wedding-b2b',
    subject: 'Ravi de notre rencontre au salon !',
    body: `Bonjour {{firstName}},

Ravi d'avoir échangé avec vous au Salon du Mariage de {{city}} !
Comme convenu, voici mon portfolio : {{portfolioLink}}
+ une sélection de réalisations que vos clients pourraient apprécier : {{galleryLink}}

Je vous propose une réduction de 15% sur la 1re collaboration.

À très vite,
Arnaud`,
    variables: ['firstName', 'city', 'portfolioLink', 'galleryLink']
  },
  {
    name: 'B2C — Comment Instagram doux',
    type: 'b2c-dm-insta',
    category: 'wedding-b2c',
    subject: null,
    body: `J'adore votre projet, vos couleurs sont magnifiques 🌸
Si l'envie d'une session photo pré-mariage vous traverse l'esprit, jetez un œil à mon profil 📸`,
    variables: []
  },
  {
    name: 'Newsletter — Welcome',
    type: 'newsletter',
    category: 'general',
    subject: 'Bienvenue dans la communauté !',
    body: `Hello {{firstName}},

Merci de rejoindre notre liste !
Tu vas recevoir 1 newsletter / mois avec mes meilleurs reportages mariage.

À très vite,
Arnaud`,
    variables: ['firstName']
  }
];

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let created = 0;
  let skipped = 0;
  for (const t of SEEDS) {
    const existing = await (prisma as any).emailTemplate.findFirst({ where: { name: t.name } });
    if (existing) {
      skipped++;
      continue;
    }
    await (prisma as any).emailTemplate.create({ data: t });
    created++;
  }
  return NextResponse.json({ ok: true, created, skipped, total: SEEDS.length });
}
