import * as THREE from "three";

const TECH = [
  "JavaScript", "Node.js", "Express", "Python", "Go", "Docker",
  "Linux", "MongoDB", "MQTT", "Cloudflare", "Railway", "Vercel",
];

const GREEN = new THREE.Color("#3ddc84").convertSRGBToLinear();
const AMBER = new THREE.Color("#f2a65a").convertSRGBToLinear();

/* 34px monogram glyphs: one shared scene, one shared material, distinct shapes.
   Twelve WebGL contexts would cost far more than it looks. */
const SHAPES = [
  (g) => new THREE.BoxGeometry(1.15, 1.15, 1.15),
  () => new THREE.IcosahedronGeometry(0.82, 0),
  () => new THREE.TorusGeometry(0.62, 0.22, 16, 40),
  () => new THREE.OctahedronGeometry(0.88, 0),
  () => new THREE.TetrahedronGeometry(0.98, 0),
  () => new THREE.DodecahedronGeometry(0.8, 0),
  () => new THREE.TorusKnotGeometry(0.46, 0.15, 64, 12),
  () => new THREE.SphereGeometry(0.78, 20, 14),
  () => new THREE.ConeGeometry(0.72, 1.2, 4),
  () => new THREE.CylinderGeometry(0.66, 0.66, 1, 6),
  () => new THREE.IcosahedronGeometry(0.8, 1),
  () => new THREE.TorusGeometry(0.62, 0.18, 12, 8),
];

export function buildTechGrid(container) {
  const items = [];

  for (const [i, name] of TECH.entries()) {
    const card = document.createElement("div");
    card.className = "tech";
    card.setAttribute("data-intro", "");

    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.textContent = name;

    card.append(canvas, label);
    container.append(card);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(34, 34, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    camera.position.set(0, 0, 3.4);

    const geom = SHAPES[i % SHAPES.length]();
    const mesh = new THREE.Mesh(geom, new THREE.MeshPhysicalMaterial({
      color: 0x101415,
      metalness: 1,
      roughness: 0.26,
      clearcoat: 1,
      clearcoatRoughness: 0.16,
      iridescence: 0.6,
      iridescenceIOR: 1.35,
      iridescenceThicknessRange: [200, 500],
    }));

    /* Edge lines carry the accent (converted to linear — see scene.js).
       Every third glyph gets amber so the grid reads as two materials, not one tint. */
    const edgeColor = i % 3 === 2 ? AMBER : GREEN;
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geom, 24),
      new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.55 })
    );

    const l1 = new THREE.DirectionalLight(0xf4f1ea, 2.2);
    l1.position.set(2, 3, 4);
    const l2 = new THREE.DirectionalLight(GREEN, 1.8);
    l2.position.set(-3, -1, 2);

    scene.add(mesh, edges, l1, l2, new THREE.AmbientLight(0x2b3430, 1));

    items.push({
      card, renderer, scene, camera, geom,
      mesh, edges,
      speed: 0.25 + (i % 5) * 0.08,
      offset: i * 0.8,
    });
  }

  let visible = true;
  const onVisibility = () => { visible = !document.hidden; };
  document.addEventListener("visibilitychange", onVisibility);

  // Only render glyphs while the stack section is on screen.
  let inView = false;
  const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }, { rootMargin: "120px" });
  io.observe(container);

  const start = performance.now();
  let raf = 0;

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!visible || !inView) return;

    const t = (now - start) / 1000;

    for (const it of items) {
      it.mesh.rotation.set(Math.sin(t * 0.5 + it.offset) * 0.3, t * it.speed + it.offset, 0);
      it.edges.rotation.copy(it.mesh.rotation);
      it.renderer.render(it.scene, it.camera);
    }
  }

  raf = requestAnimationFrame(loop);

  return {
    dispose() {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      for (const it of items) {
        it.renderer.dispose();
        it.geom.dispose();
        it.mesh.material.dispose();
        it.edges.geometry.dispose();
        it.edges.material.dispose();
      }
    },
  };
}
