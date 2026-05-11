'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const TYPE_EMOJI: Record<string, string> = {
  page: '📄', article: '📝', product: '🛒', lead: '🎯', thread: '💬', task: '📋',
};

export function MegaSearch({ orgSlug }: { orgSlug?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open || !orgSlug || q.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const r = await fetch(`/api/orgs/${orgSlug}/search?q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setResults(j.results || []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open, orgSlug]);

  if (!orgSlug) return null;

  return (
    <>
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          background: '#0a0a0f', border: '1px solid #3f3f46', borderRadius: 10,
          padding: '10px 16px', color: '#a1a1aa', cursor: 'pointer', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          transition: 'border-color .15s, background .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#d946ef'; e.currentTarget.style.background = '#18181b'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.background = '#0a0a0f'; }}
      >
        <span style={{ fontSize: 16 }}>🔍</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Rechercher : page, lieu, événement, paramètre…</span>
        <kbd style={{ background: '#27272a', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontFamily: 'monospace' }}>⌘K</kbd>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100, padding: '10vh 16px 16px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 12, width: '100%', maxWidth: 600, overflow: 'hidden' }}>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Recherche pages, articles, produits, leads, tâches…"
              style={{ width: '100%', padding: '16px 20px', background: 'transparent', border: 0, color: 'inherit', fontSize: 16, outline: 'none', borderBottom: '1px solid #27272a' }} />
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {loading && <div style={{ padding: 16, opacity: 0.5, fontSize: 13 }}>⏳ Recherche…</div>}
              {!loading && q.length >= 2 && results.length === 0 && (
                <div style={{ padding: 16, opacity: 0.5, fontSize: 13 }}>Aucun résultat pour "{q}"</div>
              )}
              {results.map((r, i) => (
                <button key={i}
                  onClick={() => { router.push(r.href); setOpen(false); setQ(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 16px', background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#27272a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 18 }}>{TYPE_EMOJI[r.type] || '·'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{r.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>{r.type}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
