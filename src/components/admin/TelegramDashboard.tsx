'use client';
import { useEffect, useState } from 'react';
import {
  MessageCircle, CheckCircle2, AlertCircle, XCircle, Loader2, Zap, RefreshCw,
  Settings, Webhook, Users, Send, Image as ImageIcon, BarChart3, Volume2, KeyRound, ExternalLink
} from 'lucide-react';

type Info = {
  hasToken: boolean;
  bot: any;
  webhook: any;
  error: string | null;
  config: {
    hasGroupChatId: boolean;
    hasChatId: boolean;
    hasWhitelist: boolean;
    whitelistCount: number;
    hasWebhookSecret: boolean;
  };
};

type TestResult = { ok: boolean; sent?: string; error?: string };

export function TelegramDashboard() {
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/telegram/info');
      const j = await r.json();
      setInfo(j);
    } finally { setLoading(false); }
  }

  async function setupWebhook(action: 'install' | 'uninstall' | 'rotate-secret') {
    setBusyAction(action);
    try {
      const r = await fetch('/api/admin/telegram/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const j = await r.json();
      if (r.ok) {
        alert(`✓ ${action === 'install' ? 'Webhook installé' : action === 'uninstall' ? 'Webhook désinstallé' : 'Secret renouvelé'}`);
      } else {
        alert(`Erreur : ${j.error}`);
      }
      await load();
    } finally { setBusyAction(null); }
  }

  async function runTest(test: string) {
    setBusyAction(test);
    setResults((p) => ({ ...p, [test]: { ok: false } }));
    try {
      const r = await fetch('/api/admin/telegram/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test })
      });
      const j = await r.json();
      setResults((p) => ({ ...p, [test]: r.ok ? { ok: true, sent: j.sent } : { ok: false, error: j.error } }));
    } catch (e: any) {
      setResults((p) => ({ ...p, [test]: { ok: false, error: e?.message } }));
    } finally { setBusyAction(null); }
  }

  const isWebhookOk = info?.webhook?.url && info.webhook.url.includes('/api/webhooks/telegram');
  const pendingUpdates = info?.webhook?.pending_update_count ?? 0;
  const lastError = info?.webhook?.last_error_message;

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-2.5">
            <MessageCircle size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Bot Telegram GLD</h1>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Configure le bot, vérifie son statut, exécute des tests fonctionnels et gère les notifications + commandes.
        </p>
      </header>

      {/* STATUT GLOBAL */}
      <section className="grid md:grid-cols-4 gap-3">
        <StatusCard
          icon={KeyRound}
          label="Token bot"
          ok={!!info?.hasToken}
          detail={info?.bot?.username ? `@${info.bot.username}` : 'Non configuré'}
        />
        <StatusCard
          icon={Webhook}
          label="Webhook"
          ok={!!isWebhookOk}
          detail={isWebhookOk ? 'Actif' : 'À installer'}
          warning={!!lastError}
          warningText={lastError}
        />
        <StatusCard
          icon={MessageCircle}
          label="Chat de notif"
          ok={!!(info?.config.hasGroupChatId || info?.config.hasChatId)}
          detail={info?.config.hasGroupChatId ? 'Groupe' : info?.config.hasChatId ? 'Privé' : 'Aucun'}
        />
        <StatusCard
          icon={Users}
          label="Whitelist"
          ok={!!info?.config.hasWhitelist}
          detail={info?.config.whitelistCount ? `${info.config.whitelistCount} user(s)` : 'Mode permissif'}
        />
      </section>

      {/* INFOS BOT */}
      {info?.bot && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="font-bold mb-3 flex items-center gap-2"><Settings size={16} className="text-sky-400" /> Bot</h2>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <Field k="Nom" v={info.bot.first_name} />
            <Field k="Username" v={`@${info.bot.username}`} link={`https://t.me/${info.bot.username}`} />
            <Field k="ID" v={info.bot.id} />
            <Field k="Peut rejoindre groupes" v={info.bot.can_join_groups ? 'Oui' : 'Non'} />
            <Field k="Lit messages groupe" v={info.bot.can_read_all_group_messages ? 'Tous' : 'Mentions seules'} />
            <Field k="Inline queries" v={info.bot.supports_inline_queries ? 'Oui' : 'Non'} />
          </div>
        </section>
      )}

      {/* SETUP WEBHOOK */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><Webhook size={16} className="text-violet-400" /> Webhook</h2>
        <p className="text-xs text-zinc-400 mb-3">
          Le webhook est l'URL que Telegram appelle quand un utilisateur t'envoie un message. Sans webhook, les commandes <code>/stats</code>, <code>/photos</code>, etc. ne marchent pas.
        </p>
        {isWebhookOk && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mb-3 text-xs space-y-1">
            <div className="text-emerald-300 font-bold flex items-center gap-1.5"><CheckCircle2 size={12} /> Webhook actif</div>
            <div className="text-zinc-400">URL : <code className="text-zinc-200">{info?.webhook?.url}</code></div>
            {pendingUpdates > 0 && <div className="text-amber-300">⚠ {pendingUpdates} update(s) en attente de traitement</div>}
            {lastError && <div className="text-red-300">❌ Dernière erreur : {lastError}</div>}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setupWebhook('install')}
            disabled={!info?.hasToken || busyAction === 'install'}
            className="bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
          >
            {busyAction === 'install' ? <Loader2 size={14} className="animate-spin" /> : <Webhook size={14} />}
            Installer / Réinstaller le webhook
          </button>
          <button
            onClick={() => setupWebhook('rotate-secret')}
            disabled={!info?.hasToken || busyAction === 'rotate-secret'}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-full text-sm flex items-center gap-2"
          >
            <KeyRound size={14} /> Renouveler le secret
          </button>
          <button
            onClick={() => setupWebhook('uninstall')}
            disabled={!info?.hasToken || busyAction === 'uninstall'}
            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 px-4 py-2 rounded-full text-sm flex items-center gap-2"
          >
            <XCircle size={14} /> Désinstaller
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-full text-sm flex items-center gap-2 ml-auto"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Actualiser
          </button>
        </div>
      </section>

      {/* TESTS */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-1 flex items-center gap-2"><Zap size={16} className="text-amber-400" /> Tests fonctionnels</h2>
        <p className="text-xs text-zinc-400 mb-4">Chaque bouton envoie un message réel dans ton chat Telegram. Tu sauras si tout marche.</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          <TestCard
            icon={Send} label="Test ping"
            description="Envoie un message simple « Pong »"
            ok={results.ping?.ok} error={results.ping?.error}
            disabled={!info?.hasToken || (!info.config.hasGroupChatId && !info.config.hasChatId)}
            onRun={() => runTest('ping')} busy={busyAction === 'ping'}
          />
          <TestCard
            icon={BarChart3} label="Test notif commande"
            description="Simule une nouvelle commande boutique → notification arrive"
            ok={results.order?.ok} error={results.order?.error}
            disabled={!info?.hasToken}
            onRun={() => runTest('order')} busy={busyAction === 'order'}
          />
          <TestCard
            icon={ImageIcon} label="Test modération photo"
            description="Envoie une miniature avec boutons ✓/✗ — clique pour tester"
            ok={results.photo?.ok} error={results.photo?.error}
            disabled={!info?.hasToken}
            onRun={() => runTest('photo')} busy={busyAction === 'photo'}
          />
          <TestCard
            icon={Volume2} label="Test broadcast"
            description="Envoie un message dans le groupe (si configuré)"
            ok={results.broadcast?.ok} error={results.broadcast?.error}
            disabled={!info?.hasToken}
            onRun={() => runTest('broadcast')} busy={busyAction === 'broadcast'}
          />
          <TestCard
            icon={BarChart3} label="Helper /stats"
            description="Rappel : tape /stats au bot pour voir tes vrais chiffres"
            ok={results.stats?.ok} error={results.stats?.error}
            disabled={!info?.hasToken}
            onRun={() => runTest('stats')} busy={busyAction === 'stats'}
          />
        </div>
      </section>

      {/* COMMANDES UTILES */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold mb-3 flex items-center gap-2"><MessageCircle size={16} className="text-cyan-400" /> Commandes disponibles dans le chat</h2>
        <p className="text-xs text-zinc-400 mb-3">À taper dans ton chat avec le bot ou dans le groupe (le bot répondra) :</p>
        <div className="grid md:grid-cols-2 gap-2 text-xs">
          {[
            ['/help', 'Liste des commandes + tes IDs Telegram'],
            ['/stats', 'Stats du jour / semaine / mois'],
            ['/commandes', '5 dernières commandes'],
            ['/photos pending', 'Photos à modérer (avec boutons ✓/✗)'],
            ['/agenda', 'Prochains événements'],
            ['/dons', 'Total dons et derniers'],
            ['/newsletter', 'Dernière campagne'],
            ['/healthcheck', 'État de toutes les intégrations'],
            ['/whoami', 'Ton user_id (utile pour la whitelist)']
          ].map(([cmd, desc]) => (
            <div key={cmd} className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex items-center gap-2">
              <code className="text-cyan-300 font-bold">{cmd}</code>
              <span className="text-zinc-500">→</span>
              <span className="text-zinc-300">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* AIDE CONFIG */}
      {!info?.hasToken && (
        <section className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-sm">
          <h3 className="font-bold text-amber-200 mb-2 flex items-center gap-2"><AlertCircle size={16} /> Pour activer le bot</h3>
          <ol className="space-y-1.5 text-amber-100/90 text-xs">
            <li>1. Sur Telegram, parle à <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline">@BotFather</a> et tape <code className="bg-zinc-950 px-1 rounded">/newbot</code></li>
            <li>2. Donne un nom (ex : « GLD Admin Bot ») et un username unique (ex : <code className="bg-zinc-950 px-1 rounded">gld_admin_bot</code>)</li>
            <li>3. Récupère le token (commence par <code className="bg-zinc-950 px-1 rounded">12345:ABC…</code>)</li>
            <li>4. Va dans <a href="/admin/settings" className="underline">Paramètres → Telegram</a> et colle le token</li>
            <li>5. Crée un groupe Telegram, ajoute ton bot, fais lui dire <code>/whoami</code> pour récupérer le <code>chat_id</code></li>
            <li>6. Reviens ici et clique <b>Installer le webhook</b></li>
          </ol>
        </section>
      )}
    </div>
  );
}

// ============================================================
// COMPOSANTS
// ============================================================

function StatusCard({ icon: Icon, label, ok, detail, warning, warningText }: any) {
  const color = ok && !warning ? 'border-emerald-500/40 bg-emerald-500/5' :
                warning ? 'border-amber-500/40 bg-amber-500/5' :
                'border-red-500/40 bg-red-500/5';
  const iconColor = ok && !warning ? 'text-emerald-400' : warning ? 'text-amber-400' : 'text-red-400';
  return (
    <div className={`rounded-2xl border p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className={iconColor} />
        <span className="text-[10px] uppercase font-bold text-zinc-400">{label}</span>
      </div>
      <div className="text-sm font-bold text-white truncate">{detail}</div>
      {warning && warningText && <div className="text-[10px] text-amber-300/80 mt-1 truncate" title={warningText}>{warningText}</div>}
    </div>
  );
}

function Field({ k, v, link }: { k: string; v: any; link?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-zinc-500 text-xs">{k}</span>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline flex items-center gap-1">
          {String(v)} <ExternalLink size={10} />
        </a>
      ) : (
        <code className="text-zinc-200">{String(v)}</code>
      )}
    </div>
  );
}

function TestCard({ icon: Icon, label, description, onRun, busy, ok, error, disabled }: any) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
      <div className="flex items-start gap-2 mb-2">
        <Icon size={16} className="text-amber-400 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-sm text-white">{label}</div>
          <div className="text-[11px] text-zinc-500">{description}</div>
        </div>
        {ok === true && <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
        {ok === false && error && <XCircle size={16} className="text-red-400 shrink-0" />}
      </div>
      <button
        onClick={onRun}
        disabled={disabled || busy}
        className="w-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-100 disabled:opacity-30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
        Lancer le test
      </button>
      {error && <div className="text-[10px] text-red-300 mt-1.5 break-words">{error}</div>}
    </div>
  );
}
