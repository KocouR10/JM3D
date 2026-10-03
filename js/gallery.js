// Galerie obrázků: načte assets/gallery/gallery.json, vykreslí mřížku
// a otevře lightbox na klik. Přidání obrázku = 1 položka v gallery.json.
const grid = document.getElementById('gallery-grid');
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lightbox-img');
const lbCaption = document.getElementById('lightbox-caption');

function openLightbox(item) {
  lbImg.src = `assets/gallery/${item.file}`;
  lbImg.alt = item.title;
  lbCaption.innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = item.title;
  lbCaption.appendChild(strong);
  if (item.desc) {
    const desc = document.createElement('span');
    desc.textContent = item.desc;
    lbCaption.appendChild(desc);
  }
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.hidden = true;
  lbImg.src = '';
  document.body.style.overflow = '';
}

document.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox.hidden) closeLightbox(); });

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
      card.setAttribute('aria-label', `${item.title} — zvětšit`);

      const img = document.createElement('img');
      img.src = `assets/gallery/${item.file}`;
      img.alt = item.title;
      img.loading = 'lazy';

      const cap = document.createElement('span');
      cap.className = 'gallery-caption';
      cap.textContent = item.title;

      card.append(img, cap);
      card.addEventListener('click', () => openLightbox(item));
      grid.appendChild(card);
    }
    //GSAP reveal po vykreslení (pokud jsou animace dostupné)
    if (window.gsap && window.ScrollTrigger) {
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.fromTo('.gallery-card',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7, stagger: 0.08, ease: 'power2.out',
          scrollTrigger: { trigger: '.gallery-grid', start: 'top 85%', once: true } });
    } else {
      grid.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    }
  })
  .catch((err) => {
    const msg = document.createElement('p');
    msg.className = 'calc-error';
    msg.textContent = 'Galerii se nepodařilo načíst (' + err.message + ').';
    grid.appendChild(msg);
  });
