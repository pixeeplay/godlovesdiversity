import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { platformDb } from '@pixeesite/database';

const SUPER_ADMIN_EMAILS = ['arnaud@gredai.com'];

/** Auto-promote configured emails to super-admin on first login. */
export async function ensureSuperAdmin(email: string) {
  if (!SUPER_ADMIN_EMAILS.includes(email.toLowerCase())) return;
  await platformDb.user.update({ where: { email: email.toLowerCase() }, data: { isSuperAdmin: true } }).catch(() => {});
}

/** Throws if the current session is not a super-admin. */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error('UNAUTHORIZED');
  const email = session.user.email.toLowerCase();
  // Hardcoded list bypass DB (in case DB unreachable)
  if (SUPER_ADMIN_EMAILS.includes(email)) return { user: session.user, email };
  const u = await platformDb.user.findUnique({ where: { email }, select: { isSuperAdmin: true } });
  if (!u?.isSuperAdmin) throw new Error('FORBIDDEN');
  return { user: session.user, email };
}

export async function isSuperAdmin(): Promise<boolean> {
  try {
    await requireSuperAdmin();
    return true;
  } catch {
    return false;
  }
}
