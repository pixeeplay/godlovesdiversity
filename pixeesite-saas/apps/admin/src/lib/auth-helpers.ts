import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { platformDb } from '@pixeesite/database';

/**
 * Récupère la session + vérifie membership pour une org.
 * Throws une error qui déclenchera 403 si pas membre.
 */
export async function requireOrgMember(orgSlug: string, allowedRoles?: string[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('UNAUTHORIZED');
  const userId = (session.user as any).id;
  const membership = await platformDb.orgMember.findFirst({
    where: { userId, org: { slug: orgSlug } },
    select: { role: true, org: { select: { id: true, slug: true, plan: true, maxSites: true, maxAiCredits: true, usedAiCredits: true } } },
  });
  if (!membership) throw new Error('FORBIDDEN');
  if (allowedRoles && !allowedRoles.includes(membership.role)) throw new Error('FORBIDDEN_ROLE');
  return { user: session.user, userId, membership };
}
