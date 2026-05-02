'use client';
import { useState } from 'react';
import {
  ShieldAlert, Eye, EyeOff, Users, Save, Loader2, CheckCircle2, Info
} from 'lucide-react';

type MenuPermissions = { hidden: string[]; editorHidden: string[] };

// Liste complète des items du menu admin (synchronisée avec AdminSidebar)
const ALL_ITEMS: { href: string; label: string; group: string; alwaysVisible?: boolean }[] = [
  { href: '/admin', label: 'Tableau de bord', group: 'Tableau de bord', alwaysVisible: true },

  { href: '/admin/shop', label: 'Produits', group: 'Boutique' },
  { href: '/admin/shop/orders', label: 'Commandes', group: 'Boutique' },
  { href: '/admin/shop/dropshipping', label: 'Dropshipping', group: 'Boutique' },

  { href: '/admin/moderation', label: 'Modération', group: 'Contenu' },
  { href: '/admin/import', label: 'Import en masse', group: 'Contenu' },
  { href: '/admin/map', label: 'Carte mondiale', group: 'Contenu' },
  { href: '/admin/posters', label: 'Affiches', group: 'Contenu' },
  { href: '/admin/news', label: 'Actualités', group: 'Contenu' },
  { href: '/admin/videos', label: 'Vidéos YouTube', group: 'Contenu' },
  { href: '/admin/banners', label: 'Bannières (hero)', group: 'Contenu' },

  { href: '/admin/newsletter', label: 'Newsletter', group: 'Communication' },
  { href: '/admin/calendar', label: 'Calendrier social', group: 'Communication' },
  { href: '/admin/pages', label: 'Pages riches', group: 'Communication' },
  { href: '/admin/content', label: 'Pages & blog', group: 'Communication' },
  { href: '/admin/partners', label: 'Partenaires', group: 'Communication' },
  { href: '/admin/donate', label: 'Dons & ticker', group: 'Communication' },

  { href: '/admin/ai', label: 'Studio IA', group: 'IA & Outils' },
  { href: '/admin/integrations', label: 'Intégrations', group: 'IA & Outils' },
  { href: '/admin/setup', label: 'Assistant configuration', group: 'IA & Outils' },

  { href: '/admin/menu', label: 'Menu nav', group: 'Système' },
  { href: '/admin/home', label: 'Page d\'accueil', group: 'Système' },
  { href: '/admin/menu-permissions', label: 'Visibilité menu (admin)', group: 'Système', alwaysVisible: true },
  { href: '/admin/users', label: 'Utilisateurs', group: 'Système' },
  { href: '/admin/settings', label: 'Paramètres', group: 'Système' }
];

const GROUPS = [
  { name: 'Tableau de bord', gradient: 'from-pink-500 to-rose-500' },
  { name: 'Boutique', gradient: 'from-emerald-500 to-green-600' },
  { name: 'Contenu', gradient: 'from-violet-500 to-purple-600' },
  { name: 'Communication', gradient: 'from-cyan-500 to-blue-500' },
  { name: 'IA & Outils', gradient: 'from-amber-500 to-orange-500' },
  { name: 'Système', gradient: 'from-zinc-500 to-zinc-700' }
];

export function MenuPermissionsEditor({ initial }: { initial: MenuPermissions }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set(initial.hidden));
  const [editorHidden, setEditorHidden] = useState<Set<string>>(new Set(initial.editorHidden));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, href: string) {
    const next = new Set(set);
    if (next.has(href)) next.delete(href);
    else next.add(href);
    setter(next);
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setSaved(false);
    const r = await fetch('/api/admin/menu-permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hidden: Array.from(hidden),
        editorHidden: Array.from(editorHidden)
      })
    });
    setBusy(false);
    if (r.ok) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        // Recharge pour appliquer la nouvelle config à la sidebar
        window.location.reload();
      }, 1200);
    }
  }

  const totalHidden = hidden.size;
  const totalEditorOnly = Array.from(editorHidden).filter((h) => !hidden.has(h)).length;

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      {/* HEADER */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-zinc-600 to-zinc-800 rounded-xl p-2.5">
            <ShieldAlert size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Visibilité du menu</h1>
          <span className="bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
            Super-admin
          </span>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Choisis les fonctionnalités du menu admin que tu veux afficher ou masquer.
          Tu peux masquer un item <strong>pour tout le monde</strong> (utile pour cacher une fonction non utilisée)
          ou <strong>seulement pour les éditeurs</strong> (les rôles EDITOR ne le verront pas, ADMIN si).
        </p>
      </header>

      {/* INFO BOX */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 flex gap-3">
        <Info size={18} className="text-blue-300 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200/90 space-y-1">
          <p><strong>Masqué pour tous</strong> = la rubrique disparaît complètement de la sidebar (mais l'URL reste accessible si on la connaît).</p>
          <p><strong>Masqué éditeurs</strong> = visible uniquement pour les comptes ADMIN, invisible pour les EDITOR.</p>
          <p>Les changements s'appliquent à <strong>toi en premier</strong> dès la sauvegarde — pense à recharger l'admin pour voir l'effet.</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-2xl font-bold text-white">{ALL_ITEMS.length}</div>
          <div className="text-xs text-zinc-500 uppercase font-bold">Items totaux</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <div className="text-2xl font-bold text-red-300">{totalHidden}</div>
          <div className="text-xs text-red-300/70 uppercase font-bold">Masqués pour tous</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="text-2xl font-bold text-amber-300">{totalEditorOnly}</div>
          <div className="text-xs text-amber-300/70 uppercase font-bold">Masqués éditeurs seulement</div>
        </div>
      </div>

      {/* TABLEAU PAR GROUPE */}
      {GROUPS.map((grp) => {
        const items = ALL_ITEMS.filter((i) => i.group === grp.name);
        if (items.length === 0) return null;
        return (
          <section key={grp.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className={`bg-gradient-to-r ${grp.gradient} px-5 py-3`}>
              <h2 className="font-bold text-white text-sm uppercase tracking-wider">{grp.name}</h2>
            </div>
            <div className="divide-y divide-zinc-800">
              {/* Header colonnes */}
              <div className="grid grid-cols-[1fr_120px_140px] gap-3 px-5 py-2 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950/50">
                <div>Rubrique</div>
                <div className="text-center">Tout monde</div>
                <div className="text-center">Éditeurs</div>
              </div>
              {items.map((item) => {
                const isHidden = hidden.has(item.href);
                const isEditorHidden = editorHidden.has(item.href);
                const locked = item.alwaysVisible;
                return (
                  <div key={item.href} className="grid grid-cols-[1fr_120px_140px] gap-3 px-5 py-3 items-center hover:bg-zinc-800/30">
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center gap-2">
                        {item.label}
                        {locked && (
                          <span className="bg-zinc-800 text-zinc-500 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded" title="Toujours visible — non masquable">
                            verrouillé
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono truncate">{item.href}</div>
                    </div>
                    <div className="flex justify-center">
                      <Toggle
                        on={isHidden}
                        disabled={!!locked}
                        onChange={() => !locked && toggle(hidden, setHidden, item.href)}
                        labelOn="Caché"
                        labelOff="Visible"
                        colorOn="red"
                      />
                    </div>
                    <div className="flex justify-center">
                      <Toggle
                        on={isEditorHidden || isHidden}
                        disabled={!!locked || isHidden}
                        onChange={() => !locked && toggle(editorHidden, setEditorHidden, item.href)}
                        labelOn={isHidden ? 'Tous cachés' : 'Caché ed.'}
                        labelOff="Éd. visibles"
                        colorOn="amber"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* SAVE BAR */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-zinc-950/90 backdrop-blur border border-zinc-800 rounded-2xl p-4 shadow-2xl">
        {saved && (
          <span className="flex items-center gap-1 text-emerald-400 text-sm">
            <CheckCircle2 size={16} /> Enregistré, rechargement…
          </span>
        )}
        <button
          onClick={save}
          disabled={busy}
          className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Enregistrer la visibilité du menu
        </button>
      </div>
    </div>
  );
}

function Toggle({
  on, disabled, onChange, labelOn, labelOff, colorOn
}: {
  on: boolean; disabled?: boolean; onChange: () => void;
  labelOn: string; labelOff: string;
  colorOn: 'red' | 'amber';
}) {
  const colorClasses = colorOn === 'red'
    ? 'bg-red-500/20 text-red-300 border-red-500/40'
    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`text-[11px] font-bold uppercase px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${on ? colorClasses : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}
    >
      {on ? <EyeOff size={11} /> : <Eye size={11} />}
      {on ? labelOn : labelOff}
    </button>
  );
}
