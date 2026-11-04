// Mobilní menu pod ikonou ☰. Bez JS se odkazy na mobilu jen zalomí (tlačítko zůstane skryté).
const nav = document.querySelector('.site-nav');
const toggle = nav?.querySelector('.nav-toggle');
const links = document.getElementById('nav-links');

if (nav && toggle && links) {
  nav.classList.add('has-toggle');
  toggle.hidden = false;

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Zavřít menu' : 'Otevřít menu');
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', (e) => { if (!nav.contains(e.target)) setOpen(false); });
  // Po roztažení okna na desktop menu zavřít, ať nezůstane otevřený stav.
  window.matchMedia('(min-width: 761px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
}
