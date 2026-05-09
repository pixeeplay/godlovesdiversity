'use client';
import { useEffect, useState } from 'react';
import {
  Code2, Bot, MessageCircle, ExternalLink, AlertTriangle, CheckCircle2, XCircle, Clock,
  Send, RefreshCw, Loader2, ShieldCheck, Sparkles, Github
} from 'lucide-react';

interface Props {
  codeServerUrl: string;
  telegramConfigured: boolean;
}

interface Approval {
  id: string;
  action: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'timeout';
  decidedBy: string | null;
  decidedAt: string | null;
  expiresAt: string;
  createdAt: string;
  telegramMessageId: string | null;
}

/**
 * Claude Workspace — combine 3 panels :
 *   ① VS Code online (iframe code-server avec extension Claude Code)
 *   ② Feed live des approvals Telegram (avec polling)
 *   ③ Quick-actions pour donner des objectifs à Claude
 *
 * Le but : tu peux laisser Claude bosser dans VS Code online, et tu valides depuis Telegram.
 */
export function ClaudeWorkspaceClient({ codeServerUrl, telegramConfigured }: Props) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [autopolling, setAutopolling] = useState(true);

  async function loadApprovals() {
    try {
      const r = await fetch('/api/admin/telegram/ask-approval', { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setApprovals(j.approvals || []);
    } catch {}
  }

  useEffect(() => { loadApprovals(); }, []);

  // Auto-refresh toutes les 5s
  useEffect(() => {
    if (!autopolling) return;
    const id = setInterval(loadApprovals, 5_000);
    return () => clearInterval(id);
  }, [autopolling]);

  const pending = approvals.filter((a) => a.status === 'pending').length;

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-[1800px] mx-auto">
      {/* Setup banner si manquant */}
      {(!codeServerUrl || !telegramConfigured) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-amber-200 flex items-center gap-2 mb-3">
            <AlertTriangle size={18} /> Setup nécessaire pour le workspace complet
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-xs">
            <SetupCard
              done={!!codeServerUrl}
              title="① code-server self-hosted"
              steps={[
                'Sur ton Mac : brew install code-server',
                'Lance : code-server --bind-addr 0.0.0.0:8443 ~/Desktop/godlovedirect',
                'Installe l\'extension "Claude Code for VS Code" (Anthropic) dans le panneau Extensions',
                'Connecte-toi avec ton compte Claude Max (OAuth)',
                'Définis CODE_SERVER_URL=http://100.x.x.x:8443 dans /admin/secrets'
              ]}
            />
            <SetupCard
              done={telegramConfigured}
              title="② Telegram bot (human-in-the-loop)"
              steps={[
                'Va sur @BotFather → /newbot, crée un bot',
                'Copie le token dans /admin/secrets → TELEGRAM_BOT_TOKEN',
                'Envoie /start à ton bot, récupère ton chat ID via api.telegram.org/bot<TOKEN>/getUpdates',
                'Définis TELEGRAM_ADMIN_CHAT_ID dans /admin/secrets',
                'Setup webhook : curl https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://gld.pixeeplay.com/api/telegram/webhook'
              ]}
            />
          </div>
        </div>
      )}

      <div className={`grid ${showSidebar ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'} gap-3`}>
        {/* MAIN — VS Code online */}
        <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl overflow-hidden">
          <header className="bg-gradient-to-r from-violet-950/50 to-fuchsia-950/30 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 size={14} className="text-cyan-400" />
              <span className="font-bold text-sm">VS Code online</span>
              {codeServerUrl ? (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">connecté</span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">non configuré</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                {showSidebar ? '◀ Cacher feed' : '▶ Afficher feed'}
              </button>
              {codeServerUrl && (
                <a href={codeServerUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                  <ExternalLink size={11} /> Plein écran
                </a>
              )}
            </div>
          </header>
          {codeServerUrl ? (
            <iframe
              src={codeServerUrl}
              className="w-full"
              style={{ height: 'calc(100vh - 250px)', minHeight: 600, border: 0 }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <Code2 size={48} className="text-zinc-700 mb-4" />
              <p className="text-zinc-300 font-bold mb-2">VS Code online non configuré</p>
              <p className="text-xs text-zinc-500 max-w-md mb-4">
                Configure <code className="bg-zinc-800 px-1.5 py-0.5 rounded">CODE_SERVER_URL</code> dans <a href="/admin/secrets" className="text-cyan-300 underline">/admin/secrets</a> avec l'URL Tailscale de ton code-server local.
              </p>
              <div className="flex gap-2">
                <a href="/admin/vscode-online" className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5">
                  <ExternalLink size={11} /> Alternatives (github.dev, Codespaces…)
                </a>
                <a href="/admin/secrets" className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold">
                  Configurer secrets
                </a>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR — Approvals Telegram */}
        {showSidebar && (
          <aside className="space-y-3">
            <header className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle size={14} className="text-cyan-400" />
                  <h3 className="font-bold text-sm">Feed Telegram</h3>
                </div>
                <label className="flex items-center gap-1 text-[10px] text-zinc-500 cursor-pointer">
                  <input type="checkbox" checked={autopolling} onChange={(e) => setAutopolling(e.target.checked)} className="accent-cyan-500" />
                  Auto-refresh 5s
                </label>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Quand Claude (en mode autopilot) demande une validation pour push/deploy, ça apparaît ici ET sur ton Telegram. Tu valides depuis ton phone, le code se déploie tout seul.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat label="En attente" value={pending} color={pending > 0 ? 'amber' : 'zinc'} />
                <Stat label="Total 24h" value={approvals.length} color="zinc" />
              </div>
            </header>

            {/* Quick prompts */}
            <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-fuchsia-400" />
                <h3 className="font-bold text-sm">Quick-actions Claude</h3>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">Clique pour ouvrir Claude (drawer flottant 🤖) avec ce prompt pré-rempli :</p>
              <div className="space-y-1.5">
                {[
                  { icon: '🐛', label: 'Lis les logs récents et fix le bug le + récurrent' },
                  { icon: '🚀', label: 'Audit les performances de l\'app et applique 3 optimisations' },
                  { icon: '🎨', label: 'Modernise le hero de la home (en autopilot, push après validation)' },
                  { icon: '📚', label: 'Génère 10 articles pour /admin/news avec cover image et HTML' },
                  { icon: '🧪', label: 'Crée des tests Vitest pour le module X (couverture 80%)' }
                ].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      // L'event ouvre le drawer flottant (FloatingClaudeButton écoute window.dispatchEvent)
                      window.dispatchEvent(new CustomEvent('claude:open', { detail: { prompt: p.label } }));
                    }}
                    className="w-full text-left text-xs bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-300 hover:text-white"
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Liste approvals */}
            <section className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ShieldCheck size={14} className="text-violet-400" />
                  Approvals récents
                </h3>
                <button onClick={loadApprovals} className="text-xs text-zinc-400 hover:text-white p-1">
                  <RefreshCw size={11} />
                </button>
              </div>
              {approvals.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-6">Aucune validation en cours.</p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {approvals.slice(0, 20).map((a) => <ApprovalCard key={a.id} approval={a} onChange={loadApprovals} />)}
                </div>
              )}
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}

function ApprovalCard({ approval, onChange }: { approval: Approval; onChange: () => void }) {
  const isPending = approval.status === 'pending';
  const isExpired = isPending && new Date(approval.expiresAt) < new Date();
  const elapsed = Math.round((Date.now() - new Date(approval.createdAt).getTime()) / 1000);
  const remaining = Math.round((new Date(approval.expiresAt).getTime() - Date.now()) / 1000);

  const statusMeta = {
    pending: { color: 'amber', icon: Clock, label: 'En attente' },
    approved: { color: 'emerald', icon: CheckCircle2, label: 'Approuvé' },
    rejected: { color: 'rose', icon: XCircle, label: 'Rejeté' },
    timeout: { color: 'zinc', icon: Clock, label: 'Timeout' }
  }[approval.status] || { color: 'zinc', icon: Clock, label: approval.status };

  const Icon = statusMeta.icon;
  const colorClass = {
    amber: 'border-amber-500/40 bg-amber-500/5',
    emerald: 'border-emerald-500/40 bg-emerald-500/5',
    rose: 'border-rose-500/40 bg-rose-500/5',
    zinc: 'border-zinc-800 bg-zinc-900'
  }[statusMeta.color];

  return (
    <div className={`border rounded-lg p-2.5 text-xs ${colorClass}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <Icon size={11} className={`text-${statusMeta.color}-300`} />
          <span className={`text-[9px] uppercase font-bold tracking-wider text-${statusMeta.color}-300`}>
            {isExpired && isPending ? 'Expiré' : statusMeta.label}
          </span>
        </div>
        <span className="text-[9px] text-zinc-500">il y a {elapsed < 60 ? `${elapsed}s` : `${Math.round(elapsed / 60)}min`}</span>
      </div>
      <p className="text-zinc-200 font-bold text-[11px]">{approval.action}</p>
      <p className="text-zinc-400 text-[10px] line-clamp-2 mt-0.5">{approval.description}</p>
      {isPending && !isExpired && remaining > 0 && (
        <p className="text-[9px] text-amber-300 mt-1">⏱ Expire dans {Math.round(remaining / 60)}min — réponds sur Telegram</p>
      )}
      {!isPending && approval.decidedBy && (
        <p className="text-[9px] text-zinc-500 mt-1">Par @{approval.decidedBy}</p>
      )}
    </div>
  );
}

function SetupCard({ done, title, steps }: { done: boolean; title: string; steps: string[] }) {
  return (
    <div className={`bg-zinc-950/60 ring-1 ${done ? 'ring-emerald-500/40' : 'ring-amber-500/40'} rounded-xl p-3`}>
      <h3 className={`font-bold mb-2 flex items-center gap-1.5 ${done ? 'text-emerald-300' : 'text-amber-300'}`}>
        {done ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
        {title}
      </h3>
      <ol className="space-y-1 text-zinc-400 list-decimal list-inside">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'amber' | 'zinc' }) {
  const map = {
    amber: 'bg-amber-500/10 text-amber-300',
    zinc: 'bg-zinc-800 text-zinc-300'
  }[color];
  return (
    <div className={`rounded-lg p-2 text-center ${map}`}>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[9px] uppercase font-bold tracking-wider opacity-70">{label}</div>
    </div>
  );
}
