import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function requireConnectUser() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return null;
  return { id: (s.user as any).id as string, email: s.user.email!, role: (s.user as any).role as string };
}

/** Charge le profil Connect d'un user, en crée un par défaut si manquant. */
export async function getOrCreateConnectProfile(userId: string) {
  let p = await prisma.connectProfile.findUnique({ where: { userId } });
  if (p) return p;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true, identity: true, traditions: true, cityProfile: true, bio: true }
  });
  if (!u) throw new Error('User introuvable');

  const handle = generateHandle(u.email!, u.name || '');
  p = await prisma.connectProfile.create({
    data: {
      userId,
      handle,
      displayName: u.name || u.email!.split('@')[0],
      city: u.cityProfile,
      bio: u.bio,
      identity: u.identity,
      traditions: u.traditions || [],
      photos: u.image ? [u.image] : []
    }
  });
  return p;
}

function generateHandle(email: string, name: string) {
  const base = (name || email.split('@')[0])
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = Math.random().toString(36).slice(2, 5);
  return `${base.slice(0, 20)}-${suffix}`;
}

export function calcAge(birthYear?: number | null): number | null {
  if (!birthYear) return null;
  return new Date().getFullYear() - birthYear;
}

/** Liste pays criminalisant LGBT — Rencontres masqué d'office. */
export const HOSTILE_COUNTRIES = new Set([
  'AF','AE','BN','GH','ID','IR','IQ','JM','KE','KW','LB','LY','MY','MA','NG','OM','PK','QA','SA','SD','SN','SO','SY','TZ','UG','YE','ZW',
  'BY','BD','BB','BJ','BT','BI','CM','TD','KM','CD','DJ','DM','EG','SZ','ET','GM','GD','GN','GY','LR','MW','MV','MR','MM','NA','PG','LK','SS','TG','TT','TN','TM','UZ','SC'
]);
