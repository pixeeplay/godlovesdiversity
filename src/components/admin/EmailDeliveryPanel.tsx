'use client';
import { useState, useEffect } from 'react';
import {
  Mail, CheckCircle2, AlertCircle, Loader2, Send, RefreshCw,
  Clock, ExternalLink, KeyRound, Eye
} from 'lucide-react';

type EmailLog = {
  id: string;
  to: string;
  fromAddr: string;
  subject: string;
  type: string;
  provider: string;
  status: 'pending' | 'sent' | 'failed';
  providerId: string | null;
  errorMessage: string | null;
  campaignId: string | null;
  createdAt: string;
};

type Stats = { total: number; sent: number; failed: number; pending: number };

type Diagnostic = {
  resendConfigured: boolean;
  resendKeyMask: string | null;
  fromAddress: string;
  adminEmail: string | null;
  provider: 'resend' | 'smtp';
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  newsletter:     { label: 'Newsletter', color: 'bg-violet-500/15 text-violet-300' },
  transactional:  { label: 'Transactionnel', color: 'bg-blue-500/15 text-blue-300' },
  confirmation:   { label: 'Confirmation', color: 'bg-emerald-500/15 text-emerald-300' },
  test:           { label: 'Test', color: 'bg-amber-500/15 text-amber-300' },
  'admin-notify': { label: 'Notif admin', color: 'bg-pink-500/15 text-pink-300' }
};

export function EmailDeliveryPanel({ defaultTestEmail }: { defaultTestEmail?: string }) {
  const [diag, setDiag] = useState<Diagnostic | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, sent: 0, failed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');

  // Test send
  const [testEmail, setTestEmail] = useState(defaultTestEmail || '');
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; hint?: string } | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [diagR, logsR] = await Promise.all([
        fetch('/api/admin/email/test').then((r) => r.json()),
        fetch(`/api/admin/email/logs${filter !== 'all' ? `?status=${filter}` : ''}`).then((r) => r.json())
      ]);
      setDiag(diagR);
      setLogs(logsR.logs || []);
      setStats(logsR.stats || { total: 0, sent: 0, failed: 0, pending: 0 });
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  async function sendTest() {
    if (!testEmail.includes('@')) {
      setTestResult({ ok: false, message: 'Email invalide' });
      return;
    }
    setSending(true);
    setTestResult(null);
    try {
      const r = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail })
      });
      const j = await r.json();
      setTestResult(j);
      // Refresh logs après l'envoi
      setTimeout(loadAll, 1500);
    } catch (e: any) {
      setTestResult({ ok: false, message: e?.message || 'Erreur réseau' });
    }
    setSending(false);
  }

  return (
    <section className="space-y-5">
      {/* HEADER + DIAGNOSTIC */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail size={20} className="text-brand-pink" />
            Suivi des envois email
          </h2>
          <button
            onClick={loadAll}
            disabled={loading}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Actualiser
          </button>
        </div>

        {/* Diagnostic config */}
        {diag && (
          <div className={`rounded-xl p-3 mb-4 border ${diag.resendConfigured
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className="flex items-start gap-3">
              {diag.resendConfigured
                ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                : <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />}
              <div className="flex-1 text-xs space-y-1">
                <div className="font-bold text-sm">
                  {diag.resendConfigured
                    ? `Resend configuré ✓ (clé ${diag.resendKeyMask})`
                    : 'Resend NON configuré — fallback SMTP local'}
                </div>
                <div className="text-zinc-400">
                  <span className="font-bold">Expéditeur :</span> <code className="bg-zinc-800 px-1.5 rounded">{diag.fromAddress}</code>
                </div>
                {diag.adminEmail && (
                  <div className="text-zinc-400">
                    <span className="font-bold">Email admin (notifications) :</span> <code className="bg-zinc-800 px-1.5 rounded">{diag.adminEmail}</code>
                  </div>
                )}
                {!diag.resendConfigured && (
                  <a href="/admin/settings" className="inline-flex items-center gap-1 text-amber-300 hover:underline mt-1">
                    <KeyRound size={11} /> Configurer la clé Resend
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          <StatPill label="Total" value={stats.total} color="bg-zinc-800 text-white" onClick={() => setFilter('all')} active={filter === 'all'} />
          <StatPill label="Envoyés" value={stats.sent} color="bg-emerald-500/15 text-emerald-300" onClick={() => setFilter('sent')} active={filter === 'sent'} />
          <StatPill label="Échecs" value={stats.failed} color="bg-red-500/15 text-red-300" onClick={() => setFilter('failed')} active={filter === 'failed'} />
          <StatPill label="En cours" value={stats.pending} color="bg-amber-500/15 text-amber-300" onClick={() => setFilter('pending')} active={filter === 'pending'} />
        </div>

        {/* Test send form */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
          <div className="text-xs font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1.5">
            <Send size={12} /> Envoyer un email de test
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="ton.email@exemple.com"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
              onKeyDown={(e) => e.key === 'Enter' && !sending && sendTest()}
            />
            <button
              onClick={sendTest}
              disabled={sending || !testEmail}
              className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-1.5"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Envoyer
            </button>
          </div>
          {testResult && (
            <div className={`mt-2 rounded-lg p-2.5 text-xs flex items-start gap-2
              ${testResult.ok
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/30 text-red-300'}`}>
              {testResult.ok
                ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
              <div className="flex-1">
                <div className="font-bold">{testResult.message}</div>
                {testResult.hint && <div className="opacity-80 mt-1">{testResult.hint}</div>}
              </div>
            </div>
          )}
          <p className="text-[11px] text-zinc-500 mt-2">
            💡 Si l'email n'arrive pas malgré « envoyé OK », vérifie : 1) ton spam 2) le domaine d'expédition est bien validé sur <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-brand-pink hover:underline inline-flex items-center gap-0.5">resend.com/domains <ExternalLink size={9} /></a> 3) la clé Resend est bien `re_…` complète.
          </p>
        </div>
      </div>

      {/* LISTE DES LOGS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_180px_120px_120px_140px] gap-3 px-4 py-2 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950/50">
          <div>Statut</div>
          <div>Destinataire / Sujet</div>
          <div>Type</div>
          <div>Provider</div>
          <div>Date</div>
          <div>Détails</div>
        </div>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <Mail size={32} className="mx-auto mb-2 opacity-40" />
            <p>Aucun envoi enregistré pour l'instant.</p>
            <p className="text-xs mt-1">Envoie un email de test ci-dessus pour vérifier que ça marche.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {logs.map((log) => {
              const typeMeta = TYPE_LABELS[log.type] || { label: log.type, color: 'bg-zinc-800 text-zinc-400' };
              return (
                <div key={log.id} className="grid grid-cols-[80px_1fr_180px_120px_120px_140px] gap-3 px-4 py-3 items-center hover:bg-zinc-800/30">
                  <div>
                    {log.status === 'sent' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300">
                        <CheckCircle2 size={11} /> Envoyé
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300">
                        <AlertCircle size={11} /> Échec
                      </span>
                    )}
                    {log.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300">
                        <Clock size={11} /> En cours
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{log.to}</div>
                    <div className="text-xs text-zinc-500 truncate">{log.subject}</div>
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${typeMeta.color}`}>
                      {typeMeta.label}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 capitalize">{log.provider}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(log.createdAt).toLocaleString('fr-FR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs">
                    {log.status === 'failed' && log.errorMessage && (
                      <details>
                        <summary className="cursor-pointer text-red-300 hover:text-red-200">
                          Voir l'erreur
                        </summary>
                        <p className="mt-1 text-[11px] text-red-200/80 bg-red-500/5 border border-red-500/20 rounded p-1.5 max-w-xs break-words">
                          {log.errorMessage}
                        </p>
                      </details>
                    )}
                    {log.providerId && (
                      <code className="text-[10px] text-zinc-500" title={log.providerId}>
                        {log.providerId.slice(0, 12)}…
                      </code>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function StatPill({
  label, value, color, onClick, active
}: { label: string; value: number; color: string; onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-3 text-left transition border-2
        ${active ? 'border-brand-pink' : 'border-transparent'}
        ${color}`}
    >
      <div className="text-2xl font-bold leading-none mb-1">{value}</div>
      <div className="text-[10px] uppercase font-bold opacity-80">{label}</div>
    </button>
  );
}
