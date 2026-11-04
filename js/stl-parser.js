// Parsování STL souborů (binární + ASCII) a výpočet objemu a rozměrů modelu.
// Vše čisté funkce — žádná DOM závislost (testuje se přes node --test).

const HEADER_SIZE = 80;
const TRIANGLE_SIZE = 50;
// Bezpečné stropy nezávislé na velikosti souboru — chrání RAM/CPU návštěvníka.
export const MAX_TRIANGLES = 1_000_000;
export const MAX_EXTENT_MM = 5000; // větší model je skoro jistě chyba jednotek (m/in/µm)

function tooManyTriangles(count) {
  return new Error(
    `Model má příliš mnoho trojúhelníků (${count.toLocaleString('cs-CZ')}, maximum je ` +
    `${MAX_TRIANGLES.toLocaleString('cs-CZ')}). Zjednodušte síť modelu nebo mi model pošlete e-mailem.`
  );
}

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
  if (count > MAX_TRIANGLES) throw tooManyTriangles(count);
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
      const n = dv.getFloat32(base + v * 4, true);
      if (!Number.isFinite(n)) {
        throw new Error(`Neplatné souřadnice v binárním STL (trojúhelník ${i + 1}).`);
      }
      triangles[i * 9 + v] = n;
    }
  }
  return { triangles, count };
}

export function parseAsciiSTL(bytes) {
  const text = new TextDecoder().decode(bytes);
  // Průchod přes exec() místo match(): nevzniká obří pole řetězců pro celý soubor.
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  const maxVertices = MAX_TRIANGLES * 3;
  let floats = new Float32Array(3 * 3 * 1024);
  let n = 0; // počet vrcholů
  let m;
  while ((m = re.exec(text)) !== null) {
    if (n >= maxVertices) throw tooManyTriangles(Math.ceil((n + 1) / 3));
    // Number (ne parseFloat): '1,5' musí být chyba, ne tiché 1 — exporty s locale čárkou.
    // isFinite navíc odmítne 'Infinity' i čísla mimo rozsah float32.
    const x = Number(m[1]), y = Number(m[2]), z = Number(m[3]);
    if (![x, y, z].every((c) => Number.isFinite(c) && Math.abs(c) <= 3.4e38)) {
      throw new Error('Neplatné souřadnice v ASCII STL.');
    }
    if ((n + 1) * 3 > floats.length) {
      const grown = new Float32Array(Math.min(floats.length * 2, maxVertices * 3));
      grown.set(floats);
      floats = grown;
    }
    floats[n * 3] = x; floats[n * 3 + 1] = y; floats[n * 3 + 2] = z;
    n++;
  }
  if (n === 0) {
    throw new Error('ASCII STL neobsahuje žádné trojúhelníky.');
  }
  const count = n / 3;
  if (!Number.isInteger(count)) {
    throw new Error('ASCII STL má neúplné trojúhelníky.');
  }
  return { triangles: floats.slice(0, n * 3), count };
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
      '– zkontrolujte, že je síť modelu uzavřená (watertight).'
    );
  }
  if (!Number.isFinite(volume) || ![ex, ey, ez].every(Number.isFinite)) {
    throw new Error('Model má neplatné souřadnice – zkontrolujte prosím soubor.');
  }
  if (Math.max(ex, ey, ez) > MAX_EXTENT_MM) {
    throw new Error(
      `Model je nereálně velký (${Math.round(Math.max(ex, ey, ez)).toLocaleString('cs-CZ')} mm). ` +
      'Zkontrolujte jednotky exportu – kalkulačka počítá v milimetrech.'
    );
  }
  if (volume === 0) throw new Error('Model má nulový objem – zkontrolujte prosím soubor.');
  return {
    volumeCm3: volume / 1000, // mm³ → cm³
    bbox: { x: maxX - minX, y: maxY - minY, z: maxZ - minZ },
  };
}
