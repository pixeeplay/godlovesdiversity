'use client';
import { useEffect, useState } from 'react';
import {
  Eye, Send, Copy, Trash2, Calendar, Clock, CheckCircle2, AlertCircle,
  Loader2, Mail, X, Edit3, FlaskConical, Pause, RefreshCw, ExternalLink, ChevronRight
} from 'lucide-react';

interface Campaign {
  id: string;
  subject: string;
  htmlContent: string;
  textContent?: string | null;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
  scheduledAt?: string | null;
  sentAt?: string | null;
  recipients: number;
  recipientsCount?: number;
  sentCount?: number;
  failedCount?: number;
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  DRAFT:     { label: 'Brouillon', bg: 'bg-zinc-700/50',     text: 'text-zinc-200',     icon: Edit3 },
  SCHEDULED: { label: 'Programmée',bg: 'bg-blue-500/20',     text: 'text-blue-200',     icon: Calendar },
  SENDING:   { label: 'Envoi…',    bg: 'bg-amber-500/20',    text: 'text-amber-200',    icon: Loader2 },
  SENT:      { label: 'Envoyée',   bg: 'bg-emerald-500/20',  text: 'text-emerald-200',  icon: CheckCircle2 },
  FAILED:    { label: 'Échec',     bg: 'bg-rose-500/20',     text: 'text-rose-200',     icon: AlertCircle }
};

interface Props {
  defaultTestEmail?: string;
}

export function CampaignHistoryList({ defaultTestEmail = '' }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCamp, setPreviewCamp] = useState<Campaign | null>(null);
  const [actionCamp, setActionCamp] = useState<Campaign | null>(null);
  const [actionMode, setActionMode] = useState<'test' | 'schedule' | 'send' | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form fields for actions
  const [testTo, setTestTo] = useState(defaultTestEmail);
  const [scheduleAt, setScheduleAt] = useState('');
  const [extraEmails, setExtraEmails] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/newsletter');
      const j = await r.json();
      setCampaigns(j.campaigns || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Auto-refresh si une campagne est en SENDING ou SCHEDULED dans le passé proche
  useEffect(() => {
    const hasPolling = campaigns.some(c => c.status === 'SENDING');
    if (!hasPolling) return;
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [campaigns]);

  function flash(msg: string, ms = 4500) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), ms);
  }

  async function duplicate(c: Campaign) {
    if (!confirm(`Dupliquer "${c.subject}" en brouillon ?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate' })
      });
      const j = await r.json();
      if (r.ok) { flash('✓ Dupliquée en brouillon'); load(); }
      else flash(`⚠ ${j.error}`);
    } finally { setBusy(false); }
  }

  async function deleteCamp(c: Campaign) {
    if (!confirm(`Supprimer définitivement "${c.subject}" ?`)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/${c.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (r.ok) { flash('🗑 Supprimée'); load(); }
      else flash(`⚠ ${j.error}`);
    } finally { setBusy(false); }
  }

  async function unschedule(c: Campaign) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unschedule' })
      });
      const j = await r.json();
      if (r.ok) { flash('Programmation annulée'); load(); }
      else flash(`⚠ ${j.error}`);
    } finally { setBusy(false); }
  }

  async function sendTest() {
    if (!actionCamp) return;
    if (!testTo.trim() || !testTo.includes('@')) { flash('⚠ Email invalide'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/newsletter/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: actionCamp.subject,
          htmlContent: actionCamp.htmlContent,
          to: testTo
        })
      });
      const j = await r.json();
      if (r.ok && j.ok) { flash(`✓ Test envoyé à ${testTo}`); setActionMode(null); }
      else flash(`⚠ ${j.error || 'Échec test'}`);
    } catch (e: any) { flash(`⚠ ${e.message}`); }
    setBusy(false);
  }

  async function scheduleSend() {
    if (!actionCamp || !scheduleAt) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/${actionCamp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schedule', scheduledAt: new Date(scheduleAt).toISOString() })
      });
      const j = await r.json();
      if (r.ok) { flash(j.message); setActionMode(null); load(); }
      else flash(`⚠ ${j.error}`);
    } catch (e: any) { flash(`⚠ ${e.message}`); }
    setBusy(false);
  }

  async function sendNow() {
    if (!actionCamp) return;
    if (!confirm(`Envoyer "${actionCamp.subject}" MAINTENANT à tous les abonnés ACTIVE ?`)) return;
    const manualRecipients = extraEmails.split(/[\s,;]+/).map(e => e.trim()).filter(e => e.includes('@'));
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/${actionCamp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', manualRecipients })
      });
      const j = await r.json();
      if (r.ok) { flash(j.message); setActionMode(null); load(); }
      else flash(`⚠ ${j.error}`);
    } catch (e: any) { flash(`⚠ ${e.message}`); }
    setBusy(false);
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">
            {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}
          </p>
          <button onClick={load} disabled={loading} className="text-xs text-fuchsia-400 hover:underline flex items-center gap-1">
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
        </div>

        {loading && campaigns.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
            <Loader2 className="animate-spin text-zinc-500 mx-auto" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            Aucune campagne pour l'instant.
          </div>
        ) : (
          campaigns.map((c) => {
            const meta = STATUS_META[c.status] || STATUS_META.DRAFT;
            const StatusIcon = meta.icon;
            const isDraft = c.status === 'DRAFT';
            const isScheduled = c.status === 'SCHEDULED';
            const isSent = c.status === 'SENT';
            const isSending = c.status === 'SENDING';
            const isFailed = c.status === 'FAILED';

            const progress = c.recipientsCount && c.sentCount != null
              ? Math.round(((c.sentCount + (c.failedCount || 0)) / c.recipientsCount) * 100)
              : 0;

            return (
              <article key={c.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition rounded-xl overflow-hidden">
                <div className="p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  {/* Left : status + subject + meta */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`shrink-0 w-9 h-9 rounded-lg ${meta.bg} ${meta.text} flex items-center justify-center`}>
                      <StatusIcon size={14} className={isSending ? 'animate-spin' : ''} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white truncate">{c.subject}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full font-bold ${meta.bg} ${meta.text}`}>{meta.label}</span>
                        <span>· créée {new Date(c.createdAt).toLocaleDateString('fr-FR')} {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {isScheduled && c.scheduledAt && (
                          <span className="text-blue-300">· programmée pour {new Date(c.scheduledAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        )}
                        {c.sentAt && (
                          <span>· envoyée {new Date(c.sentAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                        )}
                        {(isSent || isSending || isFailed) && (
                          <span>· {c.sentCount || 0}/{c.recipients} reçus{c.failedCount ? ` · ${c.failedCount} échecs` : ''}</span>
                        )}
                      </div>

                      {/* Progress bar pour SENDING */}
                      {isSending && (
                        <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-fuchsia-500 to-violet-500 transition-all"
                               style={{ width: `${progress}%` }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    <ActionBtn icon={Eye} label="Aperçu" color="zinc" onClick={() => setPreviewCamp(c)} />
                    <ActionBtn icon={FlaskConical} label="Test" color="amber" onClick={() => { setActionCamp(c); setActionMode('test'); }} />
                    {(isDraft || isFailed) && (
                      <>
                        <ActionBtn icon={Calendar} label="Programmer" color="blue" onClick={() => { setActionCamp(c); setActionMode('schedule'); }} />
                        <ActionBtn icon={Send} label="Envoyer" color="emerald" onClick={() => { setActionCamp(c); setActionMode('send'); }} />
                      </>
                    )}
                    {isScheduled && (
                      <ActionBtn icon={Pause} label="Annuler prog." color="zinc" onClick={() => unschedule(c)} />
                    )}
                    {isSent && (
                      <ActionBtn icon={Send} label="Renvoyer" color="emerald" onClick={() => { setActionCamp(c); setActionMode('send'); }} />
                    )}
                    <ActionBtn icon={Copy} label="Dupliquer" color="violet" onClick={() => duplicate(c)} />
                    {!isSending && !isSent && (
                      <ActionBtn icon={Trash2} label="Suppr." color="rose" onClick={() => deleteCamp(c)} />
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Toast feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-fuchsia-500/40 text-white text-sm font-bold px-5 py-3 rounded-xl shadow-2xl z-[200]">
          {feedback}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewCamp && (
        <Modal title={`Aperçu : ${previewCamp.subject}`} onClose={() => setPreviewCamp(null)} wide>
          <div className="bg-zinc-100 border border-zinc-300 rounded-lg overflow-hidden">
            <div className="bg-zinc-200 px-4 py-2 border-b border-zinc-300 flex items-center gap-2 text-zinc-700 text-xs">
              <Mail size={12} />
              <strong>De :</strong> parislgbt &lt;hello@parislgbt.com&gt;
              <span className="ml-3"><strong>Sujet :</strong> {previewCamp.subject}</span>
            </div>
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,-apple-system,sans-serif;color:#222;padding:24px;line-height:1.6;background:#fff;margin:0}</style></head><body>${previewCamp.htmlContent}</body></html>`}
              className="w-full bg-white"
              style={{ height: '60vh', border: 'none' }}
              sandbox="allow-same-origin"
            />
          </div>
          <div className="text-[11px] text-zinc-500 mt-3 flex items-center gap-1.5">
            <Eye size={11} /> Aperçu rendu HTML — les images bloquées par défaut Gmail/Outlook ne sont pas reproduites ici.
          </div>
        </Modal>
      )}

      {/* ACTIONS MODAL */}
      {actionCamp && actionMode && (
        <Modal
          title={
            actionMode === 'test'     ? `Envoi test : ${actionCamp.subject}` :
            actionMode === 'schedule' ? `Programmer : ${actionCamp.subject}` :
                                        `Envoyer maintenant : ${actionCamp.subject}`
          }
          onClose={() => { if (!busy) setActionMode(null); }}
        >
          {actionMode === 'test' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Envoie une copie marquée <code className="bg-amber-500/20 text-amber-200 px-1 rounded">[TEST]</code> à un ou plusieurs destinataires de test (max 10), sans toucher la liste réelle.
              </p>
              <label className="block">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Email(s) de test</span>
                <input
                  type="text"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                  placeholder="moi@exemple.com, equipe@…"
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 inline-block">Sépare plusieurs adresses par virgule.</span>
              </label>
              <FooterBtn onCancel={() => setActionMode(null)} onAct={sendTest} actLabel={busy ? 'Envoi…' : 'Envoyer le test'} actColor="amber" busy={busy} />
            </div>
          )}

          {actionMode === 'schedule' && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Choisis quand envoyer la campagne. Le cron lance les programmées au tick suivant (toutes les 5 min).
              </p>
              <label className="block">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Date & heure d'envoi</span>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </label>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-[11px] text-blue-200">
                ℹ️ Le cron <code className="bg-blue-500/20 px-1 rounded">/api/cron/newsletter-scheduled</code> doit être configuré dans Coolify (every 5 min).
              </div>
              <FooterBtn onCancel={() => setActionMode(null)} onAct={scheduleSend} actLabel={busy ? 'Programmation…' : 'Programmer l\'envoi'} actColor="blue" busy={busy || !scheduleAt} />
            </div>
          )}

          {actionMode === 'send' && (
            <div className="space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-[12px] text-emerald-200">
                Va envoyer immédiatement à <b>tous les abonnés ACTIVE</b> + les emails additionnels ci-dessous.
              </div>
              <label className="block">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Emails supplémentaires (optionnel)</span>
                <textarea
                  value={extraEmails}
                  onChange={(e) => setExtraEmails(e.target.value)}
                  rows={3}
                  placeholder="contact1@x.com, contact2@y.fr, …"
                  className="w-full mt-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 inline-block">Sépare par virgule, espace ou point-virgule.</span>
              </label>
              <FooterBtn onCancel={() => setActionMode(null)} onAct={sendNow} actLabel={busy ? 'Envoi en cours…' : 'Confirmer l\'envoi'} actColor="emerald" busy={busy} />
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

/* ─── Sub-components ─── */

function ActionBtn({ icon: Icon, label, color, onClick }: any) {
  const COLORS: Record<string, string> = {
    zinc:    'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
    amber:   'bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 border border-amber-500/30',
    blue:    'bg-blue-500/20 hover:bg-blue-500/40 text-blue-200 border border-blue-500/30',
    emerald: 'bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-500/30',
    violet:  'bg-violet-500/20 hover:bg-violet-500/40 text-violet-200 border border-violet-500/30',
    rose:    'bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/30'
  };
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition ${COLORS[color] || COLORS.zinc}`}
    >
      <Icon size={11} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Modal({ title, children, onClose, wide }: any) {
  return (
    <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl ${wide ? 'max-w-4xl' : 'max-w-lg'} w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-zinc-800 px-5 py-3 sticky top-0 bg-zinc-950">
          <h3 className="font-bold text-white truncate">{title}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1"><X size={16} /></button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FooterBtn({ onCancel, onAct, actLabel, actColor, busy }: any) {
  const COLORS: Record<string, string> = {
    amber:   'bg-amber-500 hover:bg-amber-400 text-black',
    blue:    'bg-blue-500 hover:bg-blue-400 text-white',
    emerald: 'bg-emerald-500 hover:bg-emerald-400 text-black'
  };
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onCancel} disabled={busy} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Annuler</button>
      <button
        onClick={onAct}
        disabled={busy}
        className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 disabled:opacity-50 ${COLORS[actColor]}`}
      >
        {busy && <Loader2 size={12} className="animate-spin" />}
        {actLabel}
      </button>
    </div>
  );
}
