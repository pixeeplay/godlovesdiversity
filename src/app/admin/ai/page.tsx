import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AIStudio } from '@/components/admin/AIStudio';

export default async function AIPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-2">Studio IA — Gemini</h1>
      <p className="text-zinc-400 mb-6">
        Génère des textes (légendes, articles, posts) et des visuels.
        {!process.env.GEMINI_API_KEY && (
          <span className="block mt-2 text-amber-400 text-sm">
            ⚠️ Aucune clé Gemini configurée. Ajoute <code>GEMINI_API_KEY</code> dans <code>.env</code>.
          </span>
        )}
      </p>
      <AIStudio />
    </div>
  );
}
