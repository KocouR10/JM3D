// Parsování STL souborů (binární + ASCII) a výpočet objemu a rozměrů modelu.
// Vše čisté funkce — žádná DOM závislost (testuje se přes node --test).

const HEADER_SIZE = 80;
const TRIANGLE_SIZE = 50;

export function parseSTL(buffer) {
  const bytes = new Uint8Array(buffer);
  return looksLikeAscii(bytes) ? parseAsciiSTL(bytes) : parseBinarySTL(buffer);
}

// Binární STL také může začínat "solid" — rozhoduje kontrola délky souboru.
function looksLikeAscii(bytes) {
  if (bytes.length < 5) return false;
  const head = String.fromCharCode(...bytes.slice(0, 5));
  if (head !== 'solid') return false;
  if (bytes.length < HEADER_SIZE + 4) return true;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = dv.getUint32(HEADER_SIZE, true);
  return HEADER_SIZE + 4 + count * TRIANGLE_SIZE !== bytes.length;
}

export function parseBinarySTL(buffer) {
  if (buffer.byteLength < HEADER_SIZE + 4) {
    throw new Error('Soubor je příliš malý na binární STL.');
  }
  const dv = new DataView(buffer);
  const count = dv.getUint32(HEADER_SIZE, true);
  if (count === 0) throw new Error('Soubor neobsahuje žádné trojúhelníky.');
  const expected = HEADER_SIZE + 4 + count * TRIANGLE_SIZE;
  if (expected !== buffer.byteLength) {
    throw new Error(
      `Neplatná délka binárního STL (očekáváno ${expected} B, soubor má ${buffer.byteLength} B).`
    );
  }
  const triangles = new Float32Array(count * 9);
  for (let i = 0; i < count; i++) {
    const base = HEADER_SIZE + 4 + i * TRIANGLE_SIZE + 12; // 12 B normály přeskočit
    for (let v = 0; v < 9; v++) {
      triangles[i * 9 + v] = dv.getFloat32(base + v * 4, true);
    }
  }
  return { triangles, count };
}

export function parseAsciiSTL(bytes) {
  const text = new TextDecoder().decode(bytes);
  const matches = text.match(/vertex\s+\S+\s+\S+\s+\S+/g) ?? [];
  if (matches.length === 0) {
    throw new Error('ASCII STL neobsahuje žádné trojúhelníky.');
  }
  const floats = new Float32Array(matches.length * 3);
  for (let i = 0; i < matches.length; i++) {
    const parts = matches[i].trim().split(/\s+/); // ['vertex', x, y, z]
    // Number (ne parseFloat): '1,5' musí být chyba, ne tiché 1 — exporty s locale čárkou
    const x = Number(parts[1]);
    const y = Number(parts[2]);
    const z = Number(parts[3]);
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) {
      throw new Error('Neplatné souřadnice v ASCII STL.');
    }
    floats.set([x, y, z], i * 3);
  }
  const count = matches.length / 3;
  if (!Number.isInteger(count) || count === 0) {
    throw new Error('ASCII STL má neúplné trojúhelníky.');
  }
  return { triangles: floats, count };
}

export function meshStats(triangles) {
  let volume = 0;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < triangles.length; i += 9) {
    const ax = triangles[i],     ay = triangles[i + 1], az = triangles[i + 2];
    const bx = triangles[i + 3], by = triangles[i + 4], bz = triangles[i + 5];
    const cx = triangles[i + 6], cy = triangles[i + 7], cz = triangles[i + 8];
    // Objem tetrahedrů s vrcholem v počátku (znaménko se smaže na konci).
    volume += (
      ax * (by * cz - bz * cy) +
      bx * (cy * az - cz * ay) +
      cx * (ay * bz - az * by)
    ) / 6;
    minX = Math.min(minX, ax, bx, cx); maxX = Math.max(maxX, ax, bx, cx);
    minY = Math.min(minY, ay, by, cy); maxY = Math.max(maxY, ay, by, cy);
    minZ = Math.min(minZ, az, bz, cz); maxZ = Math.max(maxZ, az, bz, cz);
  }
  volume = Math.abs(volume);
  // Nulová tloušťka v libovolné ose = plochý mesh (typicky neuzavřený) — divergence
  // tetrahedrů pak dává smyšlený objem; odmítneme nezávisle na pozici vůči počátku.
  const ex = maxX - minX, ey = maxY - minY, ez = maxZ - minZ;
  if (ex === 0 || ey === 0 || ez === 0) {
    throw new Error(
      `Model je plochý (nulová tloušťka v ose ${ex === 0 ? 'X' : ey === 0 ? 'Y' : 'Z'}) ` +
      '— zkontrolujte, že mesh je uzavřený (watertight).'
    );
  }
  if (volume === 0) throw new Error('Model má nulový objem — zkontrolujte prosím soubor.');
  return {
    volumeCm3: volume / 1000, // mm³ → cm³
    bbox: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}
