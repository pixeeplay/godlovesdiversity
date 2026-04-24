import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { FileText, Plus } from 'lucide-react';

export default async function ContentPage() {
  const s = await getServerSession(authOptions);
  if (!s) redirect('/admin/login');
  const [pages, articles] = await Promise.all([
    prisma.page.findMany({ orderBy: { updatedAt: 'desc' } }),
    prisma.article.findMany({ orderBy: { updatedAt: 'desc' } })
  ]);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-display font-bold mb-2">Contenus</h1>
      <p className="text-zinc-400 mb-8">Pages, articles, médiathèque.</p>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Pages</h2>
          <button className="btn-ghost text-sm"><Plus size={14} /> Nouvelle page</button>
        </div>
        <div className="space-y-2">
          {pages.length === 0 && <p className="text-zinc-500 italic">Aucune page.</p>}
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-zinc-500" />
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-zinc-500">/{p.slug} · {p.locale}</div>
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${p.published ? 'bg-emerald-500/10 text-emerald-300' : 'bg-zinc-700 text-zinc-300'}`}>
                {p.published ? 'Publiée' : 'Brouillon'}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Articles de blog</h2>
          <button className="btn-ghost text-sm"><Plus size={14} /> Nouvel article</button>
        </div>
        {articles.length === 0 ? (
          <p className="text-zinc-500 italic">Aucun article. Utilisez le Studio IA pour générer un premier brouillon.</p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                {a.title}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
