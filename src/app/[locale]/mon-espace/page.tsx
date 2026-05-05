import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAllFeatureFlags } from '@/lib/feature-flags';
import { MonEspaceClient } from '@/components/MonEspaceClient';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon espace — GLD' };

export default async function P() {
  const s = await getServerSession(authOptions);
  if (!s?.user) redirect('/admin/login?next=/mon-espace');
  const userId = (s.user as any).id;
  const role = (s.user as any).role;

  // Si admin/editor → redirige vers le vrai back-office
  if (['ADMIN', 'EDITOR'].includes(role)) redirect('/admin');

  // Stats perso
  let posts = 0, threads = 0, photos = 0, testimonies = 0, reviews = 0;
  try { posts = await prisma.forumPost.count({ where: { authorId: userId } }); } catch {}
  try { threads = await prisma.forumThread.count({ where: { authorId: userId } }); } catch {}
  try { photos = await prisma.photo.count({ where: { uploaderId: userId } }); } catch {}
  try { testimonies = await prisma.videoTestimony.count({ where: { uploaderId: userId } }); } catch {}
  try { reviews = await prisma.productReview.count({ where: { authorId: userId } }); } catch {}

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, image: true, createdAt: true } });
  const flags = await getAllFeatureFlags();

  return <MonEspaceClient user={user} stats={{ posts, threads, photos, testimonies, reviews }} flags={flags} />;
}
