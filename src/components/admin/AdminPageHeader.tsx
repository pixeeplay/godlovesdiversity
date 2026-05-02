import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';

type Action = {
  href?: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost';
  external?: boolean;
  badge?: string | number;
};

/**
 * Entête unifié pour toutes les pages admin.
 * - Icône gradient à gauche
 * - Titre + sous-titre
 * - Boutons d'action à droite (max 4)
 *
 * Usage :
 * <AdminPageHeader
 *   icon={ShoppingBag}
 *   gradient="from-pink-500 to-violet-500"
 *   title="Boutique"
 *   subtitle="Gère tes produits, vois tes ventes…"
 *   actions={[
 *     { href: '/admin/shop/orders', label: 'Commandes', icon: ShoppingBag, badge: pendingOrders },
 *     { href: '/boutique', label: 'Voir le site', external: true, variant: 'primary' }
 *   ]}
 * />
 */
export function AdminPageHeader({
  icon: Icon,
  gradient = 'from-brand-pink to-violet-500',
  title,
  subtitle,
  actions = []
}: {
  icon: LucideIcon;
  gradient?: string;
  title: string;
  subtitle?: string;
  actions?: Action[];
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className={`bg-gradient-to-br ${gradient} rounded-xl p-2.5`}>
            <Icon size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">{title}</h1>
        </div>
        {subtitle && <p className="text-zinc-400 text-sm max-w-2xl">{subtitle}</p>}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a, i) => {
            const I = a.icon;
            const cls =
              a.variant === 'primary'
                ? 'bg-brand-pink hover:bg-pink-600 text-white'
                : a.variant === 'ghost'
                ? 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white'
                : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-brand-pink/40';
            const inner = (
              <>
                {I && <I size={14} />}
                {a.label}
                {a.badge != null && a.badge !== 0 && (
                  <span className="bg-amber-500 text-black text-[10px] font-bold rounded-full px-2 py-0.5">
                    {a.badge}
                  </span>
                )}
              </>
            );
            const linkProps = a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {};
            if (a.href) {
              return (
                <Link key={i} href={a.href} {...linkProps}
                  className={`${cls} px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2`}>
                  {inner}
                </Link>
              );
            }
            return (
              <span key={i} className={`${cls} px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2`}>
                {inner}
              </span>
            );
          })}
        </div>
      )}
    </header>
  );
}
