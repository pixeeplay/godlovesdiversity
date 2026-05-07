'use client';
import { useState, useRef } from 'react';
import { Save, Loader2, CheckCircle2, UploadCloud, Image as ImageIcon, Trash2, Eye } from 'lucide-react';

const FIELDS: { key: string; label: string; placeholder: string; type?: 'text' | 'textarea' }[] = [
  { key: 'home.hero.eyebrow', label: 'Pré-titre du hero', placeholder: 'Plateforme LGBTQIA+ Paris + France · 2026' },
  { key: 'home.hero.title', label: 'Titre principal', placeholder: 'GOD ❤ DIVERSITY' },
  { key: 'home.hero.subtitle', label: 'Sous-titre', placeholder: 'Aucune lecture n\'est définitive. La foi se conjugue au pluriel.', type: 'textarea' },
  { key: 'home.hero.ctaPrimary', label: 'Bouton principal', placeholder: 'Participer' },
  { key: 'home.hero.ctaSecondary', label: 'Bouton secondaire', placeholder: 'Comprendre' },
  { key: 'home.manifesto.title', label: 'Titre du manifeste', placeholder: 'Le message' },
  { key: 'home.manifesto.text', label: 'Texte du manifeste', placeholder: 'Dieu n\'est pas opposé aux personnes LGBT…', type: 'textarea' },
  { key: 'home.pillars.title', label: 'Titre section piliers', placeholder: 'Quatre vérités simples' },
  { key: 'home.pillar1.title', label: 'Pilier 1 — titre', placeholder: 'Dieu est amour universel' },
  { key: 'home.pillar1.text', label: 'Pilier 1 — texte', placeholder: '…', type: 'textarea' },
  { key: 'home.pillar2.title', label: 'Pilier 2 — titre', placeholder: 'Les textes sont contextualisés' },
  { key: 'home.pillar2.text', label: 'Pilier 2 — texte', placeholder: '…', type: 'textarea' },
  { key: 'home.pillar3.title', label: 'Pilier 3 — titre', placeholder: 'L\'interprétation est humaine' },
  { key: 'home.pillar3.text', label: 'Pilier 3 — texte', placeholder: '…', type: 'textarea' },
  { key: 'home.pillar4.title', label: 'Pilier 4 — titre', placeholder: 'Foi et diversité sont compatibles' },
  { key: 'home.pillar4.text', label: 'Pilier 4 — texte', placeholder: '…', type: 'textarea' },
  { key: 'home.cta.title', label: 'Titre du CTA final', placeholder: 'Rejoignez le mouvement' },
  { key: 'home.cta.text', label: 'Texte du CTA final', placeholder: 'Téléchargez l\'affiche…', type: 'textarea' }
];

export function HomeEditor({ initial }: { initial: Record<string, string> }) {
  const [vals, setVals] = useState<Record<string, string>>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function set(k: string, v: string) {
    setVals((s) => ({ ...s, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setBusy(true); setSaved(false);
    const r = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vals)
    });
    setBusy(false);
    if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
  }

  async function uploadLogo(f: File) {
    setLogoBusy(true);
    const fd = new FormData();
    fd.append('file', f);
    const r = await fetch('/api/admin/logo', { method: 'POST', body: fd });
    const j = await r.json();
    setLogoBusy(false);
    if (j.ok) set('site.logoUrl', j.url);
  }

  async function removeLogo() {
    set('site.logoUrl', '');
    await fetch('/api/admin/settings?key=site.logoUrl', { method: 'DELETE' });
  }

  return (
    <div className="space-y-8">
      {/* LOGO */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-1 flex items-center gap-2">
          <ImageIcon size={18} className="text-brand-pink" /> Logo du site
        </h2>
        <p className="text-zinc-500 text-sm mb-5">
          PNG transparent recommandé, ~512 px de hauteur. Affiché dans la nav, le hero, et le footer.
        </p>
        <div className="flex items-center gap-6">
          <div className="w-32 h-32 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-center overflow-hidden">
            {vals['site.logoUrl'] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vals['site.logoUrl']} alt="Logo" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-zinc-600 text-xs text-center px-2">Aucun logo</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />
            <button onClick={() => fileRef.current?.click()} disabled={logoBusy} className="btn-primary text-sm">
              {logoBusy ? <Loader2 className="animate-spin" size={14} /> : <UploadCloud size={14} />}
              Téléverser un logo
            </button>
            {vals['site.logoUrl'] && (
              <button onClick={removeLogo} className="btn-ghost text-sm text-red-400 hover:text-red-300">
                <Trash2 size={14} /> Supprimer
              </button>
            )}
          </div>
        </div>
      </section>

      {/* TEXTES */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="font-bold text-lg mb-5">Contenus de la page d'accueil</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <label key={f.key} className={`grid gap-1 text-sm ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
              <span className="text-zinc-400">{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea
                  value={vals[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink"
                />
              ) : (
                <input
                  value={vals[f.key] || ''}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 outline-none focus:border-brand-pink"
                />
              )}
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-4 flex items-center justify-between gap-3 bg-zinc-950/80 backdrop-blur border border-zinc-800 rounded-2xl p-4">
        <a href="/" target="_blank" className="btn-ghost text-sm">
          <Eye size={14} /> Prévisualiser le site
        </a>
        <div className="flex items-center gap-3">
          {saved && <span className="flex items-center gap-1 text-emerald-400 text-sm"><CheckCircle2 size={16} /> Enregistré</span>}
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
