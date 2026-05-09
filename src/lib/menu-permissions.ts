/**
 * Système de visibilité des items du menu admin — 3 niveaux.
 *
 * Niveau 1 — Globaux (Settings) :
 *   - menu.hidden       : JSON array des hrefs masqués pour TOUT LE MONDE
 *   - menu.editorHidden : JSON array des hrefs masqués pour le rôle EDITOR uniquement
 *
 * Niveau 2 — Par rôle :
 *   - ADMIN  : voit tout (sauf menu.hidden)
 *   - EDITOR : voit ce qui n'est ni dans menu.hidden ni dans menu.editorHidden
 *
 * Niveau 3 — Par user (UserMenuOverride) :
 *   - visible[] : hrefs forcés visibles pour ce user (override les règles de rôle)
 *   - hidden[]  : hrefs forcés cachés pour ce user (override les règles de rôle)
 *
 * Ordre de résolution (le plus spécifique gagne) :
 *   1. UserMenuOverride.visible → TRUE
 *   2. UserMenuOverride.hidden  → FALSE
 *   3. menu.hidden global       → FALSE
 *   4. (role=EDITOR) menu.editorHidden → FALSE
 *   5. → TRUE
 */
import { prisma } from './prisma';
import { getSettings } from './settings';

export type MenuPermissions = {
  hidden: string[];
  editorHidden: string[];
};

export type UserOverride = {
  hidden: string[];
  visible: string[];
};

export async function getMenuPermissions(): Promise<MenuPermissions> {
  const s = await getSettings(['menu.hidden', 'menu.editorHidden']);
  return {
    hidden: safeArr(s['menu.hidden']),
    editorHidden: safeArr(s['menu.editorHidden'])
  };
}

/**
 * Récupère l'override par user (ou null si inexistant).
 * Best-effort : ne crash jamais — si la migration Prisma n'est pas encore appliquée,
 * retourne null silencieusement (catch).
 */
export async function getUserMenuOverride(userId: string | null | undefined): Promise<UserOverride | null> {
  if (!userId) return null;
  try {
    const ov = await prisma.userMenuOverride.findUnique({
      where: { userId },
      select: { hidden: true, visible: true }
    });
    if (!ov) return null;
    return { hidden: ov.hidden || [], visible: ov.visible || [] };
  } catch {
    return null;
  }
}

function safeArr(v?: string): string[] {
  if (!v) return [];
  try {
    const j = JSON.parse(v);
    return Array.isArray(j) ? j.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Détermine si un item de menu est visible pour un user donné.
 *
 * @param href L'URL du menu (ex: "/admin/prices")
 * @param role Rôle du user ("ADMIN" | "EDITOR" | autre)
 * @param perms Permissions globales (Settings menu.*)
 * @param userOverride Override per-user (ou undefined si pas d'override)
 */
export function isItemVisible(
  href: string,
  role: string | undefined,
  perms: MenuPermissions,
  userOverride?: UserOverride | null
): boolean {
  // Niveau 3 — overrides per-user (le plus spécifique)
  if (userOverride) {
    if (userOverride.visible.includes(href)) return true;   // forcé visible
    if (userOverride.hidden.includes(href)) return false;   // forcé caché
  }

  // Niveau 1+2 — règles globales et rôle
  if (perms.hidden.includes(href)) return false;
  if ((role === 'EDITOR' || !role) && perms.editorHidden.includes(href)) return false;

  return true;
}
