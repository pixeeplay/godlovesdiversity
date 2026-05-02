'use client';
import { useState } from 'react';
import {
  Users, Plus, Save, Loader2, CheckCircle2, AlertCircle, Trash2, Pencil,
  Eye, EyeOff, KeyRound, Shield, ShieldAlert, ShieldCheck, X, Mail, type LucideIcon
} from 'lucide-react';

type Role = 'ADMIN' | 'EDITOR' | 'MODERATOR' | 'VIEWER';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};

type RoleMeta = {
  id: Role;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  badge: string;
  perms: string[];
};

const ROLES: RoleMeta[] = [
  {
    id: 'ADMIN',
    label: 'Administrateur',
    description: 'Accès complet à tout le back-office. Peut gérer les utilisateurs, modifier les paramètres système et la visibilité du menu.',
    icon: ShieldAlert,
    gradient: 'from-pink-500 to-rose-600',
    badge: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    perms: ['Tout', 'Gestion utilisateurs', 'Visibilité menu', 'Paramètres', 'Suppression définitive']
  },
  {
    id: 'EDITOR',
    label: 'Éditeur',
    description: 'Peut créer et publier du contenu (photos, articles, affiches, produits, newsletter). N\'accède pas aux paramètres système ni à la gestion des utilisateurs.',
    icon: Pencil,
    gradient: 'from-violet-500 to-purple-600',
    badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    perms: ['Photos', 'Articles', 'Affiches', 'Produits', 'Newsletter', 'Calendrier social']
  },
  {
    id: 'MODERATOR',
    label: 'Modérateur',
    description: 'Approuve ou rejette les photos et commentaires soumis par les visiteurs. Lecture seule sur le reste du back-office.',
    icon: ShieldCheck,
    gradient: 'from-amber-500 to-orange-600',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    perms: ['Modération photos', 'Modération commentaires', 'Vue dashboard']
  },
  {
    id: 'VIEWER',
    label: 'Lecture seule',
    description: 'Accès limité aux statistiques et au dashboard. Ne peut rien modifier.',
    icon: Eye,
    gradient: 'from-zinc-500 to-zinc-700',
    badge: 'bg-zinc-700/30 text-zinc-300 border-zinc-700',
    perms: ['Dashboard', 'Statistiques']
  }
];

function getRoleMeta(r: Role) {
  return ROLES.find((x) => x.id === r) || ROLES[3];
}

function genPassword(len = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let p = '';
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) p += chars[arr[i] % chars.length];
  return p;
}

export function UsersAdmin({
  initialUsers, currentUserId, currentUserEmail
}: {
  initialUsers: User[];
  currentUserId: string;
  currentUserEmail: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stats = {
    total: users.length,
    admin: users.filter((u) => u.role === 'ADMIN').length,
    editor: users.filter((u) => u.role === 'EDITOR').length,
    moderator: users.filter((u) => u.role === 'MODERATOR').length,
    viewer: users.filter((u) => u.role === 'VIEWER').length
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl space-y-6">
      {/* HEADER */}
      <header>
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-gradient-to-br from-pink-500 to-violet-600 rounded-xl p-2.5">
            <Users size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold">Utilisateurs admin</h1>
          <span className="bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
            Super-admin
          </span>
        </div>
        <p className="text-zinc-400 text-sm max-w-3xl">
          Crée des comptes pour ton équipe avec des niveaux d'accès différents. Le rôle détermine ce que la personne peut voir et modifier.
        </p>
      </header>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <div className="text-xs text-zinc-500 uppercase font-bold">Total</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>
        {ROLES.map((r) => {
          const Icon = r.icon;
          const count = users.filter((u) => u.role === r.id).length;
          return (
            <div key={r.id} className={`relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${r.gradient} text-white shadow-lg`}>
              <Icon size={18} className="opacity-90 mb-2" />
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-[10px] uppercase font-semibold opacity-90">{r.label}</div>
            </div>
          );
        })}
      </section>

      {/* RÔLES — explication */}
      <section className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-sm font-bold mb-3 text-zinc-300">Que peut faire chaque rôle ?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.id} className={`rounded-xl border p-3 ${r.badge}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} />
                  <div className="font-bold text-sm">{r.label}</div>
                </div>
                <p className="text-[11px] opacity-80 mb-2 leading-relaxed">{r.description}</p>
                <div className="flex flex-wrap gap-1">
                  {r.perms.map((p) => (
                    <span key={p} className="text-[9px] bg-black/20 dark:bg-white/10 px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TOOLBAR */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-zinc-400">
          <strong className="text-white">{stats.total}</strong> compte{stats.total > 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-brand-pink hover:bg-pink-600 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
        >
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? 'Annuler' : 'Nouvel utilisateur'}
        </button>
      </div>

      {/* CREATE FORM */}
      {showCreate && (
        <CreateUserForm
          onCreated={(u) => { setUsers([u, ...users]); setShowCreate(false); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {/* LISTE */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_140px_140px_140px_60px] gap-3 px-4 py-2 text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950/50">
          <div>Email & nom</div>
          <div>Rôle</div>
          <div>Créé le</div>
          <div>Statut</div>
          <div></div>
        </div>
        <div className="divide-y divide-zinc-800">
          {users.map((u) => {
            const meta = getRoleMeta(u.role);
            const Icon = meta.icon;
            const isMe = u.id === currentUserId;
            const isFirstAdmin = u.role === 'ADMIN' && u.email === 'arnaud@gredai.com';
            return (
              <div key={u.id}>
                <div className="grid grid-cols-[1fr_140px_140px_140px_60px] gap-3 px-4 py-3 items-center hover:bg-zinc-800/30">
                  <div className="min-w-0">
                    <div className="font-bold text-sm flex items-center gap-2">
                      <span className="truncate">{u.email}</span>
                      {isMe && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase font-bold">Moi</span>}
                      {isFirstAdmin && <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded uppercase font-bold">Super</span>}
                    </div>
                    {u.name && <div className="text-xs text-zinc-500">{u.name}</div>}
                  </div>
                  <div>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.badge}`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  <div>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-300 px-2 py-0.5 rounded">Actif</span>
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => setEditingId(editingId === u.id ? null : u.id)}
                      className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded"
                      title="Éditer"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
                {editingId === u.id && (
                  <EditUserForm
                    user={u}
                    isMe={isMe}
                    onSaved={(updated) => {
                      setUsers(users.map((x) => x.id === u.id ? { ...x, ...updated } : x));
                      setEditingId(null);
                    }}
                    onDeleted={() => {
                      setUsers(users.filter((x) => x.id !== u.id));
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* INFO */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-xs text-blue-200/90 flex gap-2">
        <Mail size={14} className="text-blue-300 shrink-0 mt-0.5" />
        <div>
          <strong>Astuce :</strong> partage l'email + le mot de passe à la personne via un canal sécurisé (Signal, mot de passe en main propre).
          Elle se connectera sur <code className="bg-zinc-800 px-1 rounded">/admin/login</code> et pourra changer son mot de passe ensuite.
          Tu peux masquer des rubriques du menu pour les rôles non-ADMIN dans <strong>Système → Visibilité menu</strong>.
        </div>
      </div>
    </div>
  );
}

/* ─── CREATE FORM ─────────────────────────────────────── */

function CreateUserForm({
  onCreated, onCancel
}: {
  onCreated: (u: User) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('EDITOR');
  const [password, setPassword] = useState(genPassword());
  const [showPwd, setShowPwd] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!email.includes('@')) { setError('Email invalide'); return; }
    if (password.length < 8) { setError('Mot de passe 8 caractères minimum'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, password })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur');
      onCreated(j.user);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  const roleMeta = getRoleMeta(role);

  return (
    <section className="bg-zinc-900 border-2 border-brand-pink/40 rounded-2xl p-5 space-y-4">
      <h3 className="font-bold flex items-center gap-2"><Plus size={16} className="text-brand-pink" /> Nouvel utilisateur</h3>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400">Email *</span>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom@exemple.com"
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400">Nom (optionnel)</span>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Marie Dupont"
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
        </label>
      </div>

      {/* Role picker */}
      <div>
        <span className="text-xs font-bold uppercase text-zinc-400 mb-2 block">Rôle</span>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {ROLES.map((r) => {
            const Icon = r.icon;
            const active = role === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`p-3 rounded-xl border-2 text-left transition
                  ${active
                    ? `bg-gradient-to-br ${r.gradient} text-white border-transparent shadow-lg`
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} />
                  <span className="font-bold text-sm">{r.label}</span>
                </div>
                <div className={`text-[10px] line-clamp-2 ${active ? 'opacity-90' : 'opacity-60'}`}>
                  {r.description.split('.')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Password */}
      <label className="block">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-zinc-400">Mot de passe initial</span>
          <button
            type="button"
            onClick={() => setPassword(genPassword())}
            className="text-[11px] text-brand-pink hover:underline font-bold"
          >
            🎲 Générer un nouveau
          </button>
        </div>
        <div className="relative mt-1">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-10 text-sm font-mono outline-none focus:border-brand-pink"
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <span className="text-[11px] text-zinc-500 mt-1 block">
          Communique-le à la personne via un canal sécurisé. Elle pourra le changer après connexion.
        </span>
      </label>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-2 text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">
          Annuler
        </button>
        <button
          onClick={submit}
          disabled={busy}
          className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-full text-sm flex items-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Créer l'utilisateur
        </button>
      </div>
    </section>
  );
}

/* ─── EDIT FORM ──────────────────────────────────────── */

function EditUserForm({
  user, isMe, onSaved, onDeleted, onCancel
}: {
  user: User;
  isMe: boolean;
  onSaved: (u: Partial<User>) => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState<Role>(user.role);
  const [newPassword, setNewPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setBusy(true);
    setError('');
    try {
      const body: any = { name };
      if (role !== user.role) body.role = role;
      if (newPassword) body.password = newPassword;
      const r = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur');
      onSaved(j.user);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function del() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erreur');
      onDeleted();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  return (
    <div className="bg-zinc-950 border-t border-zinc-800 p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400">Nom</span>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Nom complet"
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
        </label>
        <label className="block">
          <span className="text-xs font-bold uppercase text-zinc-400">Rôle</span>
          <select
            value={role} onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-pink"
          >
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>{r.label} — {r.id}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-bold uppercase text-zinc-400">Nouveau mot de passe (laisse vide pour ne pas changer)</span>
        <div className="relative mt-1">
          <input
            type={showPwd ? 'text' : 'password'}
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Laisser vide pour conserver"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-20 text-sm font-mono outline-none focus:border-brand-pink"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <button type="button" onClick={() => setNewPassword(genPassword())}
              className="text-zinc-500 hover:text-brand-pink text-xs px-2">🎲</button>
            <button type="button" onClick={() => setShowPwd(!showPwd)}
              className="text-zinc-500 hover:text-white">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </label>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-2 text-xs flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div className="flex justify-between gap-2 pt-2 border-t border-zinc-800">
        <div>
          {!isMe && (
            confirmDelete ? (
              <div className="flex gap-2 items-center text-xs">
                <span className="text-red-300">Sûr ? Cette action est irréversible.</span>
                <button onClick={del} disabled={busy}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold px-3 py-1.5 rounded text-xs flex items-center gap-1">
                  {busy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Confirmer
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-zinc-400 hover:text-white text-xs">
                  Non
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1">
                <Trash2 size={12} /> Supprimer ce compte
              </button>
            )
          )}
          {isMe && (
            <span className="text-[11px] text-zinc-500">Tu ne peux pas te supprimer toi-même.</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white">
            Annuler
          </button>
          <button onClick={save} disabled={busy}
            className="bg-brand-pink hover:bg-pink-600 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-full text-xs flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
