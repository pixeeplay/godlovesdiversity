'use client';
/**
 * BrainVizClient — Three.js 3D visualisation des sources RAG du tenant.
 * Port faithful de GLD/src/components/admin/BrainViz.tsx, adapté multi-tenant.
 * Three.js chargé via <script> CDN comme Brain3DClient existant.
 */
import { useEffect, useRef, useState } from 'react';
import { SimpleOrgPage, card } from './SimpleOrgPage';
import { colors, gradients } from '@/lib/design-tokens';

type Source = {
  id: string;
  name: string;
  type: string;
  chunksCount: number;
  tokensCount: number;
  active: boolean;
};

const TYPE_COLOR: Record<string, [number, number, number]> = {
  text: [0.85, 0.27, 0.94],     // violet
  url: [0.02, 0.71, 0.83],      // cyan
  pdf: [0.96, 0.62, 0.04],      // orange
  'legal-doc': [0.92, 0.27, 0.6], // pink
  default: [0.55, 0.36, 0.96],
};

export function BrainVizClient({ orgSlug }: { orgSlug: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [hovered, setHovered] = useState<Source | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch sources
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/orgs/${orgSlug}/rag-sources`);
        const j = await r.json();
        setSources(j.items || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [orgSlug]);

  // Three.js scene
  useEffect(() => {
    let cleanup = () => {};
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (loading) return;

    const SCRIPT_ID = 'pxs-three-loader';
    function withThree(fn: (THREE: any) => void) {
      const G = window as any;
      if (G.THREE) { fn(G.THREE); return; }
      let s = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!s) {
        s = document.createElement('script');
        s.id = SCRIPT_ID;
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r160/three.min.js';
        s.async = true;
        document.head.appendChild(s);
      }
      s.addEventListener('load', () => fn((window as any).THREE), { once: true });
      if ((window as any).THREE) fn((window as any).THREE);
    }

    withThree((THREE) => {
      if (!canvas) return;
      const w = canvas.clientWidth || 600;
      const h = canvas.clientHeight || 500;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 1000);
      camera.position.z = 8;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Central wireframe (the "brain")
      const sphereGeo = new THREE.IcosahedronGeometry(1.2, 2);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xd946ef, wireframe: true, transparent: true, opacity: 0.4 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      scene.add(sphere);

      // Nodes: 1 per source. Size proportional to chunksCount.
      const nodeMeshes: { mesh: any; source: Source; pos: any }[] = [];
      const N = Math.max(sources.length, 1);
      for (let i = 0; i < sources.length; i++) {
        const s = sources[i];
        // Sphere around brain at different radii
        const r = 3 + (i % 3) * 0.7;
        const t = (i / N) * Math.PI * 2;
        const p = Math.acos(2 * ((i % 7) / 6) - 1);
        const x = r * Math.sin(p) * Math.cos(t);
        const y = r * Math.sin(p) * Math.sin(t);
        const z = r * Math.cos(p);
        const size = Math.min(0.15 + Math.log10(s.chunksCount + 1) * 0.15, 0.6);
        const color = TYPE_COLOR[s.type] || TYPE_COLOR.default;
        const geo = new THREE.SphereGeometry(size, 16, 16);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(color[0], color[1], color[2]),
          transparent: true, opacity: s.active ? 0.9 : 0.3,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        scene.add(mesh);

        // Edge to center
        const edgeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, y, z)]);
        const edgeMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(color[0] * 0.6, color[1] * 0.6, color[2] * 0.6),
          transparent: true, opacity: 0.3,
        });
        scene.add(new THREE.Line(edgeGeo, edgeMat));

        nodeMeshes.push({ mesh, source: s, pos: mesh.position });
      }

      // Background star cloud
      const cloudGeo = new THREE.BufferGeometry();
      const NC = 600;
      const positions = new Float32Array(NC * 3);
      for (let i = 0; i < NC; i++) {
        const r = 6 + Math.random() * 4;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(p) * Math.cos(t);
        positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        positions[i * 3 + 2] = r * Math.cos(p);
      }
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const cloudMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.4 });
      const cloud = new THREE.Points(cloudGeo, cloudMat);
      scene.add(cloud);

      const raycaster = new THREE.Raycaster();
      const mouseVec = new THREE.Vector2();

      let raf = 0;
      const start = Date.now();
      let rotX = 0, rotY = 0;
      let mx = 0, my = 0;
      function animate() {
        const t = (Date.now() - start) / 1000;
        sphere.rotation.x = t * 0.15;
        sphere.rotation.y = t * 0.2;
        // gentle global rotation
        rotY += (mx - rotY) * 0.05;
        rotX += (my - rotX) * 0.05;
        scene.rotation.y = rotY + t * 0.03;
        scene.rotation.x = rotX;
        cloud.rotation.y = t * 0.02;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
      }
      animate();

      function onResize() {
        if (!canvas) return;
        const w2 = canvas.clientWidth, h2 = canvas.clientHeight;
        camera.aspect = w2 / h2;
        camera.updateProjectionMatrix();
        renderer.setSize(w2, h2);
      }
      window.addEventListener('resize', onResize);

      function onMouseMove(e: MouseEvent) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        mx = ((e.clientX - rect.left) / rect.width - 0.5) * 1.5;
        my = -((e.clientY - rect.top) / rect.height - 0.5) * 1.0;
        // raycast for hover
        mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouseVec, camera);
        const hit = raycaster.intersectObjects(nodeMeshes.map((n) => n.mesh))[0];
        if (hit) {
          const found = nodeMeshes.find((n) => n.mesh === hit.object);
          if (found) setHovered(found.source);
        } else {
          setHovered(null);
        }
      }
      canvas.addEventListener('mousemove', onMouseMove);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        canvas.removeEventListener('mousemove', onMouseMove);
        renderer.dispose();
      };
    });

    return () => cleanup();
  }, [sources, loading]);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="🌐" title="Brain 3D" desc="Visualisation 3D Three.js de tes sources RAG indexées — nodes color-coded par type, hover pour détails.">
      <div style={{ ...card, padding: 0, overflow: 'hidden', borderTop: `3px solid ${colors.info}`, position: 'relative' }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            🧠 {sources.length} sources connectées au cerveau
            <span style={{ fontSize: 10, padding: '2px 8px', background: `${colors.info}22`, color: colors.info, borderRadius: 4, fontWeight: 700 }}>LIVE</span>
          </h3>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 0' }}>Bouge ta souris pour faire pivoter la caméra · taille node = nb chunks · couleur = type · grise = inactive.</p>
        </div>
        <canvas ref={canvasRef} style={{ width: '100%', height: 550, background: 'radial-gradient(ellipse at center, #1e0a2a 0%, #0a0a0f 100%)', display: 'block', cursor: 'grab' }} />
        {hovered && (
          <div style={{ position: 'absolute', top: 80, right: 16, ...card, padding: 12, minWidth: 220, pointerEvents: 'none', zIndex: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{hovered.name}</div>
            <div style={{ fontSize: 11, opacity: 0.6 }}>type {hovered.type} · {hovered.chunksCount} chunks · {hovered.tokensCount} tokens</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{hovered.active ? '◉ Actif' : '◯ Inactif'}</div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { label: 'Sources indexées', value: String(sources.length), sub: 'tous types', emoji: '📚' },
          { label: 'Chunks totaux', value: String(sources.reduce((s, x) => s + x.chunksCount, 0)), sub: 'passages cherchables', emoji: '🧩' },
          { label: 'Tokens cumulés', value: String(sources.reduce((s, x) => s + x.tokensCount, 0)), sub: '≈ poids', emoji: '⚡' },
          { label: 'Refresh rate', value: '60fps', sub: 'WebGL hardware', emoji: '🎮' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 20 }}>{s.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0', background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginTop: 16, padding: 14 }}>
        <h4 style={{ marginTop: 0, fontSize: 14 }}>Légende couleurs</h4>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          {Object.entries(TYPE_COLOR).filter(([k]) => k !== 'default').map(([k, c]) => (
            <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})` }} />
              <span style={{ opacity: 0.8 }}>{k}</span>
            </span>
          ))}
        </div>
      </div>
    </SimpleOrgPage>
  );
}
