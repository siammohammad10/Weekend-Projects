// Browser history. Every page, stock category and pop-up gets its own history entry, so the
// browser's back and forward buttons move through the app and a refresh keeps your place.
//
// Routes live in the URL hash so they work on any static host:
//   #stock                    a page
//   #stock?cat=motors         a stock category
//   #stock?cat=motors&item=…  a product sheet open on top of it
// Pop-ups use one extra key: item, cart, edit, import, cats or cert.

const Router = { restoring: false, expectPop: false, replaceNext: false };
const OVERLAY_KEYS = ['item', 'cart', 'edit', 'import', 'cats', 'cert'];

function routeHash() {
  if (!S.me) return '';
  const p = new URLSearchParams();
  if (U.view === 'stock' && U.cat) p.set('cat', U.cat);
  if (U.overlay) p.set(U.overlay.k, U.overlay.v ?? '1');
  const qs = p.toString();
  return '#' + U.view + (qs ? '?' + qs : '');
}

function parseRoute(hash) {
  const raw = (hash || '').replace(/^#/, '');
  const [view, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const k = OVERLAY_KEYS.find(key => params.has(key));
  return { view: view || null, cat: params.get('cat'), overlay: k ? { k, v: params.get(k) } : null };
}

// Record the current screen. Called after every render and whenever a pop-up opens.
function syncRoute() {
  if (Router.restoring || Router.expectPop || !S.me) return;
  const hash = routeHash();
  const replace = Router.replaceNext;
  Router.replaceNext = false;
  if (hash === location.hash) return;
  const state = { app: true, overlay: !!U.overlay };
  if (replace) history.replaceState(state, '', hash);
  else history.pushState(state, '', hash);
}

// Called when a pop-up closes. If opening it added a history entry, step back over that entry
// so the back button doesn't reopen it. With { replace: true } the caller is about to move to
// another page, so that page replaces the pop-up's entry instead.
function routeOverlayClosed(opts = {}) {
  if (Router.restoring || !U.overlay) {
    U.overlay = null;
    return;
  }
  U.overlay = null;
  const ownEntry = history.state && history.state.app && history.state.overlay;
  if (opts.replace) {
    if (ownEntry) Router.replaceNext = true;
    return;
  }
  if (ownEntry) {
    Router.expectPop = true;
    history.back();
  } else {
    Router.replaceNext = true;
    syncRoute();
  }
}

function sameOverlay(a, b) {
  return !!a && !!b && a.k === b.k && String(a.v ?? '1') === String(b.v ?? '1');
}

function openRouteOverlay(o) {
  const admin = S.role === 'admin';
  if (o.k === 'item' && item(o.v) && !item(o.v).hidden) openSheet(o.v);
  else if (o.k === 'cart' && !admin) openDrawer();
  else if (o.k === 'edit' && admin && (o.v === 'new' || item(o.v))) openEditor(o.v === 'new' ? null : o.v);
  else if (o.k === 'import' && admin) openImport();
  else if (o.k === 'cats' && admin) openCats();
  else if (o.k === 'cert' && admin && S.certs.some(c => c.id === o.v)) openViewer(o.v);
}

// Bring the screen in line with the URL, after back/forward or on first load.
function applyRoute() {
  if (!S.me) return;
  const r = parseRoute(location.hash);
  const set = VIEWS[S.role];
  const allowed = v => v && (set[v] || (v === 'board' && S.role === 'admin'));
  const view = allowed(r.view) ? r.view : Object.keys(set)[0];
  const cat = view === 'stock' && r.cat && catOf(r.cat) ? r.cat : null;
  Router.restoring = true;
  try {
    if (U.overlay && !sameOverlay(U.overlay, r.overlay)) {
      closeOverlay('#sheet-root');
      closeOverlay('#drawer-root');
      U.overlay = null;
    }
    const changed = view !== U.view || (view === 'stock' && cat !== (U.cat || null));
    if (changed) {
      if (U.view === 'board' && view !== 'board') leaveBoard();
      U.view = view;
      if (view === 'stock') {
        U.cat = cat;
        U.q = '';
      }
      render();
      scrollTo({ top: 0 });
    }
    if (r.overlay && !sameOverlay(U.overlay, r.overlay)) openRouteOverlay(r.overlay);
  } finally {
    Router.restoring = false;
  }
  if (r.view !== U.view || (r.overlay && !U.overlay)) {
    Router.replaceNext = true;
    syncRoute();
  }
}

addEventListener('popstate', () => {
  Router.expectPop = false;
  applyRoute();
});
