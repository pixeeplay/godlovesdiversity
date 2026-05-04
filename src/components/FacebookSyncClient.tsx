'use client';
import { useEffect, useState } from 'react';
import { Facebook, Bookmark, Mail, Cookie, Loader2, CheckCircle2, ExternalLink, Copy, Check, AlertTriangle, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';

type Props = {
  venues: Array<{ id: string; name: string; slug: string; city?: string | null }>;
  userEmail: string;
  feedConfigured: boolean;
  lastSyncedAt: Date | string | null;
  siteUrl: string;
};

export function FacebookSyncClient({ venues, userEmail, feedConfigured, lastSyncedAt, siteUrl }: Props) {
  const [tab, setTab] = useState<'A' | 'B' | 'C'>('A');

  return (
    <>
      <header className="mb-6">
        <Link href="/espace-pro" className="text-fuchsia-400 hover:underline text-sm flex items-center gap-1 mb-2">
          <ArrowLeft size={14} /> Espace pro
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl p-3">
            <Facebook size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl">Importer mes events Facebook</h1>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          3 méthodes pour récupérer les événements LGBT-friendly de ton feed Facebook (où tu es invité par les établissements) vers GLD, en brouillon ou auto-publié.
        </p>
      </header>

      {/* Onglets */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1 mb-6 inline-flex">
        <button onClick={() => setTab('A')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${tab === 'A' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Bookmark size={14} /> A · Bookmarklet
        </button>
        <button onClick={() => setTab('B')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${tab === 'B' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Mail size={14} /> B · Email auto
        </button>
        <button onClick={() => setTab('C')} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${tab === 'C' ? 'bg-fuchsia-500 text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Cookie size={14} /> C · Sync feed
        </button>
      </div>

      {tab === 'A' && <TabA venues={venues} siteUrl={siteUrl} />}
      {tab === 'B' && <TabB userEmail={userEmail} siteUrl={siteUrl} />}
      {tab === 'C' && <TabC feedConfigured={feedConfigured} lastSyncedAt={lastSyncedAt} />}
    </>
  );
}

/* ================= ONGLET A — BOOKMARKLET + URL MANUELLE ================= */

function TabA({ venues, siteUrl }: { venues: Props['venues']; siteUrl: string }) {
  const bookmarklet = `javascript:(function(){var u=encodeURIComponent(location.href);window.open('${siteUrl}/espace-pro/facebook-sync?import='+u,'_blank','width=600,height=700');})();`;

  const [url, setUrl] = useState('');
  const [venueId, setVenueId] = useState(venues[0]?.id || '');
  const [autoPublish, setAutoPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Si l'URL contient ?import=..., remplit auto le formulaire
    const u = new URL(window.location.href);
    const imported = u.searchParams.get('import');
    if (imported) setUrl(decodeURIComponent(imported));
  }, []);

  async function importNow() {
    if (!url) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch('/api/pro/events/import-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, venueId: venueId || undefined, autoPublish })
      });
      const j = await r.json();
      setResult(j);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      {/* Bookmarklet */}
      <section className="bg-zinc-900 border border-violet-500/30 rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Bookmark size={18} className="text-violet-400" /> 1 · Installe le bookmarklet</h2>
        <p className="text-sm text-zinc-400 mb-3">
          Glisse ce bouton dans ta barre de favoris du navigateur (Chrome/Safari/Firefox).
          Quand tu es sur un event Facebook qui t'intéresse, clique-le → l'event arrivera ici en brouillon, lié à ton venue.
        </p>
        <div className="flex items-center gap-3">
          <a
            href={bookmarklet}
            onClick={(e) => e.preventDefault()}
            draggable
            className="bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white font-bold px-5 py-3 rounded-full text-sm cursor-grab active:cursor-grabbing inline-flex items-center gap-2 shadow-lg shadow-fuchsia-500/30 select-none"
          >
            🔖 Envoyer à GLD
          </a>
          <button
            onClick={() => { navigator.clipboard.writeText(bookmarklet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
          >
            {copied ? <><Check size={11} /> Copié</> : <><Copy size={11} /> Copier le code</>}
          </button>
        </div>
        <details className="mt-3 text-xs text-zinc-500">
          <summary className="cursor-pointer hover:text-zinc-300">▸ Voir le code bookmarklet</summary>
          <pre className="text-[10px] mt-2 bg-zinc-950 p-3 rounded overflow-x-auto">{bookmarklet}</pre>
        </details>
      </section>

      {/* Import manuel */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><ExternalLink size={18} className="text-fuchsia-400" /> 2 · Import manuel d'une URL</h2>
        <p className="text-sm text-zinc-400 mb-3">
          Colle ici n'importe quelle URL d'event Facebook (ou Eventbrite, Meetup) — on extrait titre, date, lieu, image automatiquement.
        </p>
        <div className="space-y-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.facebook.com/events/123456789..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <div className="flex gap-2 flex-wrap items-center">
            <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm">
              <option value="">— Aucun lieu lié —</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} />
              Publier directement
            </label>
            <button
              onClick={importNow}
              disabled={busy || !url}
              className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5 ml-auto"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {busy ? 'Import…' : 'Importer'}
            </button>
          </div>
        </div>

        {result && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${result.event ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border border-red-500/30 text-red-200'}`}>
            {result.event ? (
              <div>
                <CheckCircle2 size={14} className="inline mr-1" />
                {result.alreadyImported ? 'Déjà importé : ' : 'Importé : '}
                <strong>{result.event.title}</strong>
                {result.event.startsAt && <span className="text-xs opacity-80"> · {new Date(result.event.startsAt).toLocaleString('fr-FR')}</span>}
                <Link href="/admin/events" className="text-emerald-300 hover:underline text-xs ml-2">→ voir dans /admin/events</Link>
              </div>
            ) : (
              <div><AlertTriangle size={14} className="inline mr-1" /> {result.error}</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

/* ================= ONGLET B — EMAIL AUTO ================= */

function TabB({ userEmail, siteUrl }: { userEmail: string; siteUrl: string }) {
  const inboundEmail = 'events@gld.pixeeplay.com';
  return (
    <div className="space-y-5">
      <section className="bg-zinc-900 border border-cyan-500/30 rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Mail size={18} className="text-cyan-400" /> Forward auto depuis ta boîte mail</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Facebook t'envoie un email à chaque invitation d'event. On configure une règle qui forward ces emails à GLD,
          qui parse le contenu, scrape l'event, et le crée en brouillon automatiquement.
        </p>

        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="text-xs text-zinc-500 uppercase font-bold mb-2">Adresse de forward</div>
          <div className="font-mono text-cyan-300 text-base">{inboundEmail}</div>
          <div className="text-[10px] text-zinc-500 mt-1">Ton email reconnu : <span className="text-zinc-300">{userEmail}</span></div>
        </div>

        <h3 className="font-bold text-sm mb-2">📋 Setup Gmail (5 min)</h3>
        <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside ml-2">
          <li>Va dans Gmail → Paramètres (⚙) → <strong>Voir tous les paramètres</strong></li>
          <li>Onglet <strong>Filtres et adresses bloquées</strong> → <strong>Créer un nouveau filtre</strong></li>
          <li>Dans "De" : <code className="bg-zinc-950 px-1.5 py-0.5 rounded">notification@facebookmail.com</code></li>
          <li>Dans "Inclut les mots" : <code className="bg-zinc-950 px-1.5 py-0.5 rounded">event OR événement OR invité</code></li>
          <li>Clique <strong>Créer un filtre</strong></li>
          <li>Coche <strong>Le transférer à</strong> → ajoute <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-cyan-300">{inboundEmail}</code></li>
          <li>Gmail demandera une confirmation : valide-la depuis ta boîte (un mail Google)</li>
          <li>Clique <strong>Créer le filtre</strong></li>
        </ol>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mt-4 text-xs text-amber-200">
          <AlertTriangle size={14} className="inline mr-1" />
          <strong>Côté admin GLD</strong> : faut configurer un service inbound email (Resend Inbound, Mailgun Routes, ou Cloudflare Email Workers)
          pointant sur <code>{siteUrl}/api/webhooks/email-events</code> avec un secret <code>EMAIL_WEBHOOK_SECRET</code>.
          Voir <Link href="/admin/integrations" className="underline">/admin/integrations</Link>.
        </div>
      </section>
    </div>
  );
}

/* ================= ONGLET C — SYNC FEED VIA COOKIES ================= */

function TabC({ feedConfigured, lastSyncedAt }: { feedConfigured: boolean; lastSyncedAt: Date | string | null }) {
  const [c_user, setCUser] = useState('');
  const [xs, setXs] = useState('');
  const [datr, setDatr] = useState('');
  const [fr, setFr] = useState('');
  const [busy, setBusy] = useState<'save' | 'sync' | 'delete' | null>(null);
  const [configured, setConfigured] = useState(feedConfigured);
  const [lastSync, setLastSync] = useState<string | null>(lastSyncedAt ? new Date(lastSyncedAt).toISOString() : null);
  const [result, setResult] = useState<any>(null);

  async function save() {
    if (!c_user || !xs) { alert('c_user + xs sont obligatoires'); return; }
    setBusy('save');
    try {
      const r = await fetch('/api/pro/facebook-feed', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: { c_user, xs, datr, fr } })
      });
      if (r.ok) {
        setConfigured(true);
        setCUser(''); setXs(''); setDatr(''); setFr('');
        alert('Cookies enregistrés. Tu peux lancer la sync.');
      } else {
        const j = await r.json();
        alert(`Erreur : ${j.error}`);
      }
    } finally { setBusy(null); }
  }

  async function sync() {
    setBusy('sync');
    setResult(null);
    try {
      const r = await fetch('/api/pro/facebook-feed', { method: 'POST' });
      const j = await r.json();
      setResult(j);
      if (j.ok) setLastSync(new Date().toISOString());
    } finally { setBusy(null); }
  }

  async function reset() {
    if (!confirm('Effacer les cookies FB stockés ?')) return;
    setBusy('delete');
    try {
      const r = await fetch('/api/pro/facebook-feed', { method: 'DELETE' });
      if (r.ok) { setConfigured(false); setLastSync(null); }
    } finally { setBusy(null); }
  }

  return (
    <div className="space-y-5">
      {/* Avertissement */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
        <AlertTriangle size={14} className="inline mr-1" />
        <strong>Cette méthode est techniquement contre les ToS Facebook</strong> (utilise tes cookies de session pour scraper).
        Risque de ban du compte (faible mais existant). On limite à 1 sync/6h pour rester discret.
        Préfère les méthodes <strong>A</strong> ou <strong>B</strong> si possible.
      </div>

      {/* État */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              {configured ? <><CheckCircle2 size={16} className="text-emerald-400" /> Configuré</> : <><AlertTriangle size={16} className="text-zinc-500" /> Pas encore configuré</>}
            </div>
            {lastSync && <div className="text-[11px] text-zinc-500 mt-0.5">Dernière sync : {new Date(lastSync).toLocaleString('fr-FR')}</div>}
          </div>
          <div className="flex gap-2">
            {configured && (
              <>
                <button onClick={sync} disabled={busy === 'sync'} className="bg-fuchsia-500 hover:bg-fuchsia-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
                  {busy === 'sync' ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Synchroniser maintenant
                </button>
                <button onClick={reset} disabled={busy === 'delete'} className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-2 rounded-full">
                  Effacer cookies
                </button>
              </>
            )}
          </div>
        </div>

        {result && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${result.ok ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200' : 'bg-red-500/10 border border-red-500/30 text-red-200'}`}>
            <div>📊 {result.fetched || 0} events détectés · ✅ {result.created || 0} créés · ⏭ {result.skipped || 0} déjà existants</div>
            {result.errors?.length > 0 && (
              <div className="mt-1 text-xs">⚠ {result.errors.slice(0, 3).join(' / ')}</div>
            )}
          </div>
        )}
      </section>

      {/* Configuration cookies */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <h2 className="font-bold text-lg mb-2 flex items-center gap-2"><Cookie size={18} className="text-amber-400" /> Récupérer tes cookies Facebook</h2>
        <ol className="text-sm text-zinc-300 space-y-2 list-decimal list-inside ml-2 mb-4">
          <li>Va sur <a href="https://www.facebook.com/events/calendar" target="_blank" rel="noopener noreferrer" className="text-fuchsia-400 underline inline-flex items-center gap-1">facebook.com/events/calendar <ExternalLink size={10} /></a> (logge-toi si besoin)</li>
          <li>Ouvre les <strong>DevTools</strong> (F12 ou Cmd+Opt+I sur Mac)</li>
          <li>Onglet <strong>Application</strong> (Chrome) ou <strong>Stockage</strong> (Firefox/Safari) → <strong>Cookies</strong> → <code>https://www.facebook.com</code></li>
          <li>Copie les valeurs des 4 cookies ci-dessous (clic droit sur la valeur → Copy)</li>
          <li>Colle-les ici, puis <strong>Enregistrer</strong></li>
        </ol>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">c_user (ton FB user ID) *</label>
            <input value={c_user} onChange={(e) => setCUser(e.target.value)} placeholder="100012345678901" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">xs (token session) *</label>
            <input value={xs} onChange={(e) => setXs(e.target.value)} placeholder="36%3AaBcDeFgH..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">datr (optionnel)</label>
            <input value={datr} onChange={(e) => setDatr(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">fr (optionnel)</label>
            <input value={fr} onChange={(e) => setFr(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm mt-1 font-mono" />
          </div>
        </div>

        <button onClick={save} disabled={busy === 'save' || !c_user || !xs} className="mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
          {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Enregistrer les cookies
        </button>

        <div className="text-[11px] text-zinc-500 mt-3">
          🔒 Les cookies sont stockés en base, jamais affichés. Ils expirent ≈90 jours et il faudra les renouveler.
          Si Facebook te déconnecte (changement de mot de passe, vérif sécurité), il faudra recoller de nouveaux cookies.
        </div>
      </section>
    </div>
  );
}
