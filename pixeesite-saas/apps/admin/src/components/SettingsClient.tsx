'use client';
import { useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary } from './SimpleOrgPage';

export function SettingsClient({ orgSlug, role, org }: { orgSlug: string; role: string; org: any }) {
  const [name, setName] = useState(org.name);
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor || '#d946ef');
  const [font, setFont] = useState(org.font || 'Inter');
  const [logoUrl, setLogoUrl] = useState(org.logoUrl || '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  async function save() {
    setSaving(true);
    const r = await fetch(`/api/orgs/${orgSlug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, primaryColor, font, logoUrl }),
    });
    if (r.ok) setSavedAt(new Date());
    else alert('Erreur sauvegarde');
    setSaving(false);
  }

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="⚙" title="Paramètres" desc="Branding + plan + infos org">
      <div style={{ display: 'grid', gap: 16 }}>
        <section style={card}>
          <h3 style={{ marginTop: 0 }}>🏷 Identité</h3>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Nom de l'organisation</span>
            <input style={input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ display: 'block', fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Logo (URL)</span>
            <input style={input} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
            {logoUrl && <img src={logoUrl} alt="" style={{ height: 60, marginTop: 8, borderRadius: 8 }} />}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              <span style={{ display: 'block', fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Couleur primaire</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 50, height: 38, border: 0, background: 'transparent', cursor: 'pointer' }} />
                <input style={{ ...input, fontFamily: 'monospace' }} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
              </div>
            </label>
            <label>
              <span style={{ display: 'block', fontSize: 11, opacity: 0.5, marginBottom: 4 }}>Font</span>
              <select value={font} onChange={(e) => setFont(e.target.value)} style={input}>
                <option value="Inter">Inter</option>
                <option value="Playfair Display">Playfair Display</option>
                <option value="Roboto">Roboto</option>
                <option value="Poppins">Poppins</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Helvetica Neue">Helvetica Neue</option>
              </select>
            </label>
          </div>
          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button style={{ ...btnPrimary, opacity: saving ? 0.5 : 1 }} onClick={save} disabled={saving}>
              {saving ? 'Sauvegarde…' : 'Enregistrer'}
            </button>
            {savedAt && <span style={{ color: '#10b981', fontSize: 13 }}>✓ Enregistré {savedAt.toLocaleTimeString('fr-FR')}</span>}
          </div>
        </section>

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>💎 Plan</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 24, padding: '6px 14px', background: '#27272a', borderRadius: 999, fontWeight: 700 }}>{org.plan?.toUpperCase()}</span>
            <span style={{ opacity: 0.6 }}>{org.planStatus}</span>
            {org.trialEndsAt && <span style={{ opacity: 0.6, fontSize: 12 }}>Trial → {new Date(org.trialEndsAt).toLocaleDateString('fr-FR')}</span>}
          </div>
          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.7 }}>
            Crédits IA utilisés : <strong>{org.usedAiCredits || 0} / {org.maxAiCredits}</strong>
          </div>
          <a href={`/dashboard/orgs/${orgSlug}/billing`} style={{ display: 'inline-block', marginTop: 12, color: '#06b6d4', textDecoration: 'none', fontSize: 13 }}>→ Gérer la facturation</a>
        </section>

        <section style={card}>
          <h3 style={{ marginTop: 0 }}>🌐 Domaines</h3>
          <p style={{ fontSize: 13, opacity: 0.6 }}>Domaine par défaut :</p>
          <code style={{ background: '#0a0a0f', padding: '6px 10px', borderRadius: 6, fontSize: 13 }}>{org.defaultDomain}</code>
          <p style={{ fontSize: 12, opacity: 0.5, marginTop: 12 }}>Les domaines custom (mon-domaine.com) seront disponibles à partir du plan Solo.</p>
        </section>

        <section style={{ ...card, borderColor: '#7f1d1d' }}>
          <h3 style={{ marginTop: 0, color: '#f87171' }}>⚠ Zone dangereuse</h3>
          <p style={{ fontSize: 13, opacity: 0.7 }}>Supprimer l'organisation efface tous les sites + DB tenant + assets. Irréversible.</p>
          <button style={{ background: '#7f1d1d', color: 'white', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }} onClick={() => alert('Désactivé pour l\'instant — contacte support@pixeesite.com')}>
            Supprimer l'organisation
          </button>
        </section>
      </div>
    </SimpleOrgPage>
  );
}
