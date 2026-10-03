// Hero 3D scéna: animace „tisku" vrstev pomocí Three.js.
// Barvy v souladu s LazyVim paletou (accent #7aa2f7, teal #4fd6be).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('hero-canvas');
const LAYERS = 28;

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 2.4, 7);
camera.lookAt(0, 1.2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(4, 8, 5);
scene.add(key);
const rim = new THREE.PointLight(0x4fd6be, 30, 20);
rim.position.set(-4, 3, -3);
scene.add(rim);

// Tisková podložka
const bed = new THREE.Mesh(
  new THREE.CylinderGeometry(2.6, 2.6, 0.12, 48),
  new THREE.MeshStandardMaterial({ color: 0x1a1f2e, roughness: 0.6 })
);
bed.position.y = -0.06;
scene.add(bed);

// Vrstvy modelu — mírně rozdílné velikosti, vypadá to jako reálný tisk
const layerGroup = new THREE.Group();
const layers = [];
for (let i = 0; i < LAYERS; i++) {
  const t = i / (LAYERS - 1);                      // 0..1
  const r = 1.1 - 0.45 * Math.pow(t, 2) + (i % 3) * 0.012;
  const layer = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, 0.12, 40),
    new THREE.MeshStandardMaterial({ color: 0x7aa2f7, roughness: 0.35, emissive: 0x7aa2f7, emissiveIntensity: 0.06 })
  );
  layer.position.y = 0.1 + i * 0.115;
  layer.scale.set(1, 0.05, 1); // ve vysokém „stlačení", roste při tisku
  layerGroup.add(layer);
  layers.push(layer);
}
scene.add(layerGroup);

const clock = new THREE.Clock();
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 0.6;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 0.3;
});

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const layerInterval = prefersReduced ? 0 : 0.28; // s na vrstvu (0 = celé najednou)
if (prefersReduced) for (const l of layers) l.scale.y = 1;

let printed = prefersReduced ? LAYERS : 0;
let nextLayerAt = 0;

renderer.setAnimationLoop(() => {
  resize();
  const t = clock.getElapsedTime();

  if (!prefersReduced) {
    if (t >= nextLayerAt && printed < LAYERS) {
      layers[printed].scale.y = 1;
      printed++;
      nextLayerAt = t + layerInterval;
      if (printed === LAYERS) nextLayerAt = t + 2.2; // pauza, pak smyčka znovu
    }
    if (printed === LAYERS && t >= nextLayerAt) {
      for (const l of layers) l.scale.y = 0.05;
      printed = 0;
    }
  }

  layerGroup.rotation.y = t * 0.25 + mouseX;
  layerGroup.position.y = Math.sin(t * 0.8) * 0.06 + mouseY * 0.5;
  renderer.render(scene, camera);
});
