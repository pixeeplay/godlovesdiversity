import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AIStudio } from '@/components/admin/AIStudio';
import { getSettings } from '@/lib/settings';

export default async function AIPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');

  // Lit la clé depuis la table Setting (BO) PUIS fallback env
  const settings = await getSettings(['integrations.gemini.apiKey']).catch(() => ({} as Record<string, string>));
  const hasKey = !!(settings['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-display font-bold mb-2">Studio IA — Gemini</h1>
      <p className="text-zinc-400 mb-6">
        Génère des textes (légendes, articles, posts) et des visuels.
        {!hasKey && (
          <span className="block mt-2 text-amber-400 text-sm">
            ⚠️ Aucune clé Gemini configurée. Ajoute-la dans{' '}
            <Link href="/admin/settings" className="underline font-medium">Paramètres → Gemini IA</Link>.
          </span>
        )}
        {hasKey && (
          <span className="block mt-2 text-emerald-400 text-sm">
            ✅ Clé Gemini active. Tu peux générer du contenu.
          </span>
        )}
      </p>
      <AIStudio />
    </div>
  );
}
