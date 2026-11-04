// Odeslání kontaktního formuláře přes Formspree.
// === UPRAVIT: zaregistrujte se na https://formspree.io a vložte svůj endpoint. ===
// Endpoint není tajný (je veřejný v každém prohlížeči) — žádné API klíče sem nepatří.
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/VAS_ID';
const CONTACT_EMAIL = 'jakub.mynar@jm3d.cz';

const form = document.getElementById('contact-form');
const status = document.getElementById('contact-status');

function setStatus(text, kind = '') {
  status.textContent = text;
  status.className = `contact-status${kind ? ` is-${kind}` : ''}`;
}

const topic = document.getElementById('cf-topic');
const subject = document.getElementById('cf-subject');
const mailto = document.getElementById('cf-mailto');

// Předmět e-mailu podle tématu — pro Formspree (_subject) i pro odkaz „Napsat e-mail“.
function syncTopic() {
  const label = topic.options[topic.selectedIndex].text;
  const subj = `Web JM3D: ${label}`;
  subject.value = subj;
  mailto.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subj)}`;
  const direct = document.getElementById('cd-mailto');
  if (direct) direct.href = mailto.href;
}

if (topic && subject && mailto) {
  topic.addEventListener('change', syncTopic);
  // Tlačítka s data-tema (např. „Poradit s tiskárnou“ v úvodu) rovnou předvyplní téma.
  document.querySelectorAll('[data-tema]').forEach((a) => {
    a.addEventListener('click', () => {
      topic.value = a.dataset.tema;
      syncTopic();
    });
  });
  syncTopic();
}

if (form) {
  const configured = !FORMSPREE_ENDPOINT.includes('VAS_ID');
  const submit = form.querySelector('[type="submit"]');

  if (configured) {
    // Formulář je připravený: ukázat ho místo boxu s přímým kontaktem.
    form.hidden = false;
    const direct = document.getElementById('contact-direct');
    if (direct) direct.hidden = true;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!configured) return;
    submit.disabled = true;
    setStatus('Odesílám…');
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('Děkuji! Ozvu se co nejdříve.', 'ok');
      form.reset();
      if (topic) syncTopic();
    } catch {
      setStatus(`Zprávu se nepodařilo odeslat. Zkuste to prosím znovu, nebo napište na ${CONTACT_EMAIL}.`, 'err');
    } finally {
      submit.disabled = false;
    }
  });
}
