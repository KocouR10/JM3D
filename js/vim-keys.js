// Vim klávesy: j/k scrolují mezi sekcemi — easter egg pro klávesaře.
const SECTION_IDS = ['hero', 'sluzby', 'calc', 'kontakt'];

function isTyping(e) {
  const t = e.target;
  return t instanceof HTMLElement &&
    (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

window.addEventListener('keydown', (e) => {
  if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key !== 'j' && e.key !== 'k') return;

  const current = Math.max(0, Math.round(window.scrollY / window.innerHeight));
  // Nejbližší sekce pod/p nad aktuálním viewportem
  let target;
  if (e.key === 'j') {
    target = SECTION_IDS.map((id) => document.getElementById(id)?.offsetTop ?? 0)
      .find((top) => top > window.scrollY + 80);
  } else {
    const tops = SECTION_IDS.map((id) => document.getElementById(id)?.offsetTop ?? 0);
    target = [...tops].reverse().find((top) => top < window.scrollY - 80);
  }
  if (target !== undefined) {
    document.getElementById(SECTION_IDS.find((id) => document.getElementById(id)?.offsetTop === target))
      ?.scrollIntoView({ behavior: 'smooth' });
  }
});
