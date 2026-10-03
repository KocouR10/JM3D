// Virtuální tiskárna — zjednodušený panel ve stylu Pronterface. Čisté demo:
// nic nepřipojuje, jen simuluje G-kódy a ohřev do konzole.
const els = {
  connect: document.getElementById('pp-connect'),
  state: document.getElementById('pp-state'),
  nozzle: document.getElementById('pp-temp-nozzle'),
  bed: document.getElementById('pp-temp-bed'),
  console: document.getElementById('pp-console'),
};

const state = {
  connected: false,
  nozzleTarget: 0, bedTarget: 0,
  nozzle: 24, bed: 24,
};

function log(line, cls = '') {
  const row = document.createElement('div');
  row.className = `pp-line ${cls}`;
  const t = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  row.textContent = `${t}  ${line}`;
  els.console.appendChild(row);
  while (els.console.children.length > 40) els.console.firstChild.remove();
  els.console.scrollTop = els.console.scrollHeight;
}

function gcode(cmd) {
  log(`> ${cmd}`, 'pp-gcode');
  // simulovaná odpověď firmware
  setTimeout(() => log('ok', 'pp-ok'), 180 + Math.random() * 220);
}

// --- připojení ---
els.connect.addEventListener('click', () => {
  if (!state.connected) {
    state.connected = true;
    els.state.textContent = '● připojeno (DEMO)';
    els.state.classList.add('is-on');
    els.connect.textContent = 'Odpojit';
    log('Připojeno k /dev/duše-tiskárny @ 250000 baud 😉', 'pp-info');
    setTimeout(() => log('Marlin 2.1.2 JM3D edition', 'pp-ok'), 300);
    setTimeout(() => gcode('M115 ; verze firmware'), 700);
    // po připojení jsou aktivní ostatní tlačítka
    els.connect.closest('.printer-panel').querySelectorAll('.pp-btn[disabled]').forEach((b) => (b.disabled = false));
  } else {
    state.connected = false;
    state.nozzleTarget = 0; state.bedTarget = 0;
    els.state.textContent = '● odpojeno';
    els.state.classList.remove('is-on');
    els.connect.textContent = 'Připojit';
    log('Odpojeno.', 'pp-info');
    els.connect.closest('.printer-panel').querySelectorAll('.pp-btn:not(#pp-connect)').forEach((b) => (b.disabled = true));
  }
});

// --- G-kódová tlačítka ---
document.querySelectorAll('[data-gcode]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const cmd = btn.dataset.gcode;
    gcode(cmd);
    if (cmd.startsWith('M104')) {
      // M104 S210 → ohřev; M104 S0 → vypnout (data-reset)
      const s = cmd.match(/S(\d+)/);
      state.nozzleTarget = s ? Number(s[1]) : state.nozzleTarget;
    }
    if (cmd.startsWith('M140')) {
      const s = cmd.match(/S(\d+)/);
      state.bedTarget = s ? Number(s[1]) : state.bedTarget;
    }
    if (cmd.startsWith('M112')) {
      log('!! EMERGENCY STOP — firmware zastaven (demo, v reality tvrdý stop)', 'pp-err');
      state.nozzleTarget = 0; state.bedTarget = 0;
    }
  });
});

// --- plynulý ohřev/chladnutí ---
setInterval(() => {
  for (const [key, el, label] of [['nozzle', els.nozzle, 'Tryska'], ['bed', els.bed, 'Podložka']]) {
    const current = state[key];
    const target = state[`${key}Target`] || 24;
    if (Math.abs(current - target) < 0.5) {
      state[key] = target;
    } else if (current < target) {
      state[key] = Math.min(target, current + (key === 'nozzle' ? 3.2 : 1.1));
    } else {
      state[key] = Math.max(target, current - (key === 'nozzle' ? 2.4 : 0.8));
    }
    el.textContent = `${label} ${Math.round(state[key])} °C${state[key + 'Target'] > state[key] ? ' ↑' : ''}`;
    el.classList.toggle('is-hot', state[key] > 60);
  }
}, 120);
