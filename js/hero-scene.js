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
  color: 0x07171a,
  side: THREE.BackSide,
});

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
const BED_TOP = -0.48; // dno modelu: těsně nad mřížkou (−0.49), ne v ní
const RAFT_H = 0.35;   // tenká podložní deska — kryje spodní vrstvy modelu

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
    uv[j] = 0;
    uv[j + 1] = Math.max(triangles[i + 2] / LAYER_MM, 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // spodek trupu (s vyrytým symbolem na dně) je pohřben uvnitř raftu — deska
  // ho zakryje z depth testu; loď vystupuje až nad její vršek
  geo.translate(0, BED_TOP + 0.02, 0);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, layerMat));
  group.add(new THREE.Mesh(geo, innerMat));
  printGroup.add(group);
  return group;
}

// raft — tenká deska pod modelem, statická (tiskne se „před začátkem", na startu je)
const raft = new THREE.Mesh(
  new THREE.CylinderGeometry(1, 1, RAFT_H, 48),
  new THREE.MeshStandardMaterial({ color: 0x3da893, roughness: 0.7, metalness: 0.0 })
);
raft.scale.set(3.6, 1, 2.0);
raft.position.y = BED_TOP + RAFT_H / 2;
printGroup.add(raft);

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
  // loď roste od dna (h=0) — raft je statická deska pod ní, nic neblokuje
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
  // h měřím od vršku raftu (BED_TOP + RAFT_H) — h=0 → viditelný jen raft
  clip.constant = hCurrent + BED_TOP + RAFT_H;

  const printing = benchy && hCurrent < PRINT_TOP - 0.01 && hCurrent > 0.001;
  nozzleGroup.visible = printing;
  if (printing) {
    // pomalý přejezd přes celou šířku modelu (tam a zpět), špička těsně na
    // povrchu nejvyšší vytisknuté vrstvy
    const sweep = Math.sin((t * Math.PI * 2) / 2.6) * 2.8;
    nozzleGroup.position.set(sweep, clip.constant + 0.1, 0);
  }

  if (benchy) {
    benchy.rotation.y = Math.sin(t * 0.3) * 0.3 + mouseX;
  }
  renderer.render(scene, camera);
});
