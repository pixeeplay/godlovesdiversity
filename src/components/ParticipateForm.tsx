'use client';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, MapPin, Loader2, CheckCircle2 } from 'lucide-react';

const PLACE_TYPES = [
  { v: 'CHURCH', l: 'Église' },
  { v: 'MOSQUE', l: 'Mosquée' },
  { v: 'SYNAGOGUE', l: 'Synagogue' },
  { v: 'TEMPLE', l: 'Temple' },
  { v: 'PUBLIC_SPACE', l: 'Espace public' },
  { v: 'OTHER', l: 'Autre' }
];

export function ParticipateForm() {
  const t = useTranslations('participate');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: (files) => {
      const f = files[0];
      if (!f) return;
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  });

  function geo() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => alert('Géolocalisation refusée — vous pouvez saisir le lieu manuellement.')
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return setError('Photo requise');
    setSubmitting(true);
    setError('');
    try {
      const fd = new FormData(e.currentTarget);
      fd.append('file', file);
      if (coords.lat) fd.append('latitude', String(coords.lat));
      if (coords.lng) fd.append('longitude', String(coords.lng));
      fd.append('source', 'WEB');

      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      setDone(true);
      formRef.current?.reset();
      setFile(null);
      setPreview('');
    } catch (err: any) {
      setError(err?.message || t('error'));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-brand-pink/40 bg-brand-pink/10 p-10 text-center">
        <CheckCircle2 size={48} className="text-brand-pink mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">{t('success_title')}</h2>
        <p className="text-white/80">{t('success_text')}</p>
        <button
          onClick={() => setDone(false)}
          className="mt-6 btn-ghost"
        >
          Nouvelle photo
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-6 max-w-2xl">
      <div
        {...getRootProps()}
        className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition
          ${isDragActive ? 'border-brand-pink bg-brand-pink/5' : 'border-white/20 hover:border-brand-pink'}
        `}
      >
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="" className="max-h-64 mx-auto rounded-xl" />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <UploadCloud size={40} className="text-brand-pink" />
            <p>{t('drop_label')}</p>
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Input name="authorName" label={t('name_label')} />
        <Input name="placeName" label={t('place_label')} />
        <Select name="placeType" label={t('place_type_label')} options={PLACE_TYPES} />
        <Input name="city" label={t('city_label')} />
        <Input name="country" label={t('country_label')} />
      </div>

      <Textarea name="caption" label={t('caption_label')} rows={3} />

      <button type="button" onClick={geo} className="btn-ghost self-start text-sm">
        <MapPin size={16} /> {coords.lat ? `📍 ${coords.lat.toFixed(3)}, ${coords.lng?.toFixed(3)}` : 'Géolocaliser ma position'}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button disabled={submitting || !file} className="btn-primary self-start disabled:opacity-50">
        {submitting ? (<><Loader2 className="animate-spin" size={16} /> {t('submitting')}</>) : t('submit')}
      </button>
    </form>
  );
}

function Input({ name, label }: { name: string; label: string }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/70">{label}</span>
      <input
        name={name}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:border-brand-pink outline-none"
      />
    </label>
  );
}
function Textarea({ name, label, rows }: { name: string; label: string; rows: number }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/70">{label}</span>
      <textarea
        name={name}
        rows={rows}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:border-brand-pink outline-none"
      />
    </label>
  );
}
function Select({ name, label, options }: { name: string; label: string; options: { v: string; l: string }[] }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-white/70">{label}</span>
      <select
        name={name}
        defaultValue=""
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 focus:border-brand-pink outline-none"
      >
        <option value="" className="bg-black">—</option>
        {options.map((o) => <option key={o.v} value={o.v} className="bg-black">{o.l}</option>)}
      </select>
    </label>
  );
}
