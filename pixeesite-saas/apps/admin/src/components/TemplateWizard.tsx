'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { gradients, colors } from '@/lib/design-tokens';

interface Step { step: string; ok: boolean; detail?: any; progress?: number; siteSlug?: string; }

const PALETTES = [
  { color: '#d946ef', name: 'Magenta' },
  { color: '#06b6d4', name: 'Cyan' },
  { color: '#10b981', name: 'Emerald' },
  { color: '#f59e0b', name: 'Amber' },
  { color: '#ef4444', name: 'Red' },
  { color: '#8b5cf6', name: 'Violet' },
  { color: '#0ea5e9', name: 'Sky' },
  { color: '#ec4899', name: 'Pink' },
];
const FONTS = ['Inter', 'Poppins', 'DM Sans', 'Manrope', 'Playfair Display', 'Space Grotesk', 'Bebas Neue', 'Lora'];
const TONES = ['Professionnel', 'Bohème', 'Luxe', 'Fun', 'Minimaliste', 'Brutalist', 'Éditorial', 'Corporate'];
const AUDIENCES = ['B2B entreprises', 'Particuliers grand public', 'Pros créatifs', 'Lifestyle / wellness', 'Tech early-adopters', 'Mariés / événements'];
const SECTIONS = [
  { id: 'blog', label: '📝 Blog', desc: 'Articles, SEO' },
  { id: 'shop', label: '🛒 Boutique', desc: 'Produits + Stripe' },
  { id: 'forum', label: '💬 Forum', desc: 'Discussions communauté' },
  { id: 'newsletter', label: '✉️ Newsletter', desc: 'Mailing list' },
  { id: 'events', label: '📅 Événements', desc: 'Calendrier + billetterie' },
  { id: 'leads', label: '🎯 Capture leads', desc: 'Formulaire contact' },
];

export function TemplateWizard({
  orgSlug, templateId, templateName, defaultPrimary, onClose,
}: {
  orgSlug: string;
  templateId?: string;
  templateName?: string;
  defaultPrimary?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<any>({
    name: '', brief: '',
    audience: AUDIENCES[0],
    tone: TONES[0],
    primaryColor: defaultPrimary || '#d946ef',
    font: 'Inter',
    logoUrl: '',
    sections: ['blog', 'leads'],
  });
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<Step[]>([]);
  const [percentage, setPercentage] = useState(0);
  const [finalSlug, setFinalSlug] = useState<string | null>(null);

  function setField(k: string, v: any) { setData((d: any) => ({ ...d, [k]: v })); }
  function toggleSection(s: string) {
    setData((d: any) => ({
      ...d, sections: d.sections.includes(s) ? d.sections.filter((x: string) => x !== s) : [...d.sections, s],
    }));
  }

  async function generate() {
    setGenerating(true);
    setProgress([{ step: 'starting', ok: true, detail: 'Connexion IA…' }]);

    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites/wizard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, templateId }),
      });
      if (!r.body) { setProgress([{ step: 'error', ok: false, detail: 'Pas de réponse stream' }]); return; }
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg = JSON.parse(line) as Step;
            setProgress((p) => [...p, msg]);
            if (msg.progress) setPercentage(msg.progress);
            if (msg.step === 'done') setFinalSlug(msg.siteSlug || null);
          } catch {}
        }
      }
    } catch (e: any) {
      setProgress((p) => [...p, { step: 'fatal', ok: false, detail: e.message }]);
    }
    setGenerating(false);
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, zIndex: 100, backdropFilter: 'blur(8px)',
  };
  const modal: React.CSSProperties = {
    background: colors.bgCard, border: `1px solid ${colors.borderLight}`,
    borderRadius: 16, maxWidth: 720, width: '100%', maxHeight: '92vh', overflow: 'auto',
  };
  const inp: React.CSSProperties = {
    width: '100%', padding: 12, background: '#0a0a0f', border: `1px solid ${colors.borderLight}`,
    borderRadius: 10, color: 'inherit', fontSize: 14, fontFamily: 'inherit',
  };
  const stepBar = (
    <div style={{ display: 'flex', gap: 6, padding: '14px 20px', borderBottom: `1px solid ${colors.border}` }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <div key={s} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: s <= step ? data.primaryColor : colors.border,
          transition: 'background .3s',
        }} />
      ))}
    </div>
  );

  if (generating || progress.length > 0) {
    return (
      <div style={overlay} onClick={!finalSlug ? undefined : onClose}>
        <div style={modal} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: 24 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>🪄 Génération en cours…</h2>
            <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>L'IA crée tes pages personnalisées.</p>

            {/* Progress bar */}
            <div style={{ marginTop: 16, marginBottom: 16, background: '#0a0a0f', borderRadius: 100, overflow: 'hidden', height: 8 }}>
              <div style={{
                width: `${Math.min(percentage, 100)}%`, height: '100%',
                background: gradients.brand, transition: 'width .4s',
              }} />
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'right' }}>{percentage}%</div>

            {/* Log live */}
            <div style={{
              marginTop: 12, background: '#0a0a0f', borderRadius: 10, padding: 12,
              fontFamily: 'monospace', fontSize: 11, maxHeight: 320, overflow: 'auto',
            }}>
              {progress.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, padding: '3px 0', color: p.ok ? colors.text : colors.danger }}>
                  <span>{p.ok ? '✓' : '✗'}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ color: colors.primary }}>{p.step}</span>
                    {p.detail && <span style={{ opacity: 0.7, marginLeft: 8 }}>{typeof p.detail === 'object' ? JSON.stringify(p.detail) : p.detail}</span>}
                  </span>
                </div>
              ))}
            </div>

            {finalSlug && (
              <div style={{ marginTop: 16, padding: 16, background: '#10b98115', border: `1px solid ${colors.success}`, borderRadius: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: colors.success }}>🎉 Site créé !</div>
                <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>Toutes les pages sont prêtes à être éditées.</p>
                <button onClick={() => { router.push(`/dashboard/orgs/${orgSlug}/sites/${finalSlug}`); onClose(); }}
                  style={{ background: gradients.brand, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
                  → Ouvrir le Page Builder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {stepBar}
        <div style={{ padding: 24 }}>
          {step === 1 && (
            <>
              <h2 style={{ margin: 0, fontSize: 22 }}>📝 Parle-moi de ton business</h2>
              <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>{templateName ? `Tu utilises le template "${templateName}".` : 'Site personnalisé.'} L'IA va personnaliser le contenu pour toi.</p>
              <label style={{ display: 'block', marginTop: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Nom de ton business *</div>
                <input style={inp} value={data.name} onChange={(e) => setField('name', e.target.value)} placeholder="Studio Photo Lumière" autoFocus />
              </label>
              <label style={{ display: 'block', marginBottom: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Décris ton business en quelques phrases *</div>
                <textarea style={{ ...inp, minHeight: 100 }} value={data.brief} onChange={(e) => setField('brief', e.target.value)} placeholder="Studio photo mariage et famille à Paris, style chic-bohème, sur mesure, déplacements France entière." />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button onClick={onClose} style={{ background: 'transparent', color: colors.textMuted, border: 0, padding: '10px 18px', cursor: 'pointer' }}>Annuler</button>
                <button disabled={!data.name || !data.brief} onClick={() => setStep(2)}
                  style={{ background: data.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', opacity: (!data.name || !data.brief) ? 0.4 : 1 }}>
                  Continuer →
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ margin: 0, fontSize: 22 }}>🎯 Audience & ton</h2>
              <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>L'IA adapte le vocabulaire et le style.</p>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, marginBottom: 8 }}>Audience cible</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  {AUDIENCES.map((a) => (
                    <button key={a} onClick={() => setField('audience', a)}
                      style={{
                        padding: 12, borderRadius: 10, fontSize: 13, cursor: 'pointer',
                        background: data.audience === a ? `${data.primaryColor}22` : '#0a0a0f',
                        border: `1px solid ${data.audience === a ? data.primaryColor : colors.border}`,
                        color: 'inherit', textAlign: 'left',
                      }}>{a}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, marginBottom: 8 }}>Ton du site</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {TONES.map((t) => (
                    <button key={t} onClick={() => setField('tone', t)}
                      style={{
                        padding: '8px 14px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
                        background: data.tone === t ? data.primaryColor : '#0a0a0f',
                        border: `1px solid ${data.tone === t ? data.primaryColor : colors.border}`,
                        color: data.tone === t ? 'white' : 'inherit', fontWeight: data.tone === t ? 700 : 500,
                      }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={{ background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.borderLight}`, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
                <button onClick={() => setStep(3)} style={{ background: data.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Continuer →</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ margin: 0, fontSize: 22 }}>🎨 Identité visuelle</h2>
              <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>Couleurs, police, logo. L'IA peut générer le logo aussi.</p>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, marginBottom: 8 }}>Couleur principale</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
                  {PALETTES.map((p) => (
                    <button key={p.color} onClick={() => setField('primaryColor', p.color)}
                      title={p.name}
                      style={{ aspectRatio: '1', background: p.color, borderRadius: 10, border: data.primaryColor === p.color ? '3px solid white' : 'none', cursor: 'pointer' }} />
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, marginBottom: 8 }}>Police</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {FONTS.map((f) => (
                    <button key={f} onClick={() => setField('font', f)}
                      style={{
                        padding: 10, borderRadius: 8, fontSize: 13, cursor: 'pointer', fontFamily: f,
                        background: data.font === f ? data.primaryColor : '#0a0a0f',
                        border: `1px solid ${data.font === f ? data.primaryColor : colors.border}`,
                        color: data.font === f ? 'white' : 'inherit',
                      }}>{f}</button>
                  ))}
                </div>
              </div>
              <label style={{ display: 'block', marginTop: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 12, marginBottom: 4 }}>URL Logo (optionnel)</div>
                <input style={inp} value={data.logoUrl} onChange={(e) => setField('logoUrl', e.target.value)} placeholder="https://… ou laisse vide pour génération IA" />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 24 }}>
                <button onClick={() => setStep(2)} style={{ background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.borderLight}`, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
                <button onClick={() => setStep(4)} style={{ background: data.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Continuer →</button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 style={{ margin: 0, fontSize: 22 }}>🧩 Sections optionnelles</h2>
              <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>Coche ce que tu veux activer. L'IA générera les pages associées.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 16 }}>
                {SECTIONS.map((s) => {
                  const on = data.sections.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => toggleSection(s.id)}
                      style={{
                        textAlign: 'left', padding: 14, borderRadius: 10, cursor: 'pointer',
                        background: on ? `${data.primaryColor}22` : '#0a0a0f',
                        border: `2px solid ${on ? data.primaryColor : colors.border}`,
                        color: 'inherit',
                      }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{on && '✓ '}{s.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{s.desc}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 24 }}>
                <button onClick={() => setStep(3)} style={{ background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.borderLight}`, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
                <button onClick={() => setStep(5)} style={{ background: data.primaryColor, color: 'white', border: 0, padding: '12px 24px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Continuer →</button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <h2 style={{ margin: 0, fontSize: 22 }}>🚀 Prêt à générer</h2>
              <p style={{ opacity: 0.6, fontSize: 13, marginTop: 4 }}>L'IA va créer toutes tes pages personnalisées.</p>
              <div style={{ background: '#0a0a0f', borderRadius: 10, padding: 16, marginTop: 16, fontSize: 13 }}>
                <div><strong>Business :</strong> {data.name}</div>
                <div style={{ marginTop: 4, opacity: 0.8 }}><strong>Brief :</strong> {data.brief.slice(0, 100)}{data.brief.length > 100 ? '…' : ''}</div>
                <div style={{ marginTop: 4 }}><strong>Audience :</strong> {data.audience}</div>
                <div><strong>Ton :</strong> {data.tone}</div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <strong>Couleur :</strong>
                  <span style={{ display: 'inline-block', width: 14, height: 14, background: data.primaryColor, borderRadius: 4 }} />
                  <code style={{ fontSize: 11 }}>{data.primaryColor}</code>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <strong>Police :</strong> <span style={{ fontFamily: data.font }}>{data.font}</span>
                </div>
                <div style={{ marginTop: 6 }}>
                  <strong>Sections :</strong> {data.sections.length === 0 ? <em style={{ opacity: 0.5 }}>aucune</em> : data.sections.join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 24 }}>
                <button onClick={() => setStep(4)} style={{ background: 'transparent', color: colors.textMuted, border: `1px solid ${colors.borderLight}`, padding: '10px 18px', borderRadius: 10, cursor: 'pointer' }}>← Retour</button>
                <button onClick={generate}
                  style={{ background: gradients.brand, color: 'white', border: 0, padding: '14px 28px', borderRadius: 10, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(217,70,239,0.5)' }}>
                  🪄 Générer mon site avec l'IA
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
