// Event wiring and startup.

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const f = ACT[t.dataset.act];
  if (f) {
    e.preventDefault();
    f(t, e);
  }
});
document.addEventListener('submit', e => {
  if (e.target.id === 'login-form') {
    e.preventDefault();
    login($('#eraider').value);
  }
  if (e.target.id === 'queue-form') {
    e.preventDefault();
    addJob();
  }
  if (e.target.id === 'ed-form') {
    e.preventDefault();
    saveProduct();
  }
  if (e.target.id === 'cat-form') {
    e.preventDefault();
    saveCats();
  }
  if (e.target.id === 'ready-form') {
    e.preventDefault();
    markReady(e.target.dataset.id);
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') {
    U.q = e.target.value;
    refreshStock();
  }
  if (e.target.id === 'eraider') {
    const er = $('#login-err');
    if (er) er.hidden = true;
  }
  if (e.target.id === 'inv-q') {
    U.invQ = e.target.value;
    refreshInv();
  }
  if (e.target.closest?.('#ed-form, #cat-form')) {
    const er = $('#ed-err');
    if (er) er.hidden = true;
  }
  if (e.target.id === 'pf-desc') {
    const er = $('#pf-err');
    if (er) er.hidden = true;
  }
  if (e.target.id === 'rf-amt') {
    const er = $('#rf-err');
    if (er) er.hidden = true;
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'pf-team') {
    U.printTeam = t.value;
  }
  if (t.id === 'ed-photo-input') {
    handleFile('photo', t.files[0]);
    t.value = '';
  }
  if (t.id === 'csv-input') {
    handleFile('csv', t.files[0]);
    t.value = '';
  }
  if (t.id === 'ed-cat' || t.id === 'ed-lim') {
    edSync();
    if (t.id === 'ed-cat' && t.value === '__new') $('#ed-newcat')?.focus();
  }
  if (t.id === 'avatar-input') {
    handleFile('avatar', t.files[0]);
    t.value = '';
  }
  if (t.id === 'cert-input') {
    handleFile('cert', t.files[0]);
    t.value = '';
  }
  if (t.id === 'me-name') {
    const v = t.value.trim().replace(/\s+/g, ' ');
    if (!v) {
      t.value = S.me.name;
      toast('Enter a name to show on your team', true);
      return;
    }
    const old = S.me.name;
    if (v === old) return;
    S.teams.forEach(tm => (tm.members = tm.members.map(m => (m === old ? v : m))));
    S.orders.forEach(o => {
      if (o.by === old) o.by = v;
    });
    S.certs.forEach(c => {
      if (c.student === old) c.student = v;
    });
    S.me.name = v;
    save();
    render();
    toast('Name updated');
  }
});
document.addEventListener('dragover', e => {
  const z = e.target.closest('[data-drop]');
  if (!z) return;
  e.preventDefault();
  z.classList.add('over');
});
document.addEventListener('dragleave', e => {
  const z = e.target.closest('[data-drop]');
  if (z && !z.contains(e.relatedTarget)) z.classList.remove('over');
});
document.addEventListener('drop', e => {
  const z = e.target.closest('[data-drop]');
  if (!z) return;
  e.preventDefault();
  z.classList.remove('over');
  handleFile(z.dataset.drop, e.dataTransfer.files[0]);
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (U.view === 'board') {
    ACT['board-exit']();
    return;
  }
  if (U.readyFor) {
    U.readyFor = null;
    render();
    return;
  }
  if (!$('#sheet-root').hidden) closeOverlay('#sheet-root');
  else if (!$('#drawer-root').hidden) closeOverlay('#drawer-root');
});

addEventListener('storage', e => {
  if (e.key !== KEY || !e.newValue) return;
  try {
    const sess = S.session,
      next = JSON.parse(e.newValue);
    S = next;
    S.session = sess;
    wireMe();
    if (S.items && S.cats) {
      ITEMS = S.items;
      CATS = S.cats;
    }
    for (const k in artCache) delete artCache[k];
    const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if (U.view === 'board') {
      U.boardCalm = true;
      render();
    } else if (!typing && $('#sheet-root').hidden && $('#drawer-root').hidden) render();
  } catch (err) {}
});

render();
