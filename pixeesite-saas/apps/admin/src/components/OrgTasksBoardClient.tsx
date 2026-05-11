'use client';
/**
 * OrgTasksBoardClient — port faithful du TasksBoardClient GLD vers multi-tenant.
 * Kanban 5 colonnes (todo / doing / review / done / archive) avec drag&drop,
 * éditeur modal complet (title, desc, status, priority, dueDate, tags).
 *
 * Adapté schéma Lead/Task tenant : dueDate (≠ dueAt GLD), pas de assignee object → string.
 */
import { useEffect, useState } from 'react';
import { Plus, Loader2, Calendar, Trash2, X, GripVertical, CheckCircle2 } from 'lucide-react';

const COLUMNS = [
  { id: 'todo',    label: 'À faire',  color: 'zinc',    emoji: '📋' },
  { id: 'doing',   label: 'En cours', color: 'sky',     emoji: '🚧' },
  { id: 'review',  label: 'Review',   color: 'amber',   emoji: '👀' },
  { id: 'done',    label: 'Terminé',  color: 'emerald', emoji: '✅' },
  { id: 'archive', label: 'Archivé',  color: 'zinc',    emoji: '📦' }
] as const;

const PRIORITY_COLORS: Record<string, string> = {
  low:    'bg-zinc-700 text-zinc-300',
  normal: 'bg-blue-500/20 text-blue-300',
  high:   'bg-amber-500/20 text-amber-300',
  urgent: 'bg-rose-500/30 text-rose-200'
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  dueDate: string | null;
  tags: string[];
  assignee: string | null;
  createdAt: string;
};

export function OrgTasksBoardClient({ orgSlug }: { orgSlug: string }) {
  const [tasksByStatus, setTasksByStatus] = useState<Record<string, Task[]>>({ todo: [], doing: [], review: [], done: [], archive: [] });
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editing, setEditing] = useState<Task | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<{ status: string; position: number } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/tasks`, { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) {
        const byStatus: Record<string, Task[]> = { todo: [], doing: [], review: [], done: [], archive: [] };
        for (const t of (j.items || []) as Task[]) {
          if (!byStatus[t.status]) byStatus[t.status] = [];
          byStatus[t.status].push(t);
        }
        setTasksByStatus(byStatus);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function createTask(status: string) {
    if (!newTitle.trim()) return;
    await fetch(`/api/orgs/${orgSlug}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle, status })
    });
    setNewTitle('');
    setAdding(null);
    load();
  }

  async function moveTask(taskId: string, newStatus: string, newPosition: number) {
    // Optimistic UI
    setTasksByStatus((prev) => {
      const next: Record<string, Task[]> = JSON.parse(JSON.stringify(prev));
      let task: Task | null = null;
      for (const k of Object.keys(next)) {
        const idx = next[k].findIndex((t) => t.id === taskId);
        if (idx !== -1) { [task] = next[k].splice(idx, 1); break; }
      }
      if (!task) return prev;
      task.status = newStatus;
      next[newStatus] = next[newStatus] || [];
      next[newStatus].splice(newPosition, 0, task);
      return next;
    });

    await fetch(`/api/orgs/${orgSlug}/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId, status: newStatus, position: newPosition })
    });
  }

  const total = Object.values(tasksByStatus).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="px-3 lg:px-4 pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">📋 Tâches</h1>
          <p className="text-sm text-zinc-400">{total} tâche{total > 1 ? 's' : ''} · drag & drop entre colonnes</p>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-center py-8 flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> Chargement…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const tasks = tasksByStatus[col.id] || [];
            return (
              <section
                key={col.id}
                className={`bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl flex flex-col min-h-[60vh]`}
                onDragOver={(e) => { e.preventDefault(); setDropZone({ status: col.id, position: tasks.length }); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedId && dropZone) moveTask(draggedId, dropZone.status, dropZone.position);
                  setDraggedId(null); setDropZone(null);
                }}
              >
                <header className={`px-3 py-2 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10 rounded-t-2xl`}>
                  <span className="font-bold text-sm flex items-center gap-1.5 text-zinc-100">
                    {col.emoji} {col.label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400`}>{tasks.length}</span>
                  </span>
                  <button
                    onClick={() => setAdding(col.id)}
                    className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
                    title="Ajouter une tâche"
                  >
                    <Plus size={14} />
                  </button>
                </header>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {adding === col.id && (
                    <div className="bg-zinc-950 ring-1 ring-fuchsia-500/40 rounded-lg p-2">
                      <textarea
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createTask(col.id); }
                          if (e.key === 'Escape') { setAdding(null); setNewTitle(''); }
                        }}
                        placeholder="Titre de la tâche…"
                        rows={2}
                        className="w-full bg-transparent text-xs text-zinc-100 focus:outline-none resize-none"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <button onClick={() => createTask(col.id)} disabled={!newTitle.trim()} className="text-[10px] bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 text-white font-bold px-2 py-1 rounded">
                          Créer
                        </button>
                        <button onClick={() => { setAdding(null); setNewTitle(''); }} className="text-[10px] text-zinc-500 hover:text-zinc-300 px-2 py-1">
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {tasks.map((task) => (
                    <article
                      key={task.id}
                      draggable
                      onDragStart={() => setDraggedId(task.id)}
                      onDragEnd={() => { setDraggedId(null); setDropZone(null); }}
                      onClick={() => setEditing(task)}
                      className={`bg-zinc-950 hover:bg-zinc-900 ring-1 ring-zinc-800 hover:ring-zinc-700 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition ${draggedId === task.id ? 'opacity-30' : ''}`}
                    >
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <GripVertical size={12} className="text-zinc-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-zinc-100 flex-1 line-clamp-3">{task.title}</p>
                      </div>
                      {task.description && <p className="text-[10px] text-zinc-500 line-clamp-2 mb-1.5">{task.description}</p>}
                      <div className="flex items-center justify-between gap-1 mt-1">
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className={`text-[9px] flex items-center gap-0.5 ${new Date(task.dueDate) < new Date() ? 'text-rose-400' : 'text-zinc-500'}`}>
                            <Calendar size={9} /> {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {task.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[9px] bg-violet-500/15 text-violet-300 px-1.5 py-0.5 rounded-full">#{t}</span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editing && <TaskEditor orgSlug={orgSlug} task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function TaskEditor({ orgSlug, task, onClose, onSaved }: { orgSlug: string; task: Task; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : '');
  const [tags, setTags] = useState((task.tags || []).join(', '));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    await fetch(`/api/orgs/${orgSlug}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, description, status, priority,
        dueDate: dueDate || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean)
      })
    });
    setBusy(false);
    onSaved();
  }
  async function remove() {
    if (!confirm('Supprimer cette tâche ?')) return;
    await fetch(`/api/orgs/${orgSlug}/tasks/${task.id}`, { method: 'DELETE' });
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 ring-1 ring-zinc-800 rounded-2xl max-w-xl w-full p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-zinc-100">Éditer la tâche</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400 hover:text-white" /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm font-bold focus:border-fuchsia-500 focus:outline-none text-zinc-100" placeholder="Titre" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:border-fuchsia-500 focus:outline-none text-zinc-200" placeholder="Description (markdown OK)" />
        <div className="grid grid-cols-3 gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200">
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-2 text-xs text-zinc-200" />
        </div>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags : foi, paris, sprint-2…" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200" />
        <div className="flex justify-between pt-2">
          <button onClick={remove} className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"><Trash2 size={11} /> Supprimer</button>
          <button onClick={save} disabled={busy} className="bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
