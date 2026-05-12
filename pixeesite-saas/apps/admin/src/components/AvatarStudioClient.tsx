'use client';
/**
 * AvatarStudioClient — HeyGen video avatar studio (multi-tenant).
 * Port faithful de GLD/src/components/admin/AvatarStudio.tsx, adapté Pixeesite.
 *
 * Flow:
 *   1. GET /api/orgs/[slug]/avatar-studio/avatars → liste avatars + voix + quota
 *   2. Choisir avatar + voix + couleur + script
 *   3. POST /api/orgs/[slug]/avatar-studio/generate → video_id
 *   4. Polling GET ?videoId=… toutes les 5s jusqu'au status=completed
 */
import { useEffect, useState, useRef } from 'react';
import { SimpleOrgPage, card, input, btnPrimary, btnSecondary } from './SimpleOrgPage';
import { colors, gradients } from '@/lib/design-tokens';

type Avatar = { avatar_id: string; avatar_name: string; preview_image_url: string; preview_video_url?: string; gender?: string };
type Voice = { voice_id: string; language: string; gender: string; name: string; preview_audio?: string };

const BG_PRESETS = [
  { color: '#FBEAF0', label: 'Rose doux' },
  { color: '#EEEDFE', label: 'Violet doux' },
  { color: '#E1F5EE', label: 'Vert serein' },
  { color: '#E6F1FB', label: 'Bleu ciel' },
  { color: '#FAEEDA', label: 'Ambre chaud' },
  { color: '#0F0F12', label: 'Nuit profonde' },
];

export function AvatarStudioClient({ orgSlug }: { orgSlug: string }) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [provider, setProvider] = useState<'heygen' | 'synthesia' | 'tavus'>('heygen');
  const [avatarId, setAvatarId] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [bgColor, setBgColor] = useState(BG_PRESETS[0].color);
  const [ratio, setRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [text, setText] = useState('');

  const [busy, setBusy] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  // Load avatars + voices
  async function loadList() {
    setLoadingList(true); setLoadError(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/avatar-studio/avatars`);
      const j = await r.json();
      if (j.error && !j.avatars?.length) setLoadError(j.error);
      setAvatars(j.avatars || []);
      setVoices(j.voices || []);
      setQuota(j.quota?.remainingCredits ?? null);
    } catch (e: any) { setLoadError(e?.message); }
    finally { setLoadingList(false); }
  }
  useEffect(() => { loadList(); }, [orgSlug]);

  async function generate() {
    if (!text.trim()) { setError('Script requis'); return; }
    if (!avatarId) { setError('Choisis un avatar'); return; }
    if (!voiceId) { setError('Choisis une voix'); return; }
    setError(null); setBusy(true); setVideoId(null); setStatus(null);
    try {
      // Route multi-provider (Phase 10) si pas heygen, sinon route originale.
      const endpoint = provider === 'heygen'
        ? `/api/orgs/${orgSlug}/avatar-studio/generate`
        : `/api/orgs/${orgSlug}/avatar-studio/multi-generate`;
      const body = provider === 'heygen'
        ? { text, avatarId, voiceId, bgColor, ratio }
        : { provider, script: text, avatarId, voiceId, bgColor, ratio };
      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); return; }
      setVideoId(j.video_id);
      setStatus({ status: 'pending' });
      // Start polling
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const statusEndpoint = provider === 'heygen'
            ? `/api/orgs/${orgSlug}/avatar-studio/generate?videoId=${j.video_id}`
            : `/api/orgs/${orgSlug}/avatar-studio/multi-generate?provider=${provider}&videoId=${j.video_id}`;
          const sr = await fetch(statusEndpoint);
          const s = await sr.json();
          setStatus(s);
          if (s.status === 'completed' || s.status === 'failed') {
            clearInterval(pollRef.current); pollRef.current = null;
          }
        } catch {}
      }, 5000);
    } finally { setBusy(false); }
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const selectedAvatar = avatars.find((a) => a.avatar_id === avatarId);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="🎭" title="Avatar Studio" desc="Génère des vidéos d'avatar parlant via HeyGen / Synthesia / Tavus — choisis provider + avatar + voix + script.">
      {loadError && (
        <div style={{ ...card, padding: 12, marginBottom: 12, borderLeft: `3px solid ${colors.warning}` }}>
          ⚠ {loadError}{!loadError.includes('non configurée') && ' — '}
          <a href={`/dashboard/orgs/${orgSlug}/keys`} style={{ color: colors.primary }}>Configure ta clé HEYGEN_API_KEY ici</a>
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 16 }}>
        <Stat label="Avatars HeyGen" value={avatars.length} grad={gradients.purple} />
        <Stat label="Voix dispo" value={voices.length} grad={gradients.blue} />
        <Stat label="Crédits restants" value={quota ?? '?'} grad={gradients.pink} />
        <Stat label="État" value={loadError ? 'KO' : (avatars.length > 0 ? 'Prêt' : 'Vide')} grad={loadError ? gradients.orange : gradients.green} />
      </section>

      {/* Provider switcher (Phase 10) */}
      <div style={{ ...card, padding: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Provider vidéo</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {([
            { id: 'heygen', label: '🎬 HeyGen', desc: 'Production-ready, ~50 avatars' },
            { id: 'synthesia', label: '🎭 Synthesia', desc: 'TODO — stock avatars' },
            { id: 'tavus', label: '🪞 Tavus', desc: 'TODO — real-time persona' },
          ] as const).map((p) => (
            <button key={p.id} onClick={() => setProvider(p.id)} style={{
              ...card, padding: 12, cursor: 'pointer', textAlign: 'left', flex: 1, minWidth: 180,
              border: provider === p.id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
              background: provider === p.id ? `${colors.primary}11` : colors.bgCard,
              opacity: p.id !== 'heygen' ? 0.6 : 1,
            }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{p.label}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{p.desc}</div>
            </button>
          ))}
        </div>
        {provider !== 'heygen' && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7, color: colors.warning }}>
            ⚠ {provider === 'synthesia' ? 'Synthesia' : 'Tavus'} en cours d'intégration — utilise HeyGen pour générer.
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
        {/* LEFT : avatar + voice picker */}
        <div>
          <h4 style={{ margin: '0 0 8px' }}>1. Choisis ton avatar ({avatars.length})</h4>
          {loadingList ? <p style={{ opacity: 0.5 }}>Chargement HeyGen…</p>
            : avatars.length === 0 ? <div style={{ ...card, padding: 16, textAlign: 'center', opacity: 0.6 }}>Aucun avatar disponible.</div>
              : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, maxHeight: 380, overflow: 'auto' }}>
                  {avatars.slice(0, 60).map((a) => (
                    <button key={a.avatar_id} onClick={() => setAvatarId(a.avatar_id)} style={{
                      ...card, padding: 4, cursor: 'pointer', textAlign: 'center',
                      border: avatarId === a.avatar_id ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                      background: avatarId === a.avatar_id ? `${colors.primary}11` : colors.bgCard,
                    }}>
                      {a.preview_image_url && <img src={a.preview_image_url} alt={a.avatar_name} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 4 }} />}
                      <div style={{ fontSize: 10, padding: 2, opacity: 0.9, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{a.avatar_name}</div>
                    </button>
                  ))}
                </div>
              )}

          <h4 style={{ margin: '16px 0 8px' }}>2. Choisis la voix ({voices.length})</h4>
          <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} style={input}>
            <option value="">— Sélectionne une voix —</option>
            {voices.map((v) => (
              <option key={v.voice_id} value={v.voice_id}>
                {v.name} · {v.language} · {v.gender}
              </option>
            ))}
          </select>
        </div>

        {/* RIGHT : script + bg + ratio + generate */}
        <div>
          <h4 style={{ margin: '0 0 8px' }}>3. Ton script ({text.length}/1500 chars)</h4>
          <textarea style={{ ...input, minHeight: 160, fontFamily: 'inherit' }} value={text} onChange={(e) => setText(e.target.value.slice(0, 1500))} placeholder="Bonjour, je suis votre nouvel assistant virtuel…" />

          <h4 style={{ margin: '12px 0 8px' }}>4. Couleur de fond</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BG_PRESETS.map((p) => (
              <button key={p.color} onClick={() => setBgColor(p.color)} style={{
                width: 52, height: 36, borderRadius: 6, cursor: 'pointer',
                background: p.color,
                border: bgColor === p.color ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
              }} title={p.label} />
            ))}
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 52, height: 36, padding: 0, border: 'none', cursor: 'pointer' }} />
          </div>

          <h4 style={{ margin: '12px 0 8px' }}>5. Format</h4>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['16:9', '9:16', '1:1'] as const).map((r) => (
              <button key={r} onClick={() => setRatio(r)} style={{
                ...btnSecondary, padding: '8px 14px',
                border: ratio === r ? `2px solid ${colors.primary}` : `1px solid ${colors.borderLight}`,
              }}>{r}</button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <button style={{ ...btnPrimary, fontSize: 14, padding: '12px 20px' }} disabled={busy || !text || !avatarId || !voiceId} onClick={generate}>
              {busy ? '⏳ Lancement…' : '🎬 Générer la vidéo'}
            </button>
            {error && <span style={{ marginLeft: 12, color: colors.danger, fontSize: 12 }}>{error}</span>}
          </div>
        </div>
      </div>

      {/* PREVIEW */}
      {(videoId || status) && (
        <div style={{ ...card, marginTop: 20, padding: 16 }}>
          <h4 style={{ marginTop: 0 }}>Génération en cours…</h4>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, opacity: 0.6 }}>video_id : <code>{videoId}</code></div>
              <div style={{ fontSize: 14, marginTop: 6 }}>
                Status: <strong style={{ color: status?.status === 'completed' ? colors.success : status?.status === 'failed' ? colors.danger : colors.warning }}>
                  {status?.status || 'pending'}
                </strong>
                {status?.duration ? ` · ${status.duration.toFixed(1)}s` : ''}
              </div>
              {status?.error?.message && <div style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>{status.error.message}</div>}
              {status?.status === 'completed' && status?.video_url && (
                <div style={{ marginTop: 12 }}>
                  <a href={status.video_url} target="_blank" rel="noreferrer" style={btnPrimary}>📥 Télécharger</a>
                  <button onClick={() => navigator.clipboard.writeText(status.video_url)} style={{ ...btnSecondary, marginLeft: 8 }}>📋 Copier URL</button>
                </div>
              )}
            </div>
            {selectedAvatar?.preview_image_url && (
              <img src={selectedAvatar.preview_image_url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }} />
            )}
          </div>
          {status?.status === 'completed' && status?.video_url && (
            <video src={status.video_url} controls style={{ width: '100%', marginTop: 12, borderRadius: 8, maxHeight: 480 }} />
          )}
        </div>
      )}
    </SimpleOrgPage>
  );
}

function Stat({ label, value, grad }: { label: string; value: any; grad: string }) {
  return (
    <div style={{ ...card, padding: 14, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: grad, opacity: 0.07 }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}
