// Staff views: front desk, teams, instructors and certificate review.

// Admin: desk
function vDesk() {
  const q = S.orders.filter(o => o.status === 'requested').sort((a, z) => a.at - z.at);
  const pc = S.certs.filter(c => c.status === 'pending').length;
  const low = shelf()
    .filter(i => S.stock[i.sku] <= 8)
    .sort((a, z) => S.stock[a.sku] - S.stock[z.sku]);
  const out = rentLines()
    .filter(r => r.o.status === 'purchased' && !r.l[4])
    .sort((a, z) => a.o.doneAt - z.o.doneAt);
  const outUnits = out.reduce((s, r) => s + r.l[1], 0);
  const recent = S.orders
    .filter(o => o.status === 'purchased')
    .sort((a, z) => z.doneAt - a.doneAt)
    .slice(0, 5);
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return `
  <header class="page-head"><div class="rise"><div class="eyebrow">Stockroom · ${date}</div><h1>Front desk</h1><p>Hand parts over and mark requests purchased so team balances update. Check rentals back in when they’re returned.</p></div></header>
  <div class="kpis">
    <article class="panel kpi rise ${q.length ? 'hot' : ''}" style="--i:1"><div class="eyebrow">Waiting for pickup</div><b>${countSpan(q.length)}</b><span>${money(q.reduce((s, o) => s + orderTotal(o), 0))} on hold</span></article>
    <article class="panel kpi rise" style="--i:2"><div class="eyebrow">Out on rent</div><b>${countSpan(outUnits)}</b><span>due back by ${DUE}</span></article>
    <article class="panel kpi rise" style="--i:3"><div class="eyebrow">Certificates to review</div><b>${countSpan(pc)}</b><span>lab access requests</span></article>
    <article class="panel kpi rise" style="--i:4"><div class="eyebrow">Low stock</div><b>${countSpan(low.length)}</b><span>items at 8 or fewer</span></article>
  </div>
  <div class="desk">
    <div class="main-col">
      <section class="panel rise" style="--i:5">
        <div class="panel-head"><div><div class="eyebrow">Oldest first</div><h2>Requests waiting for pickup</h2></div></div>
        ${
          q.length
            ? `<div class="qlist">${q
                .map(o => {
                  const t = teamOf(o.team),
                    ins = inst(t.instructor);
                  return `
          <div class="qrow" data-row="${o.id}">
            <div class="q-team"><span class="order-id">${o.id}</span><b>${t.name} · ${esc(o.by)}</b><span>${esc(ins.name)} · ${rel(o.at)}</span></div>
            <div class="q-items">${o.items.map(l => `<b>${l[1]}×</b> ${esc(item(l[0]).name)}${lineMode(l) === 'rent' ? ' <span class="tag rent">Rent</span>' : ''}`).join(', ')}${o.note ? `<em class="q-note">“${esc(o.note)}”</em>` : ''}</div>
            <div class="q-act"><span class="q-total">${money(orderTotal(o))}</span>
              <button class="btn btn-sm btn-ghost" data-act="cancel" data-id="${o.id}">Cancel</button>
              <button class="btn btn-sm btn-ok" data-act="mark" data-id="${o.id}">${I('check')} Mark purchased</button></div>
          </div>`;
                })
                .join('')}</div>`
            : `<div class="empty">${I('check')}<b>All caught up</b><span>New requests from teams show up here.</span></div>`
        }
      </section>
      <section class="panel rise" style="--i:6">
        <div class="panel-head"><div><div class="eyebrow">Due back by ${DUE}</div><h2>Out on rent</h2></div><span class="small muted">${out.length} rental${out.length === 1 ? '' : 's'}</span></div>
        ${
          out.length
            ? out
                .map(({ o, l, idx }) => {
                  const it = item(l[0]),
                    t = teamOf(o.team);
                  return `
          <div class="rentrow" data-row="rent-${o.id}-${idx}"><span class="line-art">${art(it)}</span>
            <div style="min-width:0"><b>${l[1]} × ${esc(it.name)}</b><span class="small">${t.name} · ${esc(o.by)} · picked up ${rel(o.doneAt)}</span></div>
            <button class="btn btn-sm btn-ghost" data-act="return" data-id="${o.id}" data-idx="${idx}">${I('ret')} Mark returned</button></div>`;
                })
                .join('')
            : '<p class="muted small">Nothing is out on rent right now.</p>'
        }
      </section>
    </div>
    <div class="side">
      <section class="panel rise" style="--i:7">
        <div class="panel-head"><div><div class="eyebrow">Reorder soon</div><h2>Low stock</h2></div><button class="linkbtn" data-act="nav" data-v="inv">Inventory</button></div>
        ${low.length ? low.map(it => `<button class="lowrow" data-act="inv-edit" data-sku="${it.sku}" aria-label="Restock ${esc(it.name)}"><span class="line-art">${art(it)}</span><div style="min-width:0"><b>${esc(it.name)}</b><div class="meter"><i style="width:${Math.max(4, (S.stock[it.sku] / 8) * 100)}%;background:${S.stock[it.sku] <= 3 ? 'var(--accent)' : 'var(--warn)'}"></i></div></div><span class="lowqty">${S.stock[it.sku]} left</span></button>`).join('') : '<p class="muted small">Everything is well stocked.</p>'}
      </section>
      <section class="panel rise" style="--i:8">
        <div class="panel-head"><div><div class="eyebrow">Recently</div><h2>Handed over</h2></div></div>
        <div class="recent">${recent.map(o => `<div><span><b style="color:var(--ink)">${teamOf(o.team).name}</b> · ${o.id}</span><span>${rel(o.doneAt)}</span></div>`).join('') || '<p class="muted small">Nothing yet.</p>'}</div>
      </section>
    </div>
  </div>`;
}

// Admin: teams
function vTeams() {
  const list = S.teams.filter(t => !U.instF || t.instructor === U.instF);
  return `
  <header class="page-head"><div class="rise"><div class="eyebrow">${S.teams.length} teams · ${S.instructors.length} instructors · ${TERM}</div><h1>Teams</h1><p>Each course sets its own team allocation. Here’s what every team has spent, has on hold, and has left.</p></div></header>
  <div class="chiprow rise" style="--i:1">
    <button class="fchip plain" data-act="inst-f" data-id="" aria-pressed="${!U.instF}">All instructors</button>
    ${S.instructors.map(i => `<button class="fchip plain" data-act="inst-f" data-id="${i.id}" aria-pressed="${U.instF === i.id}">${esc(i.name)}</button>`).join('')}
  </div>
  <div class="teams">${list
    .map((t, k) => {
      const b = budget(t.id),
        ins = inst(t.instructor);
      return `
    <article class="panel team rise" style="--i:${k + 2}">
      <div class="panel-head"><div><div class="eyebrow">${esc(ins.course)} · ${esc(ins.name)}</div><h2>${t.name}</h2></div><div class="left-big">${money(b.left)}<small>left</small></div></div>
      <p class="muted small">${esc(t.project)}</p>
      <div class="stackbar" role="img" aria-label="${money(b.spent)} spent, ${money(b.hold)} on hold of ${money(b.total)}">
        <i style="width:${(b.spent / b.total) * 100}%;background:var(--accent)"></i><i style="width:${(b.hold / b.total) * 100}%;background:var(--hold);animation-delay:.2s"></i>
      </div>
      <div class="stack-legend"><span><span class="sw" style="background:var(--accent)"></span>Spent ${money(b.spent)}${b.printed ? ` · incl. ${money(b.printed)} 3D printing` : ''}</span><span><span class="sw" style="background:var(--hold)"></span>On hold ${money(b.hold)}</span><span>${money(b.total)} course allocation</span></div>
      <div class="avatars">${t.members.map(m => avatar(m)).join('')}<span class="small muted" style="margin-left:10px">${t.members.map(m => esc(m.split(' ')[0])).join(', ')}</span></div>
      <div class="team-foot"><span><b style="color:var(--ink)">${b.items}</b> bought · <b style="color:var(--ink)">${b.rentOut}</b> on rent</span><span>${b.open ? `<span class="chip requested">${b.open} waiting</span>` : 'No open requests'}</span></div>
    </article>`;
    })
    .join('')}</div>`;
}

// Admin: instructors
function vInst() {
  return `
  <header class="page-head"><div class="rise"><div class="eyebrow">Courses using the stockroom</div><h1>Instructors</h1><p>Each instructor’s sections and the teams under them. Tap a team to see its budget.</p></div></header>
  <div class="insts">${S.instructors
    .map((ins, k) => {
      const ts = S.teams.filter(t => t.instructor === ins.id);
      const students = ts.reduce((s, t) => s + t.members.length, 0);
      const spent = ts.reduce((s, t) => s + budget(t.id).spent, 0);
      return `<article class="panel rise" style="--i:${k + 1}">
      <div class="inst-top"><span class="inst-av">${initials(ins.name.replace(/^Dr\.\s*/, ''))}</span><div><h2>${esc(ins.name)}</h2><span class="small muted">${esc(ins.course)} · ${esc(ins.section)}${ts[0] ? ` · ${money(ts[0].budget).replace('.00', '')} per team` : ''}</span></div></div>
      <div class="inst-stats"><div><b>${ts.length}</b><span>teams</span></div><div><b>${students}</b><span>students</span></div><div><b>${money(spent).replace('.00', '')}</b><span>spent</span></div></div>
      <div class="inst-teams">${ts
        .map(t => {
          const b = budget(t.id);
          return `
        <button class="inst-team" data-act="goto-team" data-id="${ins.id}"><span><b>${t.name}</b><span>${esc(t.project)}</span></span>
          <span class="meter"><i style="width:${((b.spent + b.hold) / b.total) * 100}%;background:var(--accent)"></i></span>
          <span class="num small">${money(b.left)} left</span></button>`;
        })
        .join('')}</div>
    </article>`;
    })
    .join('')}</div>`;
}

// Admin: certificates
function certPreview(c) {
  if (c.kind === 'img' && c.preview) return `<img src="${c.preview}" alt="">`;
  if (c.kind === 'demo') return certArt();
  return I('file');
}
function vCerts() {
  const all = S.certs
    .filter(c => c.status !== 'none')
    .sort((a, z) => (a.status === 'pending' ? 0 : 1) - (z.status === 'pending' ? 0 : 1) || z.at - a.at);
  const list = U.certTab === 'pending' ? all.filter(c => c.status === 'pending') : all;
  const pc = all.filter(c => c.status === 'pending').length;
  return `
  <header class="page-head"><div class="rise"><div class="eyebrow">Lab access</div><h1>Certificates</h1><p>Check each lab safety certificate. Verifying one gives that student Project Lab access.</p></div></header>
  <section class="panel rise" style="--i:1">
    <div class="tabs"><button class="fchip plain" data-act="cert-tab" data-t="pending" aria-pressed="${U.certTab === 'pending'}">Needs review · ${pc}</button><button class="fchip plain" data-act="cert-tab" data-t="all" aria-pressed="${U.certTab === 'all'}">All · ${all.length}</button></div>
    ${
      list.length
        ? `<div class="clist">${list
            .map(
              c => `
      <div class="crow" data-row="${c.id}">
        <button class="c-thumb" data-act="view-cert" data-id="${c.id}" aria-label="Preview ${esc(c.file)}">${certPreview(c)}</button>
        <div class="c-info"><b>${esc(certName(c))}</b><span>${teamOf(c.team).name} · ${esc(c.file)} · ${rel(c.at)}</span>${c.status === 'rejected' && c.note ? `<span style="display:block;color:var(--accent)">${esc(c.note)}</span>` : ''}</div>
        <div class="c-act">${c.status === 'pending' ? `<button class="btn btn-sm btn-ghost" data-act="reject" data-id="${c.id}">Reject</button><button class="btn btn-sm btn-ok" data-act="verify" data-id="${c.id}">${I('check')} Verify</button>` : chip(c.status)}</div>
      </div>`,
            )
            .join('')}</div>`
        : `<div class="empty">${I('cert')}<b>No certificates waiting</b><span>When a student uploads one, it shows up here.</span></div>`
    }
  </section>`;
}
function openViewer(id) {
  const c = S.certs.find(x => x.id === id);
  U.lastFocus = document.activeElement;
  const big =
    c.kind === 'img' && c.preview
      ? `<img src="${c.preview}" alt="Certificate from ${esc(certName(c))}">`
      : c.kind === 'demo'
        ? certArt()
        : `<div class="empty">${I('file')}<b>${esc(c.file)}</b><span>PDF preview isn’t available in this demo.</span></div>`;
  const root = $('#sheet-root');
  root.innerHTML = `<div class="scrim" data-act="close-sheet"></div>
    <div class="sheet viewer" role="dialog" aria-modal="true" aria-labelledby="viewer-title">
      <button class="close" data-act="close-sheet" aria-label="Close">${I('x')}</button>
      <div class="viewer-img">${big}</div>
      <div class="viewer-foot"><div><b id="viewer-title">${esc(certName(c))}</b><div class="small muted">${teamOf(c.team).name} · ${esc(c.file)}</div></div>
      ${c.status === 'pending' ? `<div class="c-act"><button class="btn btn-sm btn-ghost" data-act="reject" data-id="${c.id}">Reject</button><button class="btn btn-sm btn-ok" data-act="verify" data-id="${c.id}">${I('check')} Verify</button></div>` : chip(c.status)}</div>
    </div>`;
  root.hidden = false;
  void root.offsetWidth;
  root.classList.add('open');
  $('.close', root).focus({ preventScroll: true });
}
