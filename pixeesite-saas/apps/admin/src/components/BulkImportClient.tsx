'use client';
import { useState } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors } from '@/lib/design-tokens';

const ENTITIES = [
  { value: 'products', label: 'Produits', required: ['name', 'priceCents'], optional: ['slug', 'description', 'currency', 'inventory', 'category'] },
  { value: 'articles', label: 'Articles', required: ['title'], optional: ['slug', 'excerpt', 'bodyHtml', 'coverImage', 'status', 'tags'] },
  { value: 'leads', label: 'Leads / Contacts', required: ['email'], optional: ['firstName', 'lastName', 'phone', 'city', 'country', 'source', 'tags'] },
  { value: 'events', label: 'Événements', required: ['title', 'startsAt'], optional: ['description', 'endsAt', 'location', 'category', 'tags'] },
];

function parseCSV(text: string): Record<string, any>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  const headers = splitLine(lines[0]);
  const rows: Record<string, any>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Record<string, any> = {};
    headers.forEach((h, idx) => { row[h.trim()] = cells[idx]?.trim() || ''; });
    rows.push(row);
  }
  return rows;
}
function splitLine(s: string): string[] {
  const out: string[] = []; let cur = ''; let inQ = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === ',' && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

export function BulkImportClient({ orgSlug }: { orgSlug: string }) {
  const [entity, setEntity] = useState('leads');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const meta = ENTITIES.find((e) => e.value === entity)!;

  function parse() {
    setResult(null);
    try {
      const trimmed = text.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const j = JSON.parse(trimmed);
        setRows(Array.isArray(j) ? j : [j]);
      } else {
        setRows(parseCSV(trimmed));
      }
    } catch (e: any) {
      alert('Parse error: ' + e.message);
      setRows([]);
    }
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result || '')); };
    reader.readAsText(file);
  }

  async function run(dryRun: boolean) {
    if (rows.length === 0) { alert('Aucune ligne — parse d\'abord'); return; }
    setBusy(true); setResult(null);
    const r = await fetch(`/api/orgs/${orgSlug}/bulk-import`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity, rows, dryRun }),
    });
    const j = await r.json();
    setBusy(false);
    setResult(j);
  }

  return (
    <SimpleOrgPage
      orgSlug={orgSlug} emoji="📥" title="Import en masse"
      desc="CSV ou JSON → produits, articles, leads, événements. Dry-run avant insertion."
    >
      <section style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={lbl}>Entité cible</label>
            <select style={input} value={entity} onChange={(e) => { setEntity(e.target.value); setResult(null); }}>
              {ENTITIES.map((en) => <option key={en.value} value={en.value}>{en.label}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Fichier (.csv ou .json)</label>
            <input type="file" accept=".csv,.json,.tsv,.txt" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} style={input} />
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 8 }}>
          Champs requis: <code style={{ color: colors.warning }}>{meta.required.join(', ')}</code>
          {meta.optional.length > 0 && <> · optionnels: <code style={{ opacity: 0.7 }}>{meta.optional.join(', ')}</code></>}
        </div>
      </section>

      <section style={{ ...card, marginBottom: 16 }}>
        <label style={lbl}>Données (CSV ou JSON)</label>
        <textarea style={{ ...input, minHeight: 200, fontFamily: 'monospace' }}
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder={`email,firstName,country\njohn@x.com,John,FR\n…`} />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={btnSecondary} onClick={parse}>Parser ({rows.length} lignes)</button>
          <button style={btnSecondary} onClick={() => run(true)} disabled={busy || rows.length === 0}>Dry-run (validation)</button>
          <button style={btnPrimary} onClick={() => run(false)} disabled={busy || rows.length === 0}>
            {busy ? '…' : `Importer ${rows.length} ligne${rows.length > 1 ? 's' : ''}`}
          </button>
        </div>
      </section>

      {rows.length > 0 && (
        <section style={{ ...card, marginBottom: 16, maxHeight: 300, overflow: 'auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Preview (5 premières)</div>
          <pre style={{ fontSize: 11, lineHeight: 1.4, margin: 0 }}>
            {JSON.stringify(rows.slice(0, 5), null, 2)}
          </pre>
        </section>
      )}

      {result && (
        <section style={{ ...card, background: result.ok ? '#10b98111' : '#ef444411', border: `1px solid ${result.ok ? '#10b98155' : '#ef444455'}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            {result.dryRun ? '🧪 Dry-run' : '✓ Import terminé'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginBottom: 8 }}>
            <Stat label="Total" value={result.total} />
            <Stat label="Valides" value={result.valid} color={colors.success} />
            {!result.dryRun && <Stat label="Insérés" value={result.inserted} color={colors.primary} />}
            <Stat label="Erreurs" value={result.errors?.length || 0} color={result.errors?.length ? '#ef4444' : '#71717a'} />
          </div>
          {result.errors?.length > 0 && (
            <details>
              <summary style={{ fontSize: 12, cursor: 'pointer' }}>Voir les erreurs ({result.errors.length})</summary>
              <ul style={{ fontSize: 11, marginTop: 8 }}>
                {result.errors.slice(0, 20).map((e: any, i: number) => (
                  <li key={i}>Ligne {e.row}: {e.reason}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}
    </SimpleOrgPage>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return <div style={{ ...card, padding: 10 }}>
    <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 800, color: color || 'inherit' }}>{value}</div>
  </div>;
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: 4 };
