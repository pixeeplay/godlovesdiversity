import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/page-builder/seed-demo
 * Crée une page de démo /demo-parallax-photo avec parallax-hero + slider
 * + photos + vidéo + tous les types de blocs pour montrer ce qui est possible.
 */

const DEMO_BLOCKS = [
  {
    type: 'parallax-hero',
    width: 'full',
    effect: 'wow-arrival',
    effectDelay: 0,
    data: {
      title: 'God Loves Diversity',
      subtitle: 'Une communauté inclusive où chaque foi rencontre chaque amour',
      ctaLabel: 'Découvrir',
      ctaHref: '/about',
      bgImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920',
      midImage: '',
      fgImage: '',
      floatingText: 'INCLUSIVE',
      bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)',
      overlayColor: 'rgba(0,0,0,0.35)',
      height: '90vh'
    }
  },
  {
    type: 'text',
    width: 'full',
    effect: 'fade-up',
    effectDelay: 100,
    data: {
      html: '<h2>Bienvenue dans un espace de foi et d\'amour</h2><p>Depuis sa naissance, <strong>God Loves Diversity</strong> rassemble celles et ceux qui refusent le choix entre leur foi et leur identité. Notre mouvement interreligieux est ouvert à toutes les confessions, à toutes les orientations, à toutes les histoires.</p><p>Ici, on prie. On s\'écoute. On apprend. Et surtout, on se sent <em>chez soi</em>.</p>'
    }
  },
  {
    type: 'parallax-slider',
    width: 'full',
    effect: 'fade-in',
    effectDelay: 200,
    data: {
      slides: [
        {
          title: 'Foi',
          subtitle: 'Communauté inclusive',
          tagline: '01 / 04',
          image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200',
          ctaLabel: 'En savoir plus',
          ctaHref: '/about',
          accentColor: '#d946ef'
        },
        {
          title: 'Liberté',
          subtitle: 'Sans jugement',
          tagline: '02 / 04',
          image: 'https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=1200',
          ctaLabel: 'Notre vision',
          ctaHref: '/message',
          accentColor: '#06b6d4'
        },
        {
          title: 'Amour',
          subtitle: 'Sans frontières',
          tagline: '03 / 04',
          image: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1200',
          ctaLabel: 'Rejoindre',
          ctaHref: '/parrainage',
          accentColor: '#f59e0b'
        },
        {
          title: 'Espoir',
          subtitle: 'Pour tous',
          tagline: '04 / 04',
          image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1200',
          ctaLabel: 'Témoigner',
          ctaHref: '/journal',
          accentColor: '#10b981'
        }
      ],
      height: '85vh',
      autoplay: true,
      autoplayDelay: 6500
    }
  },
  {
    type: 'text',
    width: 'full',
    effect: 'gradient-flow',
    effectDelay: 300,
    data: {
      html: '<h2>Quatre vérités simples</h2><p>Ce qui nous porte. Ce qui nous unit. Ce que nous défendons devant le monde.</p>'
    }
  },
  {
    type: 'columns',
    width: 'full',
    effect: 'stagger-list',
    effectDelay: 400,
    data: {
      columns: [
        { html: '<h3>🙏 Foi</h3><p>Ta relation à Dieu (ou à l\'absolu) t\'appartient. Aucune institution n\'a le monopole de l\'amour.</p>' },
        { html: '<h3>🌈 Diversité</h3><p>Toutes les orientations, identités, parcours sont des dons. Le 6e jour, Dieu a créé la pluralité.</p>' },
        { html: '<h3>💞 Amour</h3><p>L\'amour authentique entre adultes consentants est sacré. Toujours. Sans exception.</p>' },
        { html: '<h3>🤝 Communauté</h3><p>On s\'écoute, on s\'entraide, on prie ensemble. Personne ne marche seul·e.</p>' }
      ]
    }
  },
  {
    type: 'image',
    width: '2/3',
    effect: 'zoom-in',
    effectDelay: 500,
    data: {
      src: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=1600',
      alt: 'Communauté en cercle de prière'
    }
  },
  {
    type: 'image',
    width: '1/3',
    effect: 'zoom-in',
    effectDelay: 600,
    data: {
      src: 'https://images.unsplash.com/photo-1593696954577-ab3d39317b97?w=800',
      alt: 'Bougie allumée'
    }
  },
  {
    type: 'text',
    width: 'full',
    effect: 'blur-in',
    effectDelay: 700,
    data: {
      html: '<h2>Notre communauté en mouvement</h2><p>Découvre comment les membres se rassemblent à travers le monde — du <strong>cercle de prière de Paris</strong> aux <strong>retraites silencieuses des Pyrénées</strong>, des <strong>groupes étudiants à Lyon</strong> aux <strong>veillées œcuméniques de Marseille</strong>.</p>'
    }
  },
  {
    type: 'video',
    width: 'full',
    effect: 'fade-in',
    effectDelay: 800,
    data: {
      src: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    }
  },
  {
    type: 'text',
    width: 'full',
    effect: 'fade-up',
    effectDelay: 900,
    data: {
      html: '<h2>Rejoins le mouvement</h2><p>Parraine 3 personnes ce mois-ci. Reçois un kit de bienvenue + 1 mois Premium offert. <em>Plus on est, plus le message porte.</em></p>'
    }
  },
  {
    type: 'cta',
    width: 'full',
    effect: 'bounce-in',
    effectDelay: 1000,
    data: {
      label: '🌈 Devenir membre',
      href: '/membre-plus'
    }
  },
  {
    type: 'spacer',
    width: 'full',
    effect: null,
    effectDelay: null,
    data: { height: 40 }
  }
];

export async function POST() {
  const s = await getServerSession(authOptions);
  if (!s || !['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const slug = 'demo-parallax-photo';

  // Replace
  await (prisma as any).pageBlock.deleteMany({ where: { pageSlug: slug } });

  let created = 0;
  for (let i = 0; i < DEMO_BLOCKS.length; i++) {
    const b = DEMO_BLOCKS[i];
    await (prisma as any).pageBlock.create({
      data: {
        pageSlug: slug,
        position: i,
        width: b.width,
        height: 'auto',
        type: b.type,
        data: b.data,
        effect: b.effect,
        effectDelay: b.effectDelay,
        visible: true
      }
    });
    created++;
  }

  return NextResponse.json({ ok: true, slug, blocksCount: created });
}
