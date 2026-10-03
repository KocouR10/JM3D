// Hero 3D scéna: SKUTEČNÝ 3D Benchy (assets/3DBenchy.stl), který se „tiskne"
// vrstvu po vrstvě — clipping plane stoupá, nad ním jezdí tryska.
// STL parsuje náš vlastní js/stl-parser.js (ten samý, co v kalkulačce).
// Barvy: LazyVim paleta (teal #4fd6be loďka, accent #7aa2f7 světla).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { parseSTL, meshStats } from './stl-parser.js';

const canvas = document.getElementById('hero-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 3, 10.5);
camera.lookAt(0, 2.2, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(5, 9, 6);
scene.add(key);
const rim = new THREE.PointLight(0x7aa2f7, 40, 25);
rim.position.set(-5, 4, -4);
scene.add(rim);
const fillLight = new THREE.PointLight(0xbb9af7, 12, 20);
fillLight.position.set(2, 2, 6);
scene.add(fillLight);

// --- Tisková podložka s mřížkou ---
const bed = new THREE.Mesh(
  new THREE.CylinderGeometry(4.4, 4.4, 0.1, 56),
  new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.55, metalness: 0.3 })
);
bed.position.y = -0.55;
scene.add(bed);
const grid = new THREE.GridHelper(8.4, 32, 0x2a3450, 0x1e2739);
grid.position.y = -0.49;
scene.add(grid);

// --- Textura vrstev (FDM layer lines) — jeden tmavý pás na tile ---
function makeLayerTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4fd6be';
  ctx.fillRect(0, 0, 4, 8);
  ctx.fillStyle = 'rgba(8, 18, 20, 0.55)';
  ctx.fillRect(0, 0, 4, 2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
const layerMat = new THREE.MeshStandardMaterial({
  map: makeLayerTexture(),
  roughness: 0.42,
  metalness: 0.05,
  emissive: 0x4fd6be,
  emissiveIntensity: 0.12,
});

// Clipping: viditelné je jen y < h — rostoucí rovina = tisk
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
layerMat.clippingPlanes = [clip];

const LAYER_MM = 1.4; // vizuální tloušťka vrstvy (reálných 0,2 mm by se nevykreslily)

// --- Tryska: vozík + kužel, jezdí nad aktuální vrstvou ---
const nozzleGroup = new THREE.Group();
const carriage = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.28, 0.9),
  new THREE.MeshStandardMaterial({ color: 0x2a3450, roughness: 0.4, metalness: 0.6 })
);
carriage.position.y = 0.55;
nozzleGroup.add(carriage);
const nozzle = new THREE.Mesh(
  new THREE.ConeGeometry(0.16, 0.5, 16),
  new THREE.MeshStandardMaterial({ color: 0xbb9af7, emissive: 0xbb9af7, emissiveIntensity: 0.5 })
);
nozzle.rotation.x = Math.PI;
nozzle.position.y = 0.16;
nozzleGroup.add(nozzle);
const glow = new THREE.PointLight(0x4fd6be, 6, 3.5);
glow.position.y = 0.05;
nozzleGroup.add(glow);
scene.add(nozzleGroup);

let benchy = null;          // mesh — doplní se po načtení STL
let PRINT_TOP = 5.2;        // doplní se z výšky modelu

// STL osy: X = délka (60), Y = šířka (31), Z = výška (48). Scéna: Y vzhůru →
// scene.x = model.x, scene.y = model.z, scene.z = model.y
function buildBenchy(triangles, bbox) {
  const TARGET_W = 6.4;
  const s = TARGET_W / bbox.x;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(triangles.length);
  const uv = new Float32Array((triangles.length / 3) * 2);
  for (let i = 0, j = 0; i < triangles.length; i += 3, j += 2) {
    pos[i]     = triangles[i] * s;              // x: délka
    pos[i + 1] = triangles[i + 2] * s;          // y: výška (model Z)
    pos[i + 2] = triangles[i + 1] * s;          // z: šířka (model Y)
    uv[j] = 0;
    // spodní ~3 vrstvy bez tmavých pruhů (u podlahy vypadaly jako artefakt) —
    // clamp na střed plné teal části textury
    uv[j + 1] = Math.max(triangles[i + 2] / LAYER_MM, 3);    // v = počet vrstev podle model Z
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // dno modelu (model Z=0 → scene y=0) na podložku (top = −0.5)
  geo.translate(0, -0.5, 0);
  const mesh = new THREE.Mesh(geo, layerMat);
  scene.add(mesh);
  return mesh;
}

// Načtení reálného Benchyho — náš parser, stejný jako v kalkulačce
fetch('assets/3DBenchy.stl')
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  })
  .then((buffer) => {
    const parsed = parseSTL(buffer);
    const stats = meshStats(parsed.triangles);
    benchy = buildBenchy(parsed.triangles, stats.bbox);
    PRINT_TOP = stats.bbox.z * (6.4 / stats.bbox.x) + 0.2; // výška = model Z
    if (prefersReduced) clip.constant = PRINT_TOP; // bez animace: celý Benchy
  })
  .catch((err) => console.warn('Benchy STL se nenačetl:', err));

// --- Animace tisku ---
const PRINT_SECONDS = 11;
const PAUSE_SECONDS = 4;

const clock = new THREE.Clock();
let mouseX = 0, mouseY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 0.5;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 0.25;
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

function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

renderer.setAnimationLoop(() => {
  resize();
  const t = clock.getElapsedTime();

  let h = PRINT_TOP;
  if (!prefersReduced && benchy) {
    const cycle = PRINT_SECONDS + PAUSE_SECONDS;
    const phase = t % cycle;
    if (phase < PRINT_SECONDS) {
      h = 0.15 + (PRINT_TOP - 0.15) * easeInOut(phase / PRINT_SECONDS);
    }
  }
  clip.constant = h;

  const printing = benchy && h < PRINT_TOP - 0.01;
  nozzleGroup.visible = printing;
  if (printing) {
    nozzleGroup.position.set(Math.sin(t * 6) * 2.6, h + 0.02, 0.4);
  }

  if (benchy) {
    // jen yaw kolem svislé osy — naklánění (rotation.z) píchalo trup skrz podložku
    benchy.rotation.y = Math.sin(t * 0.3) * 0.3 + mouseX;
  }
  renderer.render(scene, camera);
});
