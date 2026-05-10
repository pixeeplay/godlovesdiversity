import { prisma } from '@/lib/prisma';
import { PageBlocksRenderer } from '@/components/PageBlocksRenderer';
import { ParallaxHero } from '@/components/effects/ParallaxHero';
import { ParallaxSlider } from '@/components/effects/ParallaxSlider';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Demo Parallax · GLD' };

/**
 * Page de démo Parallax + Slider + 100 effets.
 *
 * Stratégie :
 *   1. Si des blocs existent en DB pour slug="demo-parallax-photo" → on les rend
 *      via <PageBlocksRenderer/> (l'admin a fait le seed ou la généré via IA).
 *   2. Sinon → on AUTO-SEED en DB ET on affiche un fallback hardcoded pour que
 *      la page ne soit jamais vide au premier passage.
 */
export default async function DemoParallaxPage() {
  let count = 0;
  try {
    count = await (prisma as any).pageBlock.count({
      where: { pageSlug: 'demo-parallax-photo' }
    });
  } catch {}

  // Auto-seed si jamais la table est vide
  if (count === 0) {
    try {
      await autoSeed();
    } catch {}
  }

  // Si on a des blocs maintenant, on rend via PageBlocksRenderer
  let hasBlocks = false;
  try {
    hasBlocks = (await (prisma as any).pageBlock.count({
      where: { pageSlug: 'demo-parallax-photo', visible: true }
    })) > 0;
  } catch {}

  if (hasBlocks) {
    return (
      <main>
        <PageBlocksRenderer pageSlug="demo-parallax-photo" />
      </main>
    );
  }

  // Fallback hardcoded — toujours du contenu, même si la DB n'est pas dispo
  return <FallbackDemoPage />;
}

/**
 * Fallback : la page rendue avec ParallaxHero + ParallaxSlider en dur.
 * Permet d'avoir un rendu immédiat même avant que le seed n'ait tourné.
 */
function FallbackDemoPage() {
  return (
    <main>
      <ParallaxHero
        title="God Loves Diversity"
        subtitle="Une communauté inclusive où chaque foi rencontre chaque amour"
        ctaLabel="Découvrir"
        ctaHref="/about"
        bgImage="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920"
        floatingText="INCLUSIVE"
        bgGradient="linear-gradient(180deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)"
        overlayColor="rgba(0,0,0,0.35)"
        height="90vh"
      />

      <section className="container-wide py-12">
        <div className="max-w-3xl mx-auto prose prose-invert">
          <h2 className="font-display font-bold text-3xl md:text-5xl text-white mb-4">
            Bienvenue dans un espace de foi et d'amour
          </h2>
          <p className="text-zinc-300 text-lg leading-relaxed">
            Depuis sa naissance, <strong className="text-fuchsia-300">God Loves Diversity</strong> rassemble
            celles et ceux qui refusent le choix entre leur foi et leur identité.
            Notre mouvement interreligieux est ouvert à toutes les confessions, à toutes les orientations,
            à toutes les histoires.
          </p>
          <p className="text-zinc-400 mt-3">
            Ici, on prie. On s'écoute. On apprend. Et surtout, on se sent <em>chez soi</em>.
          </p>
        </div>
      </section>

      <ParallaxSlider
        slides={[
          { title: 'Foi',     subtitle: 'Communauté inclusive', tagline: '01 / 04', image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1600', ctaLabel: 'En savoir plus', ctaHref: '/about',   accentColor: '#d946ef' },
          { title: 'Liberté', subtitle: 'Sans jugement',         tagline: '02 / 04', image: 'https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=1600', ctaLabel: 'Notre vision',  ctaHref: '/message', accentColor: '#06b6d4' },
          { title: 'Amour',   subtitle: 'Sans frontières',       tagline: '03 / 04', image: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1600', ctaLabel: 'Rejoindre',     ctaHref: '/parrainage', accentColor: '#f59e0b' },
          { title: 'Espoir',  subtitle: 'Pour tous',             tagline: '04 / 04', image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1600', ctaLabel: 'Témoigner',     ctaHref: '/journal',  accentColor: '#10b981' }
        ]}
        height="85vh"
      />

      <section className="container-wide py-16">
        <div className="text-center mb-10">
          <h2 className="font-display font-black text-3xl md:text-5xl text-white mb-3 bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            Quatre vérités simples
          </h2>
          <p className="text-zinc-400">Ce qui nous porte. Ce qui nous unit.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {[
            { emoji: '🙏', title: 'Foi',         desc: 'Ta relation à Dieu t\'appartient.' },
            { emoji: '🌈', title: 'Diversité',   desc: 'Toutes les identités sont des dons.' },
            { emoji: '💞', title: 'Amour',       desc: 'L\'amour authentique est sacré.' },
            { emoji: '🤝', title: 'Communauté',  desc: 'Personne ne marche seul·e.' }
          ].map((c) => (
            <div key={c.title} className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 text-center hover:ring-fuchsia-500/50 transition gld-fx-card-tilt-3d">
              <div className="text-4xl mb-2">{c.emoji}</div>
              <h3 className="font-bold text-white mb-1">{c.title}</h3>
              <p className="text-xs text-zinc-400">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-wide pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-6xl mx-auto">
          <div className="md:col-span-2 aspect-video rounded-2xl overflow-hidden ring-1 ring-zinc-800 gld-fx-zoom-in gld-fx-active">
            <img src="https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=1600" alt="Communauté" className="w-full h-full object-cover" />
          </div>
          <div className="aspect-video md:aspect-auto rounded-2xl overflow-hidden ring-1 ring-zinc-800 gld-fx-zoom-in gld-fx-active">
            <img src="https://images.unsplash.com/photo-1593696954577-ab3d39317b97?w=800" alt="Bougie" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      <section className="container-wide pb-16 text-center">
        <h2 className="font-display font-bold text-2xl md:text-4xl text-white mb-3">Notre communauté en mouvement</h2>
        <p className="text-zinc-400 max-w-2xl mx-auto mb-6">
          Découvre comment les membres se rassemblent à travers le monde — du <strong className="text-fuchsia-300">cercle de prière de Paris</strong> aux <strong className="text-cyan-300">retraites des Pyrénées</strong>.
        </p>
        <div className="max-w-3xl mx-auto aspect-video rounded-2xl overflow-hidden ring-1 ring-zinc-800">
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ"
            className="w-full h-full"
            title="Vidéo communauté"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </section>

      <section className="container-wide pb-20 text-center">
        <h2 className="font-display font-black text-3xl md:text-5xl text-white mb-4">Rejoins le mouvement</h2>
        <p className="text-zinc-400 max-w-xl mx-auto mb-8">
          Parraine 3 personnes ce mois-ci. Reçois un kit de bienvenue + 1 mois Premium offert.
          <em className="text-zinc-300"> Plus on est, plus le message porte.</em>
        </p>
        <a
          href="/membre-plus"
          className="inline-block bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 hover:scale-105 text-white font-bold px-8 py-4 rounded-full text-base shadow-2xl shadow-fuchsia-500/30 transition gld-fx-bounce-in gld-fx-active"
        >
          🌈 Devenir membre
        </a>
      </section>
    </main>
  );
}

/**
 * Auto-seed : copie de seed-demo route en inline pour ne pas avoir
 * besoin que l'admin appuie sur un bouton.
 */
async function autoSeed() {
  const slug = 'demo-parallax-photo';
  const blocks = [
    {
      type: 'parallax-hero', width: 'full', effect: 'wow-arrival', effectDelay: 0,
      data: {
        title: 'God Loves Diversity',
        subtitle: 'Une communauté inclusive où chaque foi rencontre chaque amour',
        ctaLabel: 'Découvrir', ctaHref: '/about',
        bgImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920',
        floatingText: 'INCLUSIVE',
        bgGradient: 'linear-gradient(180deg, #1e1b4b 0%, #4c1d95 50%, #d946ef 100%)',
        overlayColor: 'rgba(0,0,0,0.35)', height: '90vh'
      }
    },
    {
      type: 'text', width: 'full', effect: 'fade-up', effectDelay: 100,
      data: { html: '<h2>Bienvenue dans un espace de foi et d\'amour</h2><p>Depuis sa naissance, <strong>God Loves Diversity</strong> rassemble celles et ceux qui refusent le choix entre leur foi et leur identité.</p><p>Ici, on prie. On s\'écoute. On apprend. Et surtout, on se sent <em>chez soi</em>.</p>' }
    },
    {
      type: 'parallax-slider', width: 'full', effect: 'fade-in', effectDelay: 200,
      data: {
        height: '85vh', autoplay: true, autoplayDelay: 6500,
        slides: [
          { title: 'Foi',     subtitle: 'Communauté inclusive', tagline: '01 / 04', image: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1600', ctaLabel: 'En savoir plus', ctaHref: '/about',   accentColor: '#d946ef' },
          { title: 'Liberté', subtitle: 'Sans jugement',         tagline: '02 / 04', image: 'https://images.unsplash.com/photo-1517825738774-7de9363ef735?w=1600', ctaLabel: 'Notre vision',  ctaHref: '/message', accentColor: '#06b6d4' },
          { title: 'Amour',   subtitle: 'Sans frontières',       tagline: '03 / 04', image: 'https://images.unsplash.com/photo-1518621736915-f3b1c41bfd00?w=1600', ctaLabel: 'Rejoindre',     ctaHref: '/parrainage', accentColor: '#f59e0b' },
          { title: 'Espoir',  subtitle: 'Pour tous',             tagline: '04 / 04', image: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1600', ctaLabel: 'Témoigner',     ctaHref: '/journal',  accentColor: '#10b981' }
        ]
      }
    },
    {
      type: 'columns', width: 'full', effect: 'stagger-list', effectDelay: 300,
      data: {
        columns: [
          { html: '<h3>🙏 Foi</h3><p>Ta relation à Dieu t\'appartient.</p>' },
          { html: '<h3>🌈 Diversité</h3><p>Toutes les identités sont des dons.</p>' },
          { html: '<h3>💞 Amour</h3><p>L\'amour authentique est sacré.</p>' },
          { html: '<h3>🤝 Communauté</h3><p>Personne ne marche seul·e.</p>' }
        ]
      }
    },
    {
      type: 'image', width: '2/3', effect: 'zoom-in', effectDelay: 400,
      data: { src: 'https://images.unsplash.com/photo-1496062031456-07b8f162a322?w=1600', alt: 'Communauté' }
    },
    {
      type: 'image', width: '1/3', effect: 'zoom-in', effectDelay: 500,
      data: { src: 'https://images.unsplash.com/photo-1593696954577-ab3d39317b97?w=800', alt: 'Bougie' }
    },
    {
      type: 'video', width: 'full', effect: 'fade-in', effectDelay: 600,
      data: { src: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    },
    {
      type: 'cta', width: 'full', effect: 'bounce-in', effectDelay: 700,
      data: { label: '🌈 Devenir membre', href: '/membre-plus' }
    }
  ];

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
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
  }
}
