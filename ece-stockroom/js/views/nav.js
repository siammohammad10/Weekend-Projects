// Top navigation and account controls.

// Top nav
const NAV = {
  student: [
    ['dash', 'Dashboard', 'dash'],
    ['stock', 'Stock', 'box'],
    ['profile', 'Profile', 'user'],
  ],
  admin: [
    ['desk', 'Front desk', 'desk'],
    ['inv', 'Inventory', 'box'],
    ['teams', 'Teams', 'team'],
    ['instructors', 'Instructors', 'cap'],
    ['certs', 'Certificates', 'cert'],
    ['print', '3D printing', 'printer'],
  ],
};
let navRole = null;
function renderHeader() {
  const nav = $('#nav');
  $('#top').hidden = !S.me;
  if (!S.me) {
    navRole = null;
    return;
  }
  if (navRole !== S.role) {
    navRole = S.role;
    nav.innerHTML = NAV[S.role]
      .map(
        ([v, l, ic]) =>
          `<button class="nav-btn" data-act="nav" data-v="${v}">${I(ic)}<span>${l}</span><span class="badge" data-badge="${v}" hidden></span></button>`,
      )
      .join('');
  }
  $$('.nav-btn', nav).forEach(b => {
    if (b.dataset.v === U.view) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  moveNavPill();
  const badges = {
    desk: S.orders.filter(o => o.status === 'requested').length,
    certs: S.certs.filter(c => c.status === 'pending').length,
    print: S.prints.filter(j => j.status === 'queued' || j.status === 'printing').length,
  };
  $$('[data-badge]', nav).forEach(b => {
    const n = badges[b.dataset.badge] || 0;
    b.hidden = !n;
    b.textContent = n;
  });
  const cb = $('#cart-btn');
  cb.hidden = S.role !== 'student';
  if (S.role === 'student') {
    const n = cartCount();
    cb.innerHTML = I('cart') + (n ? `<span class="badge">${n}</span>` : '');
    cb.setAttribute('aria-label', n ? `Open cart, ${n} item${n > 1 ? 's' : ''}` : 'Open cart');
  }
  const me = $('#me-btn');
  me.disabled = S.role !== 'student';
  me.title = `${S.me.name} · ${S.me.u}@ttu.edu`;
  me.innerHTML = S.me.avatar ? `<img src="${S.me.avatar}" alt="">` : initials(S.me.name);
}
