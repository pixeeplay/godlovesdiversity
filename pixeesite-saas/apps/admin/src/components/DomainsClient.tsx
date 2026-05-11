'use client';
import { useEffect, useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';

export function DomainsClient({ orgSlug }: { orgSlug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [domain, setDomain] = useState('');
  const [info, setInfo] = useState<any>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`/api/orgs/${orgSlug}/domains`);
    const j = await r.json();
    setItems(j.domains || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const r = await fetch(`/api/orgs/${orgSlug}/domains`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    const j = await r.json();
    if (r.ok) {
      setInfo(j);
      setDomain('');
      load();
    } else {
      alert(j.error || 'Erreur');
    }
  }

  async function verify(id: string) {
    await fetch(`/api/orgs/${orgSlug}/domains?id=${id}`, { method: 'PATCH' });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Retirer ce domaine ?')) return;
    await fetch(`/api/orgs/${orgSlug}/domains?id=${id}`, { method: 'DELETE' });
    load();
  }

  const newButton = (
    <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Domaine</button>
  );
  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="🌐" title="Domaines"
      desc="Connecte ton propre nom de domaine (avec SSL automatique)"
      actions={newButton}
    >
      {loading ? <p style={{ opacity: 0.5 }}>Chargement…</p> : items.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌐</div>
          <p style={{ opacity: 0.6, margin: '0 0 16px' }}>Aucun domaine personnalisé.</p>
          <button style={btnPrimary} onClick={() => setShowNew(true)}>+ Ajouter mon-domaine.com</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {items.map((d) => (
            <article key={d.id} style={{ ...card, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {d.domain}
                  {d.verified ? (
                    <span style={{ fontSize: 11, padding: '2px 6px', background: '#10b98133', color: '#10b981', borderRadius: 4 }}>✓ Vérifié</span>
                  ) : (
                    <span style={{ fontSize: 11, padding: '2px 6px', background: '#f59e0b33', color: '#f59e0b', borderRadius: 4 }}>⏳ En attente</span>
                  )}
                  {d.certIssued && <span style={{ fontSize: 11, padding: '2px 6px', background: '#3b82f633', color: '#3b82f6', borderRadius: 4 }}>🔒 SSL</span>}
                </div>
                {d.lastError && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{d.lastError}</div>}
              </div>
              {!d.verified && <button style={btnSecondary} onClick={() => verify(d.id)}>Vérifier</button>}
              <button onClick={() => remove(d.id)} style={{ background: 'transparent', color: '#ef4444', border: 0, cursor: 'pointer', fontSize: 14 }}>×</button>
            </article>
          ))}
        </div>
      )}

      {showNew && (
        <div onClick={() => { setShowNew(false); setInfo(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, maxWidth: 560, width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Connecter un domaine</h3>
            {!info ? (
              <>
                <label style={{ display: 'block', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Domaine</div>
                  <input style={input} placeholder="mon-domaine.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button style={btnSecondary} onClick={() => setShowNew(false)}>Annuler</button>
                  <button style={btnPrimary} onClick={add}>Configurer</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, opacity: 0.7 }}>
                  Configure ces records DNS chez ton registrar (OVH, Gandi, Cloudflare…) :
                </p>
                <div style={{ ...card, padding: 12, marginBottom: 12, background: '#0a0a0f' }}>
                  <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>CNAME</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    {info.instructions.cname.name} → {info.instructions.cname.value}
                  </div>
                </div>
                <div style={{ ...card, padding: 12, marginBottom: 12, background: '#0a0a0f' }}>
                  <div style={{ fontSize: 11, opacity: 0.5, textTransform: 'uppercase' }}>TXT (vérification)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                    {info.instructions.txt.name}<br/>{info.instructions.txt.value}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button style={btnPrimary} onClick={() => { setShowNew(false); setInfo(null); }}>Compris</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </SimpleOrgPage>
  );
}
