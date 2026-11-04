// Galerie obrázků: načte assets/gallery/gallery.json, vykreslí mřížku
// a otevře lightbox na klik. Přidání obrázku = 1 položka v gallery.json.
const grid = document.getElementById('gallery-grid');
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lightbox-img');
const lbCaption = document.getElementById('lightbox-caption');

const closeBtn = document.querySelector('.lightbox-close');
const background = ['.site-header', 'main', '.site-footer'].map((sel) => document.querySelector(sel)).filter(Boolean);
let opener = null; // prvek, na který se po zavření vrátí fokus

function openLightbox(item, trigger) {
  opener = trigger ?? document.activeElement;
  lbImg.src = `assets/gallery/${item.file}`;
  lbImg.alt = item.title;
  lbCaption.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = item.title;
  lbCaption.appendChild(strong);
  if (item.desc) {
    const desc = document.createElement('span');
    desc.textContent = item.desc;
    lbCaption.appendChild(desc);
  }
  lightbox.hidden = false;
  background.forEach((el) => { el.inert = true; }); // zbytek stránky nejde ovládat ani číst
  document.body.style.overflow = 'hidden';
  closeBtn.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  lbImg.src = '';
  background.forEach((el) => { el.inert = false; });
  document.body.style.overflow = '';
  opener?.focus();
  opener = null;
}

closeBtn.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
window.addEventListener('keydown', (e) => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  // Jediný ovladatelný prvek dialogu je „Zavřít“ — Tab zůstane na něm.
  if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
});

fetch('assets/gallery/gallery.json')
  .then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then((items) => {
    for (const item of items) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'gallery-card reveal';
      card.setAttribute('aria-label', `${item.title} – zvětšit`);

      const img = document.createElement('img');
      img.src = `assets/gallery/${item.file}`;
      img.alt = item.title;
      img.loading = 'lazy';

      const cap = document.createElement('span');
      cap.className = 'gallery-caption';
      cap.textContent = item.title;

      card.append(img, cap);
      card.addEventListener('click', () => openLightbox(item, card));
      grid.appendChild(card);
    }
  })
  .catch((err) => {
    const msg = document.createElement('p');
    msg.className = 'calc-error';
    msg.textContent = 'Galerii se nepodařilo načíst (' + err.message + ').';
    grid.appendChild(msg);
  });
