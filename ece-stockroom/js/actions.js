// Click actions, keyed by the data-act attribute on buttons.

// Actions
function addToCart(sku, m, n, fromEl) {
  const it = item(sku),
    max = maxAdd(it, m);
  n = Math.min(n, max);
  if (n <= 0) {
    toast(
      limitReached(it, m)
        ? `Your team has hit the ${it.limit.n}-per-${perLabel(it.limit.per)} limit for this part`
        : 'No more of that part available',
      true,
    );
    return false;
  }
  fly(fromEl, () => {
    const key = sku + ':' + m;
    CART()[key] = (CART()[key] || 0) + n;
    save();
    renderHeader();
    refreshStock();
    toast(`${m === 'rent' ? 'Rental added' : 'Added'}: ${n} × ${it.name}`);
  });
  return true;
}
let resetArmed = null;
const ACT = {
  home: () => {
    if (S.me) go(S.role === 'student' ? 'dash' : 'desk');
  },
  nav: t => {
    closeOverlay('#drawer-root', { replace: true });
    go(t.dataset.v);
  },
  'demo-login': t => login(t.dataset.u),
  signout: () => {
    closeOverlay('#drawer-root', { replace: true });
    closeOverlay('#sheet-root', { replace: true });
    const u = S.session;
    S.session = null;
    save();
    leaveBoard();
    U.overlay = null;
    Router.replaceNext = false;
    history.replaceState(null, '', location.pathname + location.search);
    renderHeader();
    $('#view').innerHTML = '';
    showGate(true);
    scrollTo({ top: 0 });
    toast(`Signed out of ${u}`);
  },
  cat: t => {
    const to = t.dataset.id || null;
    const kind = U.q ? 'fade' : motionKind({ view: 'stock', cat: U.cat }, { view: 'stock', cat: to });
    pageMotion(kind, () => {
      U.cat = to;
      U.q = '';
      const q = $('#q');
      if (q) q.value = '';
      $('#stock-body').innerHTML = stockBody();
      post($('#stock-body'));
      syncRoute();
    });
    scrollTo({ top: 0, behavior: reduce || kind ? 'auto' : 'smooth' });
  },
  open: t => openSheet(t.dataset.sku),
  quick: t => {
    const it = item(t.dataset.sku);
    addToCart(it.sku, defMode(it), 1, t.closest('.item').querySelector('.item-art'));
  },
  'close-sheet': () => closeOverlay('#sheet-root'),
  mode: t => {
    if (t.dataset.m === U.mode) return;
    const prev = U.mode;
    U.mode = t.dataset.m;
    U.sq = 1;
    refreshSheet();
    const sc = $('.segctl');
    if (sc && !reduce) {
      sc.dataset.on = prev;
      void sc.offsetWidth;
      sc.dataset.on = U.mode;
    }
  },
  'sq-inc': () => {
    U.sq++;
    refreshSheet();
  },
  'sq-dec': () => {
    U.sq--;
    refreshSheet();
  },
  add: t => {
    if (addToCart(t.dataset.sku, U.mode, U.sq, $('#sheet-art')))
      setTimeout(() => closeOverlay('#sheet-root'), reduce ? 0 : 120);
  },
  'cart-open': () => openDrawer(),
  'cart-close': () => closeOverlay('#drawer-root'),
  'go-stock': () => {
    closeOverlay('#drawer-root', { replace: true });
    go('stock');
  },
  'cart-inc': t => {
    const k = t.dataset.key,
      [s, m] = k.split(':');
    if (maxAdd(item(s), m) > 0) {
      CART()[k]++;
      save();
      refreshDrawer();
      renderHeader();
      refreshStock();
    }
  },
  'cart-dec': t => {
    const k = t.dataset.key;
    CART()[k]--;
    if (CART()[k] <= 0) delete CART()[k];
    save();
    refreshDrawer();
    renderHeader();
    refreshStock();
  },
  'cart-rm': t => {
    delete CART()[t.dataset.key];
    save();
    refreshDrawer();
    renderHeader();
    refreshStock();
  },
  checkout: () => {
    const lines = cartLines(),
      b = budget(S.me.team);
    if (!lines.length) return;
    if (cartTotal() > b.left + 1e-9) {
      toast('That request is over your team’s balance', true);
      return;
    }
    const per = {};
    lines.forEach(l => (per[l.it.sku] = (per[l.it.sku] || 0) + l.q));
    if (Object.entries(per).some(([s, q]) => q > S.stock[s])) {
      toast('Some parts ran out. Check your cart quantities.', true);
      return;
    }
    const over = lines.find(
      l => l.m === 'buy' && l.it.limit && usedBuy(S.me.team, l.it.sku) + l.q > l.it.limit.n,
    );
    if (over) {
      toast(`${over.it.name} is over your team’s limit of ${over.it.limit.n}`, true);
      return;
    }
    const id = 'SR-' + S.seq++;
    const note = ($('#cart-note')?.value || '').trim().slice(0, 200);
    S.orders.push({
      id,
      team: S.me.team,
      by: S.me.name,
      items: lines.map(l => [l.it.sku, l.q, unit(l.it, l.m), l.m, null]),
      status: 'requested',
      at: Date.now(),
      doneAt: null,
      note,
    });
    lines.forEach(l => (S.stock[l.it.sku] -= l.q));
    S.carts[S.session] = {};
    save();
    closeOverlay('#drawer-root', { replace: true });
    U.flash = id;
    U.view = 'dash';
    render();
    scrollTo({ top: 0 });
    successHUD('Request sent');
    toast(`${id} is waiting at the stockroom desk`);
  },
  'pick-avatar': () => $('#avatar-input')?.click(),
  'pick-cert': () => $('#cert-input')?.click(),
  mark: t => {
    const id = t.dataset.id,
      o = S.orders.find(x => x.id === id);
    slideOut(`[data-row="${id}"]`, () => {
      o.status = 'purchased';
      o.doneAt = Date.now();
      save();
      render();
      if (U.deskQ) focusDeskSearch(true);
      toast(`${id} marked purchased · ${teamOf(o.team).name}`);
    });
  },
  cancel: t => {
    const id = t.dataset.id,
      o = S.orders.find(x => x.id === id);
    slideOut(`[data-row="${id}"]`, () => {
      o.status = 'cancelled';
      o.doneAt = Date.now();
      o.items.forEach(([s, q]) => (S.stock[s] += q));
      save();
      render();
      if (U.deskQ) focusDeskSearch(true);
      toast(`${id} cancelled. ${money(orderTotal(o))} returned to ${teamOf(o.team).name}.`);
    });
  },
  return: t => {
    const o = S.orders.find(x => x.id === t.dataset.id),
      idx = +t.dataset.idx,
      l = o.items[idx];
    slideOut(`[data-row="rent-${o.id}-${idx}"]`, () => {
      l[4] = Date.now();
      S.stock[l[0]] += l[1];
      save();
      render();
      if (U.deskQ) focusDeskSearch(true);
      toast(`${item(l[0]).name} checked back in from ${teamOf(o.team).name}`);
    });
  },
  verify: t => {
    const id = t.dataset.id,
      c = S.certs.find(x => x.id === id);
    closeOverlay('#sheet-root');
    const fin = () => {
      c.status = 'verified';
      c.note = null;
      save();
      render();
      toast(`${certName(c)} now has Project Lab access`);
    };
    U.certTab === 'pending' ? slideOut(`[data-row="${id}"]`, fin) : fin();
  },
  reject: t => {
    const id = t.dataset.id,
      c = S.certs.find(x => x.id === id);
    closeOverlay('#sheet-root');
    const fin = () => {
      c.status = 'rejected';
      c.note = 'The stockroom couldn’t verify this file. Upload a clear, complete copy of your certificate.';
      save();
      render();
      toast(`Sent ${certName(c)} a re-upload request`);
    };
    U.certTab === 'pending' ? slideOut(`[data-row="${id}"]`, fin) : fin();
  },
  'view-cert': t => openViewer(t.dataset.id),
  'cert-tab': t => {
    U.certTab = t.dataset.t;
    render();
  },
  'inst-f': t => {
    U.instF = t.dataset.id || null;
    render();
  },
  'goto-team': t => {
    U.instF = t.dataset.id;
    go('teams');
  },
  'inv-add': () => openEditor(null),
  'inv-edit': t => openEditor(t.dataset.sku),
  'inv-f': t => {
    U.invF = t.dataset.id;
    render();
  },
  'ed-mode': t => {
    $('#ed-mode').value = t.dataset.m;
    edSync();
    const er = $('#ed-err');
    if (er) er.hidden = true;
  },
  'ed-pick': () => $('#ed-photo-input')?.click(),
  'ed-rmphoto': () => {
    U.edPhoto = null;
    const it = U.edSku ? item(U.edSku) : null;
    $('#ed-photo').innerHTML = edPhotoInner(it && it.art ? it : null);
    $('#ed-rm').hidden = true;
  },
  'ed-step': t => {
    const el = $('#ed-stock'),
      v = parseInt(el.value, 10) || 0;
    el.value = Math.max(0, Math.min(9999, v + +t.dataset.d));
  },
  'cats-open': () => openCats(),
  'cat-del': t => {
    const row = t.closest('.cat-edit');
    if (reduce) {
      row.remove();
      return;
    }
    row.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateX(20px)' }], { duration: 250 }).onfinish =
      () => row.remove();
  },
  'csv-open': () => openImport(),
  'csv-pick': () => $('#csv-input')?.click(),
  'csv-back': () => {
    U.csvPlan = null;
    refreshImport();
  },
  'csv-apply': () => applyPlan(),
  'csv-copy': () => {
    const pre = $('#csv-tpl');
    const fallback = () => {
      try {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
        toast('Template selected. Press Ctrl+C or ⌘C to copy it.');
      } catch (e) {}
    };
    try {
      navigator.clipboard.writeText(CSV_TEMPLATE).then(() => toast('Template copied'), fallback);
    } catch (e) {
      fallback();
    }
  },
  'desk-clear': () => {
    U.deskQ = '';
    const el = $('#desk-q');
    if (el) el.value = '';
    refreshDesk();
    focusDeskSearch();
  },
  'board-open': () => {
    U.view = 'board';
    U.boardCalm = false;
    render();
    scrollTo({ top: 0 });
    try {
      const r = document.documentElement.requestFullscreen?.();
      r?.catch?.(() => {});
    } catch (e) {}
    clearInterval(U.boardTimer);
    U.boardTimer = setInterval(() => {
      if (U.view !== 'board') {
        clearInterval(U.boardTimer);
        return;
      }
      U.boardCalm = true;
      render();
    }, 20000);
  },
  'board-exit': () => {
    if (history.state && history.state.app && !history.state.root && location.hash.startsWith('#board')) {
      history.back();
      return;
    }
    leaveBoard();
    U.view = 'print';
    render();
    scrollTo({ top: 0 });
  },
  'job-start': t => {
    const j = S.prints.find(x => x.id === t.dataset.id);
    j.status = 'printing';
    j.startedAt = Date.now();
    save();
    render();
    toast(`Printing ${teamOf(j.team).name}’s job`);
  },
  'job-ready': t => {
    U.readyFor = t.dataset.id;
    render();
    setTimeout(() => $('#rf-amt')?.focus(), 50);
  },
  'ready-cancel': () => {
    U.readyFor = null;
    render();
  },
  'job-collect': t => {
    const j = S.prints.find(x => x.id === t.dataset.id);
    slideOut(`[data-row="job-${j.id}"]`, () => {
      j.status = 'collected';
      j.collectedAt = Date.now();
      save();
      render();
      if (U.deskQ && U.view === 'desk') focusDeskSearch(true);
      toast(`${teamOf(j.team).name} picked up their print`);
    });
  },
  'job-del': t => {
    if (!t.classList.contains('armed')) {
      t.classList.add('armed');
      t.textContent = 'Remove?';
      setTimeout(() => {
        if (document.contains(t)) {
          t.classList.remove('armed');
          t.innerHTML = I('trash');
        }
      }, 3000);
      return;
    }
    const id = t.dataset.id;
    slideOut(`[data-row="job-${id}"]`, () => {
      S.prints = S.prints.filter(x => x.id !== id);
      save();
      render();
      toast('Removed from the queue');
    });
  },
  'del-charge': t => {
    if (!t.classList.contains('armed')) {
      t.classList.add('armed');
      t.textContent = 'Remove?';
      setTimeout(() => {
        if (document.contains(t)) {
          t.classList.remove('armed');
          t.innerHTML = I('trash');
        }
      }, 3000);
      return;
    }
    const id = t.dataset.id,
      c = S.charges.find(x => x.id === id);
    slideOut(`[data-row="pc-${id}"]`, () => {
      S.charges = S.charges.filter(x => x.id !== id);
      save();
      render();
      toast(`Removed ${money(c.amount)} charge from ${teamOf(c.team).name}`);
    });
  },
  reset: t => {
    if (resetArmed) {
      clearTimeout(resetArmed);
      resetArmed = null;
      S = seed();
      wireMe();
      save();
      navRole = null;
      U.view = 'dash';
      U.cat = null;
      U.q = '';
      U.instF = null;
      closeOverlay('#drawer-root', { replace: true });
      closeOverlay('#sheet-root', { replace: true });
      render();
      scrollTo({ top: 0 });
      toast('Demo data reset');
      return;
    }
    t.textContent = 'Click again to reset';
    resetArmed = setTimeout(() => {
      resetArmed = null;
      const b = $('#reset-btn');
      if (b) b.textContent = 'Reset demo data';
    }, 3000);
  },
};
