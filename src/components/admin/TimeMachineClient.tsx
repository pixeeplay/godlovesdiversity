'use client';
import { useEffect, useState } from 'react';
import { History, GitBranch, RotateCw, Loader2, ExternalLink, Sparkles, AlertTriangle, Copy, ArrowLeft, GitCommit } from 'lucide-react';

interface Commit {
  sha: string;
  shortSha: string;
  message: string;
  fullMessage: string;
  author: string;
  avatar: string | null;
  date: string;
  url: string;
}

export function TimeMachineClient() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [redeploying, setRedeploying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [rollbackSteps, setRollbackSteps] = useState<string[] | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/time-machine');
      const j = await r.json();
      setCommits(j.commits || []);
      setError(j.error || null);
    } catch (e: any) {
      setError(e?.message || 'fetch-failed');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function redeploy() {
    setRedeploying(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/time-machine?action=redeploy', { method: 'POST' });
      const j = await r.json();
      setMsg(j.message || (r.ok ? '✓ Redeploy déclenché' : `⚠ ${j.error || j.message}`));
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setRedeploying(false);
  }

  async function rollbackTo(sha: string) {
    if (!confirm(`Rollback à ${sha.slice(0, 7)} ? Tu obtiendras les commandes Git à exécuter manuellement.`)) return;
    try {
      const r = await fetch(`/api/admin/time-machine?action=rollback&sha=${sha}`, { method: 'POST' });
      const j = await r.json();
      setRollbackSteps(j.manualSteps || null);
      setMsg(j.message);
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
  }

  function copySteps() {
    if (!rollbackSteps) return;
    const text = rollbackSteps.join('\n');
    navigator.clipboard.writeText(text);
    setMsg('✓ Commandes copiées dans le presse-papier');
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-500 via-fuchsia-500 to-violet-500 rounded-2xl p-3">
            <History size={26} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Time Machine</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Timeline visuel des commits GitHub. Redéploie le HEAD ou suis les étapes pour rollback.
            </p>
          </div>
        </div>
        <button onClick={redeploy} disabled={redeploying} className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-2">
          {redeploying ? <Loader2 size={14} className="animate-spin" /> : <RotateCw size={14} />}
          Redéployer le HEAD
        </button>
      </header>

      {msg && (
        <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-3 text-sm text-fuchsia-200 flex items-center justify-between">
          <span>{msg}</span>
          {rollbackSteps && (
            <button onClick={copySteps} className="bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Copy size={11} /> Copier
            </button>
          )}
        </div>
      )}

      {rollbackSteps && (
        <section className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4">
          <h3 className="font-bold mb-2 flex items-center gap-2 text-amber-200">
            <AlertTriangle size={14} /> Étapes manuelles pour rollback
          </h3>
          <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-3 overflow-x-auto text-amber-100 font-mono">
{rollbackSteps.join('\n')}
          </pre>
          <p className="text-[11px] text-amber-200/80 mt-2 italic">
            ⚠ Le rollback automatique n'est pas activé pour des raisons de sécurité. Exécute ces commandes localement, puis Coolify redéploiera automatiquement après le push.
          </p>
        </section>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-sm text-rose-200">
          ⚠ Impossible de charger les commits GitHub : <code>{error}</code>
          <p className="text-[11px] text-rose-200/80 mt-2">
            Si le repo est privé, configure <code className="bg-rose-500/20 px-1 rounded">integrations.github.token</code> dans /admin/settings (token avec scope `repo`).
          </p>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto text-zinc-500" /></div>
      ) : commits.length === 0 && !error ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
          Aucun commit récupéré.
        </div>
      ) : (
        <section className="relative pl-8">
          {/* Ligne verticale du timeline */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-fuchsia-500 via-violet-500 to-zinc-800" />

          {commits.map((c, i) => {
            const isLatest = i === 0;
            const isSelected = selectedSha === c.sha;
            const date = new Date(c.date);
            return (
              <article key={c.sha} className="relative mb-3 group">
                {/* Point sur la ligne */}
                <div className={`absolute -left-[26px] top-3 w-5 h-5 rounded-full border-4 transition ${
                  isLatest
                    ? 'bg-emerald-500 border-emerald-300 ring-4 ring-emerald-500/30'
                    : isSelected
                      ? 'bg-fuchsia-500 border-fuchsia-300 ring-4 ring-fuchsia-500/30'
                      : 'bg-zinc-800 border-zinc-700 group-hover:border-fuchsia-400'
                }`} />

                <div className={`bg-zinc-900 border rounded-xl p-3 hover:border-fuchsia-500/40 transition ${
                  isLatest ? 'border-emerald-500/40' : isSelected ? 'border-fuchsia-500/40' : 'border-zinc-800'
                }`}>
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {c.avatar ? (
                      <img src={c.avatar} alt={c.author} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
                        {c.author.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-sm truncate">{c.message}</h3>
                        {isLatest && (
                          <span className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            ★ HEAD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                        <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-fuchsia-300 font-mono">{c.shortSha}</code>
                        <span>par <strong className="text-zinc-300">{c.author}</strong></span>
                        <span>· {date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1">
                        <ExternalLink size={10} /> GitHub
                      </a>
                      {!isLatest && (
                        <button
                          onClick={() => rollbackTo(c.sha)}
                          className="text-[10px] bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 px-2 py-1 rounded-full flex items-center gap-1"
                          title="Rollback à ce commit"
                        >
                          <ArrowLeft size={10} /> Rollback
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSha(isSelected ? null : c.sha)}
                        className="text-[10px] text-zinc-500 hover:text-white px-2 py-1"
                      >
                        {isSelected ? 'Réduire' : 'Détails'}
                      </button>
                    </div>
                  </div>

                  {isSelected && c.fullMessage !== c.message && (
                    <pre className="mt-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[11px] text-zinc-300 whitespace-pre-wrap font-mono overflow-x-auto">
{c.fullMessage}
                    </pre>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-200">
        <h3 className="font-bold mb-2 flex items-center gap-2"><Sparkles size={14} /> Comment fonctionne le Time Machine</h3>
        <ul className="text-xs space-y-1 list-disc ml-5">
          <li><strong>Redéployer le HEAD</strong> : appelle le webhook Coolify pour reconstruire le commit le plus récent. À utiliser si un build a foiré.</li>
          <li><strong>Rollback à un SHA</strong> : génère les commandes Git à exécuter localement (revert). Coolify reconstruit auto après le push.</li>
          <li><strong>Sécurité</strong> : le hard reset distant n'est pas automatisé pour éviter les pertes accidentelles.</li>
          <li><strong>Token GitHub</strong> : nécessaire pour les repos privés. Va dans <code>/admin/settings</code> → <code>integrations.github.token</code>.</li>
        </ul>
      </section>
    </div>
  );
}
