// Inventory management: product editor, categories and CSV import.

// Admin: inventory
const SKU_RE = /^[A-Z0-9][A-Z0-9-]{1,23}$/;
const parseAmt = v => {
  const raw = String(v ?? '').replace(/[$,\s]/g, '');
  if (!/^\d*\.?\d{0,2}$/.test(raw)) return NaN;
  return raw === '' || raw === '.' ? 0 : Math.round(parseFloat(raw) * 100) / 100;
};
function catId(name) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'category';
  let id = base,
    n = 2;
  while (CATS.some(c => c.id === id)) id = `${base}-${n++}`;
  return id;
}
const findCat = nm => {
  const k = String(nm).trim().toLowerCase();
  return CATS.find(c => c.name.toLowerCase() === k || c.id === k);
};
const catRank = id => CATS.findIndex(c => c.id === id);
function invPrice(it) {
  if (it.mode === 'rent') return `${fee(it.rent)}<small>rental</small>`;
  return `${money(it.price)}${it.mode === 'both' ? `<small>or rent ${it.rent ? money(it.rent) : 'free'}</small>` : ''}`;
}
function invRows() {
  const q = (U.invQ || '').trim().toLowerCase(),
    f = U.invF || 'all';
  let list = ITEMS.filter(it =>
    f === 'all' ? true : f === 'hidden' ? it.hidden : f === 'low' ? S.stock[it.sku] <= 8 : it.cat === f,
  );
  if (q)
    list = list.filter(it =>
      (it.name + ' ' + it.sku + ' ' + (catOf(it.cat)?.name || '')).toLowerCase().includes(q),
    );
  list.sort((a, z) => catRank(a.cat) - catRank(z.cat) || a.name.localeCompare(z.name));
  if (!list.length)
    return `<div class="empty">${I('box')}<b>${q ? `No products match “${esc(U.invQ)}”` : 'No products here yet'}</b><span>${q ? 'Try a name, SKU or category.' : 'Add one with the button above.'}</span></div>`;
  return list
    .map(it => {
      const st = S.stock[it.sku] ?? 0;
      return `<button class="inv-row" data-act="inv-edit" data-sku="${it.sku}">
      <span class="line-art">${art(it)}</span>
      <span class="inv-main"><b>${esc(it.name)}</b><span>${it.sku} · ${esc(catOf(it.cat)?.name || 'No category')}</span></span>
      <span class="inv-tags">${it.hidden ? '<span class="hid">Hidden</span>' : ''}${tagsHTML(it)}</span>
      <span class="inv-price">${invPrice(it)}</span>
      <span class="inv-stock ${st <= 0 ? 'out' : st <= 8 ? 'low' : ''}">${st <= 0 ? 'Out of stock' : `${st} in stock`}</span>
      <span class="inv-chev">${I('chevr')}</span>
    </button>`;
    })
    .join('');
}
function refreshInv() {
  const b = $('#inv-body');
  if (b) b.innerHTML = invRows();
}
function vInv() {
  const f = U.invF || 'all',
    low = ITEMS.filter(i => S.stock[i.sku] <= 8).length,
    hid = ITEMS.filter(i => i.hidden).length;
  const chips = [
    ['all', `All · ${ITEMS.length}`],
    ['low', `Low stock · ${low}`],
    ...(hid ? [['hidden', `Hidden · ${hid}`]] : []),
    ...CATS.map(c => [c.id, c.name]),
  ];
  return `
  <header class="page-head">
    <div class="rise"><div class="eyebrow">Staff · ${ITEMS.length} products · ${CATS.length} categories</div><h1>Inventory</h1><p>Add parts, update prices and limits, and restock when a shipment comes in. Students see changes right away.</p></div>
    <div class="head-actions rise" style="--i:1">
      <button class="btn btn-ghost" data-act="cats-open">Categories</button>
      <button class="btn btn-ghost" data-act="csv-open">${I('upload')} Import CSV</button>
      <button class="btn btn-primary" data-act="inv-add">${I('plus')} Add product</button>
    </div>
  </header>
  <div class="inv-tools rise" style="--i:2"><label class="search">${I('search')}<input id="inv-q" type="search" placeholder="Search name, SKU or category" value="${esc(U.invQ || '')}" autocomplete="off" aria-label="Search inventory"></label></div>
  <div class="chiprow rise" style="--i:2">${chips.map(([id, l]) => `<button class="fchip" data-act="inv-f" data-id="${id}" aria-pressed="${f === id}">${esc(l)}</button>`).join('')}</div>
  <section class="panel rise" style="--i:3"><div id="inv-body">${invRows()}</div></section>`;
}

/* product editor */
const edPlaceholder = `<span class="ed-ph">${I('upload')}<span>Add photo</span></span>`;
const edPhotoInner = it =>
  U.edPhoto ? `<img src="${U.edPhoto}" alt="">` : it && it.art ? drawArt(it) : edPlaceholder;
function editorHTML(it) {
  const m = it ? it.mode : 'buy',
    lim = it?.limit,
    pre = !it && CATS.some(c => c.id === U.invF) ? U.invF : null;
  const catOpts =
    CATS.map(
      c =>
        `<option value="${c.id}" ${(it ? it.cat === c.id : pre === c.id) ? 'selected' : ''}>${esc(c.name)}</option>`,
    ).join('') + '<option value="__new">New category…</option>';
  const specs = it ? it.specs.map(([k, v]) => `${k}: ${v}`).join('\n') : '';
  return `<form class="ed" id="ed-form" novalidate>
    <div><div class="eyebrow">Inventory</div><h2 id="ed-title">${it ? esc(it.name) : 'Add a product'}</h2></div>
    <div class="ed-photo-row">
      <button type="button" class="ed-photo" id="ed-photo" data-act="ed-pick" data-drop="photo" aria-label="Upload product photo">${edPhotoInner(it)}</button>
      <div class="ed-photo-txt"><b>Product photo</b><span>JPG or PNG. Drop a file on the box or choose one. A clear photo on a plain background looks best.</span>
        <div class="ed-photo-acts"><button type="button" class="btn btn-sm btn-ghost" data-act="ed-pick">${I('upload')} Upload photo</button><button type="button" class="btn btn-sm btn-ghost" data-act="ed-rmphoto" id="ed-rm" ${U.edPhoto ? '' : 'hidden'}>Remove</button></div>
      </div>
    </div>
    <input type="file" id="ed-photo-input" accept="image/*" hidden>
    <div class="ed-grid">
      <div class="field span2"><label for="ed-name">Product name</label><input id="ed-name" maxlength="60" value="${esc(it?.name || '')}" placeholder="e.g. BME280 pressure sensor" autocomplete="off"></div>
      <div class="field"><label for="ed-sku">SKU</label><input id="ed-sku" maxlength="24" value="${esc(it?.sku || '')}" placeholder="e.g. SEN-BME280" autocomplete="off" autocapitalize="characters" spellcheck="false" ${it ? 'readonly' : ''}>${it ? '<span class="fine">A SKU can’t change once orders use it.</span>' : ''}</div>
      <div class="field"><label for="ed-cat">Category</label><select id="ed-cat">${catOpts}</select></div>
      <div class="field span2" id="ed-newcat-f" hidden><label for="ed-newcat">New category name</label><input id="ed-newcat" maxlength="30" placeholder="e.g. Displays" autocomplete="off"></div>
    </div>
    <div class="field"><label>How students get it</label>
      <div class="seg3" id="ed-modes" data-on="${m}"><span class="seg3-thumb" aria-hidden="true"></span>
        ${[
          ['buy', 'Buy only'],
          ['rent', 'Rent only'],
          ['both', 'Buy or rent'],
        ]
          .map(
            ([v, l]) =>
              `<button type="button" data-act="ed-mode" data-m="${v}" aria-pressed="${m === v}">${l}</button>`,
          )
          .join('')}
      </div><input type="hidden" id="ed-mode" value="${m}">
    </div>
    <div class="ed-grid">
      <div class="field" data-for="buy both"><label for="ed-price">Price</label><div class="money-in sm"><span>$</span><input id="ed-price" inputmode="decimal" placeholder="0.00" value="${it && it.price ? it.price.toFixed(2) : ''}" autocomplete="off"></div></div>
      <div class="field" data-for="rent both"><label for="ed-rent">Rental fee</label><div class="money-in sm"><span>$</span><input id="ed-rent" inputmode="decimal" placeholder="Leave blank for free" value="${it && it.rent ? it.rent.toFixed(2) : ''}" autocomplete="off"></div></div>
      <div class="field"><label for="ed-stock">${it ? 'In stock now' : 'Starting stock'}</label>
        <div class="stock-in"><button type="button" data-act="ed-step" data-d="-1" aria-label="One fewer">${I('minus')}</button><input id="ed-stock" inputmode="numeric" value="${it ? (S.stock[it.sku] ?? 0) : 10}" autocomplete="off"><button type="button" data-act="ed-step" data-d="1" aria-label="One more">${I('plus')}</button><button type="button" class="plus10" data-act="ed-step" data-d="10">+10</button></div>
      </div>
    </div>
    <div class="ed-block" data-for="buy both">
      <label class="switch"><span><b>Limit how many a team can buy</b><span>Rentals don’t count toward the limit.</span></span><input type="checkbox" id="ed-lim" ${lim ? 'checked' : ''}></label>
      <div class="ed-grid" id="ed-lim-f" ${lim ? '' : 'hidden'}>
        <div class="field"><label for="ed-lim-n">Up to</label><input id="ed-lim-n" inputmode="numeric" value="${lim ? lim.n : 4}" autocomplete="off"></div>
        <div class="field"><label for="ed-lim-per">Per team, each</label><select id="ed-lim-per"><option value="term" ${lim?.per !== 'course' ? 'selected' : ''}>Term</option><option value="course" ${lim?.per === 'course' ? 'selected' : ''}>Course</option></select></div>
      </div>
    </div>
    <div class="field"><label for="ed-desc">Description</label><textarea class="note" id="ed-desc" maxlength="400" placeholder="What it is and what students use it for.">${esc(it?.desc || '')}</textarea></div>
    <div class="field"><label for="ed-specs">Specs</label><textarea class="note mono" id="ed-specs" rows="4" placeholder="Voltage: 3.3–5 V&#10;Interface: I²C">${esc(specs)}</textarea><span class="fine">One per line, written as Label: value. Up to 6.</span></div>
    <label class="switch"><span><b>Show to students</b><span>Turn off to hide it from Stock. Past orders still show it.</span></span><input type="checkbox" id="ed-vis" ${it && it.hidden ? '' : 'checked'}></label>
    <p class="form-err" id="ed-err" role="alert" hidden></p>
    <div class="ed-actions"><button type="button" class="btn btn-ghost" data-act="close-sheet">Cancel</button><button type="submit" class="btn btn-primary">${it ? 'Save changes' : 'Add product'}</button></div>
  </form>`;
}
function openFormSheet(html, focusSel) {
  U.lastFocus = document.activeElement;
  U.sheetSku = null;
  const root = $('#sheet-root');
  root.innerHTML = `<div class="scrim" data-act="close-sheet"></div><div class="sheet form-sheet" role="dialog" aria-modal="true" aria-labelledby="ed-title"><button class="close" data-act="close-sheet" aria-label="Close">${I('x')}</button><div id="form-body">${html}</div></div>`;
  root.hidden = false;
  void root.offsetWidth;
  root.classList.add('open');
  const target = focusSel && matchMedia('(pointer: fine)').matches ? $(focusSel, root) : $('.close', root);
  setTimeout(() => target?.focus({ preventScroll: true }), 60);
}
function openEditor(sku) {
  const it = sku ? item(sku) : null;
  U.edSku = sku || null;
  U.edPhoto = it ? it.photo || null : null;
  openFormSheet(editorHTML(it), it ? '#ed-stock' : '#ed-name');
  edSync();
  U.overlay = { k: 'edit', v: sku || 'new' };
  syncRoute();
}
function edSync() {
  const f = $('#ed-form');
  if (!f) return;
  const m = $('#ed-mode').value;
  $$('[data-for]', f).forEach(el => (el.hidden = !el.dataset.for.split(' ').includes(m)));
  const seg = $('#ed-modes');
  seg.dataset.on = m;
  $$('button', seg).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
  $('#ed-newcat-f').hidden = $('#ed-cat').value !== '__new';
  $('#ed-lim-f').hidden = !$('#ed-lim').checked;
}
async function edPhoto(file) {
  if (!file.type.startsWith('image/')) {
    toast('That file isn’t an image. Choose a JPG or PNG.', true);
    return;
  }
  try {
    U.edPhoto = await readImage(file, 700, '#ffffff');
    const box = $('#ed-photo');
    if (box) box.innerHTML = edPhotoInner(null);
    const rm = $('#ed-rm');
    if (rm) rm.hidden = false;
  } catch (e) {
    toast('Couldn’t read that image. Try a different file.', true);
  }
}
function saveProduct() {
  const err = $('#ed-err'),
    fail = (m, sel) => {
      err.textContent = m;
      err.hidden = false;
      if (sel) $(sel)?.focus();
    };
  const old = U.edSku ? item(U.edSku) : null;
  const name = $('#ed-name').value.trim().replace(/\s+/g, ' ');
  const sku = old ? old.sku : $('#ed-sku').value.trim().toUpperCase();
  const mode = $('#ed-mode').value;
  if (!name) return fail('Give the product a name.', '#ed-name');
  if (!old) {
    if (!SKU_RE.test(sku))
      return fail('Use 2 to 24 letters, numbers or dashes for the SKU, like SEN-BME280.', '#ed-sku');
    if (item(sku))
      return fail(`${sku} is already used by ${item(sku).name}. Pick a different SKU.`, '#ed-sku');
  }
  let cat = $('#ed-cat').value,
    newCat = null;
  if (cat === '__new') {
    const cn = $('#ed-newcat').value.trim().replace(/\s+/g, ' ');
    if (!cn) return fail('Name the new category.', '#ed-newcat');
    const ex = findCat(cn);
    if (ex) cat = ex.id;
    else {
      newCat = { id: catId(cn), name: cn, blurb: '' };
      cat = newCat.id;
    }
  }
  const price = parseAmt($('#ed-price').value),
    rent = parseAmt($('#ed-rent').value);
  if (mode !== 'rent' && !(price > 0 && price <= 10000))
    return fail('Enter a price above $0, like 4.50.', '#ed-price');
  if (mode !== 'buy' && !(rent >= 0 && rent <= 10000))
    return fail('Enter a rental fee like 2.00, or leave it blank for free.', '#ed-rent');
  const stRaw = $('#ed-stock').value.trim();
  if (!/^\d+$/.test(stRaw) || +stRaw > 9999)
    return fail('Enter how many are in stock, from 0 to 9,999.', '#ed-stock');
  let limit = null;
  if (mode !== 'rent' && $('#ed-lim').checked) {
    const n = $('#ed-lim-n').value.trim();
    if (!/^\d+$/.test(n) || +n < 1 || +n > 99)
      return fail('Set the limit to a number from 1 to 99.', '#ed-lim-n');
    limit = { n: +n, per: $('#ed-lim-per').value };
  }
  const specs = $('#ed-specs')
    .value.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map(l => {
      const k = l.indexOf(':');
      return k > 0 ? [l.slice(0, k).trim(), l.slice(k + 1).trim()] : ['Note', l];
    });
  const data = {
    name,
    cat,
    mode,
    price: mode === 'rent' ? 0 : price,
    rent: mode === 'buy' ? 0 : rent,
    limit,
    desc: $('#ed-desc').value.trim(),
    specs,
    hidden: !$('#ed-vis').checked,
    photo: U.edPhoto || null,
  };
  if (newCat) CATS.push(newCat);
  if (old) Object.assign(old, data);
  else ITEMS.push({ sku, art: null, stock: +stRaw, ...data });
  S.stock[sku] = +stRaw;
  const ok = save();
  closeOverlay('#sheet-root');
  render();
  toast(
    ok
      ? old
        ? `Saved ${name}`
        : `Added ${name} to ${catOf(cat).name}`
      : 'Saved for now, but this browser’s storage is full, so it won’t survive a refresh. Try a smaller photo.',
    !ok,
  );
}

/* categories */
function catsHTML() {
  return `<form class="ed" id="cat-form" novalidate>
    <div><div class="eyebrow">Inventory</div><h2 id="ed-title">Categories</h2></div>
    <p class="muted">Rename categories or change the line shown under them in Stock. A category can be removed once it has no products.</p>
    <div class="cat-list">${CATS.map(c => {
      const n = ITEMS.filter(i => i.cat === c.id).length;
      return `<div class="cat-edit" data-id="${c.id}">
      <div class="field"><label for="ce-n-${c.id}">Name · ${n} product${n === 1 ? '' : 's'}</label><input id="ce-n-${c.id}" class="ce-name" maxlength="30" value="${esc(c.name)}" autocomplete="off"></div>
      <div class="field"><label for="ce-b-${c.id}">Description</label><input id="ce-b-${c.id}" class="ce-blurb" maxlength="90" value="${esc(c.blurb || '')}" placeholder="Shown on the category tile" autocomplete="off"></div>
      ${n ? '<span></span>' : `<button type="button" class="rm" data-act="cat-del" aria-label="Remove ${esc(c.name)}">${I('trash')}</button>`}
    </div>`;
    }).join('')}</div>
    <div class="cat-edit new"><div class="field"><label for="ce-new-n">Add a category</label><input id="ce-new-n" maxlength="30" placeholder="e.g. Displays" autocomplete="off"></div><div class="field"><label for="ce-new-b">Description</label><input id="ce-new-b" maxlength="90" placeholder="Optional" autocomplete="off"></div><span></span></div>
    <p class="form-err" id="ed-err" role="alert" hidden></p>
    <div class="ed-actions"><button type="button" class="btn btn-ghost" data-act="close-sheet">Cancel</button><button type="submit" class="btn btn-primary">Save categories</button></div>
  </form>`;
}
function saveCats() {
  const err = $('#ed-err'),
    fail = (m, el) => {
      err.textContent = m;
      err.hidden = false;
      el?.focus();
    };
  const next = [],
    names = new Set();
  for (const r of $$('#cat-form .cat-edit[data-id]')) {
    const inp = $('.ce-name', r),
      nm = inp.value.trim().replace(/\s+/g, ' ');
    if (!nm) return fail('Every category needs a name.', inp);
    if (names.has(nm.toLowerCase()))
      return fail(`Two categories are named “${nm}”. Give each a different name.`, inp);
    names.add(nm.toLowerCase());
    next.push({ ...catOf(r.dataset.id), name: nm, blurb: $('.ce-blurb', r).value.trim() });
  }
  CATS.forEach(c => {
    if (!next.some(x => x.id === c.id) && ITEMS.some(i => i.cat === c.id)) next.push(c);
  });
  const ni = $('#ce-new-n'),
    nn = ni.value.trim().replace(/\s+/g, ' ');
  if (nn) {
    if (names.has(nn.toLowerCase())) return fail(`There’s already a category named “${nn}”.`, ni);
    next.push({ id: catId(nn), name: nn, blurb: $('#ce-new-b').value.trim() });
  }
  if (!next.length) return fail('Keep at least one category.', ni);
  S.cats = next;
  CATS = next;
  if (U.invF && !['all', 'low', 'hidden'].includes(U.invF) && !catOf(U.invF)) U.invF = 'all';
  save();
  closeOverlay('#sheet-root');
  render();
  toast('Categories saved');
}

/* CSV import */
const CSV_TEMPLATE = `sku,name,category,price,rent,mode,stock,limit,limit_per,description
SEN-BME280,BME280 pressure sensor,Sensors,6.50,,buy,20,2,term,"Temperature, humidity and pressure over I2C."
EQ-SCOPE,Handheld oscilloscope,Lab equipment,,10.00,rent,3,,,Two-channel scope for bench checks.`;
const CSV_COLS = [
  ['sku', 'Required. A matching SKU updates that product.'],
  ['name', 'Required for new products.'],
  ['category', 'Required for new products. A new name creates a category.'],
  ['price', 'Purchase price in dollars.'],
  ['rent', 'Rental fee. Blank or 0 means free.'],
  ['mode', 'buy, rent or both. Defaults to buy.'],
  ['stock', 'How many are on the shelf.'],
  ['limit', 'Most a team can buy. 0 removes the limit.'],
  ['limit_per', 'term or course.'],
  ['description', 'Shown on the product page.'],
];
function parseCSV(text) {
  const rows = [];
  let row = [],
    f = '',
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"' && f === '') q = true;
    else if (c === ',') {
      row.push(f);
      f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(f);
      rows.push(row);
      row = [];
      f = '';
    } else f += c;
  }
  if (f !== '' || row.length) {
    row.push(f);
    rows.push(row);
  }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function buildPlan(text, file) {
  const rows = parseCSV(text.replace(/^﻿/, ''));
  if (rows.length < 2)
    return {
      error:
        'That file has no product rows. The first row should be the column names, with products below it.',
    };
  const alias = {
    sku: 'sku',
    name: 'name',
    product: 'name',
    'product name': 'name',
    category: 'category',
    price: 'price',
    rent: 'rent',
    'rental fee': 'rent',
    rental_fee: 'rent',
    rent_fee: 'rent',
    mode: 'mode',
    type: 'mode',
    stock: 'stock',
    qty: 'stock',
    quantity: 'stock',
    limit: 'limit',
    limit_per: 'limit_per',
    'limit per': 'limit_per',
    description: 'description',
    desc: 'description',
  };
  const head = rows[0].map(h => alias[h.trim().toLowerCase()] || null);
  if (!head.includes('sku'))
    return { error: 'The file needs a “sku” column. Copy the template to see the expected columns.' };
  const plan = { file, add: [], update: [], skip: [], newCats: [] },
    seen = new Set();
  rows.slice(1).forEach((r, k) => {
    const n = k + 2,
      get = key => {
        const i = head.indexOf(key);
        return i < 0 ? '' : String(r[i] ?? '').trim();
      };
    const sku = get('sku').toUpperCase(),
      skip = reason => plan.skip.push({ n, sku, reason });
    if (!sku) return skip('No SKU');
    if (!SKU_RE.test(sku)) return skip('SKU can only use letters, numbers and dashes');
    if (seen.has(sku)) return skip('This SKU is listed twice in the file');
    seen.add(sku);
    const ex = item(sku),
      d = {};
    const name = get('name'),
      cn = get('category'),
      pr = get('price'),
      rn = get('rent'),
      md = get('mode').toLowerCase(),
      st = get('stock'),
      li = get('limit'),
      lp = get('limit_per').toLowerCase(),
      ds = get('description');
    if (name) d.name = name.slice(0, 60);
    if (cn) d.catName = cn.slice(0, 30);
    if (pr) {
      const v = parseAmt(pr);
      if (!(v >= 0 && v <= 10000)) return skip(`Price “${pr}” isn’t a dollar amount`);
      d.price = v;
    }
    if (rn) {
      const v = parseAmt(rn);
      if (!(v >= 0 && v <= 10000)) return skip(`Rent “${rn}” isn’t a dollar amount`);
      d.rent = v;
    }
    if (md) {
      const mm = { buy: 'buy', purchase: 'buy', rent: 'rent', both: 'both', 'buy or rent': 'both' }[md];
      if (!mm) return skip(`Mode “${md}” should be buy, rent or both`);
      d.mode = mm;
    }
    if (st) {
      if (!/^\d+$/.test(st) || +st > 9999) return skip(`Stock “${st}” isn’t a whole number`);
      d.stock = +st;
    }
    if (li) {
      if (!/^\d+$/.test(li) || +li > 99) return skip(`Limit “${li}” should be a number from 0 to 99`);
      d.limit = +li;
    }
    if (lp) {
      if (!['term', 'course'].includes(lp)) return skip('limit_per should be term or course');
      d.per = lp;
    }
    if (ds) d.desc = ds.slice(0, 400);
    if (!ex) {
      if (!d.name) return skip('A new product needs a name');
      if (!d.catName) return skip('A new product needs a category');
      if (!d.mode) d.mode = !d.price && d.rent != null ? 'rent' : 'buy';
      if (d.mode !== 'rent' && !(d.price > 0)) return skip('Needs a price above $0 to be bought');
      plan.add.push({ n, sku, d });
    } else {
      const mode = d.mode || ex.mode,
        price = d.price != null ? d.price : ex.price;
      if (mode !== 'rent' && !(price > 0)) return skip('Needs a price above $0 to be bought');
      plan.update.push({ n, sku, d });
    }
  });
  [...plan.add, ...plan.update].forEach(p => {
    const c = p.d.catName;
    if (c && !findCat(c) && !plan.newCats.some(x => x.toLowerCase() === c.toLowerCase()))
      plan.newCats.push(c);
  });
  return plan;
}
function importHTML() {
  const p = U.csvPlan;
  if (!p)
    return `<div class="ed">
    <div><div class="eyebrow">Inventory</div><h2 id="ed-title">Import from a spreadsheet</h2></div>
    <p class="muted">Save your inventory sheet as a CSV file (in Excel or Google Sheets: File › Download › CSV) and upload it. New SKUs get added. SKUs that already exist get updated, and blank cells leave the current value alone.</p>
    <button type="button" class="drop" data-act="csv-pick" data-drop="csv"><span class="up">${I('upload')}</span><b>Drop a CSV file here</b><span>or click to choose one</span></button>
    <input type="file" id="csv-input" accept=".csv,text/csv" hidden>
    <div class="field"><label>Columns</label><dl class="cols">${CSV_COLS.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></div>
    <div class="tpl"><div class="tpl-head"><span>Template</span><button type="button" class="btn btn-sm btn-ghost" data-act="csv-copy">Copy</button></div><pre id="csv-tpl">${esc(CSV_TEMPLATE)}</pre></div>
  </div>`;
  const rows = [...p.add.map(x => ({ ...x, a: 'New' })), ...p.update.map(x => ({ ...x, a: 'Update' }))].sort(
    (a, z) => a.n - z.n,
  );
  const n = rows.length;
  const cell = (x, k) =>
    x.d[k] != null
      ? esc(k === 'price' || k === 'rent' ? money(x.d[k]) : x.d[k])
      : '<span class="muted">—</span>';
  return `<div class="ed">
    <div><div class="eyebrow">${esc(p.file)}</div><h2 id="ed-title">${n ? 'Ready to import' : 'Nothing to import'}</h2></div>
    <div class="imp-stats"><div><b>${p.add.length}</b><span>new products</span></div><div><b>${p.update.length}</b><span>updates</span></div><div><b>${p.skip.length}</b><span>rows skipped</span></div></div>
    ${p.newCats.length ? `<p class="small">New categories: <b>${p.newCats.map(esc).join(', ')}</b></p>` : ''}
    ${
      n
        ? `<div class="imp-table-wrap"><table class="imp"><thead><tr><th></th><th>SKU</th><th>Name</th><th>Category</th><th>Price</th><th>Rent</th><th>Stock</th></tr></thead><tbody>
      ${rows
        .slice(0, 10)
        .map(
          x =>
            `<tr><td><span class="chip ${x.a === 'New' ? 'ready' : 'queued'}">${x.a}</span></td><td class="mono-s">${x.sku}</td><td>${x.d.name ? esc(x.d.name) : esc(item(x.sku)?.name || '')}</td><td>${x.d.catName ? esc(x.d.catName) : '<span class="muted">—</span>'}</td><td>${cell(x, 'price')}</td><td>${cell(x, 'rent')}</td><td>${cell(x, 'stock')}</td></tr>`,
        )
        .join('')}
    </tbody></table></div>${rows.length > 10 ? `<p class="fine">And ${rows.length - 10} more.</p>` : ''}`
        : ''
    }
    ${
      p.skip.length
        ? `<div class="skips"><div class="field"><label>Skipped rows</label></div>${p.skip
            .slice(0, 8)
            .map(s => `<div><b>Row ${s.n}${s.sku ? ` · ${esc(s.sku)}` : ''}</b> · ${esc(s.reason)}</div>`)
            .join('')}${p.skip.length > 8 ? `<div>And ${p.skip.length - 8} more.</div>` : ''}</div>`
        : ''
    }
    <div class="ed-actions"><button type="button" class="btn btn-ghost" data-act="csv-back">Choose a different file</button><button type="button" class="btn btn-primary" data-act="csv-apply" ${n ? '' : 'disabled'}>${n ? `Import ${n} product${n === 1 ? '' : 's'}` : 'Import'}</button></div>
  </div>`;
}
function openImport() {
  U.csvPlan = null;
  openFormSheet(importHTML());
  U.overlay = { k: 'import' };
  syncRoute();
}
function openCats() {
  openFormSheet(catsHTML());
  U.overlay = { k: 'cats' };
  syncRoute();
}
function refreshImport() {
  const b = $('#form-body');
  if (b) b.innerHTML = importHTML();
  $('#sheet-root .sheet')?.scrollTo({ top: 0 });
}
function csvFile(file) {
  if (!/\.csv$/i.test(file.name) && !/csv/.test(file.type)) {
    toast('Choose a .csv file. In Excel or Google Sheets, use File › Download › CSV.', true);
    return;
  }
  if (file.size > 2e6) {
    toast('That file is over 2 MB. Split it into smaller files.', true);
    return;
  }
  const fr = new FileReader();
  fr.onerror = () => toast('Couldn’t read that file. Try saving it as CSV again.', true);
  fr.onload = () => {
    const plan = buildPlan(String(fr.result), file.name);
    if (plan.error) {
      toast(plan.error, true);
      return;
    }
    U.csvPlan = plan;
    refreshImport();
  };
  fr.readAsText(file);
}
function applyPlan() {
  const p = U.csvPlan;
  if (!p) return;
  p.newCats.forEach(nm => {
    if (!findCat(nm)) CATS.push({ id: catId(nm), name: nm, blurb: '' });
  });
  p.add.forEach(({ sku, d }) => {
    ITEMS.push({
      sku,
      name: d.name,
      cat: findCat(d.catName).id,
      mode: d.mode,
      price: d.mode === 'rent' ? 0 : d.price,
      rent: d.mode === 'buy' ? 0 : d.rent || 0,
      stock: d.stock || 0,
      art: null,
      photo: null,
      limit: d.limit ? { n: d.limit, per: d.per || 'term' } : null,
      desc: d.desc || '',
      specs: [],
      hidden: false,
    });
    S.stock[sku] = d.stock || 0;
  });
  p.update.forEach(({ sku, d }) => {
    const it = item(sku);
    if (d.name) it.name = d.name;
    if (d.catName) it.cat = findCat(d.catName).id;
    if (d.mode) it.mode = d.mode;
    if (d.price != null) it.price = d.price;
    if (d.rent != null) it.rent = d.rent;
    if (d.limit != null) it.limit = d.limit ? { n: d.limit, per: d.per || it.limit?.per || 'term' } : null;
    else if (d.per && it.limit) it.limit.per = d.per;
    if (d.desc) it.desc = d.desc;
    if (d.stock != null) S.stock[sku] = d.stock;
  });
  const n = p.add.length + p.update.length,
    added = p.add.length;
  U.csvPlan = null;
  const ok = save();
  closeOverlay('#sheet-root');
  render();
  toast(
    ok
      ? `Imported ${n} product${n === 1 ? '' : 's'}${added && added !== n ? ` (${added} new)` : ''}`
      : 'Imported for now, but this browser’s storage is full, so it won’t survive a refresh.',
    !ok,
  );
}
