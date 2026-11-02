import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/* Motion is eased here in the scene (framerate-independent damping) so GSAP only
   ever owns DOM tweens and the two never fight over the same property.

   Colours are hex sRGB like the CSS tokens, but three ships them straight to the
   shader as-is, so they must be converted to the linear working space or the
   accent renders lighter and duller than the same value in the DOM. */
const ACCENT = new THREE.Color("#3ddc84").convertSRGBToLinear();
const ACCENT_2 = new THREE.Color("#f2a65a").convertSRGBToLinear();

/* Copy of the CSS background so the fog disappears into the page, not above it. */
const BG = new THREE.Color("#08090a").convertSRGBToLinear();

export function createScene(canvas, { onReady } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  /* ACES desaturates highlights; 1.05 keeps the green from going grey. */
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(BG, 0.042);

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 7.5);

  /* Image-based lighting so the metal reads as metal instead of flat emissive. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;

  scene.add(new THREE.AmbientLight(0x2b3430, 0.7));

  /* Neutral key, green rim from behind-left, amber kicker low-right: the two
     accent lights are what give the metal its colour without tinting the page. */
  const key = new THREE.DirectionalLight(0xf4f1ea, 2.4);
  key.position.set(4, 6, 6);
  const rim = new THREE.DirectionalLight(ACCENT, 2.6);
  rim.position.set(-6, -2, 3);
  const kick = new THREE.DirectionalLight(ACCENT_2, 0.9);
  kick.position.set(5, -4, -3);
  scene.add(key, rim, kick);

  /* ---------------------------------------------------------------- core object
     A slowly turning knot at hero scale, doubled as a faint outer shell for depth. */
  const group = new THREE.Group();
  scene.add(group);

  const knotGeom = new THREE.TorusKnotGeometry(1.15, 0.34, 220, 32, 2, 3);

  /* Dark graphite base: the object reads as a shadowed solid and the accent
     only exists in its specular highlights — that is the whole point. */
  const metal = new THREE.MeshPhysicalMaterial({
    color: 0x0f1213,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.14,
    iridescence: 0.55,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [220, 520],
    envMapIntensity: 0.9,
  });

  const knot = new THREE.Mesh(knotGeom, metal);
  group.add(knot);

  const wireMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.2 });
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.35, 1)), wireMat);
  group.add(wire);

  /* ---------------------------------------------------------------- grounds the object without a visible floor */
  const grid = new THREE.GridHelper(60, 60, 0x1d2622, 0x141817);
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  grid.position.y = -2.6;
  scene.add(grid);

  /* ---------------------------------------------------------------- star dust */
  const dustCount = 1400;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const r = 6 + Math.random() * 16;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    dustPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    dustPos[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    dustPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const dustGeom = new THREE.BufferGeometry();
  dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeom, new THREE.PointsMaterial({
    size: 0.028, color: 0xb9c4bd, transparent: true, opacity: 0.45, depthWrite: false, sizeAttenuation: true,
  }));
  scene.add(dust);

  /* ---------------------------------------------------------------- post: restrained bloom, then colour-managed output */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.36, 0.72, 0.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  /* ---------------------------------------------------------------- input state */
  const pointer = new THREE.Vector2();
  const smooth = new THREE.Vector2();
  let targetScroll = 0;
  let scroll = 0;
  let visible = true;

  const onPointerMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    targetScroll = max > 0 ? window.scrollY / max : 0;
  };

  const onVisibility = () => { visible = !document.hidden; };

  const onResize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  };

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("scroll", readScroll, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
  readScroll();

  const clock = new THREE.Clock();
  let raf = 0;
  let firstFrame = true;

  function frame() {
    raf = requestAnimationFrame(frame);
    if (!visible) return;

    const t = clock.getElapsedTime();
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = 1 - Math.pow(0.001, dt); // frame-rate independent damping

    scroll += (targetScroll - scroll) * k * 0.9;
    smooth.x += (pointer.x - smooth.x) * k * 0.6;
    smooth.y += (pointer.y - smooth.y) * k * 0.6;

    knot.rotation.y = t * 0.16 + scroll * 2.4;
    knot.rotation.x = Math.sin(t * 0.22) * 0.18 - smooth.y * 0.2;
    wire.rotation.y = -t * 0.06;
    wire.rotation.z = t * 0.03;
    dust.rotation.y = t * 0.014;

    const s = 1 - scroll * 0.32;
    group.scale.setScalar(s);
    group.position.set(scroll * 1.9, -scroll * 1.6, 0);
    grid.position.z = scroll * 2.4;
    grid.position.y = -2.6 - scroll * 3.4;
    grid.material.opacity = 0.5 * (1 - scroll * 0.85);

    camera.position.x += (smooth.x * 0.65 - camera.position.x) * k * 0.7;
    camera.position.y += (smooth.y * 0.4 + scroll * 1.6 - camera.position.y) * k * 0.7;
    camera.position.z = 7.5 - scroll * 1.6;
    camera.lookAt(0, -scroll * 0.8, 0);

    bloom.strength = 0.36 + Math.sin(t * 0.9) * 0.05;

    composer.render();

    if (firstFrame) {
      firstFrame = false;
      onReady?.();
    }
  }

  frame();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      envRT.dispose();
      pmrem.dispose();
      composer.dispose();
      renderer.dispose();
      knotGeom.dispose();
      metal.dispose();
    },
  };
}
