'use client';
import { useState } from 'react';
import { Video, CheckCircle2, XCircle, Sparkles, Loader2, Trash2, Eye } from 'lucide-react';

export function TestimoniesAdmin({ initial }: { initial: any[] }) {
  const [items, setItems] = useState<any[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  async function patch(id: string, data: any) {
    setBusy(id);
    try {
      const r = await fetch(`/api/admin/testimonies/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (r.ok) setItems(items.map((it) => it.id === id ? j.testimony : it));
      else alert(`Erreur : ${j.error}`);
    } finally { setBusy(null); }
  }

  async function transcribe(id: string, item: any) {
    if (!item.videoUrl) { alert('Pas de videoUrl'); return; }
    setBusy(`tr-${id}`);
    try {
      // Appel transcription IA — endpoint à créer ou utiliser ai/text avec prompt simple si pas de Whisper
      const r = await fetch('/api/admin/testimonies/transcribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, videoUrl: item.videoUrl })
      });
      const j = await r.json();
      if (r.ok) {
        await patch(id, { transcription: j.text || '(échec transcription)' });
        alert(`Transcription : ${j.text?.length || 0} caractères`);
      } else {
        alert(`Erreur : ${j.error}`);
      }
    } finally { setBusy(null); }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement ?')) return;
    const r = await fetch(`/api/admin/testimonies/${id}`, { method: 'DELETE' });
    if (r.ok) setItems(items.filter((it) => it.id !== id));
  }

  const filtered = filter === 'all' ? items : items.filter((it) => it.status === filter);
  const counts = { pending: items.filter(i => i.status === 'pending').length, approved: items.filter(i => i.status === 'approved').length, rejected: items.filter(i => i.status === 'rejected').length };

  return (
    <div className="p-6 md:p-8 max-w-6xl space-y-5">
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-fuchsia-500 to-rose-600 rounded-xl p-2.5">
            <Video size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Témoignages vidéo</h1>
        </div>
        <p className="text-zinc-400 text-sm">Modère les témoignages soumis. Génère transcription + sous-titres FR/EN/ES/PT via IA.</p>
      </header>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === f ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
          >
            {f === 'all' ? `Tous (${items.length})` : `${f === 'pending' ? '⏳ En attente' : f === 'approved' ? '✅ Approuvés' : '🚫 Rejetés'} (${counts[f]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
          <Video size={32} className="mx-auto mb-2 opacity-30" />
          Aucun témoignage {filter !== 'all' ? `(${filter})` : ''}.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <article key={t.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="aspect-video bg-black">
                {t.videoUrl ? (
                  <video src={t.videoUrl} poster={t.thumbnailUrl} controls className="w-full h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600"><Video size={32} /></div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate">{t.title || `Témoignage de ${t.authorName || 'anonyme'}`}</h3>
                    {t.authorName && <div className="text-xs text-zinc-500">par {t.authorName}{t.authorEmail ? ` · ${t.authorEmail}` : ''}</div>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300' : t.status === 'rejected' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {t.status}
                  </span>
                </div>

                {t.transcription && (
                  <details>
                    <summary className="text-xs text-violet-400 cursor-pointer">▸ Transcription ({t.transcription.length} chars)</summary>
                    <p className="text-xs text-zinc-300 mt-1 max-h-32 overflow-y-auto">{t.transcription}</p>
                  </details>
                )}

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {t.status !== 'approved' && (
                    <button onClick={() => patch(t.id, { status: 'approved' })} disabled={busy === t.id} className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> Approuver
                    </button>
                  )}
                  {t.status !== 'rejected' && (
                    <button onClick={() => patch(t.id, { status: 'rejected', rejectionReason: 'Refusé via admin' })} disabled={busy === t.id} className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                      <XCircle size={11} /> Rejeter
                    </button>
                  )}
                  <button onClick={() => transcribe(t.id, t)} disabled={busy === `tr-${t.id}`} className="bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                    {busy === `tr-${t.id}` ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    Transcrire IA
                  </button>
                  <button onClick={() => remove(t.id)} className="text-zinc-500 hover:text-red-400 ml-auto p-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
