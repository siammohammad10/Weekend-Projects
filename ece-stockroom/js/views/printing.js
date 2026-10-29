// 3D printing: staff queue, charges and the full-screen pickup board.

// Admin: 3D printing queue + charges
const JOB_RANK = { ready: 0, printing: 1, queued: 2, collected: 3 };
const jobTime = j =>
  j.status === 'queued'
    ? `added ${rel(j.at)}`
    : j.status === 'printing'
      ? `started ${rel(j.startedAt)}`
      : j.status === 'ready'
        ? `ready ${rel(j.readyAt)}`
        : `picked up ${rel(j.collectedAt)}`;
const jobCharge = j => S.charges.find(c => c.job === j.id);
function jobRow(j) {
  const t = teamOf(j.team),
    course = inst(t.instructor).course;
  let act = '';
  if (j.status === 'queued')
    act = `<button class="rm" data-act="job-del" data-id="${j.id}" aria-label="Remove from queue">${I('trash')}</button><button class="btn btn-sm btn-ok" data-act="job-start" data-id="${j.id}">Start printing</button>`;
  if (j.status === 'printing')
    act =
      U.readyFor === j.id
        ? ''
        : `<button class="btn btn-sm btn-primary" data-act="job-ready" data-id="${j.id}">Mark ready</button>`;
  if (j.status === 'ready')
    act = `<button class="btn btn-sm btn-ok" data-act="job-collect" data-id="${j.id}">${I('check')} Picked up</button>`;
  const ch = jobCharge(j);
  const form =
    j.status === 'printing' && U.readyFor === j.id
      ? `<form class="ready-form" id="ready-form" data-id="${j.id}" novalidate>
      <label class="small muted" for="rf-amt">What did this print cost? ${t.name} has ${money(budget(j.team).left)} left.</label>
      <div class="ready-row"><div class="money-in sm"><span>$</span><input id="rf-amt" inputmode="decimal" placeholder="0.00" autocomplete="off"></div>
      <button class="btn btn-sm btn-primary" type="submit">Charge &amp; mark ready</button><button class="btn btn-sm btn-ghost" type="button" data-act="ready-cancel">Cancel</button></div>
      <p class="form-err" id="rf-err" role="alert" hidden></p>
    </form>`
      : '';
  return `<div class="jrow" data-row="job-${j.id}">
    <div style="min-width:0"><b>${t.name} · ${esc(j.desc)}</b><span class="small">${esc(course)} · ${jobTime(j)}${ch ? ` · ${money(ch.amount)} charged` : ''}</span></div>
    ${chip(j.status)}
    <div class="q-act">${act}</div>
    ${form}
  </div>`;
}
function vPrint() {
  const active = S.prints
    .filter(j => j.status !== 'collected')
    .sort((a, z) => JOB_RANK[a.status] - JOB_RANK[z.status] || a.at - z.at);
  const done = S.prints
    .filter(j => j.status === 'collected')
    .sort((a, z) => z.collectedAt - a.collectedAt)
    .slice(0, 6);
  const list = [...S.charges].sort((a, z) => z.at - a.at);
  const total = list.reduce((s, c) => s + c.amount, 0);
  const sel = U.printTeam || S.teams[0].id;
  const opts = S.instructors
    .map(ins => {
      const ts = S.teams.filter(t => t.instructor === ins.id);
      return ts.length
        ? `<optgroup label="${esc(ins.course)} · ${esc(ins.name)}">${ts.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${t.name} · ${esc(t.project)}</option>`).join('')}</optgroup>`
        : '';
    })
    .join('');
  const counts = ['ready', 'printing', 'queued'].map(s => active.filter(j => j.status === s).length);
  return `
  <header class="page-head">
    <div class="rise"><div class="eyebrow">Staff · ${TERM}</div><h1>3D printing</h1><p>Queue each job, mark it ready with its cost when it’s done, and put the queue on the stockroom screen.</p></div>
    <div class="head-actions rise" style="--i:1"><button class="btn btn-primary" data-act="board-open">${I('screen')} Show queue on screen</button></div>
  </header>
  <div class="desk">
    <div class="main-col">
      <section class="panel rise" style="--i:2">
        <div class="panel-head"><div><div class="eyebrow">${counts[0]} ready · ${counts[1]} printing · ${counts[2]} in line</div><h2>Queue</h2></div></div>
        ${active.length ? `<div class="jlist">${active.map(jobRow).join('')}</div>` : `<div class="empty">${I('printer')}<b>The queue is empty</b><span>Add a print job to get started.</span></div>`}
      </section>
      <section class="panel rise" style="--i:3">
        <div class="panel-head"><div><div class="eyebrow">This term</div><h2>Print charges</h2></div><span class="small muted">${list.length} charge${list.length === 1 ? '' : 's'} · ${money(total)}</span></div>
        ${
          list.length
            ? list
                .map(c => {
                  const t = teamOf(c.team);
                  return `<div class="prow" data-row="pc-${c.id}">
          <div style="min-width:0"><b>${esc(c.desc)}</b><span class="small">${t.name} · ${esc(inst(t.instructor).course)} · ${rel(c.at)}</span></div>
          <span class="q-total">${money(c.amount)}</span>
          <button class="rm" data-act="del-charge" data-id="${c.id}" aria-label="Remove this charge">${I('trash')}</button>
        </div>`;
                })
                .join('')
            : `<div class="empty">${I('printer')}<b>No print charges yet</b><span>Costs you enter when marking a job ready show up here.</span></div>`
        }
      </section>
    </div>
    <div class="side">
      <section class="panel rise" style="--i:4">
        <div class="panel-head"><div><div class="eyebrow">New job</div><h2>Add to queue</h2></div></div>
        <form class="pform" id="queue-form" novalidate>
          <div class="field"><label for="pf-team">Team</label><select id="pf-team">${opts}</select></div>
          <div class="field"><label for="pf-desc">What’s being printed</label><input id="pf-desc" maxlength="80" placeholder="e.g. Gripper fingers, PLA" autocomplete="off"></div>
          <p class="form-err" id="pf-err" role="alert" hidden></p>
          <button class="btn btn-primary" type="submit">${I('plus')} Add to queue</button>
        </form>
      </section>
      <section class="panel rise" style="--i:5">
        <div class="panel-head"><div><div class="eyebrow">Done</div><h2>Recently picked up</h2></div></div>
        <div class="recent">${done.map(j => `<div><span><b style="color:var(--ink)">${teamOf(j.team).name}</b> · ${esc(j.desc)}</span><span>${rel(j.collectedAt)}</span></div>`).join('') || '<p class="muted small">Nothing yet.</p>'}</div>
      </section>
    </div>
  </div>`;
}
function addJob() {
  const err = $('#pf-err'),
    tid = $('#pf-team').value,
    desc = $('#pf-desc').value.trim().replace(/\s+/g, ' ');
  if (!desc) {
    err.textContent = 'Describe the print so the team can recognize it on the screen.';
    err.hidden = false;
    $('#pf-desc').focus();
    return;
  }
  S.prints.push({ id: 'J' + Date.now().toString(36), team: tid, desc, status: 'queued', at: Date.now() });
  U.printTeam = tid;
  save();
  render();
  toast(`${teamOf(tid).name}’s print is in line`);
}
function markReady(id) {
  const j = S.prints.find(x => x.id === id),
    err = $('#rf-err');
  const raw = ($('#rf-amt').value || '').replace(/[$,\s]/g, ''),
    amt = raw === '' ? NaN : Math.round(parseFloat(raw) * 100) / 100;
  const fail = m => {
    err.textContent = m;
    err.hidden = false;
    $('#rf-amt').focus();
  };
  if (!/^\d*\.?\d{0,2}$/.test(raw) || !(amt >= 0))
    return fail('Enter the cost, like 4.50. Enter 0 if there’s no charge.');
  if (amt > 1000) return fail('That’s more than $1,000. Check the amount and try again.');
  if (amt > 0)
    S.charges.push({
      id: 'P' + Date.now().toString(36),
      team: j.team,
      desc: j.desc,
      amount: amt,
      at: Date.now(),
      job: j.id,
    });
  j.status = 'ready';
  j.readyAt = Date.now();
  U.readyFor = null;
  save();
  render();
  toast(`${teamOf(j.team).name}’s print is ready${amt > 0 ? ` · ${money(amt)} charged` : ''}`);
}

// Stockroom screen
function vBoard() {
  const by = s => S.prints.filter(j => j.status === s);
  const ready = by('ready').sort((a, z) => a.readyAt - z.readyAt);
  const printing = by('printing').sort((a, z) => a.startedAt - z.startedAt);
  const queued = by('queued').sort((a, z) => a.at - z.at);
  const now = new Date();
  const card = (j, k, cls) => {
    const t = teamOf(j.team);
    return `<article class="bd-card ${cls} ${cls === 'ready' && Date.now() - j.readyAt < 15 * 60e3 ? 'fresh' : ''}" style="--i:${k}">
      <span class="bd-team">${t.name}</span><b>${esc(j.desc)}</b>
      ${cls === 'printing' ? '<span class="bd-bar" aria-hidden="true"></span>' : ''}
      <span class="bd-meta">${esc(inst(t.instructor).course)} · ${cls === 'ready' ? `ready ${rel(j.readyAt)}` : `started ${rel(j.startedAt)}`}</span>
    </article>`;
  };
  return `<section class="board ${U.boardCalm ? 'calm' : ''}" id="board" aria-label="3D print queue">
    <header class="bd-head">
      <div class="bd-brand">${gateMark}<div><b>ECE Stockroom</b><small>3D print queue</small></div></div>
      <div class="bd-clock"><b>${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</b><small>${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</small></div>
    </header>
    <div class="bd-cols">
      <div class="bd-col ready"><h2><span class="bd-dot"></span>Ready for pickup<em>${ready.length}</em></h2>${ready.map((j, k) => card(j, k, 'ready')).join('') || '<p class="bd-empty">Nothing ready yet.</p>'}</div>
      <div class="bd-col"><h2>Printing now<em>${printing.length}</em></h2>${printing.map((j, k) => card(j, k, 'printing')).join('') || '<p class="bd-empty">The printers are idle.</p>'}</div>
      <div class="bd-col"><h2>Up next<em>${queued.length}</em></h2>
        ${queued.length ? `<ol class="bd-list">${queued.map((j, k) => `<li style="--i:${k}"><span class="bd-pos">${k + 1}</span><b>${teamOf(j.team).name}</b><span>${esc(j.desc)}</span></li>`).join('')}</ol>` : '<p class="bd-empty">No one in line.</p>'}</div>
    </div>
    <footer class="bd-foot">Show your eRaider at the desk to pick up your print.</footer>
    <button class="bd-exit" data-act="board-exit">${I('x')} Exit screen</button>
  </section>`;
}
