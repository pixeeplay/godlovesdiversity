import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, X, Heart, Briefcase, ExternalLink, Shield, FileText, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: '⚖️ Guide légal RGPD · GLD Admin' };

export default async function LegalPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login?next=/admin/leads/legal');
  if (!['ADMIN', 'EDITOR'].includes((s.user as any)?.role)) redirect('/admin');

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-amber-600 via-rose-600 to-fuchsia-600 rounded-2xl p-5 mb-4 ring-1 ring-white/10">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">⚖️</div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-black text-white tracking-tight">Guide légal RGPD</h1>
            <p className="text-white/85 text-sm mt-0.5">Ce que tu peux et ne peux pas faire avec tes leads — France/UE</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Link href="/admin/leads" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">🎯</div><p className="text-xs font-bold text-white">Leads</p>
        </Link>
        <Link href="/admin/leads/scraper" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">🕷️</div><p className="text-xs font-bold text-white">Scraper</p>
        </Link>
        <Link href="/admin/leads/scraper/new" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">✨</div><p className="text-xs font-bold text-white">Wizard</p>
        </Link>
        <Link href="/admin/leads/templates" className="bg-zinc-900 hover:bg-zinc-800 ring-1 ring-zinc-800 hover:ring-fuchsia-500 rounded-xl p-3 text-center transition">
          <div className="text-xl mb-1">📧</div><p className="text-xs font-bold text-white">Templates</p>
        </Link>
        <Link href="/admin/leads/legal" className="bg-amber-500/10 ring-1 ring-amber-500/40 rounded-xl p-3 text-center">
          <div className="text-xl mb-1">⚖️</div><p className="text-xs font-bold text-amber-300">Légal</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {/* B2C card */}
        <section className="bg-rose-500/10 ring-1 ring-rose-500/30 rounded-2xl p-4">
          <header className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 flex items-center justify-center"><Heart size={16} className="text-rose-400" /></div>
            <div>
              <h2 className="font-bold text-white">B2C — Particuliers</h2>
              <p className="text-[11px] text-rose-300/80">Futurs mariés, couples, individus</p>
            </div>
          </header>
          <p className="text-xs text-zinc-200 leading-relaxed mb-3">
            En France/UE, la <strong className="text-rose-300">prospection commerciale par email/SMS</strong> vers
            des particuliers nécessite leur <strong className="text-rose-300">consentement préalable explicite</strong> (RGPD art. 7 + LCEN art. L.34-5).
          </p>

          <h3 className="text-[10px] uppercase tracking-widest text-rose-300 font-bold mb-1.5">❌ Interdit</h3>
          <ul className="text-xs space-y-1 mb-3">
            <Bullet bad>Cold email à un particulier scrapé</Bullet>
            <Bullet bad>SMS de masse sans opt-in</Bullet>
            <Bullet bad>Cold call automatisé / robocall</Bullet>
            <Bullet bad>Acheter une liste B2C non opt-in</Bullet>
          </ul>

          <h3 className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold mb-1.5">✅ Autorisé / Recommandé</h3>
          <ul className="text-xs space-y-1">
            <Bullet good>DM Instagram (1-1, conversation)</Bullet>
            <Bullet good>Commenter leurs posts publics</Bullet>
            <Bullet good>Meta Ads Custom Audience (upload + retargeting)</Bullet>
            <Bullet good>Lookalike audiences Meta</Bullet>
            <Bullet good>Pubs sponsorisées Mariages.net (plateforme tierce)</Bullet>
            <Bullet good>Réponse à un formulaire de demande de devis</Bullet>
          </ul>
        </section>

        {/* B2B card */}
        <section className="bg-cyan-500/10 ring-1 ring-cyan-500/30 rounded-2xl p-4">
          <header className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center"><Briefcase size={16} className="text-cyan-400" /></div>
            <div>
              <h2 className="font-bold text-white">B2B — Pros</h2>
              <p className="text-[11px] text-cyan-300/80">Photographes, planners, salles, etc.</p>
            </div>
          </header>
          <p className="text-xs text-zinc-200 leading-relaxed mb-3">
            Le cadre <strong className="text-cyan-300">LCEN allège</strong> pour le B2B :
            tu peux contacter une <strong className="text-cyan-300">adresse email pro liée à une fonction</strong>
            (ex: <code>contact@</code>, <code>marie.dupont@entreprise.fr</code>) sans consentement préalable,
            tant que tu respectes 3 conditions.
          </p>

          <h3 className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold mb-1.5">✅ 3 conditions à respecter</h3>
          <ul className="text-xs space-y-1 mb-3">
            <Bullet good>Le message doit être en lien avec sa fonction pro</Bullet>
            <Bullet good>Inclure un opt-out clair et fonctionnel (lien <code>unsubscribe</code>)</Bullet>
            <Bullet good>Mentionner ton identité + base légale (intérêt légitime)</Bullet>
          </ul>

          <h3 className="text-[10px] uppercase tracking-widest text-rose-300 font-bold mb-1.5">❌ Toujours interdit</h3>
          <ul className="text-xs space-y-1">
            <Bullet bad>SMS de masse / cold call automatisé</Bullet>
            <Bullet bad>Email perso (ex: <code>marie.dupont@gmail.com</code>) traité en B2C</Bullet>
            <Bullet bad>Pas d'opt-out → lourde sanction CNIL</Bullet>
          </ul>
        </section>
      </div>

      {/* Workflow recommandé */}
      <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 mb-4">
        <header className="flex items-center gap-2 mb-3">
          <Shield size={14} className="text-emerald-400" />
          <h2 className="text-sm font-bold text-white">Workflow conforme RGPD</h2>
        </header>
        <ol className="space-y-2 text-xs text-zinc-200">
          <Step n={1}>
            <strong>Scrape pour analyse</strong> — récupère contacts dans <code>/admin/leads</code>, taggue B2C ou B2B.
            Le scraping public n'est pas interdit en soi (CJUE 2019), c'est l'usage commercial qui est encadré.
          </Step>
          <Step n={2}>
            <strong>Filtre B2B uniquement pour cold email</strong> — segmente <code>tag:b2b-pros-*</code>, vérifie que les emails sont des adresses pro.
          </Step>
          <Step n={3}>
            <strong>Envoie cold emails B2B</strong> via templates — toujours avec opt-out + mentions RGPD.
          </Step>
          <Step n={4}>
            <strong>B2C : pas d'email direct</strong> — utilise plutôt :
            <span className="block ml-4 mt-1 text-emerald-300">→ DM Insta · Meta Ads upload · réponse à formulaires.</span>
          </Step>
          <Step n={5}>
            <strong>Désinscription = 24-48h max</strong> — quand quelqu'un clique unsubscribe, marque <code>status: unsubscribed</code> immédiatement.
          </Step>
          <Step n={6}>
            <strong>Conservation max 3 ans</strong> sans interaction — purge auto les leads inactifs.
          </Step>
        </ol>
      </section>

      {/* Mentions à inclure dans tes mails */}
      <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4 mb-4">
        <header className="flex items-center gap-2 mb-3">
          <Mail size={14} className="text-fuchsia-400" />
          <h2 className="text-sm font-bold text-white">Mentions obligatoires dans chaque cold email B2B</h2>
        </header>
        <pre className="text-[11px] text-zinc-300 bg-zinc-950 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`Conformément à la loi RGPD, vous recevez ce message car votre adresse
email professionnelle figure dans une source publique en lien avec votre
activité.

Mes coordonnées :
  Arnaud Gredai — [adresse pro]
  Téléphone : [n°]

Si vous ne souhaitez plus recevoir d'emails de ma part :
  → Cliquez ici pour vous désinscrire : {{unsubscribeUrl}}

Vous disposez d'un droit d'accès, rectification, opposition et
suppression de vos données. Pour l'exercer : privacy@ton-domaine.fr`}</pre>
      </section>

      {/* Liens utiles */}
      <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
        <header className="flex items-center gap-2 mb-3">
          <FileText size={14} className="text-cyan-400" />
          <h2 className="text-sm font-bold text-white">Liens officiels</h2>
        </header>
        <ul className="text-xs space-y-1.5">
          <li><a href="https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1">CNIL — Prospection par email <ExternalLink size={10} /></a></li>
          <li><a href="https://www.cnil.fr/fr/reglement-europeen-protection-donnees" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1">CNIL — RGPD complet <ExternalLink size={10} /></a></li>
          <li><a href="https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070987/LEGISCTA000006150610" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1">LCEN — Article L.34-5 <ExternalLink size={10} /></a></li>
          <li><a href="https://www.cnil.fr/fr/la-cnil-publie-une-recommandation-sur-les-traitements-de-donnees-de-prospection-commerciale" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1">CNIL — Recommandation prospection 2022 <ExternalLink size={10} /></a></li>
        </ul>
      </section>

      <p className="text-[10px] text-zinc-500 italic mt-4 text-center">
        Ce guide est informatif et ne remplace pas un conseil juridique. En cas de doute, consulte un avocat ou un DPO.
      </p>
    </div>
  );
}

function Bullet({ children, good, bad }: { children: any; good?: boolean; bad?: boolean }) {
  return (
    <li className="flex items-start gap-1.5">
      {good && <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />}
      {bad && <X size={12} className="text-rose-400 mt-0.5 flex-shrink-0" />}
      <span className="text-zinc-300">{children}</span>
    </li>
  );
}

function Step({ n, children }: { n: number; children: any }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center">{n}</span>
      <span>{children}</span>
    </li>
  );
}
