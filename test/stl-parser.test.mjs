import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSTL, meshStats, parseBinarySTL, parseAsciiSTL } from '../js/stl-parser.js';

// Pomocník: sestaví binární STL kostky se stranou 10 mm (12 trojúhelníků).
function buildBinaryCubeSTL() {
  const v = [
    [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
    [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], // spodek
    [4, 5, 6], [4, 6, 7], // vršek
    [0, 1, 5], [0, 5, 4], // přední stěna
    [1, 2, 6], [1, 6, 5], // pravá stěna
    [2, 3, 7], [2, 7, 6], // zadní stěna
    [3, 0, 4], [3, 4, 7], // levá stěna
  ];
  const buf = new ArrayBuffer(84 + faces.length * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, faces.length, true);
  let off = 84;
  for (const [a, b, c] of faces) {
    off += 12; // normála (nuly) — záznam musí mít plných 50 B
    for (const i of [a, b, c]) {
      dv.setFloat32(off, v[i][0], true);
      dv.setFloat32(off + 4, v[i][1], true);
      dv.setFloat32(off + 8, v[i][2], true);
      off += 12;
    }
    dv.setUint16(off, 0, true);
    off += 2;
  }
  return buf;
}

// Tetrahedr: objem (10·10·10)/6 = 166,667 mm³.
function buildAsciiTetraSTL() {
  return `solid tetra
facet normal 0 0 0
  outer loop
    vertex 0 0 0
    vertex 10 0 0
    vertex 0 10 0
  endloop
endfacet
facet normal 0 0 0
  outer loop
    vertex 0 0 0
    vertex 0 10 0
    vertex 0 0 10
  endloop
endfacet
facet normal 0 0 0
  outer loop
    vertex 0 0 0
    vertex 0 0 10
    vertex 10 0 0
  endloop
endfacet
facet normal 0 0 0
  outer loop
    vertex 10 0 0
    vertex 0 0 10
    vertex 0 10 0
  endloop
endfacet
endsolid tetra
`;
}

test('parseSTL načte binární STL kostky a meshStats spočítá objem 1 cm³ a rozměry 10 mm', () => {
  const { triangles, count } = parseSTL(buildBinaryCubeSTL());
  assert.equal(count, 12);
  assert.equal(triangles.length, 12 * 9);
  const stats = meshStats(triangles);
  assert.ok(Math.abs(stats.volumeCm3 - 1) < 0.001, `objem ${stats.volumeCm3}`);
  assert.deepEqual(stats.bbox, { x: 10, y: 10, z: 10 });
});

test('parseSTL načte ASCII STL tetrahedru (objem 166,667 mm³)', () => {
  const bytes = new TextEncoder().encode(buildAsciiTetraSTL()).buffer;
  const { triangles, count } = parseSTL(bytes);
  assert.equal(count, 4);
  const stats = meshStats(triangles);
  assert.ok(Math.abs(stats.volumeCm3 - 166.667 / 1000) < 0.001, `objem ${stats.volumeCm3}`);
  assert.deepEqual(stats.bbox, { x: 10, y: 10, z: 10 });
});

test('odmítne zkrácený binární STL (hláška o délce souboru)', () => {
  const full = new Uint8Array(buildBinaryCubeSTL());
  const truncated = full.slice(0, full.length - 30).buffer;
  assert.throws(() => parseSTL(truncated), /délka/i);
});

test('odmítne nulový objem (mesh bez trojúhelníků)', () => {
  const empty = new ArrayBuffer(84);
  const dv = new DataView(empty);
  dv.setUint32(80, 0, true);
  assert.throws(() => parseSTL(empty), /trojúhelníky|délka/i);
});

test('meshStats odmítne mesh s nulovým objemem (všechny vrcholy v jedné rovině)', () => {
  const flat = new Float32Array(9 * 2);
  flat.set([0, 0, 0, 10, 0, 0, 0, 10, 0, 0, 0, 0, 0, 10, 0, 10, 0, 0]);
  assert.throws(() => meshStats(flat), /objem|plochý/i);
});

test('parseAsciiSTL odmítne NaN souřadnice', () => {
  const bytes = new TextEncoder().encode(
    'solid x\nfacet normal 0 0 0\nouter loop\nvertex abc 0 0\nvertex 1 0 0\nvertex 0 1 0\nendloop\nendfacet\nendsolid x\n'
  ).buffer;
  assert.throws(() => parseAsciiSTL(bytes), /Neplatné souřadnice/i);
});

test('parseBinarySTL odmítne příliš malý buffer', () => {
  assert.throws(() => parseBinarySTL(new ArrayBuffer(10)), /příliš malý/i);
});

test('meshStats odmítne plochý mesh mimo počátek (otevřený/degenerovaný model)', () => {
  // Review #2: plochý model v z=100 má ne-nulový "objem" tetrahedrů, ale nulovou tloušťku.
  const flat = new Float32Array(18);
  flat.set([0, 0, 100, 10, 0, 100, 0, 10, 100,  0, 0, 100, 0, 10, 100, 10, 0, 100]);
  assert.throws(() => meshStats(flat), /plochý/i);
});

test('parseAsciiSTL odmítne desetinnou čárku (locale export, tiché špatné ceny)', () => {
  const bytes = new TextEncoder().encode(
    'solid x\nfacet normal 0 0 0\nouter loop\nvertex 1,5 0 0\nvertex 2,5 0 0\nvertex 0 1,5 0\nendloop\nendfacet\nendsolid x\n'
  ).buffer;
  assert.throws(() => parseAsciiSTL(bytes), /Neplatné souřadnice/i);
});
