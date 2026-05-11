'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Page {
  id: string;
  slug: string;
  title: string;
  isHome: boolean;
  visible: boolean;
  updatedAt: string;
  blocksCount: number;
}

interface Site {
  id: string;
  slug: string;
  name: string;
  status: string;
  deployedAt: string | null;
}

export function SiteDetailClient({ orgSlug, orgName, orgDefaultDomain, site, pages, role }: {
  orgSlug: string;
  orgName: string;
  orgDefaultDomain: string | null;
  site: Site;
  pages: Page[];
  role: string;
}) {
  const router = useRouter();
  const canEdit = ['owner', 'admin', 'editor'].includes(role);
  const [publishing, setPublishing] = useState(false);
  const [showNewPage, setShowNewPage] = useState(false);
  // URL publique : <orgSlug>.pixeeplay.com/<siteSlug> (multi-sites par org via path)
  // On ignore orgDefaultDomain s'il pointe vers l'ancien .pixeesite.app (DNS pas configuré)
  const liveUrl = orgDefaultDomain && !orgDefaultDomain.endsWith('.pixeesite.app')
    ? `https://${orgDefaultDomain}/${site.slug}`
    : `https://${orgSlug}.pixeeplay.com/${site.slug}`;

  async function publish() {
    if (!confirm(`Publier "${site.name}" ? Les visiteurs verront le site immédiatement.`)) return;
    setPublishing(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites/${site.slug}/publish`, { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        router.refresh();
      } else {
        alert('Erreur : ' + (j.error || 'unknown'));
      }
    } catch (e: any) {
      alert(e.message);
    }
    setPublishing(false);
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.5 }}>
        <Link href={`/dashboard/orgs/${orgSlug}`} style={{ color: 'inherit', textDecoration: 'none' }}>← {orgName}</Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>{site.name}</h1>
          <p style={{ opacity: 0.6, fontSize: 13, margin: '4px 0' }}>
            <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: 4 }}>/{site.slug}</code>
            <span style={{ marginLeft: 8 }}>· {site.status === 'published' ? '🟢 En ligne' : '⚪ Brouillon'}</span>
            {site.deployedAt && <span style={{ marginLeft: 8, opacity: 0.5 }}>· Publié le {new Date(site.deployedAt).toLocaleDateString('fr-FR')}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {site.status === 'published' && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={btnSecondary}>
              ↗ Voir le site
            </a>
          )}
          {canEdit && (
            <button onClick={publish} disabled={publishing} style={{ ...btnPrimary, opacity: publishing ? 0.5 : 1 }}>
              {publishing ? 'Publication…' : site.status === 'published' ? '🔄 Re-publier' : '🚀 Publier'}
            </button>
          )}
        </div>
      </div>

      {/* Pages list */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Pages ({pages.length})</h2>
        {canEdit && <button onClick={() => setShowNewPage(true)} style={btnPrimary}>+ Nouvelle page</button>}
      </div>

      {pages.length === 0 ? (
        <div style={{ background: '#18181b', border: '2px dashed #27272a', borderRadius: 12, padding: 32, textAlign: 'center', opacity: 0.6 }}>
          Aucune page. Crée la première !
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/orgs/${orgSlug}/sites/${site.slug}/edit?page=${encodeURIComponent(p.slug)}`}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#18181b', border: '1px solid #27272a', borderRadius: 10, padding: 14, textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {p.isHome ? '🏠' : '📄'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{p.title} {p.isHome && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#d946ef33', color: '#d946ef', marginLeft: 4 }}>HOME</span>}</div>
                <code style={{ fontSize: 11, opacity: 0.5 }}>{p.slug}</code>
                <span style={{ fontSize: 11, opacity: 0.4, marginLeft: 8 }}>{p.blocksCount} bloc{p.blocksCount > 1 ? 's' : ''}</span>
              </div>
              {!p.visible && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#71717a33', color: '#71717a' }}>MASQUÉE</span>}
              <span style={{ opacity: 0.4 }}>→</span>
            </Link>
          ))}
        </div>
      )}

      {showNewPage && <NewPageModal orgSlug={orgSlug} siteSlug={site.slug} onClose={() => setShowNewPage(false)} />}
    </div>
  );
}

function NewPageModal({ orgSlug, siteSlug, onClose }: { orgSlug: string; siteSlug: string; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [creating, setCreating] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setCreating(true);
    const finalSlug = slug.trim() || '/' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const r = await fetch(`/api/orgs/${orgSlug}/sites/${siteSlug}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), slug: finalSlug.startsWith('/') ? finalSlug : '/' + finalSlug }),
    });
    const j = await r.json();
    if (j.ok) {
      router.push(`/dashboard/orgs/${orgSlug}/sites/${siteSlug}/edit?page=${encodeURIComponent(j.page.slug)}`);
    } else {
      alert(j.error);
      setCreating(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>Nouvelle page</h3>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la page" autoFocus style={{ width: '100%', padding: 10, background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 8, color: 'inherit', marginBottom: 8 }} />
        <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="/slug-url (auto si vide)" style={{ width: '100%', padding: 10, background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 8, color: 'inherit', fontFamily: 'monospace', fontSize: 13 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#a1a1aa', padding: '8px 12px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={create} disabled={creating || !title.trim()} style={{ ...btnPrimary, opacity: creating ? 0.5 : 1 }}>
            {creating ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: 'linear-gradient(135deg, #d946ef, #06b6d4)',
  color: 'white', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', fontSize: 13,
};
const btnSecondary: React.CSSProperties = {
  background: '#27272a', color: 'inherit', border: '1px solid #3f3f46', padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block', fontSize: 13,
};
