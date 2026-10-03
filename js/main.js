// Vstupní modul webu JM3D.
// Review #3: initAnimations se volá PRVNÍ — selhání jakéhokoli side-effect modulu
// pak nemůže zanechat .reveal elementy navždy neviditelné.
import { initAnimations } from './animations.js';

try {
  initAnimations();
} catch (err) {
  console.warn('Animace selhaly, obsah zviditelním:', err);
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => el.classList.add('is-visible'));
}

// Pojistka: pokud cokoliv zablokuje běh scroll-triggerů, obsah se za 2 s ukáže sám.
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((el) => el.classList.add('is-visible'));
}, 2000);

// Ostatní funkce se načítají izolovaně — chyba v jedné nerozbila ostatní.
const modules = ['./calculator-ui.js', './vim-keys.js', './contact.js', './pronterface.js'];
for (const m of modules) {
  import(m).catch((err) => console.warn(`Modul ${m} se nenačetl:`, err));
}

// Hero scéna po načtení stránky — když Three.js z CDN nedojde, web dál funguje.
window.addEventListener('load', () => {
  import('./hero-scene.js').catch((err) => console.warn('Hero scéna se nenačetla:', err));
});
