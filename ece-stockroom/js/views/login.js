// Sign-in screen.

// Sign-in stage, set over a live oscilloscope background that reacts to the cursor
const Gate = { boost: 1, raf: 0, off: null };
const gateMark = `<svg viewBox="0 0 42 42" aria-hidden="true"><rect x="1" y="1" width="40" height="40" rx="11" fill="#cc0000"/><rect x="10" y="13" width="22" height="9" rx="2" fill="#ffffff"/><rect x="15" y="27" width="12" height="3.5" rx="1.75" fill="#ffffff" opacity=".7"/></svg>`;

// Three scope channels. y is the baseline as a fraction of the screen height, amp is a fraction
// of the height, and wave(x, t) returns -1..1 for a pixel column x at time t (seconds).
const SCOPE_CHANNELS = [
  {
    y: 0.13,
    amp: 0.05,
    rgb: '255,72,72',
    alpha: 0.9,
    wave: (x, t) => Math.sin(x * 0.017 - t * 1.6) * 0.72 + Math.sin(x * 0.041 - t * 2.4) * 0.28,
  },
  {
    y: 0.52,
    amp: 0.06,
    rgb: '235,235,240',
    alpha: 0.42,
    wave: (x, t) => Math.tanh(6 * Math.sin(x * 0.011 - t * 1.1)),
  },
  {
    y: 0.87,
    amp: 0.055,
    rgb: '255,120,96',
    alpha: 0.75,
    wave: (x, t) => {
      // a pulse every cycle, ringing down like an underdamped circuit
      const ph = (((x * 0.0042 - t * 0.42) % 1) + 1) % 1;
      return Math.exp(-ph * 7) * Math.sin(ph * 58);
    },
  },
];

function vGate() {
  const demo = ['jreyes', 'nbrooks', 'gwu'].map(u => S.accounts.find(a => a.u === u)).filter(Boolean);
  return `<div class="gate" id="gate">
    <div class="g-scope" aria-hidden="true"><canvas id="g-grid"></canvas><canvas id="g-trace"></canvas></div>
    <div class="g-vignette" aria-hidden="true"></div>
    <div class="g-hud tl" aria-hidden="true"><span><b>CH1</b> 2.00 V/div</span><span>5.00 ms/div</span></div>
    <div class="g-hud br" aria-hidden="true"><span>Trig <b>↑</b> CH1 0.00 V</span><span>Auto · Run</span></div>
    <div class="g-in">
      <div class="g-logo g-rise">${
        LOGO_URL
          ? `<img class="logo-img" src="${LOGO_URL}" alt="Texas Tech University">`
          : `${gateMark}<div><b>Texas Tech University</b><small>Electrical &amp; Computer Engineering</small></div>`
      }</div>
      <h1 class="g-title g-rise" style="--i:1">ECE <span>Stockroom</span></h1>
      <p class="g-sub g-rise" style="--i:2">Parts, rentals and lab access for every ECE course.</p>
      <form class="g-form g-rise" style="--i:3" id="login-form" novalidate>
        <label class="g-field" for="eraider">
          <input id="eraider" name="eraider" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="eRaider username" aria-label="eRaider username">
          <span class="g-suffix">@ttu.edu</span>
          <button class="g-go" type="submit" id="login-btn" aria-label="Sign in">${I('arrow')}</button>
        </label>
        <p class="g-err" id="login-err" role="alert" hidden></p>
        <p class="g-fine">This demo signs you in with a username only, so there’s no password. The live site would send you to Texas Tech’s own eRaider page, and the stockroom would never see your password.</p>
      </form>
      <div class="g-accts g-rise" style="--i:4"><span>Or try a demo student</span>
        ${demo.map(a => `<button type="button" class="g-acct" data-act="demo-login" data-u="${a.u}"><span class="g-av">${initials(a.name)}</span>${a.u} <small>${esc(inst(teamOf(a.team).instructor).course)}</small></button>`).join('')}
      </div>
    </div>
    <div class="g-foot"><span>Student concept · demo data</span><span class="g-live">${shelf().length} parts on the shelf</span></div>
  </div>`;
}

function startScope() {
  const gc = $('#g-grid'),
    tc = $('#g-trace');
  if (!gc || !tc) return;
  const g = gc.getContext('2d'),
    c = tc.getContext('2d');
  let W = 0,
    H = 0,
    time = 0,
    prev = performance.now();
  // pointer "probe": raw position, smoothed position, and how strongly it's acting (0..1)
  const probe = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, on: 0, target: 0, last: 0 };

  function drawGrid() {
    g.clearRect(0, 0, W, H);
    const div = Math.max(46, Math.min(W / 12, H / 8)),
      cx = W / 2,
      cy = H / 2,
      px = v => Math.round(v) + 0.5;
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.beginPath();
    for (let v = cx % div; v < W; v += div) g.moveTo(px(v), 0), g.lineTo(px(v), H);
    for (let v = cy % div; v < H; v += div) g.moveTo(0, px(v)), g.lineTo(W, px(v));
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.1)';
    g.beginPath();
    g.moveTo(0, px(cy)), g.lineTo(W, px(cy)), g.moveTo(px(cx), 0), g.lineTo(px(cx), H);
    for (let v = cx % (div / 5); v < W; v += div / 5) g.moveTo(px(v), cy - 4), g.lineTo(px(v), cy + 4);
    for (let v = cy % (div / 5); v < H; v += div / 5) g.moveTo(cx - 4, px(v)), g.lineTo(cx + 4, px(v));
    g.stroke();
  }

  function draw() {
    c.clearRect(0, 0, W, H);
    const on = probe.on,
      sx = probe.sx,
      sy = probe.sy,
      sigX = Math.max(110, W * 0.09),
      sigY = Math.max(120, H * 0.17);
    if (on > 0.01) {
      // scope cursors through the probe point
      c.save();
      c.setLineDash([4, 6]);
      c.lineWidth = 1;
      c.strokeStyle = `rgba(255,90,90,${0.28 * on})`;
      c.beginPath();
      c.moveTo(Math.round(sx) + 0.5, 0), c.lineTo(Math.round(sx) + 0.5, H);
      c.moveTo(0, Math.round(sy) + 0.5), c.lineTo(W, Math.round(sy) + 0.5);
      c.stroke();
      c.restore();
    }
    for (const ch of SCOPE_CHANNELS) {
      const base = H * ch.y,
        A = Math.min(H * ch.amp, 60),
        ky = Math.exp(-((base - sy) ** 2) / (2 * sigY * sigY)) * on,
        pts = [];
      for (let x = 0; x <= W + 3; x += 3) {
        const k = ky * Math.exp(-((x - sx) ** 2) / (2 * sigX * sigX));
        const y =
          base -
          ch.wave(x, time) * A * (1 + 1.6 * k) +
          k * (sy - base) * 0.4 +
          k * Math.sin(x * 0.09 - time * 14) * 9;
        pts.push(x, y);
      }
      const path = () => {
        c.beginPath();
        c.moveTo(pts[0], pts[1]);
        for (let n = 2; n < pts.length; n += 2) c.lineTo(pts[n], pts[n + 1]);
      };
      c.lineJoin = 'round';
      path();
      c.lineWidth = 7;
      c.strokeStyle = `rgba(${ch.rgb},${0.1 * ch.alpha})`;
      c.stroke();
      c.lineWidth = 1.8;
      c.strokeStyle = `rgba(${ch.rgb},${ch.alpha})`;
      c.stroke();
      if (ky > 0.02) {
        // brighter section where the probe is touching the signal
        const grad = c.createLinearGradient(sx - sigX * 2.4, 0, sx + sigX * 2.4, 0);
        grad.addColorStop(0, `rgba(${ch.rgb},0)`);
        grad.addColorStop(0.5, `rgba(255,235,235,${Math.min(1, ky * 1.1)})`);
        grad.addColorStop(1, `rgba(${ch.rgb},0)`);
        path();
        c.lineWidth = 2.6;
        c.strokeStyle = grad;
        c.stroke();
      }
      // channel marker on the left edge, like a scope's ground reference
      c.fillStyle = `rgba(${ch.rgb},${Math.min(1, ch.alpha + 0.2)})`;
      c.beginPath();
      c.moveTo(0, base - 6), c.lineTo(9, base), c.lineTo(0, base + 6);
      c.fill();
    }
  }

  function size() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    for (const cv of [gc, tc]) (cv.width = W * dpr), (cv.height = H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawGrid();
    draw();
  }
  function frame(now) {
    if (!document.contains(tc)) return stopScope();
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    time += dt * Gate.boost;
    if (now - probe.last > 3500) probe.target = 0;
    probe.on += (probe.target - probe.on) * Math.min(1, dt * 4);
    const e = Math.min(1, dt * 10);
    probe.sx += (probe.x - probe.sx) * e;
    probe.sy += (probe.y - probe.sy) * e;
    draw();
    Gate.raf = requestAnimationFrame(frame);
  }

  const move = ev => {
    if (probe.on < 0.02) (probe.sx = ev.clientX), (probe.sy = ev.clientY);
    probe.x = ev.clientX;
    probe.y = ev.clientY;
    probe.target = 1;
    probe.last = performance.now();
  };
  const leave = () => (probe.target = 0);
  size();
  addEventListener('resize', size);
  if (!reduce) {
    addEventListener('pointermove', move, { passive: true });
    addEventListener('pointerdown', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    Gate.raf = requestAnimationFrame(frame);
  }
  Gate.off = () => {
    removeEventListener('resize', size);
    removeEventListener('pointermove', move);
    removeEventListener('pointerdown', move);
    document.documentElement.removeEventListener('mouseleave', leave);
  };
}
function stopScope() {
  cancelAnimationFrame(Gate.raf);
  Gate.off?.();
  Gate.off = null;
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
