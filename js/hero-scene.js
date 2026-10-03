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

// --- Tisková podložka (matná — bez odlesků) ---
const bed = new THREE.Mesh(
  new THREE.CylinderGeometry(4.4, 4.4, 0.1, 56),
  new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.95, metalness: 0.0 })
);
bed.position.y = -0.55;
scene.add(bed);
const grid = new THREE.GridHelper(8.4, 32, 0x2a3450, 0x1e2739);
grid.position.y = -0.49;
scene.add(grid);

// --- Textura vrstev (FDM layer lines) — výrazné pásy, ať je tisk vidět ---
function makeLayerTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 24;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4fd6be';
  ctx.fillRect(0, 0, 8, 24);
  // hluboká tmavá drážka mezi vrstvami — při 1,1 mm vrstvě čitelná čára
  ctx.fillStyle = 'rgba(2, 10, 12, 0.9)';
  ctx.fillRect(0, 0, 8, 7);
  // světlý „lesk" čerstvě vytlačené vrstvy
  ctx.fillStyle = 'rgba(200, 255, 245, 0.35)';
  ctx.fillRect(0, 7, 8, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.magFilter = THREE.NearestFilter; // ostré hrany vrstev, bez rozmytí
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
const layerMat = new THREE.MeshStandardMaterial({
  map: makeLayerTexture(),
  roughness: 0.62,       // matnější — méně divných odlesků
  metalness: 0.0,
  emissive: 0x4fd6be,
  emissiveIntensity: 0.16,
  side: THREE.FrontSide, // vnější povrch; vnitřek řeší tmavý inner mesh níže
});
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
layerMat.clippingPlanes = [clip];

// Tmavý „vnitřek" — stejná geometrie, BackSide, plochá tmavá barva (nesvítí).
// Bez něj řez odkryl teal vnitřní stěny a trup vypadal skleněně průsvitný.
const innerMat = new THREE.MeshBasicMaterial({
  color: 0x07171a,
  side: THREE.BackSide,
  clippingPlanes: [clip],
});

const LAYER_MM = 1.1; // vizuální tloušťka vrstvy — hustší a výraznější (reálných 0,2 mm by se nevykreslily)

// --- Tryska: vozík + kužel, jezdí nad aktuální vrstvou ---
const nozzleGroup = new THREE.Group();
const carriage = new THREE.Mesh(
  new THREE.BoxGeometry(0.7, 0.28, 0.9),
  new THREE.MeshStandardMaterial({ color: 0x2a3450, roughness: 0.7, metalness: 0.3 })
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
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, layerMat));       // vnější povrch
  group.add(new THREE.Mesh(geo, innerMat));       // tmavý vnitřek dutin
  scene.add(group);
  return group;
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
const PRINT_SECONDS = 26;   // pomalejší = klidnější skoky (~1,7 vrstvy/s)
const PAUSE_SECONDS = 5;

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

// Kvantizace na vrstvy — tiskárna netiskne kontinuálně: vytiskne vrstvu,
// zvedne Z, tiskne další. Clipping h proto skáče po LAYER_MM, ne plynule.
const LAYER_SCENE = LAYER_MM * (6.4 / 60) * (60 / 60); // tloušťka vrstvy ve scénových jednotkách (LAYER_MM × škála s)
function layerStep(h) {
  return Math.max(0.15, Math.floor(h / LAYER_SCENE) * LAYER_SCENE + LAYER_SCENE * 0.6);
}

renderer.setAnimationLoop(() => {
  resize();
  const t = clock.getElapsedTime();

  let h = PRINT_TOP;
  if (!prefersReduced && benchy) {
    const cycle = PRINT_SECONDS + PAUSE_SECONDS;
    const phase = t % cycle;
    if (phase < PRINT_SECONDS) {
      h = 0.15 + (PRINT_TOP - 0.15) * easeInOut(phase / PRINT_SECONDS);
      h = layerStep(h); // ← SKOKY PO VRSTVÁCH
    }
  }
  clip.constant = h;

  const printing = benchy && h < PRINT_TOP - 0.01;
  nozzleGroup.visible = printing;
  if (printing) {
    // tryska jede horizontálně uvnitř vrstvy, mezi vrstvami SKOČÍ o vrstvu výš
    const inLayerT = (t % 1.1) / 1.1;               // pohyb uvnitř jedné vrstvy ~1,1 s
    const x = Math.sin(inLayerT * Math.PI) * 2.6;   // doleva-doprava (tam a zpět)
    nozzleGroup.position.set(x, h + 0.02, 0.4);
  }

  if (benchy) {
    // jen yaw kolem svislé osy — naklánění (rotation.z) píchalo trup skrz podložku
    benchy.rotation.y = Math.sin(t * 0.3) * 0.3 + mouseX;
  }
  renderer.render(scene, camera);
});
