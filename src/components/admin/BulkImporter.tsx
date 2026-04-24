'use client';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import dynamic from 'next/dynamic';
import { UploadCloud, Loader2, CheckCircle2, MapPin, AlertCircle, Image as ImageIcon } from 'lucide-react';

const WorldMap = dynamic(() => import('./WorldMap').then((m) => m.WorldMap), { ssr: false });

type Result = {
  ok: boolean;
  filename: string;
  id?: string;
  gps?: { lat: number; lon: number } | null;
  location?: { city?: string; country?: string; placeType?: string } | null;
  error?: string;
};

const PLACE_TYPES = [
  { v: 'CHURCH', l: '⛪ Église' },
  { v: 'MOSQUE', l: '🕌 Mosquée' },
  { v: 'SYNAGOGUE', l: '✡️ Synagogue' },
  { v: 'TEMPLE', l: '🛕 Temple' },
  { v: 'PUBLIC_SPACE', l: '🌆 Espace public' },
  { v: 'OTHER', l: 'Autre' }
];

export function BulkImporter() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    multiple: true,
    onDrop: (newFiles) => {
      setFiles((prev) => [...prev, ...newFiles]);
      const newPreviews: Record<string, string> = {};
      for (const f of newFiles) newPreviews[f.name] = URL.createObjectURL(f);
      setPreviews((p) => ({ ...p, ...newPreviews }));
    }
  });

  function removeFile(name: string) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  async function uploadAll() {
    if (!files.length) return;
    setBusy(true); setResults([]);
    setProgress({ done: 0, total: files.length });

    // Envoi par lots de 10 pour éviter timeouts + retours intermédiaires
    const BATCH = 10;
    const all: Result[] = [];
    for (let i = 0; i < files.length; i += BATCH) {
      const batch = files.slice(i, i + BATCH);
      const fd = new FormData();
      for (const f of batch) fd.append('files', f);
      if (autoApprove) fd.append('autoApprove', '1');
      if (defaultCountry) fd.append('defaultCountry', defaultCountry);

      try {
        const r = await fetch('/api/admin/photos/bulk', { method: 'POST', body: fd });
        const j = await r.json();
        all.push(...(j.results || []));
        setResults([...all]);
      } catch (e: any) {
        for (const f of batch) all.push({ ok: false, filename: f.name, error: e.message });
        setResults([...all]);
      }
      setProgress({ done: Math.min(i + BATCH, files.length), total: files.length });
    }
    setBusy(false);
    setFiles([]); // vide la file après upload
  }

  const geoMarkers = results
    .filter((r) => r.gps)
    .map((r, i) => ({
      id: r.id || String(i),
      lat: r.gps!.lat,
      lon: r.gps!.lon,
      label: r.location?.city || r.filename,
      placeType: r.location?.placeType
    }));

  return (
    <div className="space-y-6">
      {/* DROPZONE */}
      <div
        {...getRootProps()}
        className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition
          ${isDragActive ? 'border-brand-pink bg-brand-pink/5' : 'border-zinc-700 hover:border-brand-pink'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud size={48} className="mx-auto text-brand-pink mb-3" />
        <p className="text-lg font-medium">Glissez vos photos ici</p>
        <p className="text-sm text-zinc-400">ou cliquez pour parcourir — accepte plusieurs fichiers</p>
      </div>

      {/* OPTIONS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 grid sm:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} />
          Approuver automatiquement (sinon → file de modération)
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-zinc-400">Pays par défaut (si pas d'EXIF)</span>
          <input
            value={defaultCountry}
            onChange={(e) => setDefaultCountry(e.target.value)}
            placeholder="ex: France"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink text-sm"
          />
        </label>
      </div>

      {/* QUEUE */}
      {files.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-zinc-400">{files.length} photo(s) en attente</span>
            <button onClick={uploadAll} disabled={busy} className="btn-primary text-sm">
              {busy
                ? <><Loader2 size={14} className="animate-spin" /> Upload {progress.done}/{progress.total}</>
                : <><UploadCloud size={14} /> Tout uploader</>}
            </button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-2">
            {files.map((f) => (
              <div key={f.name} className="relative aspect-square rounded-lg overflow-hidden bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previews[f.name]} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeFile(f.name)}
                  className="absolute top-1 right-1 bg-black/70 rounded-full w-5 h-5 text-xs hover:bg-red-500"
                >×</button>
                <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] truncate px-1 py-0.5">
                  {f.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULTS */}
      {results.length > 0 && (
        <>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h2 className="font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={18} />
              Résultats ({results.filter(r => r.ok).length}/{results.length} importées,
              {' '}{results.filter(r => r.gps).length} géolocalisées)
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={`rounded-lg border p-3 text-xs
                  ${r.ok ? 'border-emerald-700/40 bg-emerald-900/10' : 'border-red-700/40 bg-red-900/10'}`}>
                  <div className="flex items-center gap-2 font-mono truncate">
                    {r.ok
                      ? <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
                      : <AlertCircle size={12} className="text-red-400 shrink-0" />}
                    <span className="truncate">{r.filename}</span>
                  </div>
                  {r.gps && (
                    <div className="mt-1 flex items-center gap-1 text-zinc-400">
                      <MapPin size={10} />
                      {r.location?.city || '—'}, {r.location?.country || '—'}
                      {r.location?.placeType && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-brand-pink/20 text-brand-pink text-[10px]">
                          {PLACE_TYPES.find(p => p.v === r.location?.placeType)?.l || r.location.placeType}
                        </span>
                      )}
                    </div>
                  )}
                  {!r.gps && r.ok && (
                    <div className="mt-1 text-zinc-500">⚠ Pas de GPS dans l'EXIF</div>
                  )}
                  {r.error && <div className="mt-1 text-red-400">{r.error}</div>}
                </div>
              ))}
            </div>
          </div>

          {geoMarkers.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <MapPin className="text-brand-pink" size={18} />
                Carte des photos importées ({geoMarkers.length})
              </h2>
              <WorldMap markers={geoMarkers} height={400} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
