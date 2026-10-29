// Student dashboard: team balance, lab access, rentals and order history.

// Student: dashboard
function vDash() {
  const t = myTeam(),
    b = budget(t.id),
    ins = inst(t.instructor),
    c = myCert();
  const sp = Math.min(100, (Math.max(0, b.spent) / b.total) * 100),
    hp = Math.min(100 - sp, (Math.max(0, b.hold) / b.total) * 100);
  const rank = { requested: 0, purchased: 1, cancelled: 2 };
  const orders = S.orders
    .filter(o => o.team === t.id)
    .sort((a, z) => rank[a.status] - rank[z.status] || z.at - a.at);
  const jobs = S.prints.filter(j => j.team === t.id);
  const readyJobs = jobs.filter(j => j.status === 'ready');
  const hist = [
    ...orders.map(o => ({ o, live: o.status === 'requested', at: o.at })),
    ...jobs.map(j => ({ j, live: j.status !== 'collected', at: j.at })),
  ].sort((a, z) => z.live - a.live || z.at - a.at);
  const rentals = rentLines(t.id).filter(r => r.o.status === 'requested' || !r.l[4]);
  const lab = {
    verified: ['granted', 'Granted', 'Project Lab is unlocked for you.'],
    pending: ['', 'Under review', 'The stockroom is checking your certificate.'],
    rejected: ['', 'Re-upload needed', 'Your certificate needs another look.'],
    none: ['', 'Locked', 'Upload your lab safety certificate.'],
  }[c.status];
  const first = S.me.name.split(' ')[0];
  const nPicked = orders.filter(o => o.status === 'purchased').length;
  return `
  <header class="page-head">
    <div class="rise"><div class="eyebrow">${t.name} · ${esc(t.project)}</div><h1>Hey ${esc(first)}.</h1><p>Here’s your team’s budget, what you’ve picked up, and what’s still waiting at the desk.</p></div>
    <div class="head-actions rise" style="--i:1">
      ${cartCount() ? `<button class="btn btn-ghost" data-act="cart-open">${I('cart')} Cart · ${cartCount()}</button>` : ''}
      <button class="btn btn-primary" data-act="nav" data-v="stock">${I('box')} Browse stock</button>
    </div>
  </header>
  ${readyJobs.length ? `<div class="print-alert rise" style="--i:1">${I('check')}<span><b>Your 3D print is ready.</b> ${readyJobs.map(j => esc(j.desc)).join(', ')} ${readyJobs.length > 1 ? 'are' : 'is'} waiting at the stockroom desk. Bring your eRaider.</span></div>` : ''}
  <div class="dash">
    <article class="panel budget rise" style="--i:1">
      <div class="eyebrow">${t.name} balance · ${TERM}</div>
      <div class="avail"><b>${countSpan(b.left.toFixed(2), 2, '$')}</b><span>available to spend</span></div>
      <div class="capsule" role="img" aria-label="${money(b.spent)} spent, ${money(b.hold)} on hold, ${money(b.left)} available"><i class="s" style="width:${sp.toFixed(2)}%"></i><i class="h" style="width:${hp.toFixed(2)}%"></i></div>
      <div class="legend">
        <div class="legend-row"><span class="dot" style="background:var(--accent)"></span><span>Spent${b.printed ? ` <span class="muted small">· incl. ${money(b.printed)} 3D printing</span>` : ''}</span><span>${money(b.spent)}</span></div>
        <div class="legend-row"><span class="dot" style="background:var(--hold)"></span><span>On hold</span><span>${money(b.hold)}</span></div>
        <div class="legend-row"><span class="dot" style="background:var(--track)"></span><span>Available</span><span>${money(b.left)}</span></div>
      </div>
      <p class="small muted">Requests hold money until the stockroom hands parts over. Rental fees count too, and cancelled requests go back to your balance.</p>
    </article>
    <article class="panel tile rise" style="--i:2">
      <div class="eyebrow">Items purchased</div>
      <b class="big">${countSpan(b.items)}</b>
      <span class="small muted">across ${nPicked} picked-up order${nPicked === 1 ? '' : 's'}</span>
    </article>
    <article class="panel tile rise" style="--i:3">
      <div class="eyebrow">Waiting at the desk</div>
      <b class="big">${countSpan(b.open)}</b>
      <span class="small muted">${b.open ? money(b.hold) + ' on hold' : 'Nothing waiting right now'}</span>
    </article>
    <button class="panel tile link rise ${lab[0]}" style="--i:4" data-act="nav" data-v="profile">
      <span class="eyebrow">Lab access</span>
      <span class="lab-state"><span class="lockbox">${LOCK(c.status === 'verified')}</span><span><strong>${lab[1]}</strong><br><span class="small muted">${lab[2]}</span></span></span>
    </button>
    <article class="panel tile rise" style="--i:5">
      <div class="eyebrow">Your team</div>
      <div class="avatars" style="margin:6px 0 4px">${t.members.map(m => avatar(m)).join('')}</div>
      <span class="small"><b>${t.members.length} members</b> · ${esc(ins.name)}</span>
      <span class="small muted">${esc(ins.course)}, ${esc(ins.section)}</span>
    </article>
  </div>
  ${
    rentals.length
      ? `<section class="panel rise stack-gap" style="--i:6">
    <div class="panel-head"><div><div class="eyebrow">Borrowed equipment</div><h2>Rentals</h2></div><span class="small muted">${I('clock')} Return by ${DUE}</span></div>
    ${rentals
      .map(({ o, l }) => {
        const it = item(l[0]);
        return `<div class="rentrow"><span class="line-art">${art(it)}</span>
      <div style="min-width:0"><b>${l[1]} × ${esc(it.name)}</b><span class="small">${o.id} · ${o.status === 'requested' ? 'requested ' + rel(o.at) : 'picked up ' + rel(o.doneAt)}</span></div>
      ${o.status === 'requested' ? '<span class="chip requested">Requested</span>' : `<span class="chip out">Due ${DUE}</span>`}</div>`;
      })
      .join('')}
  </section>`
      : ''
  }
  <section class="panel rise stack-gap" style="--i:7">
    <div class="panel-head"><div><div class="eyebrow">History</div><h2>Orders &amp; 3D prints</h2></div><span class="small muted">${hist.length} total</span></div>
    ${
      hist.length
        ? `<div class="orders">${hist.map((h, i) => (h.o ? orderHTML(h.o, i + 7) : printHTML(h.j, i + 7))).join('')}</div>`
        : `<div class="empty">${I('box')}<b>No orders yet</b><span>Add parts from Stock and send your first request.</span></div>`
    }
  </section>`;
}
function lineState(o, l) {
  if (lineMode(l) !== 'rent' || o.status !== 'purchased') return '';
  return l[4] ? `<span class="chip returned">Returned</span>` : `<span class="chip out">Due ${DUE}</span>`;
}
function printHTML(j, i) {
  const ch = jobCharge(j),
    k = ['queued', 'printing', 'ready', 'collected'].indexOf(j.status),
    times = [j.at, j.startedAt, j.readyAt, j.collectedAt];
  const note =
    j.status === 'ready'
      ? 'It’s ready. Show your eRaider at the stockroom desk to pick it up.'
      : j.status === 'collected'
        ? 'Picked up from the stockroom.'
        : 'The stockroom adds the cost when the print is done.';
  return `<details class="order rise" style="--i:${i}">
    <summary>
      <span class="order-left"><span class="order-id">3D print · ${esc(j.desc)}</span><span class="order-meta">Printed by the stockroom · ${jobTime(j)}</span></span>
      <span class="thumbs"><span class="thumb pthumb">${I('printer')}</span></span>
      ${chip(j.status)}
      <span class="order-total">${ch ? money(ch.amount) : '<span class="muted">—</span>'}</span>
      <span class="chev">${I('chev')}</span>
    </summary>
    <div class="order-body">
      <div class="jsteps">${['In line', 'Printing', 'Ready', 'Picked up'].map((l, n) => `<div class="${n <= k ? 'on' : ''}"><i></i>${l}${n <= k && times[n] ? ` · ${rel(times[n])}` : ''}</div>`).join('')}</div>
      <p class="order-note">${note}${ch ? ` ${money(ch.amount)} was charged to your team ${rel(ch.at)}.` : ''}</p>
    </div>
  </details>`;
}
function orderHTML(o, i) {
  const n = orderQty(o),
    mine = o.by === S.me.name,
    flash = U.flash === o.id;
  const msg =
    o.status === 'requested'
      ? 'Waiting at the stockroom desk. Staff mark it purchased when they hand it over.'
      : o.status === 'purchased'
        ? `Handed over ${rel(o.doneAt)}.`
        : 'Cancelled. The amount went back to your team balance.';
  return `<details class="order ${o.status} ${flash ? 'flash' : 'rise'}" style="--i:${i}" ${flash ? 'open' : ''}>
    <summary>
      <span class="order-left"><span class="order-id">${o.id}</span><span class="order-meta">${n} item${n > 1 ? 's' : ''} · ${mine ? 'by you' : 'by ' + esc(o.by)} · ${rel(o.at)}</span></span>
      <span class="thumbs">${o.items
        .slice(0, 4)
        .map(([s]) => `<span class="thumb">${art(item(s))}</span>`)
        .join('')}${o.items.length > 4 ? `<span class="thumb">+${o.items.length - 4}</span>` : ''}</span>
      ${chip(o.status)}
      <span class="order-total">${money(orderTotal(o))}</span>
      <span class="chev">${I('chev')}</span>
    </summary>
    <div class="order-body">
      <div class="lines-wrap"><table class="lines"><tbody>${o.items
        .map(l => {
          const [s, q, p] = l;
          return `<tr><td>${esc(item(s).name)} ${modeTag(l)} ${lineState(o, l)}</td><td class="r muted">${q} × ${p ? money(p) : 'free'}</td><td class="r b num">${money(q * p)}</td></tr>`;
        })
        .join('')}</tbody></table></div>
      <p class="order-note">${msg}${o.note ? ` Note: “${esc(o.note)}”` : ''}</p>
    </div>
  </details>`;
}
