import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRICING } from '../js/config.js';
import { estimateGrams, estimateHours, calculatePrice, validateInputs, infillFactor, boxVolume } from '../js/calculator.js';

const cfg = PRICING;

test('infillFactor: 0 % → shellFactor, 100 % → 1, 20 % → 0,48', () => {
  assert.equal(infillFactor(0, cfg), cfg.shellFactor);
  assert.equal(infillFactor(100, cfg), 1);
  assert.ok(Math.abs(infillFactor(20, cfg) - 0.48) < 1e-9);
});

test('estimateGrams: kostka 1 cm³ PLA, 20 % výplň, 1 kus → 0,5952 g', () => {
  const grams = estimateGrams(1, 'PLA', 20, 1, cfg);
  assert.ok(Math.abs(grams - 1 * 1.24 * 0.48) < 1e-9, `grams=${grams}`);
});

test('estimateHours: výška 100 mm, objem 1 cm³, 1 kus → 5600 s / 3600', () => {
  const h = estimateHours(100, 1, 1, cfg);
  assert.ok(Math.abs(h - 5600 / 3600) < 1e-9, `h=${h}`);
});

test('calculatePrice: kostka 1 cm³ PLA 20 %, Z=100 mm → cena 235 Kč (nad minimem)', () => {
  const r = calculatePrice(
    { volumeCm3: 1, bboxZMm: 100, material: 'PLA', infillPct: 20, pieces: 1, postProcessing: 'none' },
    cfg
  );
  // materiál 0,5952·1,5 = 0,8928; čas 1,5556·150 = 233,333; raw 234,226 → 235
  assert.equal(r.price, 235);
  assert.ok(Math.abs(r.materialCost - 0.8928) < 1e-9);
  assert.ok(Math.abs(r.timeCost - 233.3333) < 1e-3);
  assert.equal(r.finishing, 0);
});

test('calculatePrice: miniaturní model → cena padne na minimální objednávku', () => {
  const r = calculatePrice(
    { volumeCm3: 0.01, bboxZMm: 5, material: 'PLA', infillPct: 20, pieces: 1, postProcessing: 'none' },
    cfg
  );
  assert.equal(r.price, cfg.minOrder);
});

test('calculatePrice: 3 kusy ztrojnásobí materiál, čas i úpravu', () => {
  const one = calculatePrice(
    { volumeCm3: 1, bboxZMm: 100, material: 'PETG', infillPct: 20, pieces: 1, postProcessing: 'basic' },
    cfg
  );
  const three = calculatePrice(
    { volumeCm3: 1, bboxZMm: 100, material: 'PETG', infillPct: 20, pieces: 3, postProcessing: 'basic' },
    cfg
  );
  assert.ok(Math.abs(three.materialCost - one.materialCost * 3) < 1e-9);
  assert.ok(Math.abs(three.timeCost - one.timeCost * 3) < 1e-9);
  assert.equal(three.finishing, one.finishing * 3);
});

test('validateInputs: null pro platný vstup, hlášky pro neplatný', () => {
  const ok = { volumeCm3: 1, bboxZMm: 100, material: 'PLA', infillPct: 20, pieces: 1, postProcessing: 'none' };
  assert.equal(validateInputs(ok), null);
  assert.match(validateInputs({ ...ok, volumeCm3: 0 }), /objem/i);
  assert.match(validateInputs({ ...ok, volumeCm3: -5 }), /objem/i);
  assert.match(validateInputs({ ...ok, bboxZMm: 0 }), /výška/i);
  assert.match(validateInputs({ ...ok, material: 'GOLD' }), /materiál/i);
  assert.match(validateInputs({ ...ok, infillPct: 150 }), /výplň/i);
  assert.match(validateInputs({ ...ok, pieces: 0 }), /kus/i);
  assert.match(validateInputs({ ...ok, postProcessing: 'magic' }), /úprava/i);
});

test('boxVolume: kvádr 50×50×50 mm, tvar zabírá 30 % → 37,5 cm³ (bez tiskové výplně)', () => {
  const m = boxVolume(50, 50, 50, 30);
  assert.ok(Math.abs(m.volumeCm3 - 37.5) < 1e-9);
  assert.deepEqual(m.bbox, { x: 50, y: 50, z: 50 });
});

test('boxVolume: zaplnění nad 100 % se ořízne, neplatný vstup → null', () => {
  assert.equal(boxVolume(10, 10, 10, 250).volumeCm3, 1);
  assert.equal(boxVolume(NaN, 10, 10, 30), null);
  assert.equal(boxVolume(10, 0, 10, 30), null);
  assert.equal(boxVolume(10, 10, 10, 0), null);
  assert.equal(boxVolume(10, 10, Infinity, 30), null);
});

test('regrese ruční režim: tisková výplň se uplatní právě jednou (z posuvníku)', () => {
  // plný kvádr 10×10×10 mm = 1 cm³; při 100 % zabrání musí hmotnost odpovídat STL kostce 1 cm³
  const manual = boxVolume(10, 10, 10, 100);
  const viaManual = estimateGrams(manual.volumeCm3, 'PLA', 20, 1, cfg);
  const viaStl = estimateGrams(1, 'PLA', 20, 1, cfg);
  assert.ok(Math.abs(viaManual - viaStl) < 1e-9);
});
