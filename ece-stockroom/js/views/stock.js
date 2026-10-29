// Student stock browser, product sheet and cart.

// Student: stock
function vStock() {
  const b = budget(S.me.team);
  return `
  <header class="page-head">
    <div class="rise"><div class="eyebrow">${shelf().length} parts · ${CATS.filter(c => shelf().some(i => i.cat === c.id)).length} categories · ${TERM}</div><h1>Stock</h1><p>Pick a category, open a part, and buy or rent it for your team.</p></div>
    <div class="rise" style="--i:1;flex:1 1 280px;max-width:440px">
      <label class="search">${I('search')}<input id="q" type="search" placeholder="Search parts or SKUs" value="${esc(U.q)}" autocomplete="off" aria-label="Search parts"></label>
      <div class="bal" id="bal">${balHTML()}</div>
    </div>
  </header>
  <div id="stock-body">${stockBody()}</div>`;
}
const balHTML = () =>
  `Team balance <b>${money(budget(S.me.team).left)}</b> · in cart <b>${money(cartTotal())}</b>`;
function stockBody() {
  const q = U.q.trim().toLowerCase();
  if (q) {
    const res = shelf().filter(i =>
      (i.name + ' ' + i.sku + ' ' + (catOf(i.cat)?.name || '')).toLowerCase().includes(q),
    );
    return res.length
      ? `<p class="small muted" style="margin-bottom:14px">${res.length} result${res.length > 1 ? 's' : ''} for “${esc(U.q)}”</p><div class="items">${res.map((it, i) => itemCard(it, i)).join('')}</div>`
      : `<div class="panel empty">${I('search')}<b>No parts match “${esc(U.q)}”</b><span>Try a part name like “servo” or a SKU like MOT-TT-48.</span></div>`;
  }
  const liveCats = CATS.filter(c => shelf().some(i => i.cat === c.id));
  if (!U.cat || !catOf(U.cat))
    return `<div class="tiles">${liveCats
      .map((c, i) => {
        const list = shelf().filter(it => it.cat === c.id),
          rentN = list.filter(it => it.mode !== 'buy').length;
        const prices = list.filter(it => it.mode !== 'rent').map(it => it.price);
        const kicker = prices.length
          ? `${list.length} part${list.length === 1 ? '' : 's'}${rentN ? ` · ${rentN} to rent` : ''}`
          : `${list.length} item${list.length === 1 ? '' : 's'} · rent only`;
        return `<button class="tile-cat rise" style="--i:${i + 2}" data-act="cat" data-id="${c.id}">
      <span class="tile-kicker">${kicker}</span>
      <b>${c.name}</b>
      ${c.blurb ? `<span class="tile-sub">${esc(c.blurb)}</span>` : ''}
      <span class="tile-link">${prices.length ? `From ${money(Math.min(...prices))}` : 'Borrow'} ${I('chevr')}</span>
      <span class="tile-art">${art(list[0])}</span>
    </button>`;
      })
      .join('')}</div>`;
  const c = catOf(U.cat),
    list = shelf().filter(it => it.cat === c.id);
  return `
    <nav class="crumbs rise" aria-label="Breadcrumb"><button class="linkbtn" data-act="cat" data-id="">${I('back')} All categories</button><span>/</span><span>${c.name}</span></nav>
    <div class="chiprow rise" style="--i:1">${liveCats.map(x => `<button class="fchip" data-act="cat" data-id="${x.id}" aria-pressed="${x.id === c.id}">${esc(x.name)}</button>`).join('')}</div>
    <div class="cat-head rise" style="--i:2"><h2>${esc(c.name)}.</h2>${c.blurb ? `<p>${esc(c.blurb)}</p>` : ''}</div>
    <div class="items">${list.map((it, i) => itemCard(it, i + 3)).join('')}</div>`;
}
function itemCard(it, i) {
  const m = defMode(it),
    a = maxAdd(it, m);
  return `<article class="item rise" style="--i:${i}">
    <button class="item-open" data-act="open" data-sku="${it.sku}">
      <span class="item-art">${art(it)}</span>
      <span class="item-body">${tagsHTML(it)}<span class="item-name">${esc(it.name)}</span>${stockTag(it.sku)}
      <span class="item-row">${priceHTML(it)}</span></span>
    </button>
    <button class="quick" data-act="quick" data-sku="${it.sku}" aria-label="${m === 'rent' ? 'Rent' : 'Add'} one ${esc(it.name)}" ${a <= 0 ? 'disabled' : ''} title="${a <= 0 ? (limitReached(it, m) ? 'Team limit reached' : 'None left') : m === 'rent' ? 'Rent one' : 'Add one'}">${I('plus')}</button>
  </article>`;
}

// Product sheet
function modeHTML(it) {
  if (it.mode === 'both')
    return `<div class="segctl" role="radiogroup" aria-label="Buy or rent" data-on="${U.mode}"><span class="segctl-thumb" aria-hidden="true"></span>
    <button role="radio" aria-checked="${U.mode === 'buy'}" data-act="mode" data-m="buy">Buy · ${money(it.price)}</button>
    <button role="radio" aria-checked="${U.mode === 'rent'}" data-act="mode" data-m="rent">Rent · ${fee(it.rent)}</button></div>
    <p class="mode-note">${U.mode === 'rent' ? `Return it to the desk by ${DUE}.` : 'Yours to keep.'}</p>`;
  return `<p class="mode-note">${it.mode === 'rent' ? `<span class="tag rent">Rent only.</span> Return it to the desk by ${DUE}.` : 'Purchase only. Yours to keep.'}</p>`;
}
function limitHTML(it, m) {
  if (!(it.limit && m === 'buy')) return '';
  const used = Math.min(it.limit.n, usedBuy(S.me.team, it.sku)),
    cartN = inCart(it.sku, 'buy'),
    left = Math.max(0, it.limit.n - used - cartN);
  return `<div class="limit">
    <div class="limit-top"><span>Limit ${it.limit.n} per team ${it.limit.per === 'term' ? 'this term' : 'for the course'}</span><b>${left} left</b></div>
    <div class="segbar" aria-hidden="true">${rep(it.limit.n, k => `<i class="${k < used ? 'used' : k < used + cartN ? 'cart' : ''}"></i>`)}</div>
    <span class="small muted">${used} requested or picked up by your team${cartN ? ` · ${cartN} in your cart` : ''}</span>
  </div>`;
}
function sheetInfo(it) {
  const m = U.mode,
    max = maxAdd(it, m),
    up = unit(it, m);
  U.sq = Math.min(Math.max(U.sq, 1), Math.max(max, 1));
  const why = S.stock[it.sku] - inCart(it.sku) <= 0 ? 'None left to add' : 'Team limit reached';
  const label =
    max > 0 ? `${m === 'rent' ? 'Add rental' : 'Add to cart'} · ${up ? money(up * U.sq) : 'Free'}` : why;
  const inC = inCart(it.sku, m);
  return `<div class="eyebrow">${catOf(it.cat).name} · ${it.sku}</div>
    <h2 id="sheet-title">${esc(it.name)}</h2>
    <div class="sheet-price"><span class="price">${up ? money(up) : 'Free'}</span><span class="per">${m === 'rent' ? 'rental' : 'each'}</span>${stockTag(it.sku)}</div>
    ${modeHTML(it)}
    <p class="desc">${esc(it.desc)}</p>
    ${it.specs.length ? `<dl class="specs">${it.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    ${limitHTML(it, m)}
    <div class="buy">
      <div class="qty"><button data-act="sq-dec" aria-label="Decrease quantity" ${U.sq <= 1 ? 'disabled' : ''}>${I('minus')}</button><output aria-live="polite">${max > 0 ? U.sq : 0}</output><button data-act="sq-inc" aria-label="Increase quantity" ${U.sq >= max ? 'disabled' : ''}>${I('plus')}</button></div>
      <button class="btn btn-primary" data-act="add" data-sku="${it.sku}" ${max <= 0 ? 'disabled' : ''}>${max > 0 ? I('cart') : ''} ${label}</button>
    </div>
    <p class="fine">${inC ? `${inC} already in your cart${m === 'rent' ? ' to rent' : ''}. ` : ''}${max > 0 ? `You can add up to ${max} more.` : ''}</p>`;
}
function openSheet(sku) {
  const it = item(sku);
  U.lastFocus = document.activeElement;
  U.sheetSku = sku;
  U.sq = 1;
  U.mode = defMode(it);
  const root = $('#sheet-root');
  root.innerHTML = `<div class="scrim" data-act="close-sheet"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button class="close" data-act="close-sheet" aria-label="Close">${I('x')}</button>
      <div class="sheet-art"><div class="sheet-window" id="sheet-art">${art(it)}</div></div>
      <div class="sheet-info" id="sheet-info">${sheetInfo(it)}</div>
    </div>`;
  root.hidden = false;
  void root.offsetWidth;
  root.classList.add('open');
  $('.close', root).focus({ preventScroll: true });
  U.overlay = { k: 'item', v: sku };
  syncRoute();
}
function refreshSheet() {
  const root = $('#sheet-root');
  if (root.hidden || !U.sheetSku) return;
  const focusAct = document.activeElement?.dataset?.act,
    focusM = document.activeElement?.dataset?.m;
  $('#sheet-info').innerHTML = sheetInfo(item(U.sheetSku));
  const back = focusAct && $(`#sheet-info [data-act="${focusAct}"]${focusM ? `[data-m="${focusM}"]` : ''}`);
  if (back && !back.disabled) back.focus({ preventScroll: true });
}
function closeOverlay(id, opts = {}) {
  const root = $(id);
  if (root.hidden) return;
  root.classList.remove('open');
  setTimeout(
    () => {
      if (!root.classList.contains('open')) {
        root.hidden = true;
        root.innerHTML = '';
      }
    },
    reduce ? 0 : 380,
  );
  if (id === '#sheet-root') U.sheetSku = null;
  routeOverlayClosed(opts);
  if (U.lastFocus && document.contains(U.lastFocus)) U.lastFocus.focus({ preventScroll: true });
}

// Cart drawer
function drawerHTML() {
  const lines = cartLines(),
    t = myTeam(),
    b = budget(t.id),
    tot = cartTotal(),
    after = b.left - tot,
    over = after < 0;
  return `<div class="scrim" data-act="cart-close"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title">
    <div class="drawer-head"><div><div class="eyebrow">${t.name} request</div><h2 id="cart-title">Your cart.</h2></div><button class="close inline" data-act="cart-close" aria-label="Close cart">${I('x')}</button></div>
    <div class="drawer-body">${
      lines.length
        ? lines
            .map(
              ({ key, it, m, q }) => `
      <div class="line">
        <span class="line-art">${art(it)}</span>
        <div style="min-width:0"><div class="line-name">${esc(it.name)}</div>
          <div class="line-meta">${m === 'rent' ? `<span class="tag rent">Rent</span> ${fee(it.rent)} · return by ${DUE}` : `<span class="tag buy">Buy</span> ${money(it.price)} each`}</div>
          <div class="line-ctl"><div class="qty sm"><button data-act="cart-dec" data-key="${key}" aria-label="Fewer">${I('minus')}</button><output>${q}</output><button data-act="cart-inc" data-key="${key}" aria-label="More" ${maxAdd(it, m) <= 0 ? 'disabled' : ''}>${I('plus')}</button></div>
          <button class="rm" data-act="cart-rm" data-key="${key}" aria-label="Remove ${esc(it.name)}">${I('trash')}</button></div></div>
        <span class="line-price">${money(q * unit(it, m))}</span>
      </div>`,
            )
            .join('')
        : `<div class="empty">${I('cart')}<b>Your cart is empty</b><span>Open a part in Stock and tap Add to cart.</span><button class="btn btn-ghost btn-sm" data-act="go-stock">Browse stock</button></div>`
    }
    </div>
    ${
      lines.length
        ? `<div class="drawer-foot">
      <div class="sum">
        <div><span>Subtotal (${cartCount()} items)</span><b>${money(tot)}</b></div>
        <div><span class="muted">Team balance now</span><b class="muted">${money(b.left)}</b></div>
        <div class="after ${over ? 'over' : ''}"><span>Balance after this request</span><b>${money(after)}</b></div>
      </div>
      ${over ? `<div class="warnbox">This request is ${money(-after)} over your team’s balance. Lower a quantity or remove a part.</div>` : ''}
      <textarea class="note" id="cart-note" placeholder="Note for the stockroom (optional), e.g. pickup time" aria-label="Note for the stockroom"></textarea>
      <button class="btn btn-primary" data-act="checkout" ${over ? 'disabled' : ''}>${I('check')} Send request to stockroom</button>
    </div>`
        : ''
    }
  </aside>`;
}
function openDrawer() {
  U.lastFocus = document.activeElement;
  const root = $('#drawer-root');
  root.innerHTML = drawerHTML();
  root.hidden = false;
  void root.offsetWidth;
  root.classList.add('open');
  $('.close', root).focus({ preventScroll: true });
  U.overlay = { k: 'cart' };
  syncRoute();
}
function refreshDrawer() {
  const root = $('#drawer-root');
  if (root.hidden) return;
  const note = $('#cart-note', root)?.value || '';
  root.innerHTML = drawerHTML();
  const n = $('#cart-note', root);
  if (n) n.value = note;
}
function refreshStock() {
  if (U.view !== 'stock' || S.role !== 'student') return;
  const b = $('#stock-body');
  if (!b) return;
  b.classList.add('calm');
  b.innerHTML = stockBody();
  const bal = $('#bal');
  if (bal) bal.innerHTML = balHTML();
}
