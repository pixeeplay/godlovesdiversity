'use client';
import { useEffect, useRef, useState } from 'react';
import {
  MessageCircle, CheckCircle2, AlertCircle, XCircle, Loader2, Zap, RefreshCw,
  Webhook, Users, Send, Image as ImageIcon, BarChart3, Volume2, KeyRound, ExternalLink,
  Calendar, ShoppingBag, Heart, Bell, ShieldCheck, Sparkles, ArrowDown, MessageSquare
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

type TgMessage = {
  id: string;
  direction: 'in' | 'out';
  chatId: string;
  userId: string | null;
  username: string | null;
  firstName: string | null;
  text: string | null;
  command: string | null;
  aiInterpreted: boolean;
  imageUrl: string | null;
  callbackData: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

type Stats = { todayIn: number; todayOut: number; totalIn: number; totalOut: number };

const FUNCTIONS: { id: string; label: string; description: string; icon: any; api: string; body?: any }[] = [
  { id: 'ping', label: 'Test ping', description: 'Envoie « Pong » pour vérifier la liaison', icon: Zap, api: '/api/admin/telegram/test', body: { test: 'ping' } },
  { id: 'order', label: 'Notif commande', description: 'Simule une commande boutique', icon: ShoppingBag, api: '/api/admin/telegram/test', body: { test: 'order' } },
  { id: 'photo', label: 'Modération photo', description: 'Photo de test avec boutons ✓/✗', icon: ImageIcon, api: '/api/admin/telegram/test', body: { test: 'photo' } },
  { id: 'broadcast', label: 'Broadcast', description: 'Message dans le groupe (si configuré)', icon: Volume2, api: '/api/admin/telegram/test', body: { test: 'broadcast' } },
  { id: 'stats', label: 'Helper /stats', description: 'Rappel comment voir les stats live', icon: BarChart3, api: '/api/admin/telegram/test', body: { test: 'stats' } }
];

export function TelegramDashboard() {
  const [info, setInfo] = useState<Info | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; error?: string }>>({});
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [composeText, setComposeText] = useState('');
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { void loadInfo(); void loadHistory(); }, []);

  // Poll de l'historique toutes les 5 s
  useEffect(() => {
    const t = setInterval(() => loadHistory(), 5000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll en bas du chat quand nouveaux messages
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function loadInfo() {
    try {
      const r = await fetch('/api/admin/telegram/info');
      const j = await r.json();
      setInfo(j);
    } catch { /* noop */ }
  }

  async function loadHistory() {
    try {
      const r = await fetch('/api/admin/telegram/history?limit=80');
      const j = await r.json();
      if (r.ok) {
        setMessages(j.messages || []);
        setStats(j.stats);
      }
    } catch { /* noop */ }
  }

  async function setupWebhook(action: 'install' | 'uninstall' | 'rotate-secret') {
    setBusy(action);
    try {
      const r = await fetch('/api/admin/telegram/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const j = await r.json();
      if (r.ok) alert(`✓ ${action === 'install' ? 'Webhook installé' : action === 'uninstall' ? 'Webhook désinstallé' : 'Secret renouvelé'}`);
      else alert(`Erreur : ${j.error}`);
      await loadInfo();
    } finally { setBusy(null); }
  }

  async function runFunction(fn: typeof FUNCTIONS[number]) {
    setBusy(fn.id);
    setResults((p) => ({ ...p, [fn.id]: { ok: false } }));
    try {
      const r = await fetch(fn.api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fn.body || {})
      });
      const j = await r.json();
      setResults((p) => ({ ...p, [fn.id]: { ok: r.ok, error: r.ok ? undefined : j.error } }));
      await loadHistory();
    } catch (e: any) {
      setResults((p) => ({ ...p, [fn.id]: { ok: false, error: e?.message } }));
    } finally { setBusy(null); }
  }

  async function sendCustom() {
    if (!composeText.trim()) return;
    setSending(true);
    try {
      const r = await fetch('/api/admin/telegram/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: composeText })
      });
      const j = await r.json();
      if (r.ok) { setComposeText(''); await loadHistory(); }
      else alert(`Erreur : ${j.error}`);
    } finally { setSending(false); }
  }

  const isWebhookOk = info?.webhook?.url && info.webhook.url.includes('/api/webhooks/telegram');
  const lastError = info?.webhook?.last_error_message;
  const fullyConfigured = info?.hasToken && isWebhookOk && (info?.config.hasGroupChatId || info?.config.hasChatId);

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-2.5">
            <MessageCircle size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Bot Telegram GLD</h1>
          {fullyConfigured && (
            <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
              Connecté
            </span>
          )}
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Reçois des notifications + envoie des messages depuis le site (modération, nouvelle commande, alerte…)
          + parle au bot en langage naturel ou avec des commandes <code>/</code>.
        </p>
      </header>

      {/* CARTE CONNECTER (si pas encore configuré) */}
      {!fullyConfigured && (
        <section className="bg-gradient-to-br from-sky-500/10 to-violet-500/10 border-2 border-sky-500/40 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="bg-sky-500 rounded-xl p-3 shrink-0">
              <Webhook size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg mb-1">Connecter Telegram Bot</h2>
              <p className="text-sm text-zinc-300 mb-3">
                Reçois des notifications + envoie des messages depuis le site (modération, nouvelle commande, alerte…).
              </p>
              <ol className="text-xs text-zinc-300 space-y-1.5 mb-4">
                <li><b>1.</b> Crée le bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">@BotFather</a> avec <code className="bg-zinc-950 px-1 rounded">/newbot</code> {info?.hasToken && <span className="text-emerald-400">✓ fait</span>}</li>
                <li><b>2.</b> Colle le token dans <a href="/admin/settings" className="text-sky-400 underline">Paramètres → Telegram</a> {info?.hasToken && <span className="text-emerald-400">✓ fait</span>}</li>
                <li><b>3.</b> Crée un groupe Telegram, ajoute @{info?.bot?.username || 'ton_bot'}, et tape <code>/whoami</code> {(info?.config.hasGroupChatId || info?.config.hasChatId) && <span className="text-emerald-400">✓ fait</span>}</li>
                <li><b>4.</b> Clique « Installer le webhook » ci-dessous {isWebhookOk && <span className="text-emerald-400">✓ fait</span>}</li>
              </ol>
              <button
                onClick={() => setupWebhook('install')}
                disabled={!info?.hasToken || busy === 'install'}
                className="bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
              >
                {busy === 'install' ? <Loader2 size={14} className="animate-spin" /> : <Webhook size={14} />}
                Installer le webhook maintenant
              </button>
            </div>
          </div>
        </section>
      )}

      {/* STATUT QUAND CONFIGURÉ */}
      {fullyConfigured && (
        <section className="grid md:grid-cols-4 gap-3">
          <StatusCard icon={KeyRound} label="Bot" ok={!!info?.hasToken} detail={info?.bot?.username ? `@${info.bot.username}` : '—'} />
          <StatusCard icon={Webhook} label="Webhook" ok={!!isWebhookOk} detail="Actif" warning={!!lastError} warningText={lastError} />
          <StatusCard icon={MessageCircle} label="Chat" ok={!!(info?.config.hasGroupChatId || info?.config.hasChatId)} detail={info?.config.hasGroupChatId ? 'Groupe' : 'Privé'} />
          <StatusCard icon={Users} label="Whitelist" ok={!!info?.config.hasWhitelist} detail={info?.config.whitelistCount ? `${info.config.whitelistCount} user(s)` : 'Tous autorisés'} />
        </section>
      )}

      {/* WHITELIST MULTI-USERS — gestion visuelle des accès */}
      {fullyConfigured && <WhitelistManager />}

      {/* GRILLE DE FONCTIONS */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2"><Sparkles size={16} className="text-amber-400" /> Fonctions disponibles</h2>
          <a href="https://t.me/Pixeeplaybot" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline text-xs flex items-center gap-1">
            Ouvrir le bot dans Telegram <ExternalLink size={10} />
          </a>
        </div>
        <p className="text-xs text-zinc-400 mb-4">Cliquer un bouton envoie un message réel dans Telegram. Tu peux aussi parler au bot en français naturel ou avec des commandes <code>/</code>.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FUNCTIONS.map((fn) => (
            <FunctionCard
              key={fn.id} fn={fn}
              ok={results[fn.id]?.ok}
              error={results[fn.id]?.error}
              busy={busy === fn.id}
              disabled={!info?.hasToken}
              onRun={() => runFunction(fn)}
            />
          ))}
        </div>

        {/* Liste complète des commandes V3 — 40+ commandes, organisées par catégorie */}
        <details className="mt-4" open>
          <summary className="cursor-pointer text-xs font-bold text-zinc-400 hover:text-white">
            ▸ 40+ commandes texte disponibles (cliquer pour voir tout)
          </summary>
          <div className="mt-3 space-y-3">
            {[
              {
                cat: '📊 Lecture & stats',
                cmds: [
                  ['/help', 'Liste complète + tes IDs'],
                  ['/whoami', 'Ton ID Telegram pour la whitelist'],
                  ['/stats', 'Stats jour/semaine/mois'],
                  ['/commandes', '5 dernières commandes boutique'],
                  ['/agenda', 'Prochains événements'],
                  ['/dons', 'Total dons + récents'],
                  ['/newsletter', 'Dernière newsletter'],
                  ['/healthcheck', 'État intégrations'],
                  ['/forum', 'Derniers sujets'],
                  ['/temoignages', 'Témoignages vidéo'],
                  ['/lieux', 'Lieux LGBT-friendly'],
                  ['/peerhelp', 'Demandes entraide'],
                  ['/meetups', 'Meetups à venir'],
                  ['/mentor', 'Matchings mentor'],
                  ['/users', 'Derniers inscrits'],
                  ['/subscribers', 'Abonnés newsletter'],
                  ['/sosalerts', 'Alertes SOS'],
                  ['/shelters', 'Demandes hébergement'],
                  ['/reports', 'Signalements'],
                  ['/products', 'Catalogue boutique'],
                  ['/stock', 'État stock'],
                  ['/topproducts', 'Top ventes'],
                  ['/logs', 'Logs récents'],
                ]
              },
              {
                cat: '✏️ Création',
                cmds: [
                  ['/addvenue …', 'Ajouter un lieu (Nom, Ville)'],
                  ['/addevent …', 'Créer un événement'],
                  ['/addpost …', 'Créer un post forum'],
                  ['/addbanner …', 'Créer une bannière'],
                  ['/addcoupon CODE -X%', 'Créer un coupon promo'],
                  ['/addtemoignage', 'Témoignage depuis ton message'],
                  ['/sendnewsletter', 'Envoyer la dernière campagne'],
                ]
              },
              {
                cat: '🤖 IA Gemini',
                cmds: [
                  ['/aitext …', 'Générer texte (article, post)'],
                  ['/aiimage …', 'Générer image (Imagen)'],
                  ['/aivideo …', 'Générer vidéo (Higgsfield/Veo)'],
                  ['/translate fr→en …', 'Traduire'],
                  ['/verse Romains 1:26', 'Analyse verset (Bible/Coran/Torah)'],
                  ['/legal pacs', 'Aide juridique IA'],
                  ['/voicecoach', 'Simulation conversation (coming out)'],
                ]
              },
              {
                cat: '📢 Communication',
                cmds: [
                  ['/broadcast …', 'Message au groupe'],
                  ['/notify …', 'Push notif aux abonnés'],
                ]
              },
              {
                cat: '🎨 Thèmes & flags',
                cmds: [
                  ['/theme', 'Thème actif'],
                  ['/pridemode', 'Activer thème Pride 🌈'],
                  ['/noelmode', 'Activer thème Noël 🎄'],
                  ['/features', 'Liste feature flags'],
                ]
              },
              {
                cat: '⚙️ Système',
                cmds: [
                  ['/backup', 'Backup DB JSON'],
                  ['/photos pending', 'Photos à modérer ✓/✗'],
                ]
              },
              {
                cat: '📤 Uploads (envoie un fichier)',
                cmds: [
                  ['🎤 Vocal', 'Témoignage audio'],
                  ['📷 Photo', 'Galerie + modération'],
                  ['🎥 Vidéo', 'Témoignage vidéo'],
                ]
              },
            ].map(({ cat, cmds }) => (
              <div key={cat} className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3">
                <div className="text-[11px] font-bold text-zinc-300 mb-2">{cat}</div>
                <div className="grid sm:grid-cols-2 gap-1.5 text-xs">
                  {cmds.map(([cmd, desc]) => (
                    <div key={cmd} className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 flex items-center gap-2">
                      <code className="text-cyan-300 font-bold flex-shrink-0">{cmd}</code>
                      <span className="text-zinc-500">→</span>
                      <span className="text-zinc-300 truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="bg-violet-500/5 border border-violet-500/30 rounded-lg p-2 text-xs text-violet-200">
              💬 <b>Astuce</b> : tu peux aussi écrire en français naturel — l'IA Gemini comprend
              (ex: « combien de commandes cette semaine ? » → /stats, « génère une image de chat » → /aiimage chat)
            </div>
          </div>
        </details>
      </section>

      {/* HISTORIQUE CHAT LIVE */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-cyan-400" />
            <h2 className="font-bold">Chat live</h2>
            {stats && (
              <span className="text-[10px] text-zinc-500 ml-2">
                Dernières 24 h : <b className="text-emerald-400">{stats.todayIn}</b> in / <b className="text-violet-400">{stats.todayOut}</b> out · Total <b>{stats.totalIn + stats.totalOut}</b>
              </span>
            )}
          </div>
          <button onClick={loadHistory} className="text-zinc-400 hover:text-white p-1" title="Actualiser">
            <RefreshCw size={14} />
          </button>
        </div>

        <div ref={chatRef} className="h-[400px] overflow-y-auto p-4 space-y-2 bg-zinc-950">
          {messages.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-12">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              Aucun message pour le moment.<br />
              <span className="text-xs">Envoie une commande au bot pour démarrer.</span>
            </div>
          ) : messages.map((m) => (
            <ChatBubble key={m.id} msg={m} />
          ))}
        </div>

        {/* Compose */}
        <div className="p-3 border-t border-zinc-800 flex gap-2 bg-zinc-900">
          <input
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendCustom())}
            placeholder="Écrire un message à envoyer dans le chat Telegram (HTML ok : <b>gras</b>, <i>italique</i>)…"
            disabled={!info?.hasToken || sending}
            className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500 disabled:opacity-50"
          />
          <button
            onClick={sendCustom}
            disabled={!composeText.trim() || sending || !info?.hasToken}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Envoyer
          </button>
        </div>
      </section>

      {/* SETUP / DÉSINSTALLATION en bas */}
      {fullyConfigured && (
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <details>
            <summary className="cursor-pointer text-xs font-bold text-zinc-400 hover:text-white">
              ▸ Maintenance webhook (avancé)
            </summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setupWebhook('install')} disabled={busy === 'install'} className="bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                {busy === 'install' ? <Loader2 size={12} className="animate-spin" /> : <Webhook size={12} />}
                Réinstaller
              </button>
              <button onClick={() => setupWebhook('rotate-secret')} disabled={busy === 'rotate-secret'} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                <KeyRound size={12} /> Renouveler secret
              </button>
              <button onClick={() => setupWebhook('uninstall')} disabled={busy === 'uninstall'} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5">
                <XCircle size={12} /> Désinstaller
              </button>
              <span className="text-[10px] text-zinc-500 ml-auto self-center">URL : <code>{info?.webhook?.url}</code></span>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

// =================== COMPOSANTS ===================

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

function FunctionCard({ fn, ok, error, busy, disabled, onRun }: any) {
  const Icon = fn.icon;
  return (
    <button
      onClick={onRun}
      disabled={disabled || busy}
      className={`text-left bg-zinc-950 border border-zinc-800 rounded-xl p-3 hover:border-amber-500/50 disabled:opacity-40 disabled:cursor-not-allowed transition`}
    >
      <div className="flex items-start gap-2 mb-2">
        <Icon size={16} className="text-amber-400 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-sm text-white flex items-center gap-2">
            {fn.label}
            {ok === true && <CheckCircle2 size={12} className="text-emerald-400" />}
            {ok === false && error && <XCircle size={12} className="text-red-400" />}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{fn.description}</div>
        </div>
      </div>
      {busy && <div className="text-[10px] text-amber-300 flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Envoi…</div>}
      {error && <div className="text-[10px] text-red-300 mt-1.5 break-words">{error}</div>}
    </button>
  );
}

function ChatBubble({ msg }: { msg: TgMessage }) {
  const isIn = msg.direction === 'in';
  const time = new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sender = isIn ? (msg.firstName || msg.username || `User ${msg.userId?.slice(0, 6)}`) : 'GLD bot';

  return (
    <div className={`flex ${isIn ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs ${isIn ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-zinc-900 border border-zinc-800'}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className={`text-[9px] font-bold uppercase ${isIn ? 'text-cyan-300' : 'text-violet-300'}`}>{sender}</span>
          <span className="text-[9px] text-zinc-500">{time}</span>
          {msg.command && <span className="text-[9px] bg-cyan-500/20 text-cyan-200 px-1.5 rounded-full">/{msg.command}</span>}
          {msg.aiInterpreted && <span className="text-[9px] bg-violet-500/20 text-violet-200 px-1.5 rounded-full">🧠 IA</span>}
          {msg.callbackData && <span className="text-[9px] bg-amber-500/20 text-amber-200 px-1.5 rounded-full">🔘 {msg.callbackData}</span>}
          {msg.status === 'failed' && <span className="text-[9px] bg-red-500/20 text-red-200 px-1.5 rounded-full">❌ failed</span>}
          {msg.status === 'ignored' && <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1.5 rounded-full">🚫 ignoré</span>}
        </div>
        {msg.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={msg.imageUrl} alt="" className="rounded-lg max-w-[180px] mb-1.5" />
        )}
        {msg.text && (
          <div
            className="text-zinc-200 whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: msg.text.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ') }}
          />
        )}
        {msg.errorMessage && <div className="text-[10px] text-red-300 mt-1">⚠ {msg.errorMessage}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WHITELIST MANAGER : ajout/retrait visuel d'utilisateurs autorisés au bot
// ─────────────────────────────────────────────
type WhUser = { id: string; label: string };

function WhitelistManager() {
  const [users, setUsers] = useState<WhUser[]>([]);
  const [labelsRaw, setLabelsRaw] = useState(''); // JSON brut depuis Setting
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    try {
      const r = await fetch('/api/admin/settings');
      const j = await r.json();
      const ids = (j.settings?.['integrations.telegram.allowedUserIds'] || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      let labels: Record<string, string> = {};
      try { labels = JSON.parse(j.settings?.['integrations.telegram.userLabels'] || '{}'); } catch {}
      setLabelsRaw(JSON.stringify(labels));
      setUsers(ids.map((id: string) => ({ id, label: labels[id] || '' })));
    } catch {}
    setLoaded(true);
  }

  async function persist(next: WhUser[]) {
    setSaving(true);
    const csv = next.map((u) => u.id).join(',');
    const labels = Object.fromEntries(next.filter((u) => u.label.trim()).map((u) => [u.id, u.label.trim()]));
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'integrations.telegram.allowedUserIds': csv,
        'integrations.telegram.userLabels': JSON.stringify(labels)
      })
    });
    setLabelsRaw(JSON.stringify(labels));
    setSaving(false);
  }

  function add() {
    const id = newId.trim();
    if (!/^-?\d+$/.test(id)) { alert('user_id Telegram doit être numérique (ex: 123456789)'); return; }
    if (users.find((u) => u.id === id)) { alert('Cet ID est déjà dans la whitelist'); return; }
    const next = [...users, { id, label: newLabel.trim() }];
    setUsers(next);
    setNewId(''); setNewLabel('');
    void persist(next);
  }

  function remove(id: string) {
    if (!confirm(`Retirer ${id} de la whitelist ?`)) return;
    const next = users.filter((u) => u.id !== id);
    setUsers(next);
    void persist(next);
  }

  function updateLabel(id: string, label: string) {
    const next = users.map((u) => u.id === id ? { ...u, label } : u);
    setUsers(next);
    // debounce léger : on persist sur blur
  }

  function persistLabel(id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) return;
    void persist(users);
  }

  if (!loaded) return null;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold flex items-center gap-2"><Users size={16} className="text-cyan-400" /> Whitelist multi-utilisateurs</h2>
        {saving && <Loader2 size={14} className="animate-spin text-cyan-400" />}
      </div>
      <p className="text-xs text-zinc-400 mb-4">
        Définit qui peut utiliser le bot (envoyer des commandes). <b className="text-amber-300">Vide = tout le monde autorisé</b>. Pour récupérer ton user_id Telegram : envoie <code>/whoami</code> au bot, ou demande aux personnes que tu veux ajouter.
      </p>

      {/* Liste des users actuels */}
      {users.length > 0 ? (
        <div className="space-y-2 mb-4">
          {users.map((u) => (
            <div key={u.id} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(u.label || u.id).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={u.label}
                  onChange={(e) => updateLabel(u.id, e.target.value)}
                  onBlur={() => persistLabel(u.id)}
                  placeholder="Nom (ex: Alice — modératrice)"
                  className="w-full bg-transparent text-white text-sm font-medium border-b border-zinc-800 focus:border-cyan-500 outline-none pb-1"
                />
                <code className="text-[11px] text-zinc-500">user_id : {u.id}</code>
              </div>
              <button
                onClick={() => remove(u.id)}
                className="text-zinc-500 hover:text-red-400 p-2 rounded hover:bg-red-500/10"
                title="Retirer"
              >
                <XCircle size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-lg p-3 mb-4 text-xs text-amber-200">
          ⚠ Aucune restriction — <b>tout utilisateur Telegram</b> peut interagir avec le bot. Ajoute au moins ton ID pour restreindre.
        </div>
      )}

      {/* Ajout d'un nouveau user */}
      <div className="bg-zinc-950 border border-dashed border-zinc-700 rounded-lg p-3">
        <div className="text-[11px] font-bold text-zinc-300 mb-2">+ Ajouter un utilisateur</div>
        <div className="grid sm:grid-cols-[1fr_2fr_auto] gap-2">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="user_id (123456789)"
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
          />
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Nom (optionnel)"
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
          />
          <button
            onClick={add}
            disabled={!newId.trim()}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-1"
          >
            <CheckCircle2 size={14} /> Ajouter
          </button>
        </div>
      </div>
    </section>
  );
}
