'use client';
/**
 * LegalAssistantClient — Analyse de contrats + Génération CGU/CGV/RGPD/Cookies.
 * Port faithful de GLD/src/components/admin/LegalAdmin.tsx, adapté Pixeesite multi-tenant.
 */
import { useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

type Tab = 'analyze' | 'generate';

export function LegalAssistantClient({ orgSlug }: { orgSlug: string }) {
  const [tab, setTab] = useState<Tab>('analyze');
  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="⚖️" title="Assistant juridique FR" desc="Analyse de contrats + génération CGU / CGV / RGPD / Cookies / Mentions légales.">
      <nav style={{ ...card, display: 'flex', gap: 8, marginBottom: 16, padding: 8 }}>
        <TabBtn active={tab === 'analyze'} onClick={() => setTab('analyze')} label="🔍 Analyser un document" />
        <TabBtn active={tab === 'generate'} onClick={() => setTab('generate')} label="📝 Générer un document légal" />
      </nav>
      {tab === 'analyze' ? <AnalyzeView orgSlug={orgSlug} /> : <GenerateView orgSlug={orgSlug} />}
    </SimpleOrgPage>
  );
}

/* ---- Analyse ---- */
function AnalyzeView({ orgSlug }: { orgSlug: string }) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState('contract');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (text.trim().length < 50) { setError('Texte trop court (min 50 chars)'); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/legal/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, kind }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setResult(j);
    } finally { setBusy(false); }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      setError('PDFs : copie/colle le texte ici pour l\'instant (extraction PDF auto à venir)');
      return;
    }
    const t = await file.text();
    setText(t);
  }

  return (
    <div style={{ ...card, padding: 20 }}>
      <h3 style={{ marginTop: 0 }}>Analyse d'un document légal</h3>
      <Field label="Type de document">
        <select value={kind} onChange={(e) => setKind(e.target.value)} style={input}>
          <option value="contract">Contrat (générique)</option>
          <option value="cgu">CGU</option>
          <option value="cgv">CGV</option>
          <option value="rgpd">Politique RGPD</option>
          <option value="cookies">Politique Cookies</option>
          <option value="nda">NDA / Accord de confidentialité</option>
          <option value="employment">Contrat de travail</option>
        </select>
      </Field>
      <Field label="Coller le texte du document">
        <textarea style={{ ...input, minHeight: 220, fontFamily: 'inherit' }} value={text} onChange={(e) => setText(e.target.value)} placeholder="Colle ici le texte complet à analyser…" />
      </Field>
      <div style={{ marginBottom: 12 }}>
        <input type="file" accept=".txt,.md,.html" onChange={onFileChange} />
        <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>(.txt, .md, .html — pour PDF: copie/colle le texte)</span>
      </div>
      <button style={btnPrimary} disabled={busy} onClick={run}>{busy ? '⏳ Analyse en cours…' : '🔍 Analyser'}</button>
      {error && <div style={{ ...card, padding: 10, color: colors.danger, marginTop: 12 }}>{error}</div>}

      {result?.analysis && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Résumé</h4>
          <div style={{ ...card, padding: 12, marginBottom: 12 }}>{result.analysis.summary || '—'}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ ...card, padding: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase' }}>Type détecté</div>
              <div style={{ fontWeight: 700 }}>{result.analysis.documentType || '—'}</div>
            </div>
            <div style={{ ...card, padding: 12 }}>
              <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase' }}>Parties</div>
              <div style={{ fontWeight: 700 }}>{(result.analysis.parties || []).join(', ') || '—'}</div>
            </div>
          </div>

          {result.analysis.clauses?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 8px' }}>Clauses ({result.analysis.clauses.length})</h4>
              <div style={{ display: 'grid', gap: 8 }}>
                {result.analysis.clauses.map((c: any, i: number) => (
                  <div key={i} style={{ ...card, padding: 12, borderLeft: `3px solid ${riskColor(c.risk)}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <strong>{c.title}</strong>
                      <span style={pill(riskColor(c.risk))}>{c.risk}</span>
                    </div>
                    <div style={{ fontSize: 13, opacity: 0.85 }}>{c.summary}</div>
                    {c.rationale && <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>↳ {c.rationale}</div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {result.analysis.missingClauses?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 8px' }}>Clauses manquantes recommandées</h4>
              <ul style={{ ...card, padding: '12px 28px', margin: 0 }}>{result.analysis.missingClauses.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
            </>
          )}

          {result.analysis.gdprIssues?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 8px' }}>Problèmes RGPD</h4>
              <ul style={{ ...card, padding: '12px 28px', margin: 0, borderLeft: `3px solid ${colors.warning}` }}>{result.analysis.gdprIssues.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
            </>
          )}

          {result.analysis.recommendations?.length > 0 && (
            <>
              <h4 style={{ margin: '12px 0 8px' }}>Recommandations</h4>
              <ul style={{ ...card, padding: '12px 28px', margin: 0, borderLeft: `3px solid ${colors.success}` }}>{result.analysis.recommendations.map((m: string, i: number) => <li key={i}>{m}</li>)}</ul>
            </>
          )}

          <div style={{ fontSize: 11, opacity: 0.5, marginTop: 8 }}>via {result.provider}/{result.model}</div>
        </div>
      )}

      {result && !result.analysis && (
        <div style={{ ...card, padding: 12, marginTop: 12 }}>
          <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4 }}>JSON non parsable — output brut :</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{result.raw}</pre>
        </div>
      )}
    </div>
  );
}

/* ---- Generate ---- */
function GenerateView({ orgSlug }: { orgSlug: string }) {
  const [type, setType] = useState('cgu');
  const [info, setInfo] = useState({
    legalName: '', siret: '', address: '', country: 'France',
    email: '', website: '', sector: '', dataCategories: '',
  });
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!info.legalName.trim()) { setError('Raison sociale requise'); return; }
    setBusy(true); setError(null); setOutput(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/legal/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, companyInfo: info }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setOutput(j.text);
    } finally { setBusy(false); }
  }

  function download() {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-${(info.legalName || 'doc').replace(/\W+/g, '-')}.md`;
    a.click(); URL.revokeObjectURL(url);
  }

  function copyToClipboard() {
    if (output) navigator.clipboard.writeText(output);
  }

  return (
    <div style={{ ...card, padding: 20 }}>
      <h3 style={{ marginTop: 0 }}>Génère un document juridique</h3>
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)} style={input}>
          <option value="cgu">CGU — Conditions Générales d'Utilisation</option>
          <option value="cgv">CGV — Conditions Générales de Vente</option>
          <option value="rgpd">Politique de Confidentialité (RGPD)</option>
          <option value="cookies">Politique Cookies + Bandeau</option>
          <option value="mentions">Mentions Légales</option>
        </select>
      </Field>

      <h4 style={{ margin: '12px 0 8px' }}>Informations entreprise</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Raison sociale *"><input style={input} value={info.legalName} onChange={(e) => setInfo({ ...info, legalName: e.target.value })} /></Field>
        <Field label="SIRET"><input style={input} value={info.siret} onChange={(e) => setInfo({ ...info, siret: e.target.value })} /></Field>
        <Field label="Adresse"><input style={input} value={info.address} onChange={(e) => setInfo({ ...info, address: e.target.value })} /></Field>
        <Field label="Pays"><input style={input} value={info.country} onChange={(e) => setInfo({ ...info, country: e.target.value })} /></Field>
        <Field label="Email contact"><input style={input} type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></Field>
        <Field label="Site web"><input style={input} value={info.website} onChange={(e) => setInfo({ ...info, website: e.target.value })} placeholder="https://…" /></Field>
        <Field label="Secteur d'activité"><input style={input} value={info.sector} onChange={(e) => setInfo({ ...info, sector: e.target.value })} placeholder="Ex: e-commerce, formation…" /></Field>
        <Field label="Catégories de données (pour RGPD)"><input style={input} value={info.dataCategories} onChange={(e) => setInfo({ ...info, dataCategories: e.target.value })} placeholder="Ex: nom, email, CB, géoloc…" /></Field>
      </div>

      <button style={btnPrimary} disabled={busy} onClick={run}>{busy ? '⏳ Génération…' : '⚡ Générer'}</button>
      {error && <div style={{ ...card, padding: 10, color: colors.danger, marginTop: 12 }}>{error}</div>}

      {output && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button style={btnSecondary} onClick={copyToClipboard}>📋 Copier</button>
            <button style={btnSecondary} onClick={download}>💾 Télécharger .md</button>
          </div>
          <div style={{ ...card, padding: 16, fontFamily: 'inherit', whiteSpace: 'pre-wrap', maxHeight: 600, overflow: 'auto' }}>
            {output}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- helpers ---- */
function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
      border: active ? `1px solid ${colors.primary}` : `1px solid transparent`,
      background: active ? `${colors.primary}22` : 'transparent', color: 'inherit',
    }}>{label}</button>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return <label style={{ display: 'block', marginBottom: 12 }}><div style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>{children}</label>;
}
function pill(c: string): React.CSSProperties {
  return { background: `${c}22`, color: c, padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' };
}
function riskColor(r: string): string {
  if (r === 'high') return colors.danger;
  if (r === 'medium') return colors.warning;
  if (r === 'low') return colors.success;
  return colors.textMuted;
}
