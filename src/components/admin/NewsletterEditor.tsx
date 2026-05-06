'use client';
import { useState, useEffect } from 'react';
import { Send, Save, Sparkles, Loader2, Users, Plus, X, CheckCircle2, AlertCircle, Eye, FlaskConical, Calendar } from 'lucide-react';

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

  // Cible d'envoi : tous abonnés ACTIVE ou seulement les emails manuels
  const [target, setTarget] = useState<'all' | 'manual'>('all');
  // Modes complémentaires
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testBusy, setTestBusy] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [scheduleBusy, setScheduleBusy] = useState(false);

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
          manualRecipients: manualEmails,
          target
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

  async function sendTest() {
    if (!testEmail.trim() || !testEmail.includes('@')) { setMsg('⚠ Email de test invalide'); return; }
    if (!subject.trim() || !html.trim()) { setMsg('⚠ Sujet et contenu requis pour tester'); return; }
    setTestBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/newsletter/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent: html, to: testEmail })
      });
      const j = await r.json();
      setMsg(r.ok && j.ok ? `✓ Test envoyé à ${testEmail}` : `⚠ ${j.error || 'Échec'}`);
    } catch (e: any) {
      setMsg(`⚠ ${e?.message || 'Erreur'}`);
    }
    setTestBusy(false);
  }

  async function scheduleSend() {
    if (!subject.trim() || !html.trim()) { setMsg('⚠ Sujet et contenu requis'); return; }
    if (!scheduleAt) { setMsg('⚠ Choisis une date'); return; }
    const when = new Date(scheduleAt);
    if (when.getTime() < Date.now()) { setMsg('⚠ Date dans le passé'); return; }
    setScheduleBusy(true); setMsg('');
    try {
      // 1. Crée le draft
      const r1 = await fetch('/api/admin/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlContent: html, send: false, manualRecipients: manualEmails })
      });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || 'create-failed');
      // 2. Le passe en SCHEDULED
      const r2 = await fetch(`/api/admin/newsletter/${j1.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule', scheduledAt: when.toISOString() })
      });
      const j2 = await r2.json();
      if (!r2.ok) throw new Error(j2.error || 'schedule-failed');
      setMsg(`📅 Programmée pour ${when.toLocaleString('fr-FR')} — visible dans l'historique.`);
      setScheduleAt('');
    } catch (e: any) {
      setMsg(`⚠ ${e?.message || 'Erreur'}`);
    }
    setScheduleBusy(false);
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

  const totalRecipients = target === 'manual' ? manualEmails.length : activeCount + manualEmails.length;

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

        {/* Sélecteur de cible */}
        <div className="flex flex-wrap gap-2 pb-1">
          <button
            type="button"
            onClick={() => setTarget('all')}
            className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition ${
              target === 'all' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <Users size={11} /> Tous les actifs ({activeCount}) {manualEmails.length > 0 && `+ ${manualEmails.length} manuel${manualEmails.length > 1 ? 's' : ''}`}
          </button>
          <button
            type="button"
            onClick={() => setTarget('manual')}
            disabled={manualEmails.length === 0}
            className={`text-xs px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition disabled:opacity-50 ${
              target === 'manual' ? 'bg-violet-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
          >
            <FlaskConical size={11} /> Liste de diffusion personnalisée seulement ({manualEmails.length})
          </button>
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

      {/* TEST + SCHEDULE inline panels */}
      <div className="grid sm:grid-cols-2 gap-3">
        {/* TEST */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <FlaskConical size={12} className="text-amber-300" />
            <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider">Envoyer un test</span>
          </div>
          <div className="flex gap-2">
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="moi@exemple.com"
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500"
            />
            <button
              onClick={sendTest}
              disabled={testBusy || !testEmail.includes('@') || !subject || !html}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              {testBusy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              Tester
            </button>
          </div>
          <p className="text-[10px] text-amber-200/70 mt-1">Marque [TEST] · n'affecte pas la liste réelle.</p>
        </div>

        {/* SCHEDULE */}
        <div className="bg-blue-500/5 border border-blue-500/30 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar size={12} className="text-blue-300" />
            <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Programmer l'envoi</span>
          </div>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-blue-500"
            />
            <button
              onClick={scheduleSend}
              disabled={scheduleBusy || !scheduleAt || !subject || !html}
              className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
            >
              {scheduleBusy ? <Loader2 size={11} className="animate-spin" /> : <Calendar size={11} />}
              Programmer
            </button>
          </div>
          <p className="text-[10px] text-blue-200/70 mt-1">Cron auto envoie au moment voulu.</p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-zinc-800">
        <button
          disabled={busy}
          onClick={() => setShowPreview(true)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-full text-sm flex items-center gap-2"
        >
          <Eye size={14} /> Aperçu
        </button>
        <button disabled={busy} onClick={() => save(false)}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-full text-sm flex items-center gap-2">
          <Save size={14} /> Enregistrer brouillon
        </button>
        <button disabled={busy || !subject || totalRecipients === 0}
          onClick={() => save(true)}
          className="bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-full text-sm flex items-center gap-2">
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
          Envoyer maintenant à {totalRecipients} destinataire{totalRecipients > 1 ? 's' : ''}
        </button>
        {msg && <span className="text-sm text-zinc-300">{msg}</span>}
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 sticky top-0 bg-zinc-950 z-10">
              <h3 className="font-bold text-white truncate flex items-center gap-2"><Eye size={14} /> Aperçu : {subject || '(sans sujet)'}</h3>
              <button onClick={() => setShowPreview(false)} className="text-zinc-400 hover:text-white p-1"><X size={16} /></button>
            </header>
            <div className="p-5">
              <div className="bg-zinc-100 border border-zinc-300 rounded-lg overflow-hidden">
                <div className="bg-zinc-200 px-4 py-2 border-b border-zinc-300 text-zinc-700 text-xs">
                  <strong>De :</strong> God Loves Diversity &nbsp;·&nbsp; <strong>Sujet :</strong> {subject || '(vide)'}
                </div>
                <iframe
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;color:#222;padding:24px;line-height:1.6;background:#fff;margin:0}</style></head><body>${html}</body></html>`}
                  className="w-full bg-white"
                  style={{ height: '60vh', border: 'none' }}
                  sandbox="allow-same-origin"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-3 flex items-center gap-1.5">
                <Eye size={11} /> Aperçu rendu HTML — les images sont chargées dans la sandbox, les clients mail réels peuvent les bloquer par défaut.
              </p>
            </div>
          </div>
        </div>
      )}

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
