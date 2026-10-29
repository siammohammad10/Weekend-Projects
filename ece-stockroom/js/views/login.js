// Sign-in screen.

// Sign-in stage
const Gate = {};
const gateMark = `<svg viewBox="0 0 42 42" aria-hidden="true"><rect x="1" y="1" width="40" height="40" rx="11" fill="#cc0000"/><rect x="10" y="13" width="22" height="9" rx="2" fill="#ffffff"/><rect x="15" y="27" width="12" height="3.5" rx="1.75" fill="#ffffff" opacity=".7"/></svg>`;
function vGate() {
  const demo = ['jreyes', 'nbrooks', 'gwu'].map(u => S.accounts.find(a => a.u === u)).filter(Boolean);
  return `<div class="gate" id="gate">
    <div class="g-glow" aria-hidden="true"></div>
    <div class="g-in">
      <div class="g-logo g-rise">${
        LOGO_URL
          ? `<img class="logo-img" src="${LOGO_URL}" alt="Texas Tech University">`
          : `${gateMark}<div><b>Texas Tech University</b><small>Electrical &amp; Computer Engineering</small></div>`
      }</div>
      <h1 class="g-title g-rise" style="--i:1">ECE<br><span>Stockroom.</span></h1>
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
        ${demo.map(a => `<button type="button" class="g-acct" data-act="demo-login" data-u="${a.u}"><span class="g-av">${initials(a.name)}</span>${a.u} <small>· ${esc(inst(teamOf(a.team).instructor).course)}</small></button>`).join('')}
      </div>
    </div>
    <div class="g-foot">Student concept · demo data · ${shelf().length} parts on the shelf</div>
  </div>`;
}
function showGate(anim) {
  if ($('#gate')) return;
  document.body.insertAdjacentHTML('beforeend', vGate());
  if (anim) $('#gate').classList.add('entering');
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
    gate?.remove();
    reveal();
    return;
  }
  const btn = $('#login-btn');
  btn.classList.add('ok');
  btn.innerHTML = I('check');
  setTimeout(() => {
    reveal();
    gate.classList.add('leaving');
    setTimeout(() => gate.remove(), 800);
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
