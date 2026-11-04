// Web nemá náběhové animace sekcí (redesign „Technický výkres“).
// Jediná animace je narýsování dílu v úvodu, a ta je čistě v CSS.
// Funkce zůstává kvůli kompatibilitě s main.js: jen zajistí, že je vše viditelné.
export function initAnimations() {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
}
