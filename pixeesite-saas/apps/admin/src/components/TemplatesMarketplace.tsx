'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Template {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  thumbnailUrl: string | null;
  free: boolean;
  priceCents: number;
  installCount: number;
}

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {
  photo: { emoji: '📸', label: 'Photo' },
  restaurant: { emoji: '🍽', label: 'Restaurant' },
  saas: { emoji: '💻', label: 'SaaS' },
  asso: { emoji: '🤝', label: 'Asso' },
  podcast: { emoji: '🎙', label: 'Podcast' },
  course: { emoji: '🎓', label: 'Cours' },
  agency: { emoji: '🎨', label: 'Agence' },
  ecommerce: { emoji: '🛒', label: 'E-commerce' },
  'real-estate': { emoji: '🏠', label: 'Immobilier' },
  'link-in-bio': { emoji: '🔗', label: 'Link in bio' },
  blog: { emoji: '📝', label: 'Blog' },
};

export function TemplatesMarketplace({ orgSlug }: { orgSlug: string }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | 'all'>('all');
  const [search, setSearch] = useState('');
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('category', filter);
    if (search) params.set('search', search);
    fetch(`/api/templates?${params}`)
      .then((r) => r.json())
      .then((j) => {
        setTemplates(j.templates || []);
        setCategories(j.categories || []);
      })
      .finally(() => setLoading(false));
  }, [filter, search]);

  async function useTemplate(t: Template) {
    const name = prompt(`Nom de ton site basé sur "${t.name}" ?`, t.name);
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setInstalling(t.id);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, templateId: t.id }),
      });
      const j = await r.json();
      if (j.ok) {
        router.push(`/dashboard/orgs/${orgSlug}/sites/${j.site.slug}`);
      } else {
        alert('Erreur : ' + (j.error || 'unknown'));
        setInstalling(null);
      }
    } catch (e: any) {
      alert(e.message);
      setInstalling(null);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>✨ Marketplace de templates</h1>
        <p style={{ opacity: 0.6, margin: '4px 0 0' }}>Démarre ton site en quelques clics avec un template prêt-à-l'emploi.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher…"
          style={{ flex: 1, minWidth: 200, maxWidth: 280, padding: '8px 12px', background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: 'inherit' }}
        />
        <button onClick={() => setFilter('all')} style={pillStyle(filter === 'all')}>Tout ({templates.length})</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} style={pillStyle(filter === c)}>
            {CATEGORY_META[c]?.emoji || '📦'} {CATEGORY_META[c]?.label || c}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>Chargement…</p>
      ) : templates.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 48, opacity: 0.5 }}>Aucun template ne correspond.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {templates.map((t) => (
            <article key={t.id} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {t.thumbnailUrl && (
                <div style={{ aspectRatio: '16/10', overflow: 'hidden', background: '#27272a' }}>
                  <img src={t.thumbnailUrl} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#27272a', textTransform: 'uppercase' }}>{CATEGORY_META[t.category]?.emoji} {CATEGORY_META[t.category]?.label || t.category}</span>
                  {t.free ? (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#10b98122', color: '#10b981', fontWeight: 600 }}>GRATUIT</span>
                  ) : (
                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fbbf2422', color: '#fbbf24', fontWeight: 600 }}>{(t.priceCents / 100).toFixed(0)} €</span>
                  )}
                </div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{t.name}</h3>
                {t.description && <p style={{ fontSize: 12, opacity: 0.6, margin: '6px 0 12px', flex: 1 }}>{t.description}</p>}
                <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 12 }}>{t.installCount} installations</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setPreviewing(t)}
                    style={{ flex: 1, background: '#27272a', border: 0, color: 'inherit', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                  >👁 Voir</button>
                  <button
                    onClick={() => useTemplate(t)}
                    disabled={installing === t.id}
                    style={{ flex: 2, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', border: 0, color: 'white', padding: '8px 12px', borderRadius: 6, cursor: installing === t.id ? 'wait' : 'pointer', fontSize: 13, fontWeight: 600, opacity: installing === t.id ? 0.5 : 1 }}
                  >{installing === t.id ? 'Installation…' : '✨ Utiliser'}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Preview modal */}
      {previewing && (
        <div onClick={() => setPreviewing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 16, maxWidth: 900, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            {previewing.thumbnailUrl && <img src={previewing.thumbnailUrl} alt={previewing.name} style={{ width: '100%' }} />}
            <div style={{ padding: 24 }}>
              <h2 style={{ marginTop: 0 }}>{previewing.name}</h2>
              <p style={{ opacity: 0.7 }}>{previewing.description}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setPreviewing(null)} style={{ background: '#27272a', border: 0, color: 'inherit', padding: '12px 20px', borderRadius: 8, cursor: 'pointer' }}>Fermer</button>
                <button onClick={() => { setPreviewing(null); useTemplate(previewing); }} style={{ flex: 1, background: 'linear-gradient(135deg, #d946ef, #06b6d4)', border: 0, color: 'white', padding: '12px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>✨ Utiliser ce template</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#d946ef' : '#27272a',
    color: active ? 'white' : 'inherit',
    border: 0, padding: '8px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };
}
