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
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients, radii, shadows } from '@/lib/design-tokens';

const COLUMNS = [
  { id: 'todo',    label: 'À faire',  emoji: '📋', accent: '#a1a1aa' },
  { id: 'doing',   label: 'En cours', emoji: '🚧', accent: '#7dd3fc' },
  { id: 'review',  label: 'Review',   emoji: '👀', accent: '#fcd34d' },
  { id: 'done',    label: 'Terminé',  emoji: '✅', accent: '#6ee7b7' },
  { id: 'archive', label: 'Archivé',  emoji: '📦', accent: '#71717a' },
] as const;

const PRIORITY_STYLES: Record<string, { bg: string; color: string }> = {
  low:    { bg: 'rgba(82,82,91,0.5)',    color: '#d4d4d8' },
  normal: { bg: 'rgba(59,130,246,0.2)',  color: '#7dd3fc' },
  high:   { bg: 'rgba(245,158,11,0.2)',  color: '#fcd34d' },
  urgent: { bg: 'rgba(239,68,68,0.3)',   color: '#fca5a5' },
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
      body: JSON.stringify({ title: newTitle, status }),
    });
    setNewTitle('');
    setAdding(null);
    load();
  }

  async function moveTask(taskId: string, newStatus: string, newPosition: number) {
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
      body: JSON.stringify({ id: taskId, status: newStatus, position: newPosition }),
    });
  }

  const total = Object.values(tasksByStatus).reduce((s, arr) => s + arr.length, 0);

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="📋"
      title="Tâches"
      desc={`${total} tâche${total > 1 ? 's' : ''} · drag & drop entre colonnes`}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 36, opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Chargement…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {COLUMNS.map((col) => {
            const tasks = tasksByStatus[col.id] || [];
            return (
              <section
                key={col.id}
                style={{
                  background: colors.bgCard,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radii.lg,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '60vh',
                  overflow: 'hidden',
                }}
                onDragOver={(e) => { e.preventDefault(); setDropZone({ status: col.id, position: tasks.length }); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedId && dropZone) moveTask(draggedId, dropZone.status, dropZone.position);
                  setDraggedId(null); setDropZone(null);
                }}
              >
                <header
                  style={{
                    padding: '10px 12px',
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'sticky',
                    top: 0,
                    background: colors.bgCard,
                    zIndex: 1,
                    borderTop: `3px solid ${col.accent}`,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {col.emoji} {col.label}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#0a0a0f', opacity: 0.7 }}>{tasks.length}</span>
                  </span>
                  <button
                    onClick={() => setAdding(col.id)}
                    style={{ background: 'transparent', border: 0, color: colors.textMuted, padding: 4, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Ajouter une tâche"
                  >
                    <Plus size={14} />
                  </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {adding === col.id && (
                    <div style={{ background: '#0a0a0f', border: '1px solid rgba(217,70,239,0.4)', borderRadius: radii.md, padding: 8 }}>
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
                        style={{ width: '100%', background: 'transparent', border: 0, color: 'inherit', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <button
                          onClick={() => createTask(col.id)}
                          disabled={!newTitle.trim()}
                          style={{ ...btnPrimary, padding: '4px 10px', fontSize: 10, opacity: !newTitle.trim() ? 0.4 : 1, cursor: !newTitle.trim() ? 'not-allowed' : 'pointer' }}
                        >
                          Créer
                        </button>
                        <button
                          onClick={() => { setAdding(null); setNewTitle(''); }}
                          style={{ background: 'transparent', border: 0, color: colors.textMuted, fontSize: 10, padding: '4px 8px', cursor: 'pointer' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {tasks.map((task) => {
                    const prio = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.normal;
                    const overdue = task.dueDate && new Date(task.dueDate) < new Date();
                    return (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggedId(task.id)}
                        onDragEnd={() => { setDraggedId(null); setDropZone(null); }}
                        onClick={() => setEditing(task)}
                        style={{
                          background: '#0a0a0f',
                          border: `1px solid ${colors.border}`,
                          borderRadius: radii.md,
                          padding: 10,
                          cursor: 'grab',
                          opacity: draggedId === task.id ? 0.3 : 1,
                          transition: 'border-color .15s, opacity .15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 6 }}>
                          <GripVertical size={12} style={{ opacity: 0.35, marginTop: 2, flexShrink: 0 }} />
                          <p style={{ fontSize: 12, flex: 1, margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.title}</p>
                        </div>
                        {task.description && (
                          <p style={{ fontSize: 10, opacity: 0.55, margin: '0 0 6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{task.description}</p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: prio.bg, color: prio.color }}>
                            {task.priority}
                          </span>
                          {task.dueDate && (
                            <span style={{ fontSize: 9, display: 'flex', alignItems: 'center', gap: 3, color: overdue ? '#fca5a5' : colors.textMuted }}>
                              <Calendar size={9} /> {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>
                        {task.tags && task.tags.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                            {task.tags.slice(0, 3).map((t) => (
                              <span key={t} style={{ fontSize: 9, background: 'rgba(196,181,253,0.15)', color: '#c4b5fd', padding: '2px 6px', borderRadius: 999 }}>#{t}</span>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {editing && <TaskEditor orgSlug={orgSlug} task={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </SimpleOrgPage>
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
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      }),
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
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radii.lg, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: 20, boxShadow: shadows.lg, display: 'flex', flexDirection: 'column', gap: 12 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>Éditer la tâche</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', opacity: 0.55 }}>
            <X size={18} />
          </button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...input, fontSize: 14, fontWeight: 700 }} placeholder="Titre" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...input, fontFamily: 'inherit' }} placeholder="Description (markdown OK)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={input}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={input} />
        </div>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags : foi, paris, sprint-2…" style={input} />
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
          <button onClick={remove} style={{ background: 'transparent', border: 0, color: '#fca5a5', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Trash2 size={11} /> Supprimer
          </button>
          <button onClick={save} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {busy ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle2 size={12} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
