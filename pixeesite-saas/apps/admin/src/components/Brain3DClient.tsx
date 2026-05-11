'use client';
import { useEffect, useRef } from 'react';
import { SimpleOrgPage, card } from './SimpleOrgPage';
import { gradients } from '@/lib/design-tokens';

export function Brain3DClient({ orgSlug }: { orgSlug: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cleanup = () => {};
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Inject Three.js via <script> tag (UMD)
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
      camera.position.z = 5;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Sphère wireframe centrale
      const sphereGeo = new THREE.IcosahedronGeometry(1.5, 2);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xd946ef, wireframe: true, transparent: true, opacity: 0.5 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      scene.add(sphere);

      // Points cloud
      const cloudGeo = new THREE.BufferGeometry();
      const N = 800;
      const positions = new Float32Array(N * 3);
      const colors = new Float32Array(N * 3);
      const palette = [
        [0.85, 0.27, 0.94], [0.02, 0.71, 0.83], [0.55, 0.36, 0.96],
        [0.06, 0.72, 0.51], [0.96, 0.62, 0.04], [0.92, 0.27, 0.6],
      ];
      for (let i = 0; i < N; i++) {
        const r = 2 + Math.random() * 2;
        const t = Math.random() * Math.PI * 2;
        const p = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(p) * Math.cos(t);
        positions[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
        positions[i * 3 + 2] = r * Math.cos(p);
        const c = palette[Math.floor(Math.random() * palette.length)];
        colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
      }
      cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      cloudGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const cloudMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85 });
      const cloud = new THREE.Points(cloudGeo, cloudMat);
      scene.add(cloud);

      let raf = 0;
      const start = Date.now();
      function animate() {
        const t = (Date.now() - start) / 1000;
        sphere.rotation.x = t * 0.2;
        sphere.rotation.y = t * 0.3;
        cloud.rotation.y = t * 0.05;
        cloud.rotation.x = Math.sin(t * 0.1) * 0.3;
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
        const mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
        camera.position.x = mx * 0.8;
        camera.position.y = -my * 0.8;
        camera.lookAt(0, 0, 0);
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
  }, []);

  return (
    <SimpleOrgPage orgSlug={orgSlug} emoji="🌐" title="Brain 3D" desc="Visualisation 3D Three.js de tes embeddings et flux IA — style JARVIS interactif">
      <div style={{ ...card, padding: 0, overflow: 'hidden', borderTop: '3px solid #3b82f6' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #27272a' }}>
          <h3 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            🧠 800 embeddings projetés en 3D
            <span style={{ fontSize: 10, padding: '2px 8px', background: '#3b82f622', color: '#3b82f6', borderRadius: 4, fontWeight: 700 }}>LIVE</span>
          </h3>
          <p style={{ fontSize: 12, opacity: 0.7, margin: '4px 0 0' }}>Survole pour faire pivoter la caméra. Couleurs = clusters thématiques.</p>
        </div>
        <canvas ref={canvasRef} style={{ width: '100%', height: 500, background: 'radial-gradient(ellipse at center, #1e0a2a 0%, #0a0a0f 100%)', display: 'block', cursor: 'grab' }} />
      </div>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { label: 'Documents indexés', value: '0', sub: 'Va dans /rag pour en ajouter', emoji: '📚' },
          { label: 'Dimensions originales', value: '768', sub: 'Gemini text-embedding-004', emoji: '📐' },
          { label: 'Projection', value: 'UMAP', sub: '768 → 3 dims', emoji: '🔷' },
          { label: 'Refresh rate', value: '60fps', sub: 'Hardware accelerated', emoji: '⚡' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, textAlign: 'center', padding: 14 }}>
            <div style={{ fontSize: 20 }}>{s.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0', background: gradients.brand, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
            <div style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </SimpleOrgPage>
  );
}
