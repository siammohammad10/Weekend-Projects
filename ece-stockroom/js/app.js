// Rendering, shared effects and file handling.

// Render
const VIEWS = {
  student: { dash: vDash, stock: vStock, profile: vProfile },
  admin: { desk: vDesk, inv: vInv, teams: vTeams, instructors: vInst, certs: vCerts, print: vPrint },
};
const footer = () =>
  `<footer class="foot"><span>Stockroom concept · demo data, saved only in this browser</span><button class="linkbtn" data-act="reset" id="reset-btn">Reset demo data</button></footer>`;
function render() {
  if (!S.me) {
    S.session = null;
    renderHeader();
    $('#view').innerHTML = '';
    showGate(false);
    return;
  }
  const set = VIEWS[S.role];
  const board = U.view === 'board' && S.role === 'admin';
  if (!set[U.view] && !board) U.view = Object.keys(set)[0];
  document.body.classList.toggle('board-mode', board);
  renderHeader();
  if (board) {
    $('#view').innerHTML = vBoard();
    return;
  }
  $('#view').innerHTML = set[U.view]() + footer();
  post($('#view'));
  U.flash = null;
}
function post(root) {
  countUps(root);
}
function go(view) {
  if (U.view === view && view !== 'stock') {
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    return;
  }
  U.view = view;
  render();
  scrollTo({ top: 0 });
}
function countUps(root) {
  if (reduce) return;
  $$('[data-count]', root).forEach(el => {
    const to = parseFloat(el.dataset.count),
      dec = +el.dataset.dec || 0,
      pre = el.dataset.pre || '',
      t0 = performance.now(),
      dur = 1000;
    if (!to) return;
    const f = t => {
      const p = Math.min(1, (t - t0) / dur),
        e = 1 - Math.pow(1 - p, 3);
      el.textContent =
        pre + (to * e).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}

// Effects
function toast(msg, err) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' err' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = I(err ? 'x' : 'check') + `<span>${esc(msg)}</span>`;
  $('#toasts').appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, 3400);
}
function bumpCart() {
  const cb = $('#cart-btn');
  cb.classList.remove('cart-bump');
  void cb.offsetWidth;
  cb.classList.add('cart-bump');
}
function fly(fromEl, done) {
  const cart = $('#cart-btn');
  if (reduce || !fromEl || !cart || cart.hidden) {
    done();
    bumpCart();
    return;
  }
  const a = fromEl.getBoundingClientRect(),
    b = cart.getBoundingClientRect();
  const g = document.createElement('div');
  g.className = 'ghost';
  g.innerHTML = fromEl.innerHTML;
  Object.assign(g.style, {
    left: a.left + 'px',
    top: a.top + 'px',
    width: a.width + 'px',
    height: a.height + 'px',
  });
  document.body.appendChild(g);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2),
    dy = b.top + b.height / 2 - (a.top + a.height / 2);
  g.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0)', opacity: 1 },
      {
        transform: `translate(${dx * 0.45}px,${dy * 0.45 - 90}px) scale(.55) rotate(-8deg)`,
        opacity: 1,
        offset: 0.5,
      },
      { transform: `translate(${dx}px,${dy}px) scale(.08) rotate(10deg)`, opacity: 0.4 },
    ],
    { duration: 820, easing: 'cubic-bezier(.55,0,.25,1)' },
  ).onfinish = () => {
    g.remove();
    done();
    bumpCart();
  };
}
function slideOut(sel, done) {
  const el = $(sel);
  if (!el || reduce) {
    done();
    return;
  }
  el.animate(
    [
      { opacity: 1, transform: 'none' },
      { opacity: 0, transform: 'translateX(28px)' },
    ],
    { duration: 300, easing: 'ease-in' },
  ).onfinish = done;
}

// Files
function readImage(file, max, bg) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = rej;
    fr.onload = () => {
      const img = new Image();
      img.onerror = rej;
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height)),
          cv = document.createElement('canvas');
        cv.width = Math.round(img.width * s);
        cv.height = Math.round(img.height * s);
        const cx = cv.getContext('2d');
        if (bg) {
          cx.fillStyle = bg;
          cx.fillRect(0, 0, cv.width, cv.height);
        }
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        res(cv.toDataURL('image/jpeg', 0.85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function handleFile(kind, file) {
  if (!file || !S.me) return;
  if (kind === 'photo') return edPhoto(file);
  if (kind === 'csv') return csvFile(file);
  if (kind === 'avatar') {
    if (!file.type.startsWith('image/')) {
      toast('That file isn’t an image. Choose a JPG or PNG.', true);
      return;
    }
    try {
      S.me.avatar = await readImage(file, 320);
      save();
      render();
      toast('Profile picture updated');
    } catch (e) {
      toast('Couldn’t read that image. Try a different file.', true);
    }
    return;
  }
  const okType = file.type.startsWith('image/') || file.type === 'application/pdf';
  if (!okType) {
    toast('Upload a PDF, JPG or PNG.', true);
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    toast('That file is over 10 MB. Upload a smaller copy.', true);
    return;
  }
  const c = myCert();
  try {
    c.kind = file.type === 'application/pdf' ? 'pdf' : 'img';
    c.preview = c.kind === 'img' ? await readImage(file, 1000) : null;
    c.file = file.name;
    c.at = Date.now();
    c.status = 'pending';
    c.note = null;
    save();
    render();
    toast('Certificate sent to the stockroom for review');
  } catch (e) {
    toast('Couldn’t read that file. Try a different one.', true);
  }
}
