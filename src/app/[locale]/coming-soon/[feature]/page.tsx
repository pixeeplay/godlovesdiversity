import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

const FEATURES: Record<string, { title: string; desc: string; eta: string }> = {
  'mentor': { title: '👥 Mentor·e LGBT 1-1', desc: 'Matching anonyme jeune ↔ ainé·e LGBT pour 4 conversations Zoom.', eta: 'Roadmap Q3 2026' },
  'cercles-priere': { title: '🙏 Cercles de prière inclusifs', desc: 'Groupes par tradition (catholique, juive, musulmane…) avec chat planifié.', eta: 'Roadmap Q3 2026' },
  'meetups': { title: '📍 Rencontres IRL', desc: 'Apéros, marches, cafés théologiques géolocalisés avec RSVP.', eta: 'Roadmap Q4 2026' },
  'mode-calculatrice': { title: '🔢 Mode calculatrice', desc: 'Pour les pays hostiles : l\'app ressemble à une calculatrice, code pour ouvrir GLD.', eta: 'Roadmap H2 2026' },
  'signalement': { title: '🚩 Signalement collaboratif', desc: 'Carte anonyme des lieux/personnes dangereux pour LGBT (modérée).', eta: 'Roadmap Q2 2026' },
  'hebergement': { title: '🏠 Réseau hébergement urgence', desc: 'Hôtes proposent canapé 1-3 nuits pour LGBT en danger (style Refugees Welcome).', eta: 'Roadmap Q3 2026' },
  'membre-plus': { title: '⭐ Abonnement Membre+', desc: '4€/mois : badges, accès anticipé events, statistiques perso, sans pub.', eta: 'Roadmap Q3 2026' },
  'marketplace': { title: '🛍 Marketplace artisans LGBT', desc: 'Créateur·rices indépendant·es vendent leurs œuvres, GLD prend 8%.', eta: 'Roadmap Q4 2026' },
  'crowdfunding': { title: '💰 Crowdfunding intégré', desc: 'Projets LGBT (films, livres, assos) lancent des campagnes sur GLD.', eta: 'Roadmap 2027' },
  'voice-coach': { title: '🎙 Voice Coach coming-out', desc: 'Avatar vocal qui simule conversations difficiles (parents, employeur).', eta: 'Roadmap Q2 2026' },
  'temoignage-ia': { title: '🎬 Témoignage vidéo IA', desc: 'Tu écris ton histoire en texte, l\'avatar GLD la lit en vidéo personnalisée.', eta: 'Roadmap Q3 2026' },
  'gld-local': { title: '🌆 GLD Local par ville', desc: 'Pages dédiées Paris/Lyon/Bruxelles/Berlin/NYC avec leur rédac et leurs events.', eta: 'Roadmap H2 2026' },
  'traduction-live': { title: '🌐 Traduction temps réel peer-help', desc: 'Un·e Brésilien·ne soutient un·e Français·e, l\'IA traduit en live.', eta: 'Roadmap Q2 2026' },
  'wrapped': { title: '✨ Wrapped GLD annuel', desc: 'Recap fin d\'année style Spotify : tes témoignages, soutiens, partages.', eta: 'Roadmap Décembre 2026' },
  'widget': { title: '🔌 Widget embeddable', desc: '<script src="gld.js"> pour afficher derniers témoignages sur d\'autres sites.', eta: 'Roadmap Q2 2026' }
};

export default async function ComingSoon({ params }: { params: Promise<{ feature: string }> }) {
  const { feature } = await params;
  const f = FEATURES[feature] || { title: 'Bientôt', desc: 'Fonctionnalité en cours de développement.', eta: 'À venir' };
  return (
    <main className="container-wide py-20 max-w-2xl text-center">
      <Link href="/" className="text-fuchsia-400 hover:underline text-sm flex items-center gap-1 justify-center mb-6"><ArrowLeft size={14} /> Retour à l'accueil</Link>
      <div className="inline-block bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3">
        <Sparkles size={28} className="text-white" />
      </div>
      <h1 className="font-display font-bold text-3xl mb-3">{f.title}</h1>
      <p className="text-zinc-400 mb-4">{f.desc}</p>
      <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-3 inline-block text-sm text-fuchsia-200">⏳ {f.eta}</div>
      <p className="text-[11px] text-zinc-500 mt-6">Cette feature est dans la roadmap GLD V3. Tu veux qu'on accélère ? <Link href="/contact" className="underline">Contacte-nous</Link>.</p>
    </main>
  );
}
