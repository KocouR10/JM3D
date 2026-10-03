// ==== Cenové konstanty — JEDINÉ MÍSTO, kde se upravují ceny. ====
// Hodnoty jsou rozumné výchozí (smyšlené) — přepište na své skutečné sazby.
export const PRICING = {
  minOrder: 150,          // Kč — minimální objednávka
  hourRate: 150,          // Kč za hodinu provozu tiskárny
  layerHeight: 0.2,       // mm — pro odhad času tisku
  secondsPerLayer: 10,    // s na vrstvu (režie: příprava, posun)
  secondsPerCm3: 600,     // s na cm³ vytisknutého objemu
  shellFactor: 0.35,      // podíl "pevné" hmoty při 0% výplni (skořápka + stěny)
  // Cena za gram filamentu (Kč) podle materiálu
  pricePerGram: { PLA: 1.5, PETG: 1.8, ASA: 2.0, TPU: 2.5 },
  // Hustota materiálu (g/cm³)
  density: { PLA: 1.24, PETG: 1.27, ASA: 1.07, TPU: 1.21 },
  // Cena povrchové úpravy (Kč za kus)
  postProcessing: { none: 0, basic: 100, full: 300 },
};
