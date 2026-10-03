// Odeslání kontaktního formuláře přes Formspree.
// === UPRavit: zaregistrujte se na https://formspree.io a vložte svůj endpoint. ===
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/VAS_ID';

const form = document.getElementById('contact-form');
const status = document.getElementById('contact-status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (FORMSPREE_ENDPOINT.includes('VAS_ID')) {
    status.textContent =
      'Formulář ještě není připojen (chybí Formspree endpoint — viz js/contact.js). Napište nám prosím přímo na info@jm3d.cz.';
    status.className = 'contact-status is-err';
    return;
  }
  status.textContent = 'Odesílám…';
  status.className = 'contact-status';
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    });
    if (res.ok) {
      status.textContent = 'Děkuji! Ozveme se co nejdříve.';
      status.className = 'contact-status is-ok';
      form.reset();
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    status.textContent = 'Odeslání se nepovedlo. Zkuste to prosím znovu, nebo napište na info@jm3d.cz.';
    status.className = 'contact-status is-err';
  }
});
