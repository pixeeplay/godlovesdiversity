'use client';
import { useEffect, useState } from 'react';
import { Mail, Send, Trash2, Loader2, Copy, CheckCircle2, Clock, Shield, Sparkles, ExternalLink } from 'lucide-react';

interface Invitation {
  id: string;
  code: string;
  email: string;
  role: string;
  expiresAt: string;
  usedAt?: string | null;
  usedByUa?: string | null;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-rose-500/20 text-rose-200',
  EDITOR: 'bg-fuchsia-500/20 text-fuchsia-200',
  MODERATOR: 'bg-amber-500/20 text-amber-200',
  VIEWER: 'bg-zinc-500/20 text-zinc-200'
};

export function InvitationsClient() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: '', role: 'ADMIN', ttlHours: 24 });
  const [msg, setMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/invitations');
      const j = await r.json();
      setInvitations(j.invitations || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.email.includes('@')) { setMsg('⚠ Email invalide'); return; }
    setCreating(true); setMsg(null);
    try {
      const r = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(j.message);
        setForm({ ...form, email: '' });
        load();
      } else {
        setMsg(`⚠ ${j.error || j.message}`);
      }
    } catch (e: any) { setMsg(`⚠ ${e.message}`); }
    setCreating(false);
  }

  async function revoke(id: string) {
    if (!confirm('Révoquer cette invitation ?')) return;
    try {
      await fetch(`/api/admin/invitations?id=${id}`, { method: 'DELETE' });
      load();
    } catch {}
  }

  function copyLink(code: string) {
    const url = `https://gld.pixeeplay.com/admin/login?invitation=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-rose-500 via-fuchsia-500 to-violet-500 rounded-2xl p-3">
          <Mail size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold leading-none">Invitations admin</h1>
          <p className="text-zinc-400 text-xs mt-1">
            Crée un code à usage unique pour un device tier (iPad, autre PC, etc.) avec TTL configurable.
          </p>
        </div>
      </header>

      {/* Form de création */}
      <section className="bg-gradient-to-br from-fuchsia-500/10 via-violet-500/5 to-cyan-500/10 border-2 border-fuchsia-500/30 rounded-2xl p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Send size={14} className="text-fuchsia-300" /> Nouvelle invitation
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            type="email"
            placeholder="email@destinataire.com"
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:border-fuchsia-500 outline-none"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="ADMIN">ADMIN (full access)</option>
            <option value="EDITOR">EDITOR</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="VIEWER">VIEWER (read-only)</option>
          </select>
          <select
            value={form.ttlHours}
            onChange={(e) => setForm({ ...form, ttlHours: parseInt(e.target.value) })}
            className="bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="1">⚡ 1 heure (urgence)</option>
            <option value="6">6 heures</option>
            <option value="24">24 heures (défaut)</option>
            <option value="72">3 jours</option>
            <option value="168">7 jours</option>
            <option value="720">30 jours</option>
          </select>
        </div>
        <button
          onClick={create}
          disabled={creating || !form.email.includes('@')}
          className="bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:opacity-90 disabled:opacity-50 text-white text-sm font-bold px-5 py-2 rounded-full flex items-center gap-2"
        >
          {creating ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Envoyer l'invitation par email
        </button>
        {msg && <p className="mt-3 text-sm text-fuchsia-200">{msg}</p>}
      </section>

      {/* Liste des invitations */}
      <section>
        <h2 className="text-xs uppercase font-bold tracking-widest text-violet-400 mb-3">
          Invitations ({invitations.length})
        </h2>
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-zinc-500" /></div>
        ) : invitations.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500">
            Aucune invitation pour l'instant.
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map(inv => {
              const expired = new Date(inv.expiresAt) < new Date();
              const used = !!inv.usedAt;
              const status = used ? 'used' : expired ? 'expired' : 'active';
              return (
                <article
                  key={inv.id}
                  className={`bg-zinc-900 border rounded-xl p-3 flex items-center gap-3 ${
                    status === 'active' ? 'border-emerald-500/40' :
                    status === 'used' ? 'border-zinc-700 opacity-60' :
                    'border-rose-500/40 opacity-70'
                  }`}
                >
                  <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-violet-500 flex items-center justify-center text-white font-bold">
                    {inv.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{inv.email}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[inv.role]}`}>
                        {inv.role}
                      </span>
                      {status === 'active' && <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-bold">● ACTIVE</span>}
                      {status === 'used' && <span className="text-[10px] bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-bold">✓ UTILISÉE</span>}
                      {status === 'expired' && <span className="text-[10px] bg-rose-500/20 text-rose-200 px-2 py-0.5 rounded-full font-bold">⏰ EXPIRÉE</span>}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Créée {new Date(inv.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      <span>· Expire {new Date(inv.expiresAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      {used && <span className="text-emerald-400">· Utilisée {new Date(inv.usedAt!).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {status === 'active' && (
                      <button
                        onClick={() => copyLink(inv.code)}
                        className="text-[10px] bg-fuchsia-500/20 hover:bg-fuchsia-500/40 text-fuchsia-200 px-2 py-1 rounded-full flex items-center gap-1"
                      >
                        {copiedCode === inv.code ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                        {copiedCode === inv.code ? 'Copié' : 'Copier le lien'}
                      </button>
                    )}
                    <button
                      onClick={() => revoke(inv.id)}
                      className="text-[10px] text-zinc-500 hover:text-rose-400 px-2 py-1 flex items-center gap-1"
                    >
                      <Trash2 size={10} /> Révoquer
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Doc sécurité 2FA + Tailscale */}
      <section className="bg-blue-500/5 border border-blue-500/30 rounded-2xl p-4 text-sm text-blue-200">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Shield size={14} /> Sécurité — niveaux possibles</h3>
        <div className="space-y-3 text-xs">
          <div>
            <strong className="text-emerald-300">✓ Niveau 1 (actif maintenant)</strong>
            <p className="text-blue-200/80 ml-4 mt-1">Code d'invitation à usage unique avec TTL → email envoyé. Utilise NextAuth derrière. Suffit pour iPad personnel.</p>
          </div>
          <div>
            <strong className="text-amber-300">○ Niveau 2 (P1, à coder)</strong>
            <p className="text-blue-200/80 ml-4 mt-1">2FA TOTP : ajouter un code à 6 chiffres généré par Authenticator (Google/Microsoft/etc.) à la connexion admin. Lib <code>otplib</code>, ~1 jour de dev.</p>
          </div>
          <div>
            <strong className="text-amber-300">○ Niveau 3 (P2, à coder)</strong>
            <p className="text-blue-200/80 ml-4 mt-1">SMS via Twilio sur les actions critiques (changement role, suppression admin) — 0.05 €/SMS.</p>
          </div>
          <div>
            <strong className="text-violet-300">○ Niveau 4 (haute sécurité, optionnel)</strong>
            <p className="text-blue-200/80 ml-4 mt-1">Restreindre <code>/admin/*</code> aux IPs Tailscale (allowlist). Bloque l'accès depuis Internet public. Configure dans <code>middleware.ts</code> avec check <code>req.headers.get('x-forwarded-for')</code> contre la plage Tailscale (100.x.y.z).</p>
          </div>
        </div>
      </section>
    </div>
  );
}
