'use client';
/**
 * DocViewer — explore un document RAG en détail.
 *
 * Affiche : metadata, contenu source brut, et pour chaque chunk son texte +
 * stats embedding (dim, norme) + heatmap visuelle des 256 premières dims du
 * vecteur (signe → couleur, magnitude → opacité).
 *
 * Rationale : visualiser un embedding 768D est impossible, mais une heatmap
 * 16x16 des 256 premières dims donne une "empreinte" visuelle reconnaissable.
 * Deux chunks sémantiquement proches auront des heatmaps qui se ressemblent.
 */
import { useEffect, useState } from 'react';

type Doc = {
  id: string;
  title: string;
  source: string | null;
  sourceType: string;
  author: string | null;
  tags: string[];
  locale: string;
  enabled: boolean;
  contentLength: number;
  contentPreview: string;
  createdAt: string;
  chunkCount: number;
};

type Chunk = {
  id: string;
  position: number;
  text: string;
  tokens: number;
  embeddingDim: number;
  embeddingNorm: number;
  embeddingPreview: number[];
  embeddingStart: number[];
  embeddingEnd: number[];
  createdAt: string;
};

export function DocViewer({ docId }: { docId: string }) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openChunk, setOpenChunk] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/knowledge/${docId}/chunks`)
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else { setDoc(j.doc); setChunks(j.chunks); }
      })
      .catch((e) => setError(e?.message || 'fetch KO'))
      .finally(() => setLoading(false));
  }, [docId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="text-center">
          <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-zinc-700 border-t-violet-500" />
          <p className="text-sm">Chargement du document…</p>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        <div className="text-center">
          <p className="mb-3 text-rose-400">{error || 'Doc introuvable'}</p>
          <a href="/admin/ai/knowledge" className="text-sm text-violet-400 hover:underline">← Bibliothèque</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <a href="/admin/ai/knowledge" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← Bibliothèque
            </a>
            <h1 className="mt-1 text-2xl font-bold text-white">{doc.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge color={doc.enabled ? 'emerald' : 'zinc'}>{doc.enabled ? 'Actif' : 'Désactivé'}</Badge>
              <Badge color="violet">{doc.sourceType}</Badge>
              <Badge color="sky">{doc.locale}</Badge>
              <span className="text-zinc-400">{doc.chunkCount} chunks</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-400">{doc.contentLength.toLocaleString()} car.</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-400">{new Date(doc.createdAt).toLocaleString()}</span>
            </div>
            {doc.source && (
              <a href={doc.source} target="_blank" rel="noopener noreferrer"
                 className="mt-1 block truncate text-xs text-violet-400 hover:underline">
                {doc.source}
              </a>
            )}
          </div>
          <div className="flex gap-2">
            <a href={`/admin/ai/knowledge/playground?docId=${docId}`}
               className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500">
              💬 Tester
            </a>
          </div>
        </header>

        {/* TAGS */}
        {doc.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {doc.tags.map((t) => (
              <span key={t} className="rounded-full bg-violet-900/40 px-2 py-0.5 text-xs text-violet-300 ring-1 ring-violet-700/50">
                #{t}
              </span>
            ))}
          </div>
        )}

        {/* Contenu source */}
        <details className="mb-6 rounded-2xl bg-zinc-900 p-4 ring-1 ring-zinc-800">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-300">
            📄 Contenu source ({doc.contentLength.toLocaleString()} caractères)
          </summary>
          <div className="mt-3 max-h-96 overflow-auto rounded bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300">
            {doc.contentPreview}
            {doc.contentLength > doc.contentPreview.length && (
              <div className="mt-2 text-zinc-500">… [contenu tronqué après 2000 car.]</div>
            )}
          </div>
        </details>

        {/* Chunks */}
        <h2 className="mb-3 text-lg font-bold text-zinc-100">
          🧩 Chunks indexés <span className="text-sm font-normal text-zinc-500">({chunks.length})</span>
        </h2>

        {chunks.length === 0 ? (
          <div className="rounded-xl bg-amber-950/30 p-4 text-sm text-amber-300 ring-1 ring-amber-800">
            ⚠ Aucun chunk indexé pour ce document. Ré-ingère-le ou vérifie les logs.
          </div>
        ) : (
          <div className="space-y-3">
            {chunks.map((c) => (
              <ChunkCard key={c.id} chunk={c} open={openChunk === c.id} onToggle={() =>
                setOpenChunk(openChunk === c.id ? null : c.id)
              } />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── CHUNK CARD ───────────────────────────────────────────────── */

function ChunkCard({ chunk, open, onToggle }: { chunk: Chunk; open: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-violet-700/50">
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-4 text-left">
        <div className="flex-1 overflow-hidden">
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="rounded bg-violet-900/40 px-1.5 py-0.5 font-mono text-violet-300">
              #{chunk.position}
            </span>
            <span className="text-zinc-500">{chunk.tokens} tokens</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500">dim {chunk.embeddingDim}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500">‖v‖ = {chunk.embeddingNorm}</span>
          </div>
          <p className="line-clamp-2 text-sm text-zinc-300">{chunk.text}</p>
        </div>
        <span className="flex-shrink-0 text-zinc-500">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800 p-4">
          {/* Texte complet */}
          <div className="mb-4">
            <Label>📝 Texte complet</Label>
            <div className="mt-1 max-h-64 overflow-auto rounded bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-300">
              {chunk.text}
            </div>
          </div>

          {/* Stats embedding */}
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            <Stat label="Dimension" value={`${chunk.embeddingDim}D`} />
            <Stat label="Norme L2" value={chunk.embeddingNorm.toFixed(4)} />
            <Stat label="Tokens" value={chunk.tokens} />
          </div>

          {/* Heatmap empreinte */}
          <div className="mb-4">
            <Label>🌈 Empreinte du vecteur (256 premières dimensions)</Label>
            <div className="mt-2 rounded bg-zinc-950 p-3">
              <EmbeddingHeatmap values={chunk.embeddingPreview} />
              <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-3 bg-blue-500" />→ valeurs négatives
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-3 bg-rose-500" />→ valeurs positives
                </span>
                <span>Opacité ∝ |valeur|</span>
              </div>
            </div>
          </div>

          {/* Floats bruts (début/fin) */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>🔢 8 premières dims</Label>
              <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 font-mono text-[10px] text-emerald-400">
                {JSON.stringify(chunk.embeddingStart)}
              </pre>
            </div>
            <div>
              <Label>🔢 8 dernières dims</Label>
              <pre className="mt-1 overflow-x-auto rounded bg-zinc-950 p-2 font-mono text-[10px] text-emerald-400">
                {JSON.stringify(chunk.embeddingEnd)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── HEATMAP EMBEDDING ────────────────────────────────────────── */

function EmbeddingHeatmap({ values }: { values: number[] }) {
  // Trouve max abs pour normaliser opacité
  const maxAbs = Math.max(...values.map(Math.abs), 1e-9);
  const cols = 32;
  const rows = Math.ceil(values.length / cols);
  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {values.map((v, i) => {
        const intensity = Math.abs(v) / maxAbs;
        const color = v >= 0 ? '244,63,94' : '59,130,246'; // rose / blue
        return (
          <div
            key={i}
            title={`d${i}: ${v.toFixed(4)}`}
            className="aspect-square rounded-sm"
            style={{ background: `rgba(${color}, ${0.15 + intensity * 0.85})` }}
          />
        );
      })}
    </div>
  );
}

/* ─── PRIMITIVES ───────────────────────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{children}</div>;
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded bg-zinc-950 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold text-zinc-100">{value}</div>
    </div>
  );
}

function Badge({ color, children }: { color: 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'zinc'; children: React.ReactNode }) {
  const cls = {
    emerald: 'bg-emerald-900/40 text-emerald-300 ring-emerald-700/50',
    rose: 'bg-rose-900/40 text-rose-300 ring-rose-700/50',
    amber: 'bg-amber-900/40 text-amber-300 ring-amber-700/50',
    violet: 'bg-violet-900/40 text-violet-300 ring-violet-700/50',
    sky: 'bg-sky-900/40 text-sky-300 ring-sky-700/50',
    zinc: 'bg-zinc-800 text-zinc-300 ring-zinc-700',
  }[color];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${cls}`}>{children}</span>;
}
