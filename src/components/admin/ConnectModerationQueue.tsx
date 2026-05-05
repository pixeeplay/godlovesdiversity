'use client';
import { useState } from 'react';
import { Flag, AlertTriangle, MessageSquare, FileText, Check, X, Loader2 } from 'lucide-react';

export function ModerationQueue({ reports, flaggedPosts, flaggedMessages }: { reports: any[]; flaggedPosts: any[]; flaggedMessages: any[] }) {
  const [tab, setTab] = useState<'reports' | 'posts' | 'messages'>('reports');
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 grid place-items-center"><Flag size={18} /></div>
        <div>
          <h1 className="font-display font-bold text-2xl">File de modération Connect</h1>
          <p className="text-sm text-zinc-400">Signalements, posts flagués IA, messages suspects</p>
        </div>
      </div>

      <div className="flex gap-2 my-5 border-b border-zinc-800">
        <Tab active={tab === 'reports'} onClick={() => setTab('reports')} icon={Flag} count={reports.length} label="Signalements" />
        <Tab active={tab === 'posts'} onClick={() => setTab('posts')} icon={FileText} count={flaggedPosts.length} label="Posts flagués IA" />
        <Tab active={tab === 'messages'} onClick={() => setTab('messages')} icon={MessageSquare} count={flaggedMessages.length} label="Messages flagués IA" />
      </div>

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 ? <Empty label="Aucun signalement en attente" /> : reports.map(r => <ReportCard key={r.id} r={r} />)}
        </div>
      )}
      {tab === 'posts' && (
        <div className="space-y-3">
          {flaggedPosts.length === 0 ? <Empty label="Aucun post flagué par l'IA" /> : flaggedPosts.map(p => <PostCard key={p.id} p={p} />)}
        </div>
      )}
      {tab === 'messages' && (
        <div className="space-y-3">
          {flaggedMessages.length === 0 ? <Empty label="Aucun message flagué" /> : flaggedMessages.map(m => <MsgCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, icon: Icon, count, label }: any) {
  return (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-bold flex items-center gap-2 border-b-2 transition ${active ? 'border-rose-500 text-white' : 'border-transparent text-zinc-400 hover:text-white'}`}>
      <Icon size={14} /> {label}
      <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full">{count}</span>
    </button>
  );
}
function Empty({ label }: { label: string }) {
  return <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-2xl">{label}</div>;
}

function ReportCard({ r }: { r: any }) {
  const [busy, setBusy] = useState(false);
  async function action(act: 'dismiss' | 'remove' | 'ban') {
    setBusy(true);
    await fetch('/api/admin/connect/moderate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: r.id, action: act })
    });
    location.reload();
  }
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-zinc-300 font-bold">{r.reporter?.name || r.reporter?.email}</span>
            <span className="text-zinc-500">→ signale →</span>
            <span className="text-rose-300 font-bold">{r.reported?.name || r.reported?.email}</span>
          </div>
          <div className="mt-2 text-sm">
            <span className="bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded-full text-xs font-bold mr-2">{r.reason}</span>
            {r.contentType && <span className="text-zinc-400 text-xs">sur {r.contentType}</span>}
          </div>
          {r.details && <p className="mt-2 text-xs text-zinc-300 italic bg-zinc-950 p-2 rounded">"{r.details}"</p>}
          <div className="text-[10px] text-zinc-500 mt-1">{new Date(r.createdAt).toLocaleString('fr-FR')}</div>
        </div>
        <div className="flex flex-col gap-1">
          <button onClick={() => action('dismiss')} disabled={busy} className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg flex items-center gap-1">{busy ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Rejeter</button>
          <button onClick={() => action('remove')} disabled={busy} className="text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-3 py-1.5 rounded-lg">Supprimer contenu</button>
          <button onClick={() => action('ban')} disabled={busy} className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 px-3 py-1.5 rounded-lg">Bannir user</button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ p }: { p: any }) {
  return (
    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
      <div className="text-xs text-zinc-400 mb-1"><b className="text-amber-200">{p.author?.name || p.author?.email}</b> · {new Date(p.createdAt).toLocaleString('fr-FR')}</div>
      <p className="text-sm text-zinc-100 mb-2 whitespace-pre-wrap">{p.text}</p>
      {p.moderationNotes && <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded mb-2">⚠ IA : {p.moderationNotes}</div>}
      <div className="flex gap-2">
        <button className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 px-3 py-1.5 rounded-lg">Approuver</button>
        <button className="text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 px-3 py-1.5 rounded-lg">Supprimer</button>
      </div>
    </div>
  );
}

function MsgCard({ m }: { m: any }) {
  return (
    <div className="bg-zinc-900 border border-amber-500/30 rounded-2xl p-4">
      <div className="text-xs text-zinc-400 mb-1"><b className="text-amber-200">{m.sender?.name || m.sender?.email}</b> · {new Date(m.createdAt).toLocaleString('fr-FR')}</div>
      <p className="text-sm text-zinc-100">{m.text}</p>
    </div>
  );
}
