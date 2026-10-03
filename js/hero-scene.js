import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { parseSTL, meshStats } from './stl-parser.js';

const canvas = document.getElementById('hero-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 3, 10.5);

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

const bed = new THREE.Mesh(
  new THREE.CylinderGeometry(4.4, 4.4, 0.1, 56),
  new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.95, metalness: 0.0 })
);
bed.position.y = -0.55;
scene.add(bed);
const grid = new THREE.GridHelper(8.4, 32, 0x2a3450, 0x1e2739);
grid.position.y = -0.49;
scene.add(grid);

const LAYER_MM = 1.1;

function makeLayerTexture() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 24;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4fd6be';
  ctx.fillRect(0, 0, 8, 24);
  ctx.fillStyle = 'rgba(2, 10, 12, 0.9)';
  ctx.fillRect(0, 0, 8, 7);
  ctx.fillStyle = 'rgba(200, 255, 245, 0.35)';
  ctx.fillRect(0, 7, 8, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const layerMat = new THREE.MeshStandardMaterial({
  map: makeLayerTexture(),
  roughness: 0.62,
  metalness: 0.0,
  emissive: 0x4fd6be,
  emissiveIntensity: 0.16,
  side: THREE.FrontSide,
});
const innerMat = new THREE.MeshBasicMaterial({
  color: 0x0d1a1d,
  side: THREE.BackSide,
});

function makeInfillTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b1517';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(79, 214, 190, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
innerMat.map = makeInfillTexture();

const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
layerMat.clippingPlanes = [clip];
innerMat.clippingPlanes = [clip];

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

// celá tisková scéna v jedné skupině — na širokých obrazovkách vpravo od textu
const printGroup = new THREE.Group();
printGroup.add(bed, grid, nozzleGroup);
scene.add(printGroup);
const CENTER_X = () => (window.innerWidth > 980 ? 2.4 : 0);
printGroup.position.x = CENTER_X();

let benchy = null;
let PRINT_TOP = 5.2;
let LAYER_SCENE = 0.12;
let sweepBands = null; // spočteno ze STL — min/max X pro hladiny výšky

// Silueta modelu: pro každou hladinu výšky min/max X z trojúhelníků, které ji protínají.
// Tryska pak jede přesně přes šířku modelu v dané výšce — ne podle ručních odhadů.
function computeSweepBands(triangles, s, top) {
  const LEVELS = 40;
  const step = top / LEVELS;
  const min = new Array(LEVELS).fill(Infinity);
  const max = new Array(LEVELS).fill(-Infinity);
  for (let i = 0; i < triangles.length; i += 9) {
    // y souřadnice trojúhelníku ve scéně (model Z × škála)
    const ys = [triangles[i + 2], triangles[i + 5], triangles[i + 8]].map((v) => v * s);
    const lo = Math.max(0, Math.floor(Math.min(...ys) / step));
    const hi = Math.min(LEVELS - 1, Math.floor(Math.max(...ys) / step));
    const xs = [triangles[i], triangles[i + 3], triangles[i + 6]].map((v) => v * s);
    for (let l = lo; l <= hi; l++) {
      if (xs[0] < min[l]) min[l] = xs[0];
      if (xs[0] > max[l]) max[l] = xs[0];
      if (xs[1] < min[l]) min[l] = xs[1];
      if (xs[1] > max[l]) max[l] = xs[1];
      if (xs[2] < min[l]) min[l] = xs[2];
      if (xs[2] > max[l]) max[l] = xs[2];
    }
  }
  const bands = [];
  for (let l = 0; l < LEVELS; l++) {
    if (min[l] <= max[l]) bands.push({ h: (l + 0.5) * step, c: (min[l] + max[l]) / 2, a: (max[l] - min[l]) / 2 });
  }
  return bands;
}

function buildBenchy(triangles, bbox) {
  const TARGET_W = 6.4;
  const s = TARGET_W / bbox.x;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(triangles.length);
  const uv = new Float32Array((triangles.length / 3) * 2);
  for (let i = 0, j = 0; i < triangles.length; i += 3, j += 2) {
    pos[i] = triangles[i] * s;
    pos[i + 1] = triangles[i + 2] * s;
    pos[i + 2] = triangles[i + 1] * s;
    uv[j] = 0.5; // konstantní střed textu — plná teal, žádné fazování podle X
    uv[j + 1] = Math.max(triangles[i + 2] / LAYER_MM, 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // spodek trupu (s vyrytým symbolem na dně) je pohřben uvnitř podložky —
  // její neprůhledný povrch ho zakryje z depth testu
  geo.translate(0, -0.55, 0);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, layerMat));
  group.add(new THREE.Mesh(geo, innerMat));
  group.add(buildInfill(s));
  printGroup.add(group);
  return group;
}

// infill — mřížka uvnitř trupu, viditelná skrz otevřený řez (jako výplň ze sliceru)
function buildInfill(s) {
  const pts = [];
  const x0 = -1.1, x1 = 1.1, z0 = -0.9, z1 = 0.9;
  const y0 = 0.4, y1 = 2.6, step = 0.55;
  const xs = []; for (let x = x0; x <= x1 + 0.01; x += step) xs.push(x);
  const zs = []; for (let z = z0; z <= z1 + 0.01; z += step) zs.push(z);
  const ys = []; for (let y = y0; y <= y1 + 0.01; y += step) ys.push(y);
  for (const x of xs) for (const z of zs) pts.push(x, y0, z, x, y1, z);           // svislé
  for (const y of ys) {
    for (const z of zs) pts.push(x0, y, z, x1, y, z);                              // podél X
    for (const x of xs) pts.push(x, y, z0, x, y, z1);                              // podél Z
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts), 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0x4fd6be, transparent: true, opacity: 0.5,
    clippingPlanes: [clip],
  });
  return new THREE.LineSegments(geo, mat);
}

fetch('assets/3DBenchy.stl')
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  })
  .then((buffer) => {
    const parsed = parseSTL(buffer);
    const stats = meshStats(parsed.triangles);
    const s = 6.4 / stats.bbox.x;
    benchy = buildBenchy(parsed.triangles, stats.bbox);
    PRINT_TOP = stats.bbox.z * s + 0.2;
    LAYER_SCENE = LAYER_MM * s;
    sweepBands = computeSweepBands(parsed.triangles, s, PRINT_TOP);
    if (prefersReduced) hCurrent = PRINT_TOP;
  })
  .catch((err) => console.warn('Benchy STL se nenačetl:', err));

const PRINT_SECONDS = 26;
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

function layerTarget(rawH) {
  // loď roste od dna (h=0) — první vrstva leží na podložce
  return Math.max(0, Math.floor(rawH / LAYER_SCENE) * LAYER_SCENE + LAYER_SCENE * 0.6);
}

let hCurrent = 0;
const HOP_SPEED = 10;

renderer.setAnimationLoop(() => {
  resize();
  printGroup.position.x = CENTER_X(); // reaguje na zmenšení okna
  camera.lookAt(CENTER_X() * 0.55, 2.2, 0);
  const dt = clock.getDelta();
  const t = clock.elapsedTime;

  let hTarget = PRINT_TOP;
  if (!prefersReduced && benchy) {
    const cycle = PRINT_SECONDS + PAUSE_SECONDS;
    const phase = t % cycle;
    if (phase < PRINT_SECONDS) {
      hTarget = layerTarget(PRINT_TOP * easeInOut(phase / PRINT_SECONDS));
    }
  }
  // skok na další vrstvu ne není telegrafní: rychle, ale plynule dojede
  hCurrent += (hTarget - hCurrent) * (1 - Math.exp(-dt * HOP_SPEED));
  // h měřím od povrchu podložky (−0.5) — h=0 → čistá podložka, spodek trupu je v ní pohřbený
  clip.constant = hCurrent - 0.5;

  const printing = benchy && hCurrent < PRINT_TOP - 0.01 && hCurrent > 0.001;
  nozzleGroup.visible = printing;
  if (printing && sweepBands && sweepBands.length) {
    // střed a rozsah přejezdu ze skutečné siluety modelu v aktuální výšce
    const LEVELS = sweepBands.length;
    const idx = Math.min(LEVELS - 1, Math.max(0, Math.floor((hCurrent / PRINT_TOP) * LEVELS)));
    const band = sweepBands[idx];
    const shrink = 0.92; // tryska zůstává mírně uvnitř okraje, nepřelétá ho
    const sweep = band.c + Math.sin((t * Math.PI * 2) / 3.4) * band.a * shrink;
    nozzleGroup.position.set(sweep, clip.constant + 0.1, 0);
  }

  if (benchy) {
    benchy.rotation.y = Math.sin(t * 0.3) * 0.3 + mouseX;
  }
  renderer.render(scene, camera);
});
