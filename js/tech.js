import * as THREE from "three";

const TECH = [
  "JavaScript", "Node.js", "Express", "Python", "Go", "Docker",
  "Linux", "MongoDB", "MQTT", "Cloudflare", "Railway", "Vercel",
];

const GREEN = new THREE.Color("#3ddc84").convertSRGBToLinear();
const AMBER = new THREE.Color("#f2a65a").convertSRGBToLinear();

const SHAPES = [
  () => new THREE.BoxGeometry(1.15, 1.15, 1.15),
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

/* Render each monogram once on a single hidden renderer and swap in the
   resulting PNG. One WebGL context total: phone browsers force-loss contexts
   past ~8-12 (the hero scene is the oldest, so it dies first), and Mali GPUs
   present never-cleared buffers as white frames. Static images sidestep all
   of it while keeping the identical 3D look. */
export function buildTechGrid(container) {
  const size = 136; /* supersampled 2x of the 68px display box */
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
  camera.position.set(0, 0, 3.4);
  const l1 = new THREE.DirectionalLight(0xf4f1ea, 2.2);
  l1.position.set(2, 3, 4);
  const l2 = new THREE.DirectionalLight(GREEN, 1.8);
  l2.position.set(-3, -1, 2);
  const ambient = new THREE.AmbientLight(0x2b3430, 1);

  TECH.forEach((name, i) => {
    const card = document.createElement("div");
    card.className = "tech";
    card.setAttribute("data-intro", "");

    const img = document.createElement("img");
    img.alt = "";
    img.width = 34;
    img.height = 34;
    img.decoding = "async";

    const label = document.createElement("span");
    label.textContent = name;
    card.append(img, label);
    container.append(card);

    try {
      const scene = new THREE.Scene();
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
      /* every third glyph gets amber so the grid reads as two materials */
      const edgeColor = i % 3 === 2 ? AMBER : GREEN;
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom, 24),
        new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.55 })
      );
      scene.add(mesh, edges, l1.clone(), l2.clone(), ambient.clone());

      /* fixed, deliberate pose per glyph — quiet, consistent, zero GPU after this */
      mesh.rotation.set(Math.sin(i * 1.7) * 0.35, 0.55 + i * 0.35, 0);
      edges.rotation.copy(mesh.rotation);

      renderer.render(scene, camera);
      img.src = renderer.domElement.toDataURL("image/png");

      geom.dispose();
      edges.geometry.dispose();
      mesh.material.dispose();
      edges.material.dispose();
    } catch (err) {
      console.error("Glyph failed:", name, err);
      card.remove();
    }
  });

  renderer.dispose();
  return null;
}
