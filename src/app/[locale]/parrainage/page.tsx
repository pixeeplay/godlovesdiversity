import Link from 'next/link';
import { Gift, Users, Award, Share2 } from 'lucide-react';

export const metadata = { title: 'Programme parrainage — GLD' };

export default function P() {
  return (
    <main className="container-wide py-12 max-w-3xl">
      <header className="text-center mb-8">
        <div className="inline-block bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 rounded-2xl p-3 mb-3">
          <Gift size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-4xl mb-2">Programme parrainage</h1>
        <p className="text-zinc-400 max-w-xl mx-auto">Invite tes ami·es. Quand 3 d'entre eux rejoignent GLD, tu débloques le badge Ambassadeur·rice + 10€ de réduc shop.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        {[
          { Icon: Users, n: 1, label: 'Crée ton lien unique', desc: 'Connecte-toi puis viens ici pour générer ton code' },
          { Icon: Share2, n: 2, label: 'Partage-le', desc: 'Aux ami·es, sur Insta/TikTok/Telegram' },
          { Icon: Award, n: 3, label: 'Récolte tes badges', desc: '3 inscrits = badge Ambassadeur·rice + bon 10€' }
        ].map((s, i) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <s.Icon size={24} className="text-fuchsia-400 mx-auto mb-2" />
            <div className="text-[10px] uppercase font-bold text-zinc-400">Étape {s.n}</div>
            <div className="font-bold text-sm mt-1">{s.label}</div>
            <div className="text-[11px] text-zinc-400 mt-1">{s.desc}</div>
          </div>
        ))}
      </div>

      <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-2xl p-5 text-center">
        <p className="text-sm text-zinc-200 mb-3">Pour générer ton lien unique, tu dois d'abord avoir un compte GLD :</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link href="/inscription" className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold px-5 py-2 rounded-full text-sm">Créer un compte</Link>
          <Link href="/admin/login" className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-5 py-2 rounded-full text-sm">Se connecter</Link>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mt-5">
        <h2 className="font-bold text-sm mb-2">🏅 Badges disponibles</h2>
        <ul className="text-xs text-zinc-300 space-y-1.5">
          <li>🌱 <strong>Témoin</strong> — 1er post sur le forum ou témoignage</li>
          <li>💗 <strong>Soutien</strong> — 10 cœurs « je suis là pour toi » donnés</li>
          <li>👼 <strong>Ange gardien</strong> — 5 réponses peer-help</li>
          <li>📣 <strong>Ambassadeur·rice</strong> — 3 ami·es parrainés ou 100 partages</li>
          <li>✨ <strong>Veilleur·se</strong> — 1 an d'activité régulière</li>
        </ul>
      </div>
    </main>
  );
}
