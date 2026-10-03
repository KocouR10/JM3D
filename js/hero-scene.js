// Hero 3D scéna: klasický 3D Benchy (benchmark loďka), který se „tiskne"
// vrstvu po vrstvě — clipping plane stoupá, nad ním jezdí tryska.
// Barvy: LazyVim paleta (teal #4fd6be loďka, accent #7aa2f7 světla).
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('hero-canvas');

const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 2.6, 9.5);
camera.lookAt(0, 1.4, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const key = new THREE.DirectionalLight(0xffffff, 1.3);
key.position.set(5, 9, 6);
scene.add(key);
const rim = new THREE.PointLight(0x7aa2f7, 40, 25); // modré odsvětlení kontur
rim.position.set(-5, 4, -4);
scene.add(rim);
const fill = new THREE.PointLight(0xbb9af7, 12, 20); // fialová fill zepředu
fill.position.set(2, 2, 6);
scene.add(fill);

// --- Tisková podložka s jemnou mřížkou ---
const bed = new THREE.Mesh(
  new THREE.CylinderGeometry(3.4, 3.4, 0.1, 56),
  new THREE.MeshStandardMaterial({ color: 0x141a28, roughness: 0.55, metalness: 0.3 })
);
bed.position.y = -0.55;
scene.add(bed);
const grid = new THREE.GridHelper(6.4, 26, 0x2a3450, 0x1e2739);
grid.position.y = -0.49;
scene.add(grid);

// --- Textura vrstev (FDM layer lines) ---
function makeLayerTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 64;               // 1 perioda = 2 vrstvy
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4fd6be';
  ctx.fillRect(0, 0, 4, 64);
  ctx.fillStyle = 'rgba(10, 20, 22, 0.55)'; // tmavší mezera mezi vrstvami
  ctx.fillRect(0, 0, 4, 3);
  ctx.fillRect(0, 32, 4, 3);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 34);                    // ~0.12 jednotky na vrstvu
  return tex;
}
const layerMat = new THREE.MeshStandardMaterial({
  map: makeLayerTexture(),
  roughness: 0.42,
  metalness: 0.05,
  emissive: 0x4fd6be,
  emissiveIntensity: 0.12,
  clippingPlanes: [], // doplněno níže
});

// --- Silueta Benchyho (boční profil, extruze = šířka lodi) ---
// x: dševo −3..3.2 (zadní → příď), y: dno −0.35 → komín 3.9
const profile = new THREE.Shape();
profile.moveTo(3.2, 1.75);                       // špička přídě
profile.lineTo(1.25, 1.6);                       // paluba ke kabině
profile.lineTo(1.25, 3.0);                       // čelní stěna kabiny
profile.lineTo(-0.15, 3.0);                      // střecha kabiny ke komínu
profile.lineTo(-0.15, 3.95);                     // komín vzhůru
profile.lineTo(-0.85, 3.95);
profile.lineTo(-0.85, 3.0);
profile.lineTo(-3.0, 3.0);                       // střecha k zádi
profile.lineTo(-3.0, 1.05);                      // zádě hnou dolů
profile.bezierCurveTo(-1.6, -0.55, 1.7, -0.55, 3.2, 0.95); // zakřivené dno
profile.closePath();

const benchyGeo = new THREE.ExtrudeGeometry(profile, {
  depth: 2.1,
  bevelEnabled: true,
  bevelThickness: 0.14,
  bevelSize: 0.1,
  bevelSegments: 3,
  curveSegments: 24,
});
benchyGeo.center();

const benchy = new THREE.Mesh(benchyGeo, layerMat);
benchy.position.y = 1.55;                       // dno sedí na podložce
scene.add(benchy);

// Clipping: vše nad rovinou y = h je „ještě vytištěno"
const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.0); // visible y < h
layerMat.clippingPlanes = [clip];

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
const glow = new THREE.PointLight(0x4fd6be, 6, 3.5); // svit na čerstvé vrstvě
glow.position.y = 0.05;
nozzleGroup.add(glow);
scene.add(nozzleGroup);

// --- Animace tisku ---
const PRINT_TOP = 4.4;        // clipping h na konci tisku
const PRINT_SECONDS = 9;      // doba tisku
const PAUSE_SECONDS = 3;      // pauza po dokončení

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
if (prefersReduced) clip.constant = PRINT_TOP; // bez animace: celý Benchy najednou

function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

renderer.setAnimationLoop(() => {
  resize();
  const t = clock.getElapsedTime();

  let h = PRINT_TOP;
  if (!prefersReduced) {
    const cycle = PRINT_SECONDS + PAUSE_SECONDS;
    const phase = t % cycle;
    if (phase < PRINT_SECONDS) {
      h = 0.15 + (PRINT_TOP - 0.15) * easeInOut(phase / PRINT_SECONDS);
    }
    // fáze pauzy: h zůstává PRINT_TOP, pak cyklus začne znovu
  }
  clip.constant = h;

  // tryska jezdí jen během tisku
  const printing = h < PRINT_TOP - 0.01;
  nozzleGroup.visible = printing;
  if (printing) {
    nozzleGroup.position.set(Math.sin(t * 7) * 1.9, h + 0.02, 0.35);
  }

  benchy.rotation.y = Math.sin(t * 0.3) * 0.35 + mouseX; // jemné houpání + parallax
  benchy.rotation.z = Math.sin(t * 0.55) * 0.03 + mouseY * 0.15;
  renderer.render(scene, camera);
});
