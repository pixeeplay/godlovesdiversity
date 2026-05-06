'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Sparkles, Send, ExternalLink, FileText, Video, Loader2, RefreshCw, CheckCircle2, Mail } from 'lucide-react';

const AUDIENCES = [
  { id: 'user' as const, label: 'Utilisateur', emoji: '👤', desc: 'Manuel grand public, ton chaleureux' },
  { id: 'admin' as const, label: 'Administrateur', emoji: '🛠', desc: 'Back-office et tâches admin' },
  { id: 'superadmin' as const, label: 'Super-Admin', emoji: '⚙️', desc: 'Technique : IA, sécurité, infra' }
];

export function ManualsAdminClient() {
  const [latest, setLatest] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/admin/ai/manual/generate').then((r) => r.json()).catch(() => ({ recent: [], latestByAudience: [] }));
    setLatest(r.latestByAudience || []);
    setRecent(r.recent || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function generate(audience: string | 'all', publishToTelegram = false) {
    setRunning(audience);
    setResult(null);
    const url = audience === 'all'
      ? `/api/admin/ai/manual/generate${publishToTelegram ? '?publishToTelegram=1' : ''}`
      : `/api/admin/ai/manual/generate?audience=${audience}${publishToTelegram ? '&publishToTelegram=1' : ''}`;
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const j = await r.json();
    setRunning(null);
    setResult(j);
    setTimeout(() => setResult(null), 8000);
    load();
  }

  function getLatest(audience: string) {
    return latest.find((m) => m.audience === audience);
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl flex items-center gap-3">
            <BookOpen className="text-cyan-400" /> Manuels auto-générés
          </h1>
          <p className="text-sm text-zinc-400 mt-1">3 audiences · régénérés 2×/jour par cron · publiés sur le site + Telegram + scripts vidéo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Recharger
          </button>
          <button onClick={() => generate('all', false)} disabled={!!running} className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
            {running === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Régénérer les 3 maintenant
          </button>
          <button onClick={() => generate('all', true)} disabled={!!running} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
            <Send size={14} /> Régénérer + publier Telegram
          </button>
        </div>
      </header>

      {/* RÉSULTAT GLOBAL */}
      {result && (
        <div className={`rounded-xl border p-4 text-sm ${result.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-200'}`}>
          {result.ok ? (
            <div>
              <CheckCircle2 className="inline mr-2" size={16} />
              {result.results?.length || 0} manuel(s) généré(s) :
              <ul className="mt-2 ml-6 space-y-1 text-xs">
                {result.results?.map((r: any, i: number) => (
                  <li key={i}>
                    {r.error ? `❌ ${r.audience} : ${r.error}` : `✓ ${r.audience} v${r.version} · ${r.sectionCount} sections · ${r.wordCount} mots · ${r.apiCalls} appels Gemini${r.publishedToTelegram ? ' · 📱 publié Telegram' : ''}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span>⚠ {result.error || 'Erreur inconnue'}</span>
          )}
        </div>
      )}

      {/* CARTES PAR AUDIENCE */}
      <div className="grid md:grid-cols-3 gap-4">
        {AUDIENCES.map((a) => {
          const m = getLatest(a.id);
          return (
            <div key={a.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl mb-1">{a.emoji}</div>
                  <h2 className="font-bold text-lg">{a.label}</h2>
                  <p className="text-xs text-zinc-400 mt-1">{a.desc}</p>
                </div>
              </div>

              {m ? (
                <div className="bg-zinc-800/50 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-zinc-400">Version</span><b className="font-mono">{m.version}</b></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Sections</span><b>{m.sectionCount}</b></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Mots</span><b>{m.wordCount}</b></div>
                  <div className="flex justify-between"><span className="text-zinc-400">Généré</span><b>{new Date(m.createdAt).toLocaleString('fr-FR')}</b></div>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                  Pas encore généré.
                </div>
              )}

              <div className="grid grid-cols-3 gap-1 text-xs">
                <a href={`/api/manuals/${a.id}`} target="_blank" className="bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 px-2 py-2 rounded text-center font-bold flex items-center justify-center gap-1">
                  <ExternalLink size={11} /> HTML
                </a>
                <a href={`/api/manuals/${a.id}?format=markdown`} target="_blank" className="bg-zinc-800 hover:bg-zinc-700 px-2 py-2 rounded text-center flex items-center justify-center gap-1">
                  <FileText size={11} /> MD
                </a>
                <a href={`/api/manuals/${a.id}?format=video`} target="_blank" className="bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/40 text-fuchsia-200 px-2 py-2 rounded text-center font-bold flex items-center justify-center gap-1">
                  <Video size={11} /> Vidéo
                </a>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                <button onClick={() => generate(a.id, false)} disabled={!!running} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50">
                  {running === a.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Régénérer
                </button>
                <button onClick={() => generate(a.id, true)} disabled={!!running} className="bg-violet-500/30 hover:bg-violet-500/50 border border-violet-400/50 text-violet-100 px-3 py-2 rounded text-xs flex items-center justify-center gap-1 disabled:opacity-50">
                  <Send size={11} /> + Telegram
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* HISTORIQUE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h2 className="font-bold text-lg mb-3">Historique récent</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun manuel généré pour l'instant. Clique "Régénérer les 3 maintenant" en haut.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-zinc-500 border-b border-zinc-800">
              <tr><th className="text-left py-2">Date</th><th className="text-left">Audience</th><th className="text-left">Version</th><th className="text-right">Sections</th><th className="text-right">Mots</th><th className="text-center">Telegram</th><th></th></tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id} className="border-b border-zinc-800/50">
                  <td className="py-2 text-zinc-400">{new Date(m.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td><span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px]">{m.audience}</span></td>
                  <td className="font-mono text-[10px]">{m.version}</td>
                  <td className="text-right">{m.sectionCount}</td>
                  <td className="text-right">{m.wordCount}</td>
                  <td className="text-center">{m.publishedToTelegram ? '✅' : '—'}</td>
                  <td className="text-right">
                    <a href={`/api/manuals/${m.audience}`} target="_blank" className="text-cyan-300 hover:underline">Voir</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* EMAIL QUOTIDIEN CONFIGURABLE */}
      <EmailDailySection />

      {/* INFO CRON */}
      <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-xs text-cyan-200">
        <p className="font-bold mb-2">⏰ Cron Coolify recommandés (à ajouter dans Scheduled Tasks) :</p>
        <pre className="bg-black/30 p-2 rounded text-[10px] overflow-x-auto whitespace-pre-wrap">
manual-morning · 0 6 * * *
wget -qO- --header="X-Cron-Secret: $CRON_SECRET" --post-data="" "http://localhost:3000/api/admin/ai/manual/generate?publishToTelegram=1"

manual-evening · 0 18 * * *
wget -qO- --header="X-Cron-Secret: $CRON_SECRET" --post-data="" "http://localhost:3000/api/admin/ai/manual/generate"

manual-email-daily · 0 7 * * *
wget -qO- --header="X-Cron-Secret: $CRON_SECRET" --post-data="" "http://localhost:3000/api/admin/ai/manual/email?send=1"
        </pre>
        <p className="mt-2 text-cyan-300/70">Le 1er publie sur Telegram, le 2nd régénère, le 3e envoie par email à l'adresse configurée ci-dessus (silencieux si désactivé).</p>
      </div>

      {/* LIENS PUBLICS */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-400">
        <p className="font-bold mb-2 text-zinc-300">📤 URLs publiques :</p>
        <ul className="space-y-1 font-mono">
          <li><a href="/api/manuals/user" target="_blank" className="text-cyan-300 hover:underline">https://gld.pixeeplay.com/api/manuals/user</a></li>
          <li><a href="/api/manuals/admin" target="_blank" className="text-cyan-300 hover:underline">https://gld.pixeeplay.com/api/manuals/admin</a></li>
          <li><a href="/api/manuals/superadmin" target="_blank" className="text-cyan-300 hover:underline">https://gld.pixeeplay.com/api/manuals/superadmin</a></li>
        </ul>
        <p className="mt-2 text-zinc-500">Ajoute <code>?format=markdown</code> ou <code>?format=video</code> pour les autres formats.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SECTION EMAIL QUOTIDIEN
// ─────────────────────────────────────────────
function EmailDailySection() {
  const [cfg, setCfg] = useState<{ enabled: boolean; recipient: string; audience: string; hour: number; lastSentAt: string | null }>({ enabled: false, recipient: '', audience: 'admin', hour: 7, lastSentAt: null });
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [sendResult, setSendResult] = useState<any>(null);

  async function load() {
    const r = await fetch('/api/admin/ai/manual/email').then((r) => r.json()).catch(() => null);
    if (r) setCfg({ enabled: !!r.enabled, recipient: r.recipient || '', audience: r.audience || 'admin', hour: r.hour || 7, lastSentAt: r.lastSentAt });
  }
  useEffect(() => { load(); }, []);

  async function save() {
    setBusy(true);
    await fetch('/api/admin/ai/manual/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    setBusy(false);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(0), 2500);
  }

  async function sendNow() {
    if (!cfg.recipient || !cfg.recipient.includes('@')) {
      alert('Adresse email invalide');
      return;
    }
    setSending(true);
    setSendResult(null);
    // Save d'abord, puis send
    await fetch('/api/admin/ai/manual/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    const r = await fetch('/api/admin/ai/manual/email?send=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const j = await r.json();
    setSending(false);
    setSendResult(j);
    setTimeout(() => setSendResult(null), 8000);
    load();
  }

  return (
    <section className="bg-emerald-500/5 border border-emerald-500/30 rounded-xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Mail size={20} className="text-emerald-300" />
        <div className="flex-1">
          <h2 className="font-bold text-lg">Envoi email quotidien</h2>
          <p className="text-xs text-zinc-400">Reçois automatiquement le manuel chaque jour à une heure choisie. Désactivable.</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <button type="button" onClick={() => setCfg((c) => ({ ...c, enabled: !c.enabled }))} className={`relative inline-flex h-7 w-12 rounded-full transition ${cfg.enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}>
            <span className={`absolute top-0.5 h-6 w-6 bg-white rounded-full transition-transform ${cfg.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="font-bold">{cfg.enabled ? 'Activé' : 'Désactivé'}</span>
        </label>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 pt-3 border-t border-emerald-500/20">
        <div className="sm:col-span-2">
          <label className="text-xs text-zinc-400 block mb-1">Adresse email destinataire</label>
          <input type="email" value={cfg.recipient} onChange={(e) => setCfg((c) => ({ ...c, recipient: e.target.value }))} placeholder="arnaud@gredai.com" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Heure d'envoi</label>
          <input type="number" min={0} max={23} value={cfg.hour} onChange={(e) => setCfg((c) => ({ ...c, hour: parseInt(e.target.value) || 7 }))} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-3">
          <label className="text-xs text-zinc-400 block mb-1">Audience à envoyer</label>
          <div className="flex gap-2">
            {(['user', 'admin', 'superadmin'] as const).map((a) => (
              <button key={a} type="button" onClick={() => setCfg((c) => ({ ...c, audience: a }))} className={`text-xs px-3 py-2 rounded font-bold transition ${cfg.audience === a ? 'bg-emerald-500/30 border border-emerald-400/60 text-emerald-100' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-transparent'}`}>
                {a === 'user' ? '👤 Utilisateur' : a === 'admin' ? '🛠 Admin' : '⚙️ Super-Admin'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-emerald-500/20">
        {savedAt > 0 && <span className="text-emerald-300 text-xs flex items-center gap-1"><CheckCircle2 size={12} /> Config sauvée</span>}
        {cfg.lastSentAt && <span className="text-xs text-zinc-500">Dernier envoi : {new Date(cfg.lastSentAt).toLocaleString('fr-FR')}</span>}
        <div className="ml-auto flex gap-2">
          <button onClick={save} disabled={busy} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50">
            {busy ? <Loader2 size={12} className="animate-spin" /> : '💾'} Sauvegarder config
          </button>
          <button onClick={sendNow} disabled={sending || !cfg.recipient.includes('@')} className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded text-xs font-bold flex items-center gap-1 disabled:opacity-50">
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Envoyer maintenant
          </button>
        </div>
      </div>

      {sendResult && (
        <div className={`text-xs p-2 rounded ${sendResult.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
          {sendResult.ok ? `✓ Envoyé à ${sendResult.to} (audience ${sendResult.audience}, version ${sendResult.version})` : `⚠ ${sendResult.error || 'Erreur'}`}
        </div>
      )}
    </section>
  );
}
