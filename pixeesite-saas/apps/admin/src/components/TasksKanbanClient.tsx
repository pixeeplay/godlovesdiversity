'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

const COLUMNS = [
  { id: 'todo', label: '📥 À faire', color: '#3b82f6' },
  { id: 'doing', label: '🚀 En cours', color: '#f59e0b' },
  { id: 'review', label: '👀 Review', color: '#8b5cf6' },
  { id: 'done', label: '✅ Fait', color: '#10b981' },
];

const PRIORITIES = [
  { id: 'low', label: 'Basse', color: '#6b7280' },
  { id: 'normal', label: 'Normale', color: '#3b82f6' },
  { id: 'high', label: 'Haute', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgente', color: '#ef4444' },
];

export function TasksKanbanClient({ orgSlug }: { orgSlug: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<any>({ status: 'todo', priority: 'normal' });

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/tasks`);
    const j = await r.json();
    setTasks(j.items || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function moveTask(id: string, newStatus: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    await fetch(`/api/orgs/${orgSlug}/tasks`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
  }

  async function createTask() {
    const r = await fetch(`/api/orgs/${orgSlug}/tasks`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    });
    if (r.ok) { setShowNew(false); setDraft({ status: 'todo', priority: 'normal' }); load(); }
  }

  async function deleteTask(id: string) {
    if (!confirm('Supprimer cette tâche ?')) return;
    await fetch(`/api/orgs/${orgSlug}/tasks?id=${id}`, { method: 'DELETE' });
    load();
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Nouvelle tâche</button>
  );
  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="📋" title="Tâches"
      desc="Kanban pour organiser ton travail (drag-drop entre colonnes)"
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData('text');
                  if (id) moveTask(id, col.id);
                }}
                style={{ ...card, padding: 8, minHeight: 400, background: '#0a0a0f' }}
              >
                <div style={{ padding: '8px 4px', borderBottom: `2px solid ${col.color}`, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ fontSize: 13 }}>{col.label}</strong>
                  <span style={{ opacity: 0.5, fontSize: 12 }}>{colTasks.length}</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {colTasks.map((t) => {
                    const prio = PRIORITIES.find((p) => p.id === t.priority);
                    return (
                      <div key={t.id} draggable
                        onDragStart={(e) => e.dataTransfer.setData('text', t.id)}
                        style={{ ...card, padding: 10, cursor: 'grab', background: '#18181b' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{t.title}</div>
                          <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 0, color: '#a1a1aa', cursor: 'pointer', fontSize: 14 }}>×</button>
                        </div>
                        {t.description && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>{t.description.slice(0, 80)}</div>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                          {prio && <span style={{ fontSize: 10, padding: '2px 6px', background: `${prio.color}33`, color: prio.color, borderRadius: 4 }}>{prio.label}</span>}
                          {t.dueDate && <span style={{ fontSize: 10, opacity: 0.5 }}>📅 {new Date(t.dueDate).toLocaleDateString('fr-FR')}</span>}
                          {t.assignee && <span style={{ fontSize: 10, opacity: 0.5 }}>👤 {t.assignee}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div style={{ fontSize: 11, opacity: 0.3, textAlign: 'center', padding: 20 }}>vide</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <div onClick={() => setShowNew(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 480, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Nouvelle tâche</h3>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Titre</div>
              <input style={input} value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>Description</div>
              <textarea style={{ ...input, minHeight: 80 }} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Statut</div>
                <select style={input} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
              <label>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Priorité</div>
                <select style={input} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
              <button style={btnPrimary} onClick={createTask}>Créer</button>
            </div>
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
