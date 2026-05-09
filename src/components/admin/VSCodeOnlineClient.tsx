'use client';
import { useEffect, useState } from 'react';
import { ExternalLink, Code2, Github, Cloud, Cpu, Sparkles, Save, Loader2, FolderOpen, FileText, AlertTriangle } from 'lucide-react';

interface Props {
  repo: string;        // ex: "pixeeplay/godlovesdiversity"
  branch: string;
  codeServerUrl: string;  // optional self-hosted code-server (via Tailscale)
}

interface FileNode {
  path: string;
  type: 'file' | 'dir';
}

export function VSCodeOnlineClient({ repo, branch, codeServerUrl }: Props) {
  const [tab, setTab] = useState<'launch' | 'embed' | 'editor'>('launch');

  const githubDevUrl = `https://github.dev/${repo}/tree/${branch}`;
  const vscodeDevUrl = `https://vscode.dev/github/${repo}/tree/${branch}`;
  const codespacesUrl = `https://github.com/codespaces/new?repo=${repo}&ref=${branch}`;
  const stackblitzUrl = `https://stackblitz.com/github/${repo}/tree/${branch}`;
  const gitpodUrl = `https://gitpod.io/#https://github.com/${repo}/tree/${branch}`;

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-7xl mx-auto">
      {/* TABS */}
      <div className="flex gap-2 border-b border-zinc-800 mb-4">
        <TabBtn active={tab === 'launch'} onClick={() => setTab('launch')} icon={<Cloud size={14} />} label="Lancer un IDE en ligne" />
        <TabBtn active={tab === 'embed'} onClick={() => setTab('embed')} icon={<Code2 size={14} />} label="Embed direct" />
        <TabBtn active={tab === 'editor'} onClick={() => setTab('editor')} icon={<FileText size={14} />} label="Quick editor" />
      </div>

      {tab === 'launch' && <LaunchPanel
        githubDevUrl={githubDevUrl}
        vscodeDevUrl={vscodeDevUrl}
        codespacesUrl={codespacesUrl}
        stackblitzUrl={stackblitzUrl}
        gitpodUrl={gitpodUrl}
        codeServerUrl={codeServerUrl}
        repo={repo}
        branch={branch}
      />}

      {tab === 'embed' && <EmbedPanel codeServerUrl={codeServerUrl} repo={repo} branch={branch} />}

      {tab === 'editor' && <QuickEditor />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition ${
        active ? 'border-cyan-500 text-cyan-300' : 'border-transparent text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ─── PANEL : LANCER UN IDE EN LIGNE ───────────────────────── */

function LaunchPanel(props: {
  githubDevUrl: string; vscodeDevUrl: string; codespacesUrl: string;
  stackblitzUrl: string; gitpodUrl: string; codeServerUrl: string;
  repo: string; branch: string;
}) {
  const ides = [
    {
      name: 'github.dev',
      desc: 'VS Code in the browser — read & basic edit, sans terminal. Gratuit, instant.',
      url: props.githubDevUrl,
      icon: <Github size={20} />,
      gradient: 'from-zinc-700 to-zinc-900',
      best: 'Le plus rapide pour des edits ponctuels',
      pro: ['Pas d\'install', 'GitHub login auto', 'Syntax + git diff'],
      con: ['Pas de terminal', 'Pas de npm install']
    },
    {
      name: 'vscode.dev',
      desc: 'Microsoft VS Code Web — variant officielle, browser-based.',
      url: props.vscodeDevUrl,
      icon: <Code2 size={20} />,
      gradient: 'from-blue-600 to-cyan-600',
      best: 'Pour des sessions longues sur ton repo GitHub',
      pro: ['Extensions', 'Settings sync', 'Source control'],
      con: ['Pas de terminal', 'Limité côté backend']
    },
    {
      name: 'GitHub Codespaces',
      desc: 'Conteneur cloud complet avec VS Code + terminal + Node + DB. 60h gratuites/mois.',
      url: props.codespacesUrl,
      icon: <Cloud size={20} />,
      gradient: 'from-emerald-600 to-cyan-700',
      best: 'Le plus puissant — comme un Mac dans le cloud',
      pro: ['Terminal complet', 'npm/pnpm install', 'docker', 'preview ports'],
      con: ['~$0.18/h après les 60h gratuites', 'Setup ~30s']
    },
    {
      name: 'StackBlitz',
      desc: 'WebContainers — Node.js qui tourne directement dans le navigateur. Hot reload instant.',
      url: props.stackblitzUrl,
      icon: <Sparkles size={20} />,
      gradient: 'from-violet-600 to-fuchsia-700',
      best: 'Pour expérimenter sans rien installer',
      pro: ['Démarrage 3s', 'Preview live', 'Pas besoin de container'],
      con: ['Limité aux Node-pure', 'Pas de Postgres réel']
    },
    {
      name: 'Gitpod',
      desc: 'Workspace cloud — alternative à Codespaces avec 50h gratuites/mois.',
      url: props.gitpodUrl,
      icon: <Cloud size={20} />,
      gradient: 'from-amber-600 to-orange-700',
      best: 'Alternative open-source à Codespaces',
      pro: ['Terminal complet', '50h gratuites', 'Snapshots'],
      con: ['Setup à configurer (.gitpod.yml)']
    }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 text-xs text-cyan-200/90 space-y-1">
        <p>
          <strong>Repo cible :</strong> <code className="bg-zinc-800 px-1.5 py-0.5 rounded">{props.repo}</code>
          {' '} · branche <code className="bg-zinc-800 px-1.5 py-0.5 rounded">{props.branch}</code>
        </p>
        <p>Choisis ton IDE en ligne préféré ci-dessous. Tous ouvrent dans un nouvel onglet et te connectent directement sur ce repo.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {ides.map((ide) => (
          <a
            key={ide.name}
            href={ide.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 rounded-2xl p-5 transition overflow-hidden"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${ide.gradient}`} />
            <div className="flex items-start gap-3">
              <div className={`shrink-0 rounded-xl bg-gradient-to-br ${ide.gradient} p-3 text-white`}>
                {ide.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  {ide.name}
                  <ExternalLink size={11} className="text-zinc-500 group-hover:text-cyan-400 transition" />
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{ide.desc}</p>
                <p className="text-[11px] text-emerald-300 mt-2 font-bold">→ {ide.best}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-emerald-400 mb-0.5">+ Avantages</p>
                    <ul className="text-[10px] text-zinc-300 space-y-0.5">
                      {ide.pro.map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold text-rose-400 mb-0.5">– Limites</p>
                    <ul className="text-[10px] text-zinc-300 space-y-0.5">
                      {ide.con.map((p, i) => <li key={i}>• {p}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Code-server self-hosted */}
      <div className={`bg-gradient-to-br from-violet-900/40 to-zinc-900 border-2 ${props.codeServerUrl ? 'border-violet-500/50' : 'border-violet-500/20 border-dashed'} rounded-2xl p-5`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 p-3">
            <Cpu size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-base text-white flex items-center gap-2 flex-wrap">
              code-server self-hosted
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">via Tailscale</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              VS Code installé sur ton Mac, accessible via Tailscale depuis ton navigateur. Le plus puissant : terminal complet, exécution dans ton env local.
            </p>
            {props.codeServerUrl ? (
              <a
                href={props.codeServerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 rounded-lg text-sm"
              >
                <ExternalLink size={14} /> Ouvrir code-server ({props.codeServerUrl})
              </a>
            ) : (
              <div className="mt-3 bg-zinc-950 ring-1 ring-zinc-800 rounded-lg p-3 text-[11px]">
                <p className="text-zinc-300 mb-2 font-bold">Pas encore configuré. Setup en 3 étapes :</p>
                <ol className="text-zinc-400 space-y-1 list-decimal list-inside">
                  <li>Installe code-server sur ton Mac : <code className="text-emerald-300">brew install code-server</code></li>
                  <li>Lance : <code className="text-emerald-300">code-server --bind-addr 0.0.0.0:8443 ~/Desktop/godlovedirect</code></li>
                  <li>Définis <code className="text-emerald-300">CODE_SERVER_URL=http://100.x.x.x:8443</code> (ton IP Tailscale) dans Coolify</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── PANEL : EMBED DIRECT ─────────────────────────────────── */

function EmbedPanel({ codeServerUrl, repo, branch }: { codeServerUrl: string; repo: string; branch: string }) {
  const [tryEmbed, setTryEmbed] = useState(false);
  const targetUrl = codeServerUrl || `https://github.dev/${repo}/tree/${branch}`;

  return (
    <div className="space-y-4">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3">
        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-200/90">
          <p className="font-bold mb-1">Limite navigateur</p>
          <p>
            github.dev et vscode.dev refusent l'embed iframe (X-Frame-Options DENY) — ils n'apparaîtront pas ici.
            Pour un VS Code <strong>vraiment intégré</strong>, utilise <code className="bg-zinc-800 px-1 rounded">code-server</code> self-hosted (configurer <code className="bg-zinc-800 px-1 rounded">CODE_SERVER_URL</code>) — il accepte l'embed.
          </p>
        </div>
      </div>

      {!tryEmbed ? (
        <button
          onClick={() => setTryEmbed(true)}
          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-2xl py-12 text-center"
        >
          <Code2 size={32} className="text-cyan-400 mx-auto mb-2" />
          <p className="font-bold">Tenter l'embed</p>
          <p className="text-xs text-zinc-500 mt-1">URL cible : <code>{targetUrl}</code></p>
        </button>
      ) : (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs">
            <code className="text-zinc-400 truncate">{targetUrl}</code>
            <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
              <ExternalLink size={11} /> Ouvrir
            </a>
          </header>
          <iframe
            src={targetUrl}
            className="w-full"
            style={{ height: 'calc(100vh - 240px)', minHeight: 500, border: 0 }}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      )}
    </div>
  );
}

/* ─── PANEL : QUICK EDITOR ─────────────────────────────────── */

function QuickEditor() {
  const [filePath, setFilePath] = useState('');
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!filePath.trim()) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/files?path=${encodeURIComponent(filePath)}`, { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load KO');
      setContent(j.content || '');
      setOriginalContent(j.content || '');
    } catch (e: any) {
      setError(e?.message || 'erreur lecture');
    }
    setLoading(false);
  }

  async function save() {
    if (!filePath.trim()) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch('/api/admin/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath, content })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'save KO');
      setOriginalContent(content);
      setMessage(`✓ ${filePath} sauvegardé (${content.length} bytes)`);
    } catch (e: any) {
      setError(e?.message || 'erreur écriture');
    }
    setSaving(false);
  }

  const dirty = content !== originalContent;

  return (
    <div className="space-y-3">
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 text-xs text-cyan-200/90">
        <p>
          <strong>Quick Editor</strong> — édite directement un fichier de l'app sur le serveur. Utile pour
          des micro-fixes sans repasser par git. Les changements sont écrits sur le filesystem du conteneur
          (perdus au prochain redeploy si pas commit). Pour persister, utilise plutôt <strong>github.dev</strong> ou <strong>Claude CLI</strong>.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-cyan-400" />
          <input
            type="text"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            placeholder="Chemin relatif depuis /app — ex: src/components/Navbar.tsx"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono focus:border-cyan-500 focus:outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          />
          <button
            onClick={load}
            disabled={loading || !filePath.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FolderOpen size={14} />}
            Charger
          </button>
        </div>

        {filePath && (
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setMessage(null); }}
            placeholder="Contenu du fichier…"
            spellCheck={false}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs leading-relaxed focus:border-cyan-500 focus:outline-none"
            style={{ minHeight: 400, maxHeight: '60vh', tabSize: 2 }}
          />
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs">
            {error && <span className="text-rose-300 flex items-center gap-1"><AlertTriangle size={11} /> {error}</span>}
            {message && <span className="text-emerald-300">{message}</span>}
            {!error && !message && filePath && (
              <span className="text-zinc-500">{content.length} caractères {dirty && <span className="text-amber-300">· modifié</span>}</span>
            )}
          </div>
          <button
            onClick={save}
            disabled={saving || !filePath.trim() || !dirty}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold px-5 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
