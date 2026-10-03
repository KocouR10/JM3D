// Vstupní modul webu JM3D. Každá funkce se importuje izolovaně,
// aby chyba v jedné nerozbila ostatní.
import './calculator-ui.js';
import './vim-keys.js';

// Hero scéna až po načtení stránky — a když Three.js z CDN nedojde, web dál funguje.
window.addEventListener('load', () => {
  import('./hero-scene.js').catch((err) => console.warn('Hero scéna se nenačetla:', err));
});
