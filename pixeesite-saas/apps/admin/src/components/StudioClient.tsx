'use client';
/**
 * StudioClient — Pixeesite Studio créatif (style NotebookLM).
 *
 * 5 onglets :
 *   🎙 Audio Overview — podcast 2 voix ElevenLabs (animateur + invité)
 *   🎬 Video Overview — avatar narrateur HeyGen
 *   🧠 Mind Map — arborescence cliquable du site (Cytoscape via CDN)
 *   🎞 Storyboard — slides plein écran narrées
 *   📄 Briefing — analyse PDF (SEO / a11y / suggestions)
 *
 * Toutes les routes sont multi-tenant via /api/orgs/[slug]/studio/...
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SimpleOrgPage, card, btnPrimary, btnSecondary, input } from './SimpleOrgPage';
import { colors, gradients } from '@/lib/design-tokens';

type Tab = 'audio' | 'video' | 'mindmap' | 'storyboard' | 'briefing';

const TABS: { id: Tab; emoji: string; label: string; desc: string }[] = [
  { id: 'audio',      emoji: '🎙', label: 'Audio podcast', desc: '2 voix IA · 2–5 min' },
  { id: 'video',      emoji: '🎬', label: 'Vidéo avatar', desc: 'HeyGen · narrateur' },
  { id: 'mindmap',    emoji: '🧠', label: 'Mind Map', desc: 'Arborescence du site' },
  { id: 'storyboard', emoji: '🎞', label: 'Storyboard', desc: '8–12 slides narrées' },
  { id: 'briefing',   emoji: '📄', label: 'Briefing PDF', desc: 'SEO · a11y · audit' },
];

interface Props {
  orgSlug: string;
}

export function StudioClient({ orgSlug }: Props) {
  const [tab, setTab] = useState<Tab>('audio');

  return (
    <SimpleOrgPage
      orgSlug={orgSlug}
      emoji="🎬"
      title="Studio créatif"
      desc="Transforme ton site en podcast, vidéo, mind map, storyboard ou briefing PDF — style NotebookLM."
    >
      {/* Tab nav */}
      <nav style={{
        display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 16,
        borderBottom: `1px solid ${colors.border}`,
      }}>
        {TABS.map((t) => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            style={{
              background: tab === t.id ? gradients.brand : colors.bgCard,
              border: tab === t.id ? 'none' : `1px solid ${colors.border}`,
              color: tab === t.id ? 'white' : colors.text,
              padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
              fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all .15s',
            }}>
            <span style={{ fontSize: 16 }}>{t.emoji}</span>
            <span>
              <div style={{ lineHeight: 1.1 }}>{t.label}</div>
              <div style={{ fontSize: 9, opacity: 0.7, fontWeight: 500, marginTop: 2 }}>{t.desc}</div>
            </span>
          </button>
        ))}
      </nav>

      {tab === 'audio' && <AudioTab orgSlug={orgSlug} />}
      {tab === 'video' && <VideoTab orgSlug={orgSlug} />}
      {tab === 'mindmap' && <MindMapTab orgSlug={orgSlug} />}
      {tab === 'storyboard' && <StoryboardTab orgSlug={orgSlug} />}
      {tab === 'briefing' && <BriefingTab orgSlug={orgSlug} />}
    </SimpleOrgPage>
  );
}

/* ──────────────── Audio Tab — ElevenLabs podcast 2 voix ──────────────── */

function AudioTab({ orgSlug }: { orgSlug: string }) {
  const [siteSlug, setSiteSlug] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [host, setHost] = useState('Alice');
  const [guest, setGuest] = useState('Marc');
  const [tone, setTone] = useState<'enthousiaste' | 'professionnel' | 'décontracté'>('enthousiaste');
  const [duration, setDuration] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { loadSites(); }, [orgSlug]);
  async function loadSites() {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`);
      const j = await r.json();
      const list = j.sites || [];
      setSites(list);
      if (list[0]) setSiteSlug(list[0].slug);
    } catch {}
  }

  async function generate() {
    if (!siteSlug) { setError('Choisis un site'); return; }
    setBusy(true); setError(null); setResult(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/studio/audio-overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, hostName: host, guestName: guest, tone, durationMin: duration }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); }
      else setResult(j);
    } catch (e: any) { setError(e?.message); }
    setBusy(false);
  }

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>🎙 Audio Overview · 2 voix IA</h3>
        <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 16px' }}>
          L'IA analyse les pages de ton site et génère un dialogue de podcast naturel entre un animateur et un invité, narré par 2 voix ElevenLabs distinctes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label>
            <span style={labelTxt}>Site source</span>
            <select value={siteSlug} onChange={(e) => setSiteSlug(e.target.value)} style={input}>
              <option value="">— Choisir —</option>
              {sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelTxt}>Animateur (voix F)</span>
            <input value={host} onChange={(e) => setHost(e.target.value)} style={input} />
          </label>
          <label>
            <span style={labelTxt}>Invité (voix M)</span>
            <input value={guest} onChange={(e) => setGuest(e.target.value)} style={input} />
          </label>
          <label>
            <span style={labelTxt}>Ton</span>
            <select value={tone} onChange={(e) => setTone(e.target.value as any)} style={input}>
              <option value="enthousiaste">Enthousiaste</option>
              <option value="professionnel">Professionnel</option>
              <option value="décontracté">Décontracté</option>
            </select>
          </label>
          <label>
            <span style={labelTxt}>Durée (min)</span>
            <input type="number" min={2} max={8} value={duration} onChange={(e) => setDuration(Number(e.target.value))} style={input} />
          </label>
        </div>

        <button onClick={generate} disabled={busy || !siteSlug}
          style={{ ...btnPrimary, marginTop: 16, fontSize: 14, padding: '12px 20px', opacity: busy ? 0.5 : 1 }}>
          {busy ? '⏳ Génération (peut prendre 30–60 s)…' : '🎙 Générer le podcast'}
        </button>
        {error && <p style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {result && (
        <div style={{ ...card, padding: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>🎧 Podcast prêt</h4>
          {result.audioUrl ? (
            <audio src={result.audioUrl} controls style={{ width: '100%', marginBottom: 12 }} />
          ) : (
            <p style={{ color: colors.warning, fontSize: 12 }}>
              ⚠ Pas d'audio généré — {result.warning || 'ElevenLabs requis pour l\'audio'}. Le script ci-dessous reste disponible.
            </p>
          )}
          {result.script && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.7 }}>📜 Voir le script ({result.script.length} chars)</summary>
              <pre style={{
                background: colors.bg, padding: 12, borderRadius: 8, fontSize: 11,
                whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto', marginTop: 8,
              }}>{result.script}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────── Video Tab — HeyGen avatar narrateur ──────────────── */

function VideoTab({ orgSlug }: { orgSlug: string }) {
  const [siteSlug, setSiteSlug] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [tone, setTone] = useState<'pitch' | 'tour' | 'welcome'>('welcome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [status, setStatus] = useState<any>(null);
  const pollRef = useRef<any>(null);

  useEffect(() => { loadSites(); }, [orgSlug]);
  async function loadSites() {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`);
      const j = await r.json();
      setSites(j.sites || []);
      if (j.sites?.[0]) setSiteSlug(j.sites[0].slug);
    } catch {}
  }

  async function generate() {
    if (!siteSlug) { setError('Choisis un site'); return; }
    setBusy(true); setError(null); setVideoId(null); setStatus(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/studio/video-overview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug, tone }),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || 'Erreur'); setBusy(false); return; }
      setVideoId(j.video_id);
      setStatus({ status: 'pending', script: j.script });
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const sr = await fetch(`/api/orgs/${orgSlug}/avatar-studio/generate?videoId=${j.video_id}`);
          const s = await sr.json();
          setStatus((prev: any) => ({ ...prev, ...s }));
          if (s.status === 'completed' || s.status === 'failed') {
            clearInterval(pollRef.current); pollRef.current = null;
          }
        } catch {}
      }, 5000);
    } catch (e: any) { setError(e?.message); }
    setBusy(false);
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>🎬 Vidéo de présentation · Avatar narrateur</h3>
        <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 16px' }}>
          Un avatar HeyGen présente ton site face caméra. Choisis le ton, le script est généré automatiquement à partir du contenu du site, puis envoyé à HeyGen.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <label>
            <span style={labelTxt}>Site source</span>
            <select value={siteSlug} onChange={(e) => setSiteSlug(e.target.value)} style={input}>
              <option value="">— Choisir —</option>
              {sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
          <label>
            <span style={labelTxt}>Format</span>
            <select value={tone} onChange={(e) => setTone(e.target.value as any)} style={input}>
              <option value="welcome">Accueil chaleureux ("Bienvenue sur…")</option>
              <option value="tour">Visite guidée ("Voici ce que vous trouverez…")</option>
              <option value="pitch">Pitch commercial ("Notre proposition…")</option>
            </select>
          </label>
        </div>

        <button onClick={generate} disabled={busy || !siteSlug}
          style={{ ...btnPrimary, marginTop: 16, fontSize: 14, padding: '12px 20px', opacity: busy ? 0.5 : 1 }}>
          {busy ? '⏳ Lancement…' : '🎬 Générer la vidéo'}
        </button>
        {error && <p style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {(videoId || status) && (
        <div style={{ ...card, padding: 16 }}>
          <h4 style={{ margin: '0 0 8px' }}>Génération HeyGen…</h4>
          <div style={{ fontSize: 12, marginBottom: 8 }}>
            video_id : <code>{videoId}</code>
            <br />
            Status : <strong style={{
              color: status?.status === 'completed' ? colors.success
                : status?.status === 'failed' ? colors.danger : colors.warning,
            }}>{status?.status || 'pending'}</strong>
          </div>
          {status?.error?.message && <p style={{ color: colors.danger, fontSize: 12 }}>{status.error.message}</p>}
          {status?.status === 'completed' && status?.video_url && (
            <>
              <video src={status.video_url} controls style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <a href={status.video_url} target="_blank" rel="noreferrer" style={btnPrimary}>📥 Télécharger</a>
                <button onClick={() => navigator.clipboard.writeText(status.video_url)} style={btnSecondary}>📋 Copier URL</button>
              </div>
            </>
          )}
          {status?.script && (
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.7 }}>📜 Voir le script</summary>
              <pre style={{ background: colors.bg, padding: 12, borderRadius: 8, fontSize: 11, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', marginTop: 8 }}>{status.script}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────── Mind Map Tab — site structure ──────────────── */

function MindMapTab({ orgSlug }: { orgSlug: string }) {
  const [siteSlug, setSiteSlug] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [graph, setGraph] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const cyRef = useRef<HTMLDivElement>(null);
  const cyInstance = useRef<any>(null);

  useEffect(() => { loadSites(); }, [orgSlug]);
  async function loadSites() {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`);
      const j = await r.json();
      setSites(j.sites || []);
      if (j.sites?.[0]) {
        setSiteSlug(j.sites[0].slug);
        loadGraph(j.sites[0].slug);
      }
    } catch {}
  }

  async function loadGraph(slug = siteSlug) {
    if (!slug) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/studio/mindmap?siteSlug=${slug}`);
      const j = await r.json();
      setGraph(j);
    } catch {}
    setLoading(false);
  }

  // Charge cytoscape via CDN dans <head>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).cytoscape) return;
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/cytoscape@3.28.1/dist/cytoscape.min.js';
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Render le graphe quand graph + cyRef ready
  useEffect(() => {
    if (!graph || !cyRef.current) return;
    const tryRender = () => {
      const cy = (window as any).cytoscape;
      if (!cy) { setTimeout(tryRender, 200); return; }
      if (cyInstance.current) cyInstance.current.destroy();
      cyInstance.current = cy({
        container: cyRef.current,
        elements: [
          ...graph.nodes.map((n: any) => ({ data: { id: n.id, label: n.label, type: n.type } })),
          ...graph.edges.map((e: any) => ({ data: { source: e.from, target: e.to } })),
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#d946ef',
              'label': 'data(label)',
              'color': '#fafafa', 'font-size': 11, 'text-valign': 'center',
              'text-halign': 'center', 'text-wrap': 'wrap', 'text-max-width': '120px',
              'border-width': 1, 'border-color': '#27272a',
              'padding': '8px',
            },
          },
          {
            selector: 'node[type="site"]',
            style: { 'background-color': '#06b6d4', 'shape': 'round-rectangle', 'width': 80, 'height': 50 },
          },
          {
            selector: 'node[type="page"]',
            style: { 'background-color': '#d946ef', 'shape': 'round-rectangle', 'width': 70, 'height': 42 },
          },
          {
            selector: 'node[type="block"]',
            style: { 'background-color': '#8b5cf6', 'shape': 'ellipse', 'width': 30, 'height': 30, 'font-size': 9 },
          },
          {
            selector: 'edge',
            style: { 'width': 1.5, 'line-color': '#3f3f46', 'curve-style': 'bezier', 'target-arrow-color': '#3f3f46', 'target-arrow-shape': 'triangle' },
          },
        ],
        layout: { name: 'breadthfirst', directed: true, spacingFactor: 1.2, padding: 20 },
      });
      cyInstance.current.on('tap', 'node', (evt: any) => {
        const data = evt.target.data();
        if (data.type === 'page' && data.pageSlug && data.siteSlug) {
          window.open(`/dashboard/orgs/${orgSlug}/sites/${data.siteSlug}/edit?page=${encodeURIComponent(data.pageSlug)}`, '_blank');
        }
      });
    };
    tryRender();
    return () => { if (cyInstance.current) cyInstance.current.destroy(); };
  }, [graph, orgSlug]);

  function exportPng() {
    if (!cyInstance.current) return;
    const png = cyInstance.current.png({ scale: 2, full: true, bg: '#0a0a0f' });
    const a = document.createElement('a');
    a.href = png;
    a.download = `mindmap-${siteSlug}.png`;
    a.click();
  }

  return (
    <div>
      <div style={{ ...card, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ flex: 1 }}>
          <span style={labelTxt}>Site</span>
          <select value={siteSlug} onChange={(e) => { setSiteSlug(e.target.value); loadGraph(e.target.value); }} style={input}>
            <option value="">— Choisir —</option>
            {sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
        <button onClick={() => loadGraph()} disabled={loading || !siteSlug} style={btnSecondary}>🔄 Recharger</button>
        <button onClick={exportPng} disabled={!graph} style={btnPrimary}>📥 PNG</button>
      </div>

      <div style={{ ...card, padding: 0, height: 600, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            Chargement de la structure…
          </div>
        )}
        {!loading && !graph && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 56 }}>🧠</div>
            <p>Choisis un site pour voir sa carte mentale</p>
          </div>
        )}
        <div ref={cyRef} style={{ width: '100%', height: '100%' }} />
      </div>
      <p style={{ fontSize: 11, opacity: 0.5, textAlign: 'center', marginTop: 8 }}>
        Click sur une page → ouvre le Page Builder
      </p>
    </div>
  );
}

/* ──────────────── Storyboard Tab — slides plein écran ──────────────── */

function StoryboardTab({ orgSlug }: { orgSlug: string }) {
  const [siteSlug, setSiteSlug] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [slides, setSlides] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadSites(); }, [orgSlug]);
  async function loadSites() {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`);
      const j = await r.json();
      setSites(j.sites || []);
      if (j.sites?.[0]) setSiteSlug(j.sites[0].slug);
    } catch {}
  }

  async function generate() {
    if (!siteSlug) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/studio/storyboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug }),
      });
      const j = await r.json();
      if (!r.ok) setError(j.error || 'Erreur');
      else { setSlides(j.slides || []); setCurrent(0); }
    } catch (e: any) { setError(e?.message); }
    setBusy(false);
  }

  // Keyboard nav en mode fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowRight' || e.key === ' ') setCurrent((c) => Math.min(slides.length - 1, c + 1));
      if (e.key === 'ArrowLeft') setCurrent((c) => Math.max(0, c - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen, slides.length]);

  return (
    <div>
      <div style={{ ...card, padding: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <label style={{ flex: 1 }}>
          <span style={labelTxt}>Site source</span>
          <select value={siteSlug} onChange={(e) => setSiteSlug(e.target.value)} style={input}>
            <option value="">— Choisir —</option>
            {sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
        </label>
        <button onClick={generate} disabled={busy || !siteSlug} style={btnPrimary}>
          {busy ? '⏳ Génération…' : '🎞 Générer 8–12 slides'}
        </button>
      </div>
      {error && <p style={{ color: colors.danger, fontSize: 12 }}>{error}</p>}

      {slides.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 14 }}>{slides.length} slides générées</strong>
            <button onClick={() => { setCurrent(0); setFullscreen(true); }} style={btnPrimary}>▶ Lancer plein écran</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {slides.map((s, i) => (
              <article key={i} onClick={() => { setCurrent(i); setFullscreen(true); }}
                style={{
                  ...card, padding: 0, overflow: 'hidden', cursor: 'pointer',
                  transition: 'transform .15s, box-shadow .15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 16px rgba(217,70,239,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {s.image && <img src={s.image} alt="" style={{ width: '100%', height: 120, objectFit: 'cover' }} />}
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Slide {i + 1}/{slides.length}</div>
                  <strong style={{ fontSize: 12 }}>{s.title}</strong>
                  {s.bullets?.length > 0 && (
                    <ul style={{ margin: '6px 0 0', paddingLeft: 14, fontSize: 11, opacity: 0.8 }}>
                      {s.bullets.slice(0, 3).map((b: string, j: number) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {/* Fullscreen player */}
      {fullscreen && slides[current] && (
        <div style={{
          position: 'fixed', inset: 0, background: '#000', zIndex: 80,
          display: 'flex', flexDirection: 'column',
        }}>
          {slides[current].image && (
            <div style={{
              flex: 1, background: `url(${slides[current].image}) center/cover`,
              position: 'relative',
            }}>
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))' }} />
              <div style={{
                position: 'absolute', bottom: 60, left: '5%', right: '5%',
                color: 'white',
              }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>Slide {current + 1} / {slides.length}</div>
                <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px' }}>{slides[current].title}</h1>
                {slides[current].bullets?.length > 0 && (
                  <ul style={{ fontSize: 16, lineHeight: 1.6, opacity: 0.95 }}>
                    {slides[current].bullets.map((b: string, j: number) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            </div>
          )}
          <div style={{ padding: 16, background: '#111', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0} style={btnSecondary}>◀</button>
            <div style={{ flex: 1, color: 'white', fontSize: 12 }}>{slides[current].title}</div>
            <button onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))} disabled={current === slides.length - 1} style={btnSecondary}>▶</button>
            <button onClick={() => setFullscreen(false)} style={btnSecondary}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────── Briefing Tab — PDF audit ──────────────── */

function BriefingTab({ orgSlug }: { orgSlug: string }) {
  const [siteSlug, setSiteSlug] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { loadSites(); }, [orgSlug]);
  async function loadSites() {
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/sites`);
      const j = await r.json();
      setSites(j.sites || []);
      if (j.sites?.[0]) setSiteSlug(j.sites[0].slug);
    } catch {}
  }

  async function generate() {
    if (!siteSlug) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch(`/api/orgs/${orgSlug}/studio/briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSlug }),
      });
      const j = await r.json();
      if (!r.ok) setError(j.error || 'Erreur');
      else setResult(j);
    } catch (e: any) { setError(e?.message); }
    setBusy(false);
  }

  return (
    <div>
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>📄 Briefing IA · Audit complet du site</h3>
        <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 16px' }}>
          L'IA analyse l'intégralité de ton site et génère un rapport structuré : points forts, suggestions d'amélioration, score SEO estimé, accessibilité, métriques de contenu.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: 1, minWidth: 200 }}>
            <span style={labelTxt}>Site source</span>
            <select value={siteSlug} onChange={(e) => setSiteSlug(e.target.value)} style={input}>
              <option value="">— Choisir —</option>
              {sites.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
          <button onClick={generate} disabled={busy || !siteSlug} style={btnPrimary}>
            {busy ? '⏳ Analyse…' : '📄 Générer le briefing'}
          </button>
        </div>
        {error && <p style={{ color: colors.danger, fontSize: 12, marginTop: 8 }}>{error}</p>}
      </div>

      {result && (
        <div style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0, flex: 1 }}>Rapport · {result.siteName}</h3>
            {result.pdfUrl && (
              <a href={result.pdfUrl} download style={btnPrimary}>📥 PDF</a>
            )}
          </div>

          {/* Scores */}
          {result.scores && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 20 }}>
              {Object.entries(result.scores).map(([k, v]: any) => (
                <div key={k} style={{ ...card, padding: 12, textAlign: 'center', background: colors.bg }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: v >= 80 ? colors.success : v >= 60 ? colors.warning : colors.danger }}>{v}</div>
                  <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{k}</div>
                </div>
              ))}
            </div>
          )}

          {/* Sections */}
          {result.strengths && (
            <Section title="✅ Points forts" items={result.strengths} color={colors.success} />
          )}
          {result.improvements && (
            <Section title="🔧 Suggestions d'amélioration" items={result.improvements} color={colors.warning} />
          )}
          {result.seo && (
            <Section title="🔍 SEO" items={result.seo} color={colors.info} />
          )}
          {result.a11y && (
            <Section title="♿ Accessibilité" items={result.a11y} color={colors.violet} />
          )}

          {result.summary && (
            <details style={{ marginTop: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12, opacity: 0.7 }}>📜 Résumé exécutif complet</summary>
              <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result.summary}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 8px', color, fontSize: 13 }}>{title}</h4>
      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
        {items.map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
}

const labelTxt: React.CSSProperties = {
  display: 'block', fontSize: 10, opacity: 0.6, textTransform: 'uppercase',
  letterSpacing: 1, marginBottom: 4, fontWeight: 700,
};
