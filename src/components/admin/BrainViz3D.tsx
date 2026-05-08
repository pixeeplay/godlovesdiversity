'use client';
/**
 * BrainViz3D — visualisation 3D interactive du cerveau RAG via Three.js (CDN).
 *
 * Affiche dans un canvas WebGL :
 *   - Un cerveau central wireframe (Icosahedron) qui pulse à la fréquence vitale
 *   - Les chunks projetés en 3D (PCA 3 composantes) comme particules colorées par cluster
 *   - Les synapses (top similarités) comme arêtes lumineuses entre nœuds
 *   - Halo radial pulsant (sprite billboard)
 *   - Étoiles d'arrière-plan (geometry buffer)
 *
 * Interactivité (sans OrbitControls externe, on l'écrit minimal) :
 *   - Drag souris : rotation
 *   - Molette : zoom
 *   - Hover : tooltip sur le chunk survolé
 *
 * Three.js est chargé via CDN au mount (pas de npm dependency).
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

const CLUSTER_COLORS = [
  0xf43f5e, 0xec4899, 0xa855f7, 0x6366f1,
  0x0ea5e9, 0x06b6d4, 0x10b981, 0xf59e0b,
];

declare global {
  interface Window { THREE?: any }
}

export function BrainViz3D({ nodes, synapses, pulseHz, glowColor }: {
  nodes: Node3D[];
  synapses: Synapse[];
  pulseHz: number;
  glowColor: string; // ex: "#a855f7"
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ node: Node3D; x: number; y: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cleanup: (() => void) | undefined;

    const init = () => {
      if (!window.THREE || !containerRef.current) return;
      const THREE = window.THREE;
      const container = containerRef.current;

      const W = container.clientWidth;
      const H = container.clientHeight || 500;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x020617); // slate-950

      // Camera perspective
      const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
      camera.position.set(0, 0, 4);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lumières
      const ambient = new THREE.AmbientLight(0x404060, 0.6);
      scene.add(ambient);
      const point = new THREE.PointLight(0xffffff, 1.5, 20);
      point.position.set(3, 3, 5);
      scene.add(point);

      // === CERVEAU CENTRAL : icosphère wireframe pulsante ===
      const brainGeom = new THREE.IcosahedronGeometry(0.5, 2);
      const brainMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(glowColor),
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      const brain = new THREE.Mesh(brainGeom, brainMat);
      scene.add(brain);

      // Inner glow sphere
      const innerGeom = new THREE.SphereGeometry(0.35, 32, 32);
      const innerMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(glowColor),
        transparent: true,
        opacity: 0.18,
      });
      const innerSphere = new THREE.Mesh(innerGeom, innerMat);
      scene.add(innerSphere);

      // === HALO sprite ===
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = 256; haloCanvas.height = 256;
      const hctx = haloCanvas.getContext('2d')!;
      const grad = hctx.createRadialGradient(128, 128, 10, 128, 128, 128);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(0.5, glowColor + '55');
      grad.addColorStop(1, glowColor + '00');
      hctx.fillStyle = grad;
      hctx.fillRect(0, 0, 256, 256);
      const haloTex = new THREE.CanvasTexture(haloCanvas);
      const haloMat = new THREE.SpriteMaterial({ map: haloTex, transparent: true, opacity: 0.4, depthWrite: false });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.set(2.5, 2.5, 1);
      scene.add(halo);

      // === CONSTELLATION : particules par cluster ===
      // Une géométrie buffer par cluster pour avoir 1 couleur par groupe
      const clusterGroups: any[] = [];
      const nodeMeshes: { node: Node3D; mesh: any }[] = [];

      // On crée des sphères individuelles pour permettre le hover (sinon il faudrait raycaster sur Points)
      for (const n of nodes) {
        const geom = new THREE.SphereGeometry(0.025 + n.weight * 0.05, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length],
        });
        const m = new THREE.Mesh(geom, mat);
        // Rayon orbital : on étire les coords PCA en sphère
        m.position.set(n.x * 1.6, n.y * 1.6, n.z * 1.6);
        m.userData = { node: n };
        scene.add(m);
        nodeMeshes.push({ node: n, mesh: m });
      }

      // === SYNAPSES : lignes ===
      const synapseGroup = new THREE.Group();
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      for (const syn of synapses) {
        const a = nodeMap.get(syn.fromId);
        const b = nodeMap.get(syn.toId);
        if (!a || !b) continue;
        const geom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(a.x * 1.6, a.y * 1.6, a.z * 1.6),
          new THREE.Vector3(b.x * 1.6, b.y * 1.6, b.z * 1.6),
        ]);
        const mat = new THREE.LineBasicMaterial({
          color: CLUSTER_COLORS[a.cluster % CLUSTER_COLORS.length],
          transparent: true,
          opacity: 0.3 + syn.similarity * 0.4,
        });
        synapseGroup.add(new THREE.Line(geom, mat));
      }
      scene.add(synapseGroup);

      // === STARFIELD ===
      const starGeom = new THREE.BufferGeometry();
      const starCount = 200;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
      starGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.03, transparent: true, opacity: 0.6 });
      scene.add(new THREE.Points(starGeom, starMat));

      // === INTERACTIVITY MAISON (drag rotation, wheel zoom, hover raycast) ===
      const camPos = { theta: 0, phi: Math.PI / 2, radius: 4 };
      let isDragging = false;
      let lastMouse = { x: 0, y: 0 };

      const updateCamera = () => {
        camera.position.x = camPos.radius * Math.sin(camPos.phi) * Math.cos(camPos.theta);
        camera.position.y = camPos.radius * Math.cos(camPos.phi);
        camera.position.z = camPos.radius * Math.sin(camPos.phi) * Math.sin(camPos.theta);
        camera.lookAt(0, 0, 0);
      };
      camPos.theta = Math.PI / 2;
      updateCamera();

      const onMouseDown = (e: MouseEvent) => { isDragging = true; lastMouse = { x: e.clientX, y: e.clientY }; };
      const onMouseUp = () => { isDragging = false; };
      const onMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const dx = e.clientX - lastMouse.x;
          const dy = e.clientY - lastMouse.y;
          camPos.theta -= dx * 0.005;
          camPos.phi = Math.max(0.1, Math.min(Math.PI - 0.1, camPos.phi - dy * 0.005));
          lastMouse = { x: e.clientX, y: e.clientY };
          updateCamera();
        }
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        camPos.radius = Math.max(1.5, Math.min(15, camPos.radius + e.deltaY * 0.005));
        updateCamera();
      };

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

      renderer.domElement.style.cursor = 'grab';
      renderer.domElement.addEventListener('mousedown', (e) => { onMouseDown(e); renderer.domElement.style.cursor = 'grabbing'; });
      window.addEventListener('mouseup', () => { onMouseUp(); renderer.domElement.style.cursor = 'grab'; });
      window.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('mousemove', onHoverMove);
      renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
      renderer.domElement.addEventListener('mouseleave', () => setHover(null));

      // Resize handler
      const onResize = () => {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight || 500;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', onResize);

      // === ANIMATION LOOP ===
      let animId: number;
      const startTime = Date.now();
      const animate = () => {
        const t = (Date.now() - startTime) / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * pulseHz * 2 * Math.PI);
        // Cerveau central pulse
        const scale = 1 + pulse * 0.15;
        brain.scale.setScalar(scale);
        brain.rotation.y += 0.003;
        brain.rotation.x += 0.001;
        innerSphere.scale.setScalar(scale);
        // Halo pulse
        haloMat.opacity = 0.25 + pulse * 0.25;
        halo.scale.setScalar(2.2 + pulse * 0.6);
        // Auto-rotate doucement les nodes (effet orbital)
        synapseGroup.rotation.y -= 0.001;

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };
      animate();
      setLoaded(true);

      cleanup = () => {
        cancelAnimationFrame(animId);
        renderer.domElement.removeEventListener('wheel', onWheel as any);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp as any);
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

    // Charge Three.js depuis CDN si pas déjà
    if (window.THREE) {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
      script.async = true;
      script.onload = init;
      document.head.appendChild(script);
    }

    return () => cleanup?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, synapses.length, glowColor, pulseHz]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-800" style={{ height: 560 }}>
      <div ref={containerRef} className="h-full w-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
          <div className="text-center">
            <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-fuchsia-500" />
            Chargement Three.js…
          </div>
        </div>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-md rounded-lg bg-slate-900/95 p-3 text-xs ring-1 ring-fuchsia-500/40 backdrop-blur"
          style={{ left: Math.min(hover.x + 14, 600), top: Math.max(hover.y + 14, 0) }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#' + CLUSTER_COLORS[hover.node.cluster % CLUSTER_COLORS.length].toString(16).padStart(6, '0') }} />
            <span className="font-semibold text-slate-100">{hover.node.docTitle}</span>
          </div>
          <p className="text-slate-300">"{hover.node.preview}…"</p>
          <p className="mt-1 font-mono text-[10px] text-slate-500">
            cluster {hover.node.cluster} · weight {hover.node.weight.toFixed(2)} · ({hover.node.x.toFixed(2)}, {hover.node.y.toFixed(2)}, {hover.node.z.toFixed(2)})
          </p>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-slate-900/80 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur">
        🖱️ Drag = rotation · Molette = zoom · Hover = détail chunk
      </div>
      <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-slate-900/80 px-3 py-1.5 text-[10px] text-slate-400 backdrop-blur">
        {nodes.length} chunks · {synapses.length} synapses
      </div>
    </div>
  );
}
