// Page and sheet motion, modelled on iOS.
//
// - Going deeper (into a stock category) pushes the new page in from the right over the old
//   one. Going back pops it away to the right. The browser's back and forward buttons do the same.
// - Switching tabs crossfades.
// - While a sheet or the cart is open, the page behind it settles back slightly.
// - On phones, sheets and the cart can be swiped down to close.
//
// All of it is skipped when the device asks for reduced motion.

const SPRING = 'cubic-bezier(0.32, 0.72, 0, 1)';
const PUSH_MS = 520;
const FADE_MS = 240;
const phone = () => innerWidth <= 760;
let motion = null;

function endMotion() {
  if (!motion) return;
  const m = motion;
  motion = null;
  m.anims.forEach(a => a.cancel());
  m.ghost.remove();
  $('#view').classList.remove('moving', 'under');
  document.documentElement.classList.remove('in-motion');
}

// Run `update` (which re-renders the page) inside a page transition.
// kind is 'push', 'pop' or 'fade'. Anything else just runs the update.
function pageMotion(kind, update) {
  const view = $('#view');
  endMotion();
  if (reduce || !kind || !S.me || U.view === 'board' || document.hidden || !view.animate) {
    update();
    return;
  }

  // Freeze a copy of the current page where it sits on screen, then render the new one.
  const r = view.getBoundingClientRect();
  const ghost = view.cloneNode(true);
  ghost.removeAttribute('id');
  ghost.querySelectorAll('[id]').forEach(n => n.closest('svg') || n.removeAttribute('id'));
  ghost.classList.add('page-ghost');
  ghost.setAttribute('aria-hidden', 'true');
  ghost.inert = true;
  Object.assign(ghost.style, {
    top: r.top + 'px',
    left: r.left + 'px',
    width: r.width + 'px',
    height: r.height + 'px',
  });
  document.body.appendChild(ghost);

  update();
  if (U.view === 'board') {
    ghost.remove();
    return;
  }
  scrollTo({ top: 0 });

  const html = document.documentElement;
  html.classList.add('in-motion');
  const anims = [];
  const opts = { duration: PUSH_MS, easing: SPRING };

  if (kind === 'fade') {
    ghost.classList.add('over');
    anims.push(
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: FADE_MS,
        easing: 'ease-out',
        fill: 'forwards',
      }),
    );
  } else {
    // The slide is the entrance, so the page's own fade-up animations are skipped.
    view.getAnimations({ subtree: true }).forEach(a => a.animationName === 'rise' && a.finish());
    const w = innerWidth;
    const far = phone() ? w : Math.min(w * 0.4, 520);
    const near = -far * 0.3;
    const fadeIn = phone() ? 1 : 0;
    if (kind === 'push') {
      view.classList.add('moving');
      anims.push(
        view.animate(
          [
            { transform: `translateX(${far}px)`, opacity: fadeIn },
            { transform: 'none', opacity: 1 },
          ],
          opts,
        ),
        ghost.animate(
          [
            { transform: 'none', opacity: 1 },
            { transform: `translateX(${near}px)`, opacity: phone() ? 0.6 : 0 },
          ],
          { ...opts, fill: 'forwards' },
        ),
      );
    } else {
      view.classList.add('under');
      ghost.classList.add('over', 'moving');
      anims.push(
        view.animate(
          [
            { transform: `translateX(${near}px)`, opacity: phone() ? 0.6 : 0 },
            { transform: 'none', opacity: 1 },
          ],
          opts,
        ),
        ghost.animate(
          [
            { transform: 'none', opacity: 1 },
            { transform: `translateX(${far}px)`, opacity: fadeIn },
          ],
          { ...opts, fill: 'forwards' },
        ),
      );
    }
  }

  const m = { ghost, anims };
  motion = m;
  Promise.all(anims.map(a => a.finished))
    .then(() => motion === m && endMotion())
    .catch(() => {});
}

// Which way a move from one screen to another should animate.
function motionKind(from, to) {
  if (from.view !== to.view) return 'fade';
  if (to.view !== 'stock' || (from.cat || null) === (to.cat || null)) return null;
  if (!from.cat) return 'push';
  if (!to.cat) return 'pop';
  return 'fade';
}

// The page behind an open sheet settles back, scaled around the middle of the screen, and stays put
// while the sheet is open.
function watchOverlays() {
  const roots = [$('#sheet-root'), $('#drawer-root')];
  const sync = () => {
    const open = roots.some(r => r.classList.contains('open'));
    const body = document.body;
    if (open === body.classList.contains('behind')) return;
    if (open) {
      const view = $('#view');
      view.style.transformOrigin = `50% ${Math.round(innerHeight / 2 - view.getBoundingClientRect().top)}px`;
      // Stop the page behind from scrolling. Pad by the scrollbar's width so nothing shifts when it hides.
      body.style.paddingRight = innerWidth - document.documentElement.clientWidth + 'px';
    } else body.style.paddingRight = '';
    document.documentElement.classList.toggle('locked', open);
    body.classList.toggle('behind', open);
  };
  const obs = new MutationObserver(sync);
  roots.forEach(r => obs.observe(r, { attributes: true, attributeFilter: ['class'] }));
}

// Swipe a sheet or the cart down to close it, on phones.
function swipeToClose(root, close) {
  let d = null;
  root.addEventListener(
    'touchstart',
    e => {
      d = null;
      if (!phone() || !root.classList.contains('open') || e.touches.length > 1) return;
      const panel = e.target.closest('.sheet:not(.form-sheet), .drawer');
      if (!panel || e.target.closest('input, textarea, select, .qty')) return;
      // Only start a swipe when the content under the finger is scrolled to the top.
      const body = panel.classList.contains('drawer') ? $('.drawer-body', panel) : panel;
      const scroller = body && body.contains(e.target) ? body : null;
      if (scroller && scroller.scrollTop > 0) return;
      d = { panel, scroller, y0: e.touches[0].clientY, dy: 0, on: false, t: [] };
    },
    { passive: true },
  );
  root.addEventListener(
    'touchmove',
    e => {
      if (!d) return;
      const y = e.touches[0].clientY;
      const dy = y - d.y0;
      if (!d.on) {
        if (dy < -4 || (d.scroller && d.scroller.scrollTop > 0)) {
          d = null;
          return;
        }
        if (dy < 8) return;
        d.on = true;
        d.y0 = y;
        d.panel.style.transition = 'none';
      }
      e.preventDefault();
      d.dy = Math.max(0, y - d.y0);
      d.t.push([e.timeStamp, d.dy]);
      if (d.t.length > 5) d.t.shift();
      d.panel.style.transform = `translateY(${d.dy}px)`;
    },
    { passive: false },
  );
  const end = () => {
    if (!d || !d.on) {
      d = null;
      return;
    }
    const { panel, dy, t } = d;
    d = null;
    const [t0, y0] = t[0] || [0, 0];
    const [t1, y1] = t[t.length - 1] || [1, 0];
    const v = (y1 - y0) / Math.max(1, t1 - t0);
    panel.style.transition = '';
    panel.style.transform = '';
    if (dy > panel.offsetHeight * 0.28 || (v > 0.45 && dy > 30)) close();
  };
  root.addEventListener('touchend', end);
  root.addEventListener('touchcancel', end);
}

// The highlight behind the current tab slides from tab to tab.
function moveNavPill() {
  const nav = $('#nav');
  let pill = $('.nav-pill', nav);
  if (!pill) {
    pill = document.createElement('span');
    pill.className = 'nav-pill';
    pill.setAttribute('aria-hidden', 'true');
    nav.prepend(pill);
  }
  const cur = $('.nav-btn[aria-current="page"]', nav);
  if (!cur || !cur.offsetWidth) {
    pill.classList.remove('on');
    return;
  }
  const first = !pill.classList.contains('on');
  if (first) pill.style.transition = 'none';
  pill.style.width = cur.offsetWidth + 'px';
  pill.style.transform = `translateX(${cur.offsetLeft}px)`;
  pill.classList.add('on');
  if (first) {
    void pill.offsetWidth;
    pill.style.transition = '';
  }
}

function initMotion() {
  watchOverlays();
  swipeToClose($('#sheet-root'), () => closeOverlay('#sheet-root'));
  swipeToClose($('#drawer-root'), () => closeOverlay('#drawer-root'));
  addEventListener('resize', () => S.me && moveNavPill());
  document.fonts?.ready.then(() => S.me && moveNavPill());
}
