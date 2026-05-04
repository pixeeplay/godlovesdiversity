'use client';
import { useState } from 'react';
import { Database, Download, ShieldCheck, Loader2, FileJson, Users, ShoppingBag, FolderArchive } from 'lucide-react';

const SCOPES = [
  { id: 'full', label: 'Backup complet', description: 'Tout : contenu + utilisateurs + commandes + paramètres', icon: Database, color: 'from-fuchsia-500 to-pink-600' },
  { id: 'content', label: 'Contenu seul', description: 'Pages, articles, photos, événements, partenaires, produits', icon: FileJson, color: 'from-cyan-500 to-blue-600' },
  { id: 'users', label: 'Utilisateurs + abonnés', description: 'Comptes admin, abonnés newsletter, campagnes', icon: Users, color: 'from-violet-500 to-purple-600' },
  { id: 'orders', label: 'Commandes', description: 'Toutes les commandes boutique avec items', icon: ShoppingBag, color: 'from-emerald-500 to-green-600' }
];

export function BackupAdmin() {
  const [busy, setBusy] = useState<string | null>(null);

  function downloadBackup(scope: string) {
    setBusy(scope);
    // Le navigateur télécharge directement (Content-Disposition: attachment)
    const url = `/api/admin/backup?scope=${scope}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `gld-backup-${scope}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setBusy(null), 1500);
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl p-2.5">
            <FolderArchive size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Sauvegardes</h1>
          <span className="bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Admin</span>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Télécharge tes données GLD en JSON. À garder en lieu sûr (Google Drive, disque externe, etc.).
          Fait en complément des backups Postgres automatiques de Coolify.
        </p>
      </header>

      <section className="grid sm:grid-cols-2 gap-4">
        {SCOPES.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => downloadBackup(s.id)}
              disabled={busy === s.id}
              className="text-left bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-fuchsia-500/40 transition disabled:opacity-50"
            >
              <div className={`bg-gradient-to-br ${s.color} rounded-xl p-3 inline-block mb-3`}>
                <Icon size={20} className="text-white" />
              </div>
              <h3 className="font-bold text-lg text-white mb-1">{s.label}</h3>
              <p className="text-xs text-zinc-400 mb-3">{s.description}</p>
              <div className="flex items-center gap-2 text-fuchsia-300 text-sm font-bold">
                {busy === s.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                {busy === s.id ? 'Téléchargement…' : 'Télécharger en JSON'}
              </div>
            </button>
          );
        })}
      </section>

      {/* INFO BACKUPS COOLIFY */}
      <section className="bg-emerald-500/5 border border-emerald-500/30 rounded-2xl p-5">
        <h2 className="font-bold flex items-center gap-2 text-emerald-200 mb-2">
          <ShieldCheck size={16} /> Backups Postgres automatiques (Coolify)
        </h2>
        <p className="text-xs text-emerald-100/80 mb-3">
          La base de données complète (incluant photos métadata, paramètres, etc.) est sauvegardée automatiquement
          tous les jours par Coolify. Pour télécharger un dump SQL ou restaurer :
        </p>
        <ol className="text-xs text-emerald-100/80 space-y-1.5 list-decimal list-inside">
          <li>Coolify Dashboard → projet GLD → Database → Backups</li>
          <li>Sélectionne la date → « Download » (format <code>.sql.gz</code>)</li>
          <li>Pour restaurer : <code>gunzip backup.sql.gz | psql $DATABASE_URL</code></li>
        </ol>
      </section>

      {/* INFO MÉDIAS */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold flex items-center gap-2 mb-2">
          <FolderArchive size={16} className="text-cyan-400" /> Médias (photos, vidéos, affiches)
        </h2>
        <p className="text-xs text-zinc-400 mb-3">
          Les fichiers binaires sont stockés sur MinIO (S3-compatible). Les <strong>URLs</strong> et <strong>métadonnées</strong>
          (lieu, auteur, date) sont dans le backup JSON ci-dessus. Pour récupérer les binaires :
        </p>
        <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside">
          <li>SSH sur ton serveur Coolify</li>
          <li><code>docker cp $(docker ps -qf name=minio):/data /chemin/local/backup-medias</code></li>
          <li>Ou utilise <code>mc</code> (MinIO Client) pour mirror le bucket en local</li>
        </ol>
      </section>

      <p className="text-[10px] text-zinc-600 text-center">
        ⚠ Les backups JSON contiennent des données sensibles (emails, paramètres API).
        Stocke-les chiffrés et n'envoie jamais par email non sécurisé.
      </p>
    </div>
  );
}
