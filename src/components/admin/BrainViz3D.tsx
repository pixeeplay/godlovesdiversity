'use client';
/**
 * BrainViz3D — Mode JARVIS / Arc Reactor.
 *
 * Refonte complète façon HUD holographique Iron Man :
 *   - Noyau "arc reactor" : 3 anneaux concentriques + hexagone pulsant + triangles rotatifs
 *   - 3 anneaux orbitaux (axes X, Y, Z) qui tournent à des vitesses différentes
 *   - Particules-chunks orbitales colorées par cluster (mais teinte cyan dominante)
 *   - Lignes data-flux entre chunks (synapses)
 *   - HUD overlay HTML : brackets [ ] aux 4 coins, télémétrie défilante, label "G.L.D. NEURAL CORE"
 *   - Scanlines subtiles, glow cyan #00d4ff, fond noir profond
 *   - Drag = orbiter / molette = zoom / hover = tooltip chunk
 */
import { useEffect, useRef, useState } from 'react';

type Node3D = {
  id: string;
  docId: string;
  docTitle: string;
  x: number; y: number; z: number;
  weight: number;
  cluster: number;
  preview: string;
};

type Synapse = {
  fromId: string;
  toId: string;
  similarity: number;
};

// Palette Jarvis : cyan dominant + accents
const JARVIS_CYAN = 0x00d4ff;
const CLUSTER_COLORS = [
  0x00d4ff, 0x4dd0e1, 0x00bcd4, 0x18ffff,
  0x80deea, 0x26c6da, 0x0097a7, 0x00838f,
];

declare global {
  interface Window { THREE?: any }
}

export function BrainViz3D({ nodes, synapses, pulseHz }: {
  nodes: Node3D[];
  synapses: Synapse[];
  pulseHz: number;
  glowColor?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ node: Node3D; x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [telemetry, setTelemetry] = useState<string[]>([]);

  // Télémétrie défilante (mock)
  useEffect(() => {
    const seed = [
      'NEURAL_CORE: ONLINE',
      'EMBED_DIM: 768',
      'PCA_VARIANCE: 87.3%',
      'COSINE_THRESHOLD: 0.55',
      'ACTIVITY: 100/100',
      'HEMI_SYNC: NOMINAL',
      'CHUNKS_INDEXED: ' + nodes.length,
      'SYNAPSES_ACTIVE: ' + synapses.length,
      'CLUSTER_ENTROPY: 2.31',
      'DATA_INTEGRITY: 99.97%',
      'PULSE: ' + pulseHz.toFixed(2) + ' Hz',
      'MEMORY_ALLOC: OPTIMAL',
    ];
    setTelemetry(seed);
    const t = setInterval(() => {
      setTelemetry((prev) => {
        const next = [...prev];
        next.push(next.shift()!);
        return next;
      });
    }, 1500);
    return () => clearInterval(t);
  }, [nodes.length, synapses.length, pulseHz]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const init = () => {
      if (!window.THREE || !containerRef.current) return;
      const THREE = window.THREE;
      const container = containerRef.current;
      const W = container.clientWidth;
      const H = container.clientHeight || 560;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000308);

      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
      camera.position.set(0, 0, 5);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // === ARC REACTOR CORE ===
      const coreGroup = new THREE.Group();
      scene.add(coreGroup);

      // Cercle central plein
      const coreInner = new THREE.Mesh(
        new THREE.CircleGeometry(0.18, 32),
        new THREE.MeshBasicMaterial({ color: JARVIS_CYAN, transparent: true, opacity: 0.85 })
      );
      coreGroup.add(coreInner);

      // Triangles entrelacés (étoile de David rotative)
      const triGeom1 = new THREE.RingGeometry(0.22, 0.24, 3);
      const triGeom2 = new THREE.RingGeometry(0.22, 0.24, 3);
      const triMat = new THREE.MeshBasicMaterial({ color: JARVIS_CYAN, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
      const tri1 = new THREE.Mesh(triGeom1, triMat);
      const tri2 = new THREE.Mesh(triGeom2, triMat); tri2.rotation.z = Math.PI;
      coreGroup.add(tri1); coreGroup.add(tri2);

      // 3 anneaux concentriques
      const ringRadii = [0.32, 0.42, 0.55];
      const rings: any[] = [];
      ringRadii.forEach((r, i) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(r - 0.008, r, 64),
          new THREE.MeshBasicMaterial({ color: JARVIS_CYAN, transparent: true, opacity: 0.55 - i * 0.1, side: THREE.DoubleSide })
        );
        coreGroup.add(ring);
        rings.push(ring);
      });

      // Marqueurs sur le grand anneau (graduations type chronomètre)
      const tickGroup = new THREE.Group();
      for (let i = 0; i < 36; i++) {
        const angle = (i / 36) * Math.PI * 2;
        const isMajor = i % 3 === 0;
        const len = isMajor ? 0.06 : 0.03;
        const tick = new THREE.Mesh(
          new THREE.PlaneGeometry(0.008, len),
          new THREE.MeshBasicMaterial({ color: JARVIS_CYAN, transparent: true, opacity: isMajor ? 0.9 : 0.4 })
        );
        tick.position.set(Math.cos(angle) * 0.62, Math.sin(angle) * 0.62, 0);
        tick.rotation.z = angle - Math.PI / 2;
        tickGroup.add(tick);
      }
      coreGroup.add(tickGroup);

      // Halo glow sprite
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = 256; haloCanvas.height = 256;
      const hctx = haloCanvas.getContext('2d')!;
      const grad = hctx.createRadialGradient(128, 128, 5, 128, 128, 128);
      grad.addColorStop(0, '#00d4ff');
      grad.addColorStop(0.3, '#00d4ff66');
      grad.addColorStop(1, '#00d4ff00');
      hctx.fillStyle = grad; hctx.fillRect(0, 0, 256, 256);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(haloCanvas), transparent: true, opacity: 0.6, depthWrite: false,
        blending: THREE.AdditiveBlending,
      }));
      halo.scale.set(2.5, 2.5, 1);
      scene.add(halo);

      // === 3 ANNEAUX ORBITAUX (axes X / Y / Z) ===
      const orbitGroup = new THREE.Group();
      scene.add(orbitGroup);
      const orbitColors = [0x00d4ff, 0x4dd0e1, 0x80deea];
      const orbits: { mesh: any; speed: number }[] = [];
      [0, 1, 2].forEach((i) => {
        const orbitGeom = new THREE.TorusGeometry(1.2 + i * 0.15, 0.005, 8, 100);
        const orbitMat = new THREE.MeshBasicMaterial({ color: orbitColors[i], transparent: true, opacity: 0.65 });
        const orbit = new THREE.Mesh(orbitGeom, orbitMat);
        if (i === 0) orbit.rotation.x = Math.PI / 2;
        if (i === 1) orbit.rotation.y = Math.PI / 2;
        if (i === 2) orbit.rotation.z = Math.PI / 4;
        orbitGroup.add(orbit);
        orbits.push({ mesh: orbit, speed: 0.005 + i * 0.003 });

        // Petit "satellite" qui suit l'orbite
        const sat = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        sat.userData = { orbit: orbit, radius: 1.2 + i * 0.15, phase: i * 1.3, speed: 0.5 + i * 0.2 };
        orbit.add(sat);
        sat.position.set(1.2 + i * 0.15, 0, 0);
      });

      // === CHUNKS PARTICLES (interactives pour hover) ===
      const nodeMeshes: { node: Node3D; mesh: any }[] = [];
      for (const n of nodes) {
        const geom = new THREE.SphereGeometry(0.022 + n.weight * 0.04, 10, 10);
        const mat = new THREE.MeshBasicMaterial({
          color: CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length],
          transparent: true, opacity: 0.85,
        });
        const m = new THREE.Mesh(geom, mat);
        m.position.set(n.x * 1.7, n.y * 1.7, n.z * 1.7);
        m.userData = { node: n };
        scene.add(m);
        nodeMeshes.push({ node: n, mesh: m });
      }

      // === SYNAPSES (data-flux lines cyan) ===
      const synapseGroup = new THREE.Group();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const syn of synapses) {
        const a = nodeMap.get(syn.fromId);
        const b = nodeMap.get(syn.toId);
        if (!a || !b) continue;
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x * 1.7, a.y * 1.7, a.z * 1.7),
          new THREE.Vector3(b.x * 1.7, b.y * 1.7, b.z * 1.7),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: JARVIS_CYAN, transparent: true, opacity: 0.15 + syn.similarity * 0.3,
        });
        synapseGroup.add(new THREE.Line(geom, mat));
      }
      scene.add(synapseGroup);

      // === GRID DE FOND (style holo) ===
      const gridHelper = new THREE.GridHelper(20, 20, 0x00d4ff, 0x003844);
      (gridHelper.material as any).transparent = true;
      (gridHelper.material as any).opacity = 0.15;
      gridHelper.position.y = -2.5;
      scene.add(gridHelper);

      // Stars
      const starGeom = new THREE.BufferGeometry();
      const sp = new Float32Array(150 * 3);
      for (let i = 0; i < 150; i++) {
        sp[i * 3] = (Math.random() - 0.5) * 40;
        sp[i * 3 + 1] = (Math.random() - 0.5) * 40;
        sp[i * 3 + 2] = (Math.random() - 0.5) * 40;
      }
      starGeom.setAttribute('position', new THREE.BufferAttribute(sp, 3));
      scene.add(new THREE.Points(starGeom, new THREE.PointsMaterial({ color: 0x00d4ff, size: 0.025, transparent: true, opacity: 0.4 })));

      // === CAMERA CONTROL ===
      let theta = 0, phi = Math.PI / 2, R = 5;
      let drag = false, lx = 0, ly = 0, auto = true;
      const upd = () => {
        camera.position.x = R * Math.sin(phi) * Math.cos(theta);
        camera.position.y = R * Math.cos(phi);
        camera.position.z = R * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(0, 0, 0);
      };
      upd();
      renderer.domElement.style.cursor = 'grab';
      renderer.domElement.addEventListener('mousedown', (e) => { drag = true; lx = e.clientX; ly = e.clientY; auto = false; renderer.domElement.style.cursor = 'grabbing'; });
      window.addEventListener('mouseup', () => { drag = false; renderer.domElement.style.cursor = 'grab'; setTimeout(() => { auto = true; }, 4000); });
      const onMove = (e: MouseEvent) => {
        if (!drag) return;
        const dx = e.clientX - lx, dy = e.clientY - ly;
        theta -= dx * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - dy * 0.005));
        lx = e.clientX; ly = e.clientY; upd();
      };
      window.addEventListener('mousemove', onMove);
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        R = Math.max(2, Math.min(15, R + e.deltaY * 0.005));
        upd();
      };
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

      // Hover raycaster
      const raycaster = new THREE.Raycaster();
      const mouse2d = new THREE.Vector2();
      const onHoverMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouse2d.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse2d.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse2d, camera);
        const intersects = raycaster.intersectObjects(nodeMeshes.map((nm) => nm.mesh));
        if (intersects.length > 0) {
          const node = intersects[0].object.userData.node as Node3D;
          setHover({ node, x: e.clientX - rect.left, y: e.clientY - rect.top });
        } else {
          setHover(null);
        }
      };
      renderer.domElement.addEventListener('mousemove', onHoverMove);
      renderer.domElement.addEventListener('mouseleave', () => setHover(null));

      const onResize = () => {
        const w = container.clientWidth;
        const h = container.clientHeight || 560;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      // === ANIMATION ===
      let animId: number;
      const t0 = Date.now();
      const animate = () => {
        const t = (Date.now() - t0) / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * pulseHz * 2 * Math.PI);

        // Core pulse
        coreInner.scale.setScalar(0.9 + pulse * 0.3);
        (coreInner.material as any).opacity = 0.7 + pulse * 0.3;
        // Triangles tournent en sens opposés
        tri1.rotation.z += 0.012;
        tri2.rotation.z -= 0.018;
        // Anneaux tournent à différentes vitesses
        rings[0].rotation.z += 0.003;
        rings[1].rotation.z -= 0.005;
        rings[2].rotation.z += 0.002;
        // Graduations tournent doucement
        tickGroup.rotation.z += 0.001;

        // Halo
        halo.material.opacity = 0.4 + pulse * 0.4;
        halo.scale.setScalar(2.2 + pulse * 0.6);

        // Orbites
        orbits.forEach(({ mesh, speed }, i) => {
          mesh.rotation.z += speed;
          // Satellite suit l'orbite
          const sat = mesh.children[0];
          if (sat) {
            const angle = t * sat.userData.speed + sat.userData.phase;
            sat.position.x = sat.userData.radius * Math.cos(angle);
            sat.position.y = sat.userData.radius * Math.sin(angle);
          }
        });

        // Particles drift léger
        synapseGroup.rotation.y += 0.0008;

        if (auto) {
          theta += 0.0015;
          upd();
        }

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };
      animate();
      setLoaded(true);

      cleanup = () => {
        cancelAnimationFrame(animId);
        renderer.domElement.removeEventListener('wheel', onWheel as any);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
        scene.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
            else obj.material.dispose();
          }
        });
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      };
    };

    if (window.THREE) init();
    else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, synapses.length, pulseHz]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-black ring-1 ring-cyan-500/30" style={{ height: 560 }}>
      <div ref={containerRef} className="h-full w-full" />

      {/* Scanlines overlay */}
      <div className="pointer-events-none absolute inset-0" style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,212,255,0.03) 0px, rgba(0,212,255,0.03) 1px, transparent 1px, transparent 3px)',
        mixBlendMode: 'screen',
      }} />

      {/* HUD : 4 brackets aux coins */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
        <div key={corner} className={`pointer-events-none absolute h-6 w-6 ${
          corner === 'tl' ? 'left-3 top-3 border-l-2 border-t-2' :
          corner === 'tr' ? 'right-3 top-3 border-r-2 border-t-2' :
          corner === 'bl' ? 'left-3 bottom-3 border-l-2 border-b-2' :
          'right-3 bottom-3 border-r-2 border-b-2'
        }`} style={{ borderColor: '#00d4ff' }} />
      ))}

      {/* HUD : label central haut */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 text-center">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: '#00d4ff' }}>
          G.L.D. NEURAL CORE
        </div>
        <div className="mt-0.5 font-mono text-[9px] tracking-widest text-cyan-300/60">
          STATUS · ONLINE · AUTOPILOT
        </div>
      </div>

      {/* HUD : télémetrie défilante à droite */}
      <div className="pointer-events-none absolute right-3 top-12 max-h-72 overflow-hidden">
        <div className="font-mono text-[9px] leading-relaxed" style={{ color: '#00d4ff', opacity: 0.7 }}>
          {telemetry.slice(0, 8).map((line, i) => (
            <div key={i} className="text-right" style={{ opacity: 1 - i * 0.1 }}>{`> ${line}`}</div>
          ))}
        </div>
      </div>

      {/* HUD : compteur en bas à gauche */}
      <div className="pointer-events-none absolute bottom-3 left-3 font-mono text-[10px]" style={{ color: '#00d4ff' }}>
        <div>NODES: {nodes.length.toString().padStart(5, '0')}</div>
        <div>LINKS: {synapses.length.toString().padStart(3, '0')}</div>
        <div>FREQ:  {pulseHz.toFixed(2).padStart(5, '0')} Hz</div>
      </div>

      {/* HUD : controls bottom right */}
      <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] text-cyan-300/60">
        DRAG · WHEEL · HOVER
      </div>

      {/* Loader */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center font-mono text-sm" style={{ color: '#00d4ff' }}>
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-2 border-cyan-900 border-t-cyan-400" />
            INITIALIZING NEURAL CORE…
          </div>
        </div>
      )}

      {/* Tooltip hover chunk */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-md rounded-md p-3 text-xs ring-1 backdrop-blur"
          style={{
            left: Math.min(hover.x + 14, 600),
            top: Math.max(hover.y + 14, 0),
            background: 'rgba(0, 8, 16, 0.95)',
            color: '#00d4ff',
            borderColor: '#00d4ff',
          }}
        >
          <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
            <span>▸ NODE //{hover.node.id.slice(-6)}</span>
            <span className="opacity-50">CLUSTER {hover.node.cluster}</span>
          </div>
          <div className="font-semibold text-cyan-100">{hover.node.docTitle}</div>
          <p className="mt-1 text-cyan-200/80">"{hover.node.preview}…"</p>
          <p className="mt-1 font-mono text-[9px] text-cyan-400/60">
            POS [{hover.node.x.toFixed(2)}, {hover.node.y.toFixed(2)}, {hover.node.z.toFixed(2)}] · W {hover.node.weight.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
