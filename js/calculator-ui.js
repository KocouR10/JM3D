// UI vrstva kalkulačky: STL upload (drag & drop), ruční zadání, živá cena.
import { PRICING } from './config.js';
import { parseSTL, meshStats } from './stl-parser.js';
import { calculatePrice, validateInputs } from './calculator.js';

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

const els = {
  modeStl: document.querySelector('[data-mode="stl"]'),
  modeManual: document.querySelector('[data-mode="manual"]'),
  drop: document.getElementById('calc-drop'),
  file: document.getElementById('calc-file'),
  manual: document.getElementById('calc-manual'),
  material: document.getElementById('calc-material'),
  infill: document.getElementById('calc-infill'),
  infillOut: document.getElementById('infill-out'),
  pieces: document.getElementById('calc-pieces'),
  post: document.getElementById('calc-post'),
  error: document.getElementById('calc-error'),
  result: document.getElementById('calc-result'),
  price: document.getElementById('calc-price-value'),
  grams: document.getElementById('calc-grams'),
  hours: document.getElementById('calc-hours'),
  volume: document.getElementById('calc-volume'),
  bbox: document.getElementById('calc-bbox'),
  loaded: document.getElementById('calc-loaded'),
  empty: document.querySelector('.calc-drop-empty'),
  filename: document.getElementById('calc-filename'),
  tris: document.getElementById('calc-tris'),
  preview: document.getElementById('calc-preview'),
  clear: document.getElementById('calc-clear'),
};

let model = null; // { volumeCm3, bbox } | null

// --- Režimy ---
for (const btn of [els.modeStl, els.modeManual]) {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    els.modeStl.classList.toggle('is-active', mode === 'stl');
    els.modeManual.classList.toggle('is-active', mode === 'manual');
    els.modeStl.setAttribute('aria-selected', mode === 'stl');
    els.modeManual.setAttribute('aria-selected', mode === 'manual');
    els.drop.hidden = mode !== 'stl';
    els.manual.hidden = mode !== 'manual';
    model = null;
    els.loaded.hidden = true;
    els.empty.hidden = false;
    els.file.value = '';
    recalc();
  });
}

// --- STL upload ---
els.file.addEventListener('change', () => els.file.files[0] && readFile(els.file.files[0]));
for (const [type, on] of [['dragenter', true], ['dragover', true], ['dragleave', false], ['drop', false]]) {
  els.drop.addEventListener(type, (e) => {
    e.preventDefault();
    els.drop.classList.toggle('is-dragover', on);
    if (type === 'drop') {
      const file = e.dataTransfer?.files?.[0];
      if (file) readFile(file);
    }
  });
}

function readFile(file) {
  hideError();
  if (!file.name.toLowerCase().endsWith('.stl')) {
    showError('Podporujeme jen soubory .stl.');
    return;
  }
  if (file.size > MAX_FILE_BYTES) {
    showError('Soubor je příliš velký (maximálně 50 MB). Zmenšete model nebo napište nám.');
    return;
  }
  file.arrayBuffer().then((buffer) => {
    const parsed = parseSTL(buffer); // při chybě throw → catch níže
    const stats = meshStats(parsed.triangles);
    model = stats;
    showLoaded(file.name, parsed.count, stats);
    renderPreview(parsed.triangles);
    recalc();
  }).catch((err) => showError(err.message || 'Soubor se nepodařilo přečíst.'));
}

// --- UI stavu „model načten" ---
function showLoaded(name, triCount, stats) {
  els.empty.hidden = true;
  els.loaded.hidden = false;
  els.filename.textContent = name;
  els.tris.textContent = `${triCount.toLocaleString('cs-CZ')} trojúhelníků · ${stats.volumeCm3.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })} cm³`;
}

function clearModel() {
  model = null;
  els.loaded.hidden = true;
  els.empty.hidden = false;
  els.file.value = '';
  hideError();
  recalc();
}
els.clear.addEventListener('click', clearModel);

// --- miniaturní 3D náhled nahraného modelu ---
let previewRenderer = null;

function renderPreview(triangles) {
  // Three.js se načte až při prvním uploadu — homepage bez STL netáhne 600 kB
  import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
    .then((THREE) => {
      if (!previewRenderer) {
        previewRenderer = new THREE.WebGLRenderer({ canvas: els.preview, alpha: true, antialias: true });
        previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      }
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(35, 220 / 150, 0.1, 100);
      cam.position.set(0, 0.7, 3);

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dir = new THREE.DirectionalLight(0xffffff, 1.2);
      dir.position.set(2, 3, 4);
      scene.add(dir);
      const rimL = new THREE.PointLight(0x4fd6be, 8, 10);
      rimL.position.set(-3, 2, -2);
      scene.add(rimL);

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(triangles, 3));
      geo.computeVertexNormals();
      geo.center();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: 0x57c9b8, roughness: 0.55, metalness: 0.0,
        side: THREE.DoubleSide,
      }));
      // škálujeme podle bounding sphere, ať je cokoliv v canvasu vidět
      geo.computeBoundingSphere();
      const r = geo.boundingSphere.radius || 1;
      mesh.scale.setScalar(1.4 / r);
      scene.add(mesh);

      previewRenderer.setSize(220, 150, false);
      previewRenderer.render(scene, cam);
      let spin = 0;
      const spinLoop = () => {
        if (!model) return; // model smazán → stop
        spin += 0.012;
        mesh.rotation.y = spin;
        previewRenderer.render(scene, cam);
        requestAnimationFrame(spinLoop);
      };
      spinLoop();
    })
    .catch(() => {/* CDN nedostupné — náhled prostě nezobrazí, cena počítá dál */});
}

// --- Ruční zadání ---
for (const id of ['dim-x', 'dim-y', 'dim-z', 'dim-fill']) {
  document.getElementById(id).addEventListener('input', () => {
    model = manualVolume();
    recalc();
  });
}

function manualVolume() {
  const x = parseFloat(document.getElementById('dim-x').value);
  const y = parseFloat(document.getElementById('dim-y').value);
  const z = parseFloat(document.getElementById('dim-z').value);
  const fill = Math.min(parseFloat(document.getElementById('dim-fill').value) || 0, 100); // horní mez výplně
  if (![x, y, z, fill].every(Number.isFinite) || x <= 0 || y <= 0 || z <= 0 || fill <= 0) {
    return null; // žádná hláška, jen ještě není co počítat
  }
  return { volumeCm3: (x * y * z * (fill / 100)) / 1000, bbox: { x, y, z } };
}

// --- Společné parametry ---
els.infill.addEventListener('input', () => {
  els.infillOut.value = `${els.infill.value} %`;
  recalc();
});
for (const el of [els.material, els.pieces, els.post]) {
  el.addEventListener('input', recalc);
}

// --- Výpočet a zobrazení ---
function currentInput() {
  if (!model) return null;
  return {
    volumeCm3: model.volumeCm3,
    bboxZMm: model.bbox.z,
    material: els.material.value,
    infillPct: parseFloat(els.infill.value),
    pieces: parseInt(els.pieces.value, 10),
    postProcessing: els.post.value,
  };
}

function recalc() {
  const input = currentInput();
  if (!input) {
    els.result.hidden = true;
    return;
  }
  const error = validateInputs(input);
  if (error) {
    els.result.hidden = true;
    showError(error);
    return;
  }
  hideError();
  const r = calculatePrice(input, PRICING);
  els.result.hidden = false;
  animateNumber(els.price, r.price, ' Kč');
  els.grams.textContent = formatNum(r.grams, ' g');
  els.hours.textContent = r.hours >= 1
    ? formatNum(r.hours, ' h')
    : `${Math.round(r.hours * 60)} min`;
  els.volume.textContent = formatNum(input.volumeCm3, ' cm³');
  els.bbox.textContent =
    `${fmt(model.bbox.x)} × ${fmt(model.bbox.y)} × ${fmt(model.bbox.z)} mm`;
}

function animateNumber(el, target, suffix) {
  const start = parseFloat(el.dataset.value || '0');
  el.dataset.value = String(target);
  const duration = 500;
  const t0 = performance.now();
  function tick(t) {
    const p = Math.min((t - t0) / duration, 1);
    const eased = 1 - (1 - p) * (1 - p);
    el.textContent = `${Math.round(start + (target - start) * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function formatNum(n, suffix) {
  return `${n.toLocaleString('cs-CZ', { maximumFractionDigits: 1 })}${suffix}`;
}
function fmt(n) { return Math.round(n).toLocaleString('cs-CZ'); }

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}
function hideError() { els.error.hidden = true; }
