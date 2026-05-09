'use client';
import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, Trash2, Loader2, CheckCircle2, AlertTriangle, KeyRound, Lock, Info } from 'lucide-react';

interface Secret {
  key: string;
  label: string;
  desc: string;
  tip: string | null;
  configured: boolean;
  source: 'env' | 'db' | null;
  masked: string;
}

export function SecretsManagerClient() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Map<string, string>>(new Map());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/secrets', { cache: 'no-store' });
      const j = await r.json();
      if (r.ok) setSecrets(j.secrets || []);
    } catch (e: any) {
      setError(e?.message);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit(key: string) {
    setEditing((m) => {
      const next = new Map(m);
      next.set(key, '');
      return next;
    });
  }
  function cancelEdit(key: string) {
    setEditing((m) => {
      const next = new Map(m);
      next.delete(key);
      return next;
    });
  }
  function setEditValue(key: string, value: string) {
    setEditing((m) => {
      const next = new Map(m);
      next.set(key, value);
      return next;
    });
  }
  function toggleReveal(key: string) {
    setRevealed((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save(key: string) {
    const value = editing.get(key) ?? '';
    if (!value) return;
    setSavingKey(key);
    setError(null);
    try {
      const r = await fetch('/api/admin/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'KO');
      setSavedKey(key);
      cancelEdit(key);
      await load();
      setTimeout(() => setSavedKey(null), 2000);
    } catch (e: any) {
      setError(e?.message);
    }
    setSavingKey(null);
  }

  async function remove(key: string) {
    if (!confirm(`Supprimer le secret "${key}" ?`)) return;
    setSavingKey(key);
    try {
      await fetch(`/api/admin/secrets?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
      await load();
    } finally {
      setSavingKey(null);
    }
  }

  const filtered = secrets.filter((s) =>
    !filter || s.key.toLowerCase().includes(filter.toLowerCase()) || s.label.toLowerCase().includes(filter.toLowerCase())
  );
  const configured = secrets.filter((s) => s.configured).length;
  const fromEnv = secrets.filter((s) => s.source === 'env').length;
  const fromDB = secrets.filter((s) => s.source === 'db').length;

  return (
    <div className="px-3 lg:px-4 pb-6 max-w-5xl mx-auto">
      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-4 flex gap-3">
        <Info size={18} className="text-blue-300 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-200/90 space-y-1">
          <p>
            <strong>Configure les clés API depuis l'admin</strong> sans toucher à Coolify. Stockées en DB (Setting), accessibles via <code className="bg-zinc-800 px-1 rounded">getSecret(KEY)</code>.
          </p>
          <p>
            <strong>Priorité :</strong> Coolify env vars (badge <span className="text-emerald-300">env</span>) gagne toujours sur la DB (<span className="text-violet-300">db</span>). Définir une valeur ici n'écrase pas une env var existante.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Stat label="Configurés" value={`${configured} / ${secrets.length}`} color="emerald" />
        <Stat label="Depuis Coolify" value={fromEnv} color="cyan" sub="env vars" />
        <Stat label="Depuis DB" value={fromDB} color="violet" sub="éditables ici" />
      </div>

      {/* Filtre */}
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="🔎 Filtrer par nom ou label…"
        className="w-full mb-4 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
      />

      {/* Liste */}
      {loading ? (
        <p className="text-zinc-500 text-center py-8 flex items-center justify-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Chargement…
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((sec) => {
            const isEditing = editing.has(sec.key);
            const isSaving = savingKey === sec.key;
            const isSaved = savedKey === sec.key;
            const value = editing.get(sec.key) ?? '';
            const showRevealed = revealed.has(sec.key);

            return (
              <article key={sec.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-start gap-3">
                  <div className={`shrink-0 rounded-xl p-2.5 ${
                    sec.source === 'env' ? 'bg-emerald-500/20 text-emerald-300' :
                    sec.source === 'db' ? 'bg-violet-500/20 text-violet-300' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>
                    {sec.configured ? <Lock size={18} /> : <KeyRound size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{sec.label}</h3>
                      {sec.source === 'env' && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300" title="Défini dans Coolify env vars — non éditable ici">env</span>
                      )}
                      {sec.source === 'db' && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">db</span>
                      )}
                      {!sec.configured && (
                        <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">non configuré</span>
                      )}
                    </div>
                    <code className="text-[11px] text-zinc-500 font-mono">{sec.key}</code>
                    <p className="text-xs text-zinc-400 mt-1">{sec.desc}</p>
                    {sec.tip && <p className="text-[11px] text-cyan-300 mt-0.5">💡 {sec.tip}</p>}

                    {/* Affichage / édition */}
                    {!isEditing ? (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {sec.configured ? (
                          <code className="bg-zinc-950 ring-1 ring-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-300">
                            {showRevealed ? '••••••••' /* on ne révèle jamais en clair côté client — placeholder */ : sec.masked}
                          </code>
                        ) : (
                          <span className="text-xs text-zinc-500 italic">Non défini</span>
                        )}
                        {sec.source !== 'env' && (
                          <button
                            onClick={() => startEdit(sec.key)}
                            className="text-xs bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg font-bold"
                          >
                            {sec.configured ? 'Modifier' : 'Définir'}
                          </button>
                        )}
                        {sec.source === 'db' && (
                          <button
                            onClick={() => remove(sec.key)}
                            disabled={isSaving}
                            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                          >
                            <Trash2 size={11} /> Supprimer
                          </button>
                        )}
                        {isSaved && (
                          <span className="flex items-center gap-1 text-emerald-300 text-xs">
                            <CheckCircle2 size={11} /> Sauvegardé
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type={showRevealed ? 'text' : 'password'}
                            value={value}
                            onChange={(e) => setEditValue(sec.key, e.target.value)}
                            placeholder={`Coller ${sec.label}…`}
                            autoFocus
                            className="flex-1 bg-zinc-950 border border-violet-500/50 rounded-lg px-3 py-2 text-sm font-mono focus:border-violet-500 focus:outline-none"
                          />
                          <button
                            onClick={() => toggleReveal(sec.key)}
                            className="p-2 text-zinc-400 hover:text-zinc-200"
                            title={showRevealed ? 'Masquer' : 'Révéler'}
                          >
                            {showRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => save(sec.key)}
                            disabled={isSaving || !value.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
                          >
                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                            Enregistrer
                          </button>
                          <button
                            onClick={() => cancelEdit(sec.key)}
                            className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300 flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: React.ReactNode; color: 'emerald' | 'cyan' | 'violet'; sub?: string }) {
  const map = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    cyan: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
    violet: 'bg-violet-500/10 border-violet-500/30 text-violet-300'
  }[color];
  return (
    <div className={`border rounded-2xl p-3 text-center ${map}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[10px] uppercase font-bold tracking-wider opacity-70">{label}</div>
      {sub && <div className="text-[9px] opacity-50 mt-0.5">{sub}</div>}
    </div>
  );
}
