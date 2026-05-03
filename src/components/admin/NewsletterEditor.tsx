'use client';
import { useState, useEffect } from 'react';
import { Send, Save, Sparkles, Loader2, Users, Plus, X, CheckCircle2, AlertCircle } from 'lucide-react';

type ProgressData = {
  campaign: { id: string; subject: string; status: string; recipients: number };
  progress: { sent: number; failed: number; pending: number };
  recentFailures: { to: string; errorMessage: string; createdAt: string }[];
};

export function NewsletterEditor() {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState(`<h1 style="color:#FF1493">Hello 🌈</h1>\n<p>Bonjour à toutes et tous,</p>\n<p>Voici les nouvelles du mouvement ce mois-ci...</p>`);
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [activeCount, setActiveCount] = useState<number>(0);

  // Suivi de l'envoi en cours
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);

  // Charge le nombre d'abonnés actifs
  useEffect(() => {
    fetch('/api/admin/newsletter')
      .then((r) => r.json())
      .then((j) => setActiveCount(j.activeSubscribers || 0))
      .catch(() => {});
  }, []);

  // Polling progression
  useEffect(() => {
    if (!activeCampaignId) return;
    let stop = false;
    const tick = async () => {
      if (stop) return;
      try {
        const r = await fetch(`/api/admin/newsletter/${activeCampaignId}`);
        const j = await r.json();
        if (!stop) setProgress(j);
        if (j?.campaign?.status === 'SENT' || j?.campaign?.status === 'FAILED') {
          // Fini, on s'arrête mais garde l'affichage
          return;
        }
      } catch {}
      if (!stop) setTimeout(tick, 2000);
    };
    tick();
    return () => { stop = true; };
  }, [activeCampaignId]);

  function addEmail() {
    const e = emailInput.trim();
    if (!e.includes('@')) return;
    if (manualEmails.includes(e)) { setEmailInput(''); return; }
    setManualEmails([...manualEmails, e]);
    setEmailInput('');
  }

  function removeEmail(e: string) {
    setManualEmails(manualEmails.filter((x) => x !== e));
  }

  async function save(send: boolean) {
    setBusy(true); setMsg(''); setProgress(null);
    try {
      const r = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject, htmlContent: html, send,
          manualRecipients: manualEmails
        })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur serveur');
      setMsg(j.message || (send ? '✅ Envoi en cours' : '✅ Brouillon enregistré'));
      if (send && j.id) {
        setActiveCampaignId(j.id);
      }
    } catch (e: any) {
      setMsg(`❌ ${e?.message || 'Erreur'}`);
    }
    setBusy(false);
  }

  async function aiDraft() {
    setAiBusy(true);
    try {
      const r = await fetch('/api/ai/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Rédige une newsletter mensuelle pour le mouvement God Loves Diversity. Sujet du mois : témoignages reçus, actions à venir. Ton inclusif, apaisé, simple. Format HTML simple, max 200 mots, sans <html> tag wrapper.`,
          system: 'Tu es l\'éditorialiste du mouvement God Loves Diversity. Tu écris en français, ton chaleureux et lumineux.'
        })
      });
      const j = await r.json();
      setHtml(j.text || html);
    } catch {}
    setAiBusy(false);
  }

  const totalRecipients = activeCount + manualEmails.length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
      {/* OBJET */}
      <label className="block">
        <span className="text-xs font-bold uppercase text-zinc-400">Objet de la newsletter</span>
        <input
          value={subject} onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          placeholder="🌈 Newsletter d'avril — God Loves Diversity"
        />
      </label>

      {/* CONTENU HTML */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase text-zinc-400">Contenu HTML</span>
          <button onClick={aiDraft} disabled={aiBusy}
            className="text-xs flex items-center gap-1 text-brand-pink hover:underline disabled:opacity-50">
            {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Brouillon par IA
          </button>
        </div>
        <textarea
          value={html} onChange={(e) => setHtml(e.target.value)}
          rows={10}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink font-mono text-xs"
        />
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mt-2 max-h-48 overflow-auto text-sm"
             dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      {/* DESTINATAIRES */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-brand-pink" />
            <span className="text-sm font-bold">Destinataires</span>
          </div>
          <span className="text-xs text-zinc-400">
            <strong className="text-emerald-400">{activeCount}</strong> abonné{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            {manualEmails.length > 0 && (
              <span> + <strong className="text-violet-400">{manualEmails.length}</strong> manuel{manualEmails.length > 1 ? 's' : ''}</span>
            )}
            {' '}= <strong className="text-white">{totalRecipients}</strong> au total
          </span>
        </div>

        {/* Add manual email */}
        <div>
          <span className="text-[11px] uppercase font-bold text-zinc-500 block mb-1">
            Ajouter des emails supplémentaires (en plus des abonnés)
          </span>
          <div className="flex gap-2">
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEmail(); } }}
              placeholder="email@exemple.com (Entrée pour ajouter)"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-pink"
            />
            <button
              onClick={addEmail} disabled={!emailInput.includes('@')}
              className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 px-3 rounded-lg text-xs flex items-center gap-1"
            >
              <Plus size={12} /> Ajouter
            </button>
          </div>
          {manualEmails.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {manualEmails.map((e) => (
                <span key={e} className="inline-flex items-center gap-1 text-xs bg-violet-500/15 text-violet-300 border border-violet-500/30 rounded-full pl-2 pr-1 py-0.5">
                  {e}
                  <button onClick={() => removeEmail(e)} className="hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800">
        <button disabled={busy} onClick={() => save(false)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <Save size={14} /> Enregistrer brouillon
        </button>
        <button disabled={busy || !subject || totalRecipients === 0}
          onClick={() => save(true)}
          className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2">
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
          Envoyer à {totalRecipients} destinataire{totalRecipients > 1 ? 's' : ''}
        </button>
        {msg && <span className="text-sm text-zinc-300">{msg}</span>}
      </div>

      {/* PROGRESSION ENVOI */}
      {progress && (
        <div className="bg-zinc-950 border-2 border-brand-pink/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm flex items-center gap-2">
              {progress.campaign.status === 'SENT' ? (
                <><CheckCircle2 size={16} className="text-emerald-400" /> Envoi terminé</>
              ) : progress.campaign.status === 'FAILED' ? (
                <><AlertCircle size={16} className="text-red-400" /> Envoi échoué</>
              ) : (
                <><Loader2 size={16} className="animate-spin text-brand-pink" /> Envoi en cours…</>
              )}
            </h4>
            <span className="text-xs text-zinc-500">{progress.campaign.subject}</span>
          </div>

          {/* Barre de progression */}
          <div className="bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-brand-pink to-violet-500 h-full transition-all"
              style={{ width: `${Math.min(100, ((progress.progress.sent + progress.progress.failed) / Math.max(1, progress.campaign.recipients)) * 100)}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-zinc-900 rounded-lg p-2">
              <div className="text-lg font-bold">{progress.campaign.recipients}</div>
              <div className="text-[10px] text-zinc-500 uppercase">Total</div>
            </div>
            <div className="bg-emerald-500/10 rounded-lg p-2">
              <div className="text-lg font-bold text-emerald-300">{progress.progress.sent}</div>
              <div className="text-[10px] text-emerald-400 uppercase">Envoyés</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2">
              <div className="text-lg font-bold text-red-300">{progress.progress.failed}</div>
              <div className="text-[10px] text-red-400 uppercase">Échecs</div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-2">
              <div className="text-lg font-bold text-amber-300">{progress.progress.pending}</div>
              <div className="text-[10px] text-amber-400 uppercase">En cours</div>
            </div>
          </div>

          {/* Erreurs récentes */}
          {progress.recentFailures.length > 0 && (
            <details className="bg-red-500/5 border border-red-500/20 rounded-lg p-2 text-xs">
              <summary className="cursor-pointer font-bold text-red-300">
                Voir les {progress.recentFailures.length} dernières erreurs
              </summary>
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {progress.recentFailures.map((f, i) => (
                  <div key={i} className="bg-zinc-900 rounded p-1.5">
                    <div className="font-bold text-red-200">{f.to}</div>
                    <div className="text-red-300/80 break-words">{f.errorMessage}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <p className="text-[11px] text-zinc-500">
            💡 La page « Suivi des envois email » au-dessus liste chaque envoi un par un avec le détail.
          </p>
        </div>
      )}
    </div>
  );
}
