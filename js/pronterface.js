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
  waiting: null, // 'nozzle' | 'bed' | null — při M109/M190
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

// --- Demo tisk: pustí sekvenaci G-kódu jako skutečný slicer výstup ---
const DEMO_PROGRAM = [
  'M140 S60 ; podložka na 60 °C',
  'M104 S210 ; tryska na 210 °C',
  'G28 ; homing všech os',
  'M190 S60 ; čekej na teplotu podložky',
  'M109 S210 ; čekej na teplotu trysky',
  'G92 E0 ; vynuluj extruder',
  'G1 Z0.2 F300 ; první vrstva',
  'G1 X40 Y40 E0.5 F2400',
  'G1 X80 Y40 E0.9 F2400',
  'G1 X80 Y80 E1.3 F2400',
  'G1 X40 Y80 E1.7 F2400',
  'G1 X40 Y40 E2.1 F2400 ; obvod první vrstvy',
  'G1 Z0.4 F300 ; druhá vrstva',
  'G1 X45 Y45 E2.4 F3000',
  'G1 X75 Y45 E2.8 F3000',
  'G1 X75 Y75 E3.2 F3000',
  'G1 X45 Y75 E3.6 F3000',
  'G1 X45 Y45 E4.0 F3000',
  'G1 Z10 F600 ; zvedni trysku',
  'M104 S0 ; tryska vyp',
  'M140 S0 ; podložka vyp',
  'G28 X0 Y0 ; odjezd do rohu',
  'M84 ; motory vyp',
];

const demoBtn = document.getElementById('pp-demo-run');
let demoRunning = false;

function runDemo() {
  if (demoRunning) return;
  demoRunning = true;
  demoBtn.disabled = true;
  demoBtn.textContent = '⏸ Tiskne…';
  log('=== DEMO TISK — sekvenace jako ze sliceru ===', 'pp-info');
  let i = 0;
  const step = () => {
    if (!state.connected || i >= DEMO_PROGRAM.length) {
      demoRunning = false;
      demoBtn.disabled = !state.connected;
      demoBtn.textContent = '▶ Demo tisk';
      if (state.connected && i >= DEMO_PROGRAM.length) log('=== DEMO HOTOV — model by byl vytištěn ===', 'pp-info');
      return;
    }
    const cmd = DEMO_PROGRAM[i++];
    gcode(cmd);
    if (cmd.startsWith('M104')) { const s = cmd.match(/S(\d+)/); if (s) state.nozzleTarget = Number(s[1]); }
    if (cmd.startsWith('M140')) { const s = cmd.match(/S(\d+)/); if (s) state.bedTarget = Number(s[1]); }
    // skutečný tisk: čekání na teplotu, rychlé pohyby — zpoždění podle typu příkazu
    let delay = 350;
    if (cmd.startsWith('M109')) { state.waiting = 'nozzle'; delay = 2600; log('… čekám na teplotu trysky', 'pp-info'); }
    else if (cmd.startsWith('M190')) { state.waiting = 'bed'; delay = 2200; log('… čekám na teplotu podložky', 'pp-info'); }
    else if (cmd.startsWith('G1') && cmd.includes('F2400')) delay = 500;
    else if (cmd.startsWith('G1') && cmd.includes('F3000')) delay = 420;
    setTimeout(step, delay);
  };
  step();
}

demoBtn.addEventListener('click', runDemo);

// --- plynulý ohřev/chladnutí ---
setInterval(() => {
  for (const [key, el, label] of [['nozzle', els.nozzle, 'Tryska'], ['bed', els.bed, 'Podložka']]) {
    const current = state[key];
    const target = state[`${key}Target`] || 24;
    if (Math.abs(current - target) < 0.5) {
      state[key] = target;
      // dorazilo na cílovou teplotu → pusť čekání firmware (M109/M190)
      if (state.waiting === key) {
        log(`… ${label.toLowerCase()} na ${Math.round(target)} °C — pokračuji`, 'pp-ok');
        state.waiting = null;
      }
    } else if (current < target) {
      state[key] = Math.min(target, current + (key === 'nozzle' ? 3.2 : 1.1));
    } else {
      state[key] = Math.max(target, current - (key === 'nozzle' ? 2.4 : 0.8));
    }
    el.textContent = `${label} ${Math.round(state[key])} °C${state[key + 'Target'] > state[key] ? ' ↑' : ''}`;
    el.classList.toggle('is-hot', state[key] > 60);
  }
}, 120);
