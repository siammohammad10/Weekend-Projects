// Sign-in screen.

// Sign-in stage, styled as an oscilloscope screen
const Gate = { boost: 1, resize: null };
const gateMark = `<svg viewBox="0 0 42 42" aria-hidden="true"><rect x="1" y="1" width="40" height="40" rx="11" fill="#cc0000"/><rect x="10" y="13" width="22" height="9" rx="2" fill="#ffffff"/><rect x="15" y="27" width="12" height="3.5" rx="1.75" fill="#ffffff" opacity=".7"/></svg>`;

// Signals the background trace cycles through, one per sweep. x runs 0..1 across the screen, y is -1..1.
const SCOPE_WAVES = [
  x => Math.sin(x * Math.PI * 6),
  x => Math.tanh(9 * Math.sin(x * Math.PI * 5)) * 0.8,
  x => {
    // step response with ringing
    const t = x - 0.18;
    return t < 0 ? -0.8 : 0.85 - 1.65 * Math.exp(-t * 9) * Math.cos(t * 70);
  },
  x => ((x * 6) % 1 < 0.2 + 0.6 * x ? 0.8 : -0.8), // PWM with a rising duty cycle
  x => Math.sin(x * Math.PI * 18) * Math.sin(x * Math.PI) * 0.95, // amplitude-modulated burst
];

function vGate() {
  const demo = ['jreyes', 'nbrooks', 'gwu'].map(u => S.accounts.find(a => a.u === u)).filter(Boolean);
  return `<div class="gate" id="gate">
    <div class="g-scope" aria-hidden="true"><canvas id="g-grid"></canvas><canvas id="g-trace"></canvas></div>
    <div class="g-vignette" aria-hidden="true"></div>
    <div class="g-hud tl" aria-hidden="true"><span><b>CH1</b> 2.00 V/div</span><span>5.00 ms/div</span></div>
    <div class="g-hud br" aria-hidden="true"><span>Trig <b>↑</b> CH1 0.00 V</span><span>Auto · Run</span></div>
    <section class="g-panel g-rise" aria-labelledby="g-title">
      <div class="g-logo">${
        LOGO_URL
          ? `<img class="logo-img" src="${LOGO_URL}" alt="Texas Tech University">`
          : `${gateMark}<div><b>Texas Tech University</b><small>Electrical &amp; Computer Engineering</small></div>`
      }</div>
      <div class="g-head">
        <h1 class="g-title" id="g-title">ECE <span>Stockroom</span></h1>
        <p class="g-sub">Parts, rentals and lab access for every ECE course.</p>
      </div>
      <form class="g-form" id="login-form" novalidate>
        <label class="g-label" for="eraider">eRaider username</label>
        <div class="g-field">
          <input id="eraider" name="eraider" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="e.g. jreyes">
          <span class="g-suffix">@ttu.edu</span>
          <button class="g-go" type="submit" id="login-btn" aria-label="Sign in">${I('arrow')}</button>
        </div>
        <p class="g-err" id="login-err" role="alert" hidden></p>
        <p class="g-fine">This demo signs you in with a username only, so there’s no password. The live site would send you to Texas Tech’s own eRaider page, and the stockroom would never see your password.</p>
      </form>
      <div class="g-accts"><span class="g-label">Demo students</span>
        ${demo.map(a => `<button type="button" class="g-acct" data-act="demo-login" data-u="${a.u}"><span class="g-av">${initials(a.name)}</span>${a.u} <small>${esc(inst(teamOf(a.team).instructor).course)}</small></button>`).join('')}
      </div>
      <div class="g-foot"><span>Student concept · demo data</span><span class="g-live">${shelf().length} parts on the shelf</span></div>
    </section>
  </div>`;
}

function startScope() {
  const gc = $('#g-grid'),
    tc = $('#g-trace');
  if (!gc || !tc) return;
  const g = gc.getContext('2d'),
    t = tc.getContext('2d');
  let W = 0,
    H = 0,
    mid = 0,
    amp = 0,
    wave = 0,
    x = 0,
    last = null,
    pause = 0,
    prev = performance.now();

  const yAt = (w, px) => mid - SCOPE_WAVES[w](px / W) * amp;

  function drawGrid() {
    g.clearRect(0, 0, W, H);
    const div = Math.max(46, Math.min(W / 12, H / 8)),
      cx = W / 2,
      cy = mid,
      px = v => Math.round(v) + 0.5;
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,.055)';
    g.beginPath();
    for (let v = cx % div; v < W; v += div) g.moveTo(px(v), 0), g.lineTo(px(v), H);
    for (let v = cy % div; v < H; v += div) g.moveTo(0, px(v)), g.lineTo(W, px(v));
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.13)';
    g.beginPath();
    g.moveTo(0, px(cy)), g.lineTo(W, px(cy)), g.moveTo(px(cx), 0), g.lineTo(px(cx), H);
    for (let v = cx % (div / 5); v < W; v += div / 5) g.moveTo(px(v), cy - 4), g.lineTo(px(v), cy + 4);
    for (let v = cy % (div / 5); v < H; v += div / 5) g.moveTo(cx - 4, px(v)), g.lineTo(cx + 4, px(v));
    g.stroke();
  }
  function strokeTrace(pts) {
    t.lineCap = 'butt';
    t.lineJoin = 'round';
    for (const [w, c] of [
      [7, 'rgba(255,40,40,.14)'],
      [2, 'rgba(255,72,72,.95)'],
    ]) {
      t.lineWidth = w;
      t.strokeStyle = c;
      t.beginPath();
      pts.forEach(([a, b], k) => (k ? t.lineTo(a, b) : t.moveTo(a, b)));
      t.stroke();
    }
  }
  function drawStatic() {
    t.clearRect(0, 0, W, H);
    const pts = [];
    for (let px = 0; px <= W; px += 2) pts.push([px, yAt(2, px)]);
    strokeTrace(pts);
  }
  function size() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    for (const c of [gc, tc]) (c.width = W * dpr), (c.height = H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    t.setTransform(dpr, 0, 0, dpr, 0, 0);
    mid = H / 2;
    amp = Math.min(H * 0.2, 170);
    x = 0;
    last = null;
    drawGrid();
    if (reduce) drawStatic();
  }
  function frame(now) {
    if (!document.contains(tc)) return stopScope();
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    // phosphor persistence: fade what's already drawn
    t.globalCompositeOperation = 'destination-out';
    t.fillStyle = `rgba(0,0,0,${Math.min(1, dt * 1.5)})`;
    t.fillRect(0, 0, W, H);
    t.globalCompositeOperation = 'source-over';
    if (pause > 0) pause -= dt;
    else {
      const nx = Math.min(W, x + (W / 2.4) * dt * Gate.boost);
      const pts = [last || [x, yAt(wave, x)]];
      for (let px = x + 2; px < nx; px += 2) pts.push([px, yAt(wave, px) + (Math.random() - 0.5) * 1.2]);
      pts.push([nx, yAt(wave, nx)]);
      strokeTrace(pts);
      last = pts[pts.length - 1];
      x = nx;
      if (x >= W) {
        x = 0;
        last = null;
        wave = (wave + 1) % SCOPE_WAVES.length;
        pause = 0.35;
      }
    }
    Gate.raf = requestAnimationFrame(frame);
  }

  size();
  Gate.resize = size;
  addEventListener('resize', size);
  if (!reduce) Gate.raf = requestAnimationFrame(frame);
}
function stopScope() {
  cancelAnimationFrame(Gate.raf);
  if (Gate.resize) removeEventListener('resize', Gate.resize);
  Gate.resize = null;
  Gate.boost = 1;
}

function showGate(anim) {
  if ($('#gate')) return;
  document.body.insertAdjacentHTML('beforeend', vGate());
  if (anim) $('#gate').classList.add('entering');
  startScope();
  if (matchMedia('(pointer: fine)').matches)
    setTimeout(() => $('#eraider')?.focus({ preventScroll: true }), 900);
}
function login(raw) {
  const u = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/@ttu\.edu$/, '');
  const err = $('#login-err');
  const fail = m => {
    if (err) {
      err.textContent = m;
      err.hidden = false;
    }
    $('#eraider')?.focus();
    const f = $('.g-field');
    if (f && !reduce)
      f.animate(
        [
          { transform: 'none' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'none' },
        ],
        { duration: 380, easing: 'ease-out' },
      );
  };
  if (!u) return fail('Enter your eRaider username.');
  const a = S.accounts.find(x => x.u === u);
  if (!a)
    return fail(`We couldn’t find “${u}” on any team in this demo. Try one of the demo students below.`);
  if (err) err.hidden = true;
  S.session = a.u;
  save();
  U.view = a.role === 'admin' ? 'desk' : 'dash';
  U.cat = null;
  U.q = '';
  U.instF = null;
  const gate = $('#gate');
  const reveal = () => {
    render();
    scrollTo({ top: 0 });
    toast(`Signed in as ${a.u}`);
  };
  if (!gate || reduce) {
    stopScope();
    gate?.remove();
    reveal();
    return;
  }
  const btn = $('#login-btn');
  btn.classList.add('ok');
  btn.innerHTML = I('check');
  Gate.boost = 4;
  setTimeout(() => {
    reveal();
    gate.classList.add('leaving');
    setTimeout(() => {
      stopScope();
      gate.remove();
    }, 750);
  }, 450);
}
function successHUD(text) {
  if (reduce) return;
  const el = document.createElement('div');
  el.className = 'hud';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg><span>${esc(text)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 380);
  }, 1350);
}
