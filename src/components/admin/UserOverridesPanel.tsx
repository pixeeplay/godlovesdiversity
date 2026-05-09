'use client';
import { useEffect, useState } from 'react';
import { Loader2, Save, Trash2, CheckCircle2, UserSearch, RotateCcw, Eye, EyeOff, Minus } from 'lucide-react';

type AllItem = { href: string; label: string; group: string; alwaysVisible?: boolean; isNew?: boolean };
type UserLite = { id: string; email: string; name: string | null; role: string };
type Override = { id: string; userId: string; hidden: string[]; visible: string[]; notes: string | null; updatedAt: string; user: UserLite };
type State = 'auto' | 'force-visible' | 'force-hidden';

export function UserOverridesPanel({
  ALL_ITEMS,
  GROUPS
}: {
  ALL_ITEMS: AllItem[];
  GROUPS: { name: string; gradient: string }[];
}) {
  const [users, setUsers] = useState<UserLite[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [states, setStates] = useState<Map<string, State>>(new Map()); // href → state
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  // Charge la liste users + overrides
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/admin/menu-permissions/user', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'load KO');
      setUsers(j.users || []);
      setOverrides(j.overrides || []);
    } catch (e: any) {
      setError(e?.message || 'erreur chargement');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // Quand un user est sélectionné, hydrate les states depuis son override
  useEffect(() => {
    if (!selectedUserId) {
      setStates(new Map());
      setNotes('');
      return;
    }
    const ov = overrides.find((o) => o.userId === selectedUserId);
    const next = new Map<string, State>();
    if (ov) {
      for (const h of ov.visible) next.set(h, 'force-visible');
      for (const h of ov.hidden) next.set(h, 'force-hidden');
      setNotes(ov.notes || '');
    } else {
      setNotes('');
    }
    setStates(next);
  }, [selectedUserId, overrides]);

  function setState(href: string, st: State) {
    setStates((prev) => {
      const next = new Map(prev);
      if (st === 'auto') next.delete(href);
      else next.set(href, st);
      return next;
    });
    setSaved(false);
  }

  async function save() {
    if (!selectedUserId) return;
    setSaving(true);
    setError(null);
    try {
      const visible: string[] = [];
      const hidden: string[] = [];
      for (const [href, st] of states) {
        if (st === 'force-visible') visible.push(href);
        else if (st === 'force-hidden') hidden.push(href);
      }
      const r = await fetch('/api/admin/menu-permissions/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, hidden, visible, notes }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'save KO');
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || 'erreur sauvegarde');
    }
    setSaving(false);
  }

  async function resetOverride() {
    if (!selectedUserId) return;
    if (!confirm('Supprimer tous les overrides de ce user ? Il reprendra les permissions normales de son rôle.')) return;
    setResetting(true);
    setError(null);
    try {
      await fetch(`/api/admin/menu-permissions/user?userId=${selectedUserId}`, { method: 'DELETE' });
      await load();
      setStates(new Map());
      setNotes('');
    } catch (e: any) {
      setError(e?.message || 'erreur reset');
    }
    setResetting(false);
  }

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const overrideExists = !!overrides.find((o) => o.userId === selectedUserId);
  const totalForced = states.size;
  const totalVisible = Array.from(states.values()).filter((s) => s === 'force-visible').length;
  const totalHidden = Array.from(states.values()).filter((s) => s === 'force-hidden').length;

  const filteredItems = (group: string) =>
    ALL_ITEMS.filter((i) => i.group === group)
      .filter((i) => !filter || i.label.toLowerCase().includes(filter.toLowerCase()) || i.href.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* INFO */}
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4 text-xs text-violet-200/90 space-y-1">
        <p>
          <strong>Override par utilisateur</strong> — permet de donner accès (ou de retirer) à un item du menu admin
          pour <strong>UN user spécifique</strong>, indépendamment de son rôle.
        </p>
        <p>3 états par item :</p>
        <ul className="ml-6 space-y-0.5">
          <li>🔄 <strong>Auto</strong> — applique la règle de rôle (défaut)</li>
          <li>👁 <strong>Forcer visible</strong> — ce user verra l'item même si son rôle ne le permet pas</li>
          <li>🚫 <strong>Forcer caché</strong> — ce user ne verra pas l'item même si son rôle le permet</li>
        </ul>
      </div>

      {/* USER PICKER */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <UserSearch size={18} className="text-violet-300" />
          <h3 className="font-bold text-sm">Choisir un utilisateur</h3>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Loader2 size={14} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
            {users.map((u) => {
              const ov = overrides.find((o) => o.userId === u.id);
              const isSelected = u.id === selectedUserId;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={`text-left p-3 rounded-lg border transition flex items-center gap-3 ${
                    isSelected ? 'bg-violet-500/20 border-violet-500/60' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{u.name || u.email}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{u.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${u.role === 'ADMIN' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {u.role}
                    </span>
                    {ov && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">
                        {(ov.hidden?.length || 0) + (ov.visible?.length || 0)} override{(ov.hidden?.length || 0) + (ov.visible?.length || 0) > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
            {users.length === 0 && (
              <p className="text-zinc-500 text-sm col-span-2">Aucun utilisateur ADMIN/EDITOR trouvé.</p>
            )}
          </div>
        )}
      </section>

      {/* OVERRIDE EDITOR */}
      {selectedUser && (
        <>
          <section className="bg-gradient-to-br from-violet-950/40 to-zinc-900 border border-violet-500/30 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-base">
                  Overrides pour <span className="text-violet-300">{selectedUser.name || selectedUser.email}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Rôle : <code className="bg-zinc-800 px-1.5 py-0.5 rounded">{selectedUser.role}</code>
                  {' · '}
                  {totalForced > 0
                    ? <>{totalForced} override{totalForced > 1 ? 's' : ''} actifs ({totalVisible} forcé visibles, {totalHidden} forcé cachés)</>
                    : 'aucun override (rôle par défaut)'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="🔎 Filtrer par nom ou URL"
                  className="text-xs bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 w-56 focus:border-violet-500 focus:outline-none"
                />
                {overrideExists && (
                  <button
                    onClick={resetOverride}
                    disabled={resetting}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {resetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    Reset
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* GROUPES */}
          {GROUPS.map((grp) => {
            const items = filteredItems(grp.name);
            if (items.length === 0) return null;
            return (
              <section key={grp.name} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className={`bg-gradient-to-r ${grp.gradient} px-5 py-3`}>
                  <h2 className="font-bold text-white text-sm uppercase tracking-wider">{grp.name}</h2>
                </div>
                <div className="divide-y divide-zinc-800">
                  {items.map((item) => {
                    const st = states.get(item.href) || 'auto';
                    return (
                      <div key={item.href} className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3 items-center hover:bg-zinc-800/30">
                        <div>
                          <div className="font-semibold text-sm text-white flex items-center gap-2 flex-wrap">
                            {item.label}
                            {item.isNew && (
                              <span className="bg-fuchsia-500/20 text-fuchsia-300 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">new</span>
                            )}
                            {item.alwaysVisible && (
                              <span className="bg-zinc-800 text-zinc-500 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded">verrouillé</span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono truncate">{item.href}</div>
                        </div>
                        <div className="flex gap-1">
                          <StateBtn
                            label="Auto" icon={<Minus size={11} />}
                            active={st === 'auto'}
                            disabled={!!item.alwaysVisible}
                            color="zinc"
                            onClick={() => setState(item.href, 'auto')}
                          />
                          <StateBtn
                            label="Force visible" icon={<Eye size={11} />}
                            active={st === 'force-visible'}
                            disabled={!!item.alwaysVisible}
                            color="emerald"
                            onClick={() => setState(item.href, 'force-visible')}
                          />
                          <StateBtn
                            label="Force caché" icon={<EyeOff size={11} />}
                            active={st === 'force-hidden'}
                            disabled={!!item.alwaysVisible}
                            color="rose"
                            onClick={() => setState(item.href, 'force-hidden')}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* NOTES */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <label className="block text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Notes (optionnel)</label>
            <textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
              placeholder="Pourquoi cet override pour ce user ? (visible uniquement par les ADMIN)"
              rows={2}
              maxLength={500}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </section>

          {/* SAVE BAR */}
          <div className="sticky bottom-4 flex items-center justify-end gap-3 bg-zinc-950/90 backdrop-blur border border-violet-500/30 rounded-2xl p-4 shadow-2xl">
            {error && <span className="text-rose-400 text-sm">⚠ {error}</span>}
            {saved && (
              <span className="flex items-center gap-1 text-emerald-400 text-sm">
                <CheckCircle2 size={16} /> Enregistré
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Enregistrer les overrides pour {selectedUser.name || selectedUser.email.split('@')[0]}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function StateBtn({
  label, icon, active, disabled, color, onClick
}: {
  label: string; icon: React.ReactNode; active: boolean; disabled?: boolean;
  color: 'zinc' | 'emerald' | 'rose'; onClick: () => void;
}) {
  const colorMap = {
    zinc:    'bg-zinc-700 text-zinc-100 border-zinc-600',
    emerald: 'bg-emerald-500/30 text-emerald-200 border-emerald-500/50',
    rose:    'bg-rose-500/30 text-rose-200 border-rose-500/50'
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg border flex items-center gap-1 transition
        ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
        ${active ? colorMap[color] : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
    >
      {icon}
      {label}
    </button>
  );
}
