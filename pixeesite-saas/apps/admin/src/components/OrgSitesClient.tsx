'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Site {
  id: string;
  slug: string;
  name: string;
  status: string;
  pageCount: number;
  updatedAt: string;
}

const STATUS_META: Record<string, { color: string; label: string }> = {
  draft:     { color: '#a1a1aa', label: 'Brouillon' },
  published: { color: '#10b981', label: 'En ligne' },
  archived:  { color: '#71717a', label: 'Archivé' },
};

export function OrgSitesClient({ orgSlug, initialSites, canCreateMore }: { orgSlug: string; initialSites: Site[]; canCreateMore: boolean }) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  async function createBlankSite() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }),
      });
      const j = await r.json();
      if (j.ok) {
        router.push(`/dashboard/orgs/${orgSlug}/sites/${j.site.slug}`);
      } else {
        alert('Erreur: ' + j.error);
        setCreating(false);
      }
    } catch (e: any) {
      alert(e.message);
      setCreating(false);
    }
  }

  async function deleteSite(s: Site) {
    const ok = window.confirm(`Supprimer définitivement le site « ${s.name} » ? Cette action est irréversible.`);
    if (!ok) return;
    setDeleting(s.id);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites/${s.slug}`, { method: 'DELETE' });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) {
        setSites((arr) => arr.filter((x) => x.id !== s.id));
      } else {
        alert('Erreur: ' + (j.error || `HTTP ${r.status}`));
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  }

  function previewUrl(s: Site): string {
    // Org subdomain on pixeeplay.com. Si l'org a 1 site, /<siteSlug>, sinon idem.
    return `https://${orgSlug}.pixeeplay.com/${s.slug}`;
  }

  if (sites.length === 0) {
    return (
      <div style={{ background: '#18181b', border: '2px dashed #27272a', borderRadius: 16, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Aucun site créé</h3>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>Démarre depuis un template prêt-à-l'emploi ou crée une page blanche.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <Link href={`/dashboard/orgs/${orgSlug}/templates`} style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', padding: '12px 20px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
            ✨ Choisir un template
          </Link>
          <button onClick={() => setShowNew(true)} style={{ background: '#27272a', color: 'inherit', border: '1px solid #3f3f46', padding: '12px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Page blanche
          </button>
        </div>
        {showNew && <NewSiteModal name={name} setName={setName} slug={slug} setSlug={setSlug} creating={creating} onClose={() => setShowNew(false)} onCreate={createBlankSite} />}
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Mes sites</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {sites.map((s) => {
          const meta = STATUS_META[s.status] || STATUS_META.draft;
          const isDeleting = deleting === s.id;
          return (
            <div
              key={s.id}
              style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, padding: 16, opacity: isDeleting ? 0.5 : 1, transition: 'opacity .2s' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#fafafa' }}>{s.name}</div>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${meta.color}22`, color: meta.color, fontWeight: 600, textTransform: 'uppercase' }}>{meta.label}</span>
              </div>
              <code style={{ fontSize: 11, opacity: 0.5, display: 'block', marginBottom: 8 }}>/{s.slug}</code>
              <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 12 }}>
                {s.pageCount} page{s.pageCount > 1 ? 's' : ''} · MAJ {new Date(s.updatedAt).toLocaleDateString('fr-FR')}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Link
                  href={`/dashboard/orgs/${orgSlug}/sites/${s.slug}`}
                  aria-label={`Éditer le site ${s.name}`}
                  title="Éditer"
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white',
                    border: 0, padding: '8px 10px', borderRadius: 8, fontWeight: 600,
                    cursor: 'pointer', fontSize: 12, textDecoration: 'none',
                  }}
                >
                  ✏️ <span>Éditer</span>
                </Link>
                <a
                  href={previewUrl(s)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Prévisualiser le site ${s.name} dans un nouvel onglet`}
                  title="Preview"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: '#27272a', color: '#fafafa',
                    border: '1px solid #3f3f46', padding: '8px 10px', borderRadius: 8,
                    cursor: 'pointer', fontSize: 12, textDecoration: 'none', fontWeight: 600,
                  }}
                >
                  👁 <span>Preview</span>
                </a>
                <button
                  onClick={() => deleteSite(s)}
                  disabled={isDeleting}
                  aria-label={`Supprimer le site ${s.name}`}
                  title="Supprimer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', color: '#ef4444',
                    border: '1px solid #ef444455', padding: '8px 10px', borderRadius: 8,
                    cursor: isDeleting ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600,
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
        {canCreateMore && (
          <button
            onClick={() => setShowNew(true)}
            style={{ background: '#10b98115', border: '2px dashed #10b98140', borderRadius: 12, padding: 16, color: '#10b981', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            + Nouveau site
          </button>
        )}
      </div>
      {showNew && <NewSiteModal name={name} setName={setName} slug={slug} setSlug={setSlug} creating={creating} onClose={() => setShowNew(false)} onCreate={createBlankSite} />}
    </>
  );
}

function NewSiteModal({ name, setName, slug, setSlug, creating, onClose, onCreate }: any) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>Nouveau site blanc</h3>
        <input value={name} onChange={(e) => { setName(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')); }} placeholder="Nom du site" autoFocus style={{ width: '100%', padding: 10, background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 8, color: 'inherit', marginBottom: 8 }} />
        <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40))} placeholder="slug-url" style={{ width: '100%', padding: 10, background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 8, color: 'inherit', fontFamily: 'monospace', fontSize: 13 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: '#a1a1aa', padding: '8px 12px', cursor: 'pointer' }}>Annuler</button>
          <button onClick={onCreate} disabled={creating || !name.trim()} style={{ background: '#d946ef', color: 'white', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: creating ? 'wait' : 'pointer', opacity: creating ? 0.5 : 1 }}>
            {creating ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}
