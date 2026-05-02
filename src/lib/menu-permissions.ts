/**
 * Système de visibilité des items du menu admin.
 *
 * Stockage : Settings.menu.hidden = JSON array des hrefs masqués
 *            Settings.menu.editorHidden = JSON array des hrefs masqués pour le rôle EDITOR uniquement
 *
 * - ADMIN voit toujours tout (mais peut masquer pour soi-même via menu.hidden)
 * - EDITOR ne voit que ce qui n'est ni dans menu.hidden ni dans menu.editorHidden
 */
import { getSettings } from './settings';

export type MenuPermissions = {
  hidden: string[];
  editorHidden: string[];
};

export async function getMenuPermissions(): Promise<MenuPermissions> {
  const s = await getSettings(['menu.hidden', 'menu.editorHidden']);
  return {
    hidden: safeArr(s['menu.hidden']),
    editorHidden: safeArr(s['menu.editorHidden'])
  };
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

export function isItemVisible(href: string, role: string | undefined, perms: MenuPermissions): boolean {
  if (perms.hidden.includes(href)) return false;
  if ((role === 'EDITOR' || !role) && perms.editorHidden.includes(href)) return false;
  return true;
}
