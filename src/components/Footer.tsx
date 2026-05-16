'use client';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { Instagram, Facebook, Youtube, Twitter, Mail, Heart, FileText, MessageCircle, BookOpen, Sparkles, Send } from 'lucide-react';

type Partner = { id: string; name: string; url: string; logoUrl: string | null };

export function Footer() {
  const [hashtag, setHashtag] = useState('#GodLovesDiversity');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    fetch('/api/branding').then((r) => r.json()).then((j) => {
      if (j.hashtag) setHashtag(j.hashtag);
    }).catch(() => {});
    fetch('/api/partners').then((r) => r.json()).then((j) => {
      setPartners(((j.items || []) as Partner[]).slice(0, 12));
    }).catch(() => {});
  }, []);

  async function subscribe() {
    if (!email.includes('@')) return;
    setBusy(true);
    try {
      const r = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (r.ok) { setSubscribed(true); setEmail(''); }
    } catch {}
    setBusy(false);
  }

  return (
    <footer
      className="border-t border-white/10 mt-20 footer-themed"
      style={{ background: 'var(--footer-bg, linear-gradient(180deg, #050208 0%, #000 100%))' }}
    >
      {/* Grid de colonnes */}
      <div className="container-wide py-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        {/* Col 1 — Brand */}
        <div className="col-span-2 lg:col-span-2">
          <div className="text-brand-pink font-display font-bold tracking-wider text-2xl mb-3">{hashtag}</div>
          <p className="text-sm text-white/60 max-w-xs mb-4">
            Mouvement interreligieux pour l'inclusion LGBT+. Photos, témoignages, ressources et outils pour rendre la foi accueillante partout dans le monde.
          </p>
          <div className="flex items-center gap-3 text-white/70">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition" aria-label="Instagram"><Instagram size={20} /></a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition" aria-label="Facebook"><Facebook size={20} /></a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition" aria-label="TikTok">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6c0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64c0 3.33 2.76 5.7 5.69 5.7c3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48z" />
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition" aria-label="YouTube"><Youtube size={20} /></a>
            <a href="https://x.com" target="_blank" rel="noreferrer" className="hover:text-brand-pink transition" aria-label="X"><Twitter size={20} /></a>
          </div>
        </div>

        {/* Col 2 — Le mouvement */}
        <div>
          <h4 className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3">Le mouvement</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/a-propos" className="text-white/70 hover:text-brand-pink flex items-center gap-2"><Sparkles size={12} /> À propos</Link></li>
            <li><Link href="/message" className="text-white/70 hover:text-brand-pink flex items-center gap-2"><MessageCircle size={12} /> Notre message</Link></li>
            <li><Link href="/argumentaire" className="text-white/70 hover:text-brand-pink flex items-center gap-2"><FileText size={12} /> Argumentaire</Link></li>
            <li><Link href="/partenaires" className="text-white/70 hover:text-brand-pink flex items-center gap-2"><Heart size={12} /> Partenaires</Link></li>
          </ul>
        </div>

        {/* Col 3 — Ressources */}
        <div>
          <h4 className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3">Ressources</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/affiches" className="text-white/70 hover:text-brand-pink">Télécharger l'affiche</Link></li>
            <li><Link href="/galerie" className="text-white/70 hover:text-brand-pink">Galerie photos</Link></li>
            <li><Link href="/boutique" className="text-white/70 hover:text-brand-pink">Boutique</Link></li>
            <li><Link href="/newsletters" className="text-white/70 hover:text-brand-pink flex items-center gap-2"><BookOpen size={12} /> Archive newsletters</Link></li>
            <li><Link href="/don" className="text-white/70 hover:text-brand-pink flex items-center gap-2"><Heart size={12} /> Faire un don</Link></li>
            <li><Link href="/voyage-safe" className="text-white/70 hover:text-brand-pink">✈️ Voyage safe LGBTQ+</Link></li>
            <li><Link href="/aide-juridique" className="text-white/70 hover:text-brand-pink">⚖️ Aide juridique IA</Link></li>
            <li><Link href="/verset-inclusif" className="text-white/70 hover:text-brand-pink">📖 Verset inclusif</Link></li>
            <li><Link href="/partager" className="text-white/70 hover:text-brand-pink">✨ Crée ta carte</Link></li>
          </ul>
        </div>

        {/* Col 3.5 — Espace personnel & pro */}
        <div>
          <h4 className="text-xs uppercase tracking-widest text-fuchsia-400 font-bold mb-3">Mon compte</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/mon-espace" className="text-white/70 hover:text-brand-pink font-bold">🏠 Mon espace</Link></li>
            <li><Link href="/inscription" className="text-white/70 hover:text-brand-pink">📝 S'inscrire (gratuit)</Link></li>
            <li><Link href="/admin/login" className="text-white/70 hover:text-brand-pink">🔐 Connexion</Link></li>
            <li><Link href="/parrainage" className="text-white/70 hover:text-brand-pink">🎁 Programme parrainage</Link></li>
            <li><Link href="/sos/contacts" className="text-white/70 hover:text-brand-pink">🚨 Mes contacts SOS</Link></li>
            <li className="pt-2 border-t border-white/10">
              <Link href="/admin/pro" className="text-fuchsia-300 hover:text-brand-pink font-bold">🏪 Espace Pro (venues)</Link>
            </li>
            <li>
              <Link href="/admin" className="text-fuchsia-300 hover:text-brand-pink font-bold">⚙️ Back-office Admin</Link>
            </li>
          </ul>
        </div>

        {/* Col 4 — Newsletter */}
        <div className="col-span-2 lg:col-span-1">
          <h4 className="text-xs uppercase tracking-widest text-brand-pink font-bold mb-3 flex items-center gap-2"><Mail size={12} /> Newsletter</h4>
          <p className="text-sm text-white/60 mb-3">Une fois par mois, l'essentiel du mouvement.</p>
          {subscribed ? (
            <p className="text-sm text-emerald-400">✓ Vérifie ton email pour confirmer.</p>
          ) : (
            <div className="flex gap-2">
              <input
                type="email" placeholder="ton@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
              />
              <button onClick={subscribe} disabled={busy || !email}
                      className="bg-brand-pink hover:bg-pink-600 text-white font-bold rounded-lg px-3 disabled:opacity-50">
                <Send size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Section Partenaires — logos N&B, retour couleur au hover */}
      {partners.length > 0 && (
        <div className="border-t border-white/5">
          <div className="container-wide py-10">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-6 text-center">
              Ils soutiennent le mouvement
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
              {partners.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.name}
                  className="block"
                >
                  {p.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.logoUrl}
                      alt={p.name}
                      className="gld-partner-logo h-10 max-w-[140px] object-contain"
                    />
                  ) : (
                    <span className="gld-partner-logo text-sm font-bold text-white/80">{p.name}</span>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bas footer */}
      <div className="border-t border-white/5">
        <div className="container-wide py-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <div>© {new Date().getFullYear()} GodLovesDiversity.com — Tous droits réservés.</div>
          <div className="flex gap-5">
            <Link href="/mentions-legales" className="hover:text-brand-pink">Mentions légales</Link>
            <Link href="/rgpd" className="hover:text-brand-pink">Confidentialité</Link>
            <Link href="/contact" className="hover:text-brand-pink">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
