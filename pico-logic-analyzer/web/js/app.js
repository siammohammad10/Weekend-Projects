// The page: capture settings, connecting to the Pico, decoders, measurements and the decoded log.

(function () {
  const PLA = globalThis.PLA;
  const $ = s => document.querySelector(s);
  const esc = s =>
    String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  // Every rate divides the firmware's 100 MHz clock evenly.
  const RATES = [10e3, 20e3, 50e3, 100e3, 200e3, 500e3, 1e6, 2e6, 5e6, 10e6, 20e6, 25e6, 50e6, 100e6];
  const SAMPLES = [10000, 20000, 50000, 100000, 200000, 400000];
  const GENERIC = Array.from({ length: PLA.CHANNELS }, (_, i) => `CH${i}`);
  const LOG_LIMIT = 3000;

  const saved = PLA.store.get('pla-settings', {});
  const S = {
    names: saved.names || GENERIC.slice(),
    visible: saved.visible || Array(PLA.CHANNELS).fill(true),
    rate: saved.rate || 2e6,
    samples: saved.samples || 200000,
    trig: saved.trig === undefined ? 1 : saved.trig,
    edge: saved.edge || 'F',
    decoders: (saved.decoders || []).map((d, i) => ({ ...d, id: i + 1 })),
    board: saved.board || 'pico',
  };
  let nextId = S.decoders.length + 1;
  let cap = null,
    device = null,
    busy = false,
    demo = false,
    demoCounter = 7,
    results = [],
    logRows = [],
    freshLog = false,
    entering = null;

  const view = new PLA.WaveView($('#wave'));

  const save = () =>
    PLA.store.set('pla-settings', {
      names: S.names,
      visible: S.visible,
      rate: S.rate,
      samples: S.samples,
      trig: S.trig,
      edge: S.edge,
      decoders: S.decoders.map(({ type, params }) => ({ type, params })),
      board: S.board,
    });

  // ---------------------------------------------------------------- board and firmware

  function renderBoard() {
    const sel = $('#board');
    if (!sel.options.length)
      sel.innerHTML = PLA.BOARDS.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('');
    const b = PLA.board(S.board);
    sel.value = b.id;
    const file = PLA.firmwareFile(b);
    $('#board-facts').innerHTML = `<span>${b.chip}</span><span>${PLA.fmtCount(b.samples)} samples</span>`;
    $('#board-look').textContent = `${b.look} ${b.led}`;
    const dl = $('#board-dl');
    dl.href = PLA.FIRMWARE_DIR + file;
    dl.setAttribute('download', file);
    $('#board-file').textContent = file;
    $('#board-drive').textContent = b.drive;
  }

  function setSetup(open, remember = true) {
    $('#setup-wrap').classList.toggle('open', open);
    $('#setup-btn').setAttribute('aria-expanded', String(open));
    if (remember) PLA.store.set('pla-setup-open', open);
  }

  $('#board').addEventListener('change', e => {
    S.board = e.target.value;
    save();
    renderBoard();
  });
  $('#setup-btn').addEventListener('click', () => setSetup(!$('#setup-wrap').classList.contains('open')));
  $('#setup-close').addEventListener('click', () => setSetup(false));

  // ---------------------------------------------------------------- settings

  const maxSamples = () => (device && device.info ? device.info.maxSamples : 400000);

  function fillSettings() {
    $('#rate').innerHTML = RATES.map(r => `<option value="${r}">${PLA.fmtRate(r)}</option>`).join('');
    $('#rate').value = S.rate;
    const opts = SAMPLES.filter(n => n <= maxSamples());
    if (S.samples > maxSamples()) S.samples = opts[opts.length - 1];
    $('#samples').innerHTML = opts.map(n => `<option value="${n}">${PLA.fmtCount(n)}</option>`).join('');
    $('#samples').value = S.samples;
    fillTrigger();
    $('#trig-edge').value = S.edge;
    updateWindow();
  }

  function fillTrigger() {
    $('#trig-ch').innerHTML =
      `<option value="-1">None (start now)</option>` +
      S.names
        .map((n, i) => `<option value="${i}">${n === GENERIC[i] ? n : `CH${i} · ${esc(n)}`}</option>`)
        .join('');
    $('#trig-ch').value = S.trig;
    $('#trig-edge').disabled = S.trig < 0;
  }

  function updateWindow() {
    $('#window').textContent = `${PLA.fmtTime(S.samples / S.rate)} window`;
  }

  const trigger = () => (S.trig < 0 ? null : { channel: S.trig, rising: S.edge === 'R' });

  $('#rate').addEventListener('change', e => {
    S.rate = +e.target.value;
    updateWindow();
    save();
  });
  $('#samples').addEventListener('change', e => {
    S.samples = +e.target.value;
    updateWindow();
    save();
  });
  $('#trig-ch').addEventListener('change', e => {
    S.trig = +e.target.value;
    $('#trig-edge').disabled = S.trig < 0;
    save();
  });
  $('#trig-edge').addEventListener('change', e => {
    S.edge = e.target.value;
    save();
  });

  // ---------------------------------------------------------------- status

  function status(html, cls = '') {
    const el = $('#status');
    if (el.innerHTML === html) return;
    el.className = 'status ' + cls;
    el.innerHTML = html;
    // Restart the fade so every new message eases in. Progress updates skip it.
    if (!html.includes('class="bar"')) {
      void el.offsetWidth;
      el.classList.add('fade');
    }
  }

  let toastTimer;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
  }

  function setConn() {
    const el = $('#conn');
    el.className = 'conn' + (device ? ' on' : demo ? ' demo' : '');
    el.querySelector('span').textContent = device
      ? `${PLA.boardShortName(device.info.board)} connected · ${PLA.fmtCount(device.info.maxSamples)} samples`
      : demo
        ? 'Demo signals'
        : 'Not connected';
    $('#connect-btn').textContent = device ? 'Disconnect' : 'Connect Pico';
    $('#demo-btn').hidden = !!device || demo;
  }

  function setBusy(on) {
    busy = on;
    const b = $('#capture-btn');
    b.classList.toggle('primary', !on);
    b.classList.toggle('stop', on);
    b.querySelector('span').textContent = on ? 'Stop' : 'Capture';
    ['#rate', '#samples', '#trig-ch', '#trig-edge'].forEach(
      s => ($(s).disabled = on || (s === '#trig-edge' && S.trig < 0)),
    );
  }

  // ---------------------------------------------------------------- capturing

  async function capture() {
    if (busy) return stop();
    if (!device) {
      if (!demo) startDemo(false);
      return demoCapture();
    }
    const trig = trigger();
    setBusy(true);
    status(
      trig
        ? `<span class="spin"></span>Waiting for a ${trig.rising ? 'rising' : 'falling'} edge on <b>${esc(S.names[trig.channel])}</b>…`
        : `<span class="spin"></span>Capturing…`,
    );
    try {
      const c = await device.capture({ rate: S.rate, samples: S.samples, trigger: trig }, (state, p) => {
        if (state === 'receiving')
          status(
            `<span class="bar"><i style="width:${(p * 100).toFixed(1)}%"></i></span>Receiving ${Math.round(p * 100)}%`,
          );
      });
      load(c);
    } catch (e) {
      if (e.aborted) status('Stopped. Nothing was captured.');
      else status(esc(e.message), 'error');
    } finally {
      setBusy(false);
    }
  }

  function stop() {
    if (device) device.abort().catch(() => {});
  }

  function demoCapture() {
    setBusy(true);
    const trig = trigger();
    status(`<span class="spin"></span>Capturing the demo signals…`);
    setTimeout(() => {
      try {
        load(PLA.demoCapture({ rate: S.rate, samples: S.samples, trigger: trig, counter: demoCounter++ }));
      } finally {
        setBusy(false);
      }
    }, 260);
  }

  function startDemo(captureNow = true) {
    demo = true;
    if (S.names.every((n, i) => n === GENERIC[i])) S.names = PLA.DEMO_NAMES.slice();
    if (!S.decoders.length)
      S.decoders = PLA.DEMO_DECODERS.map(d => ({ ...d, params: { ...d.params }, id: nextId++ }));
    fillTrigger();
    save();
    setConn();
    renderDecoders();
    if (captureNow) demoCapture();
  }

  function load(c) {
    const same = cap && cap.n === c.n && cap.rate === c.rate;
    cap = c;
    $('#empty').classList.add('gone');
    freshLog = true;
    view.setCapture(c, same);
    decodeAll();
    const parts = [
      `<b>${PLA.fmtCount(c.n)}</b> samples at <b>${PLA.fmtRate(c.rate)}</b> (${PLA.fmtTime(c.duration)})`,
      c.trigger
        ? `triggered on a ${c.trigger.rising ? 'rising' : 'falling'} edge of ${esc(S.names[c.trigger.channel])}`
        : 'no trigger',
    ];
    if (c.source === 'demo') parts.push('demo signals');
    if (c.transferMs) parts.push(`sent over USB in ${PLA.fmtTime(c.transferMs / 1000, 2)}`);
    status(parts.join(' · '));
    updateTools();
  }

  // ---------------------------------------------------------------- decoders

  function decodeAll() {
    results = [];
    const lanes = {};
    if (cap) {
      for (const d of S.decoders) {
        let r;
        try {
          r = PLA.DECODERS[d.type].decode(cap, d.params);
        } catch (e) {
          r = { lanes: [], warning: e.message };
        }
        results.push({ d, r });
        r.lanes.forEach((lane, n) => {
          (lanes[lane.channel] = lanes[lane.channel] || []).push({
            items: lane.items,
            name: PLA.DECODERS[d.type].name + (r.lanes.length > 1 ? (n ? ' MISO' : ' MOSI') : ''),
            warning: r.warning,
          });
        });
        if (!r.lanes.length && r.warning) toast(`${PLA.DECODERS[d.type].name}: ${r.warning}`);
      }
    }
    view.setLayout(
      S.names.map((_, i) => ({ index: i, visible: S.visible[i] })),
      lanes,
    );
    renderLabels();
    renderLog();
  }

  function channelOptions(value, optional) {
    return (
      (optional ? `<option value="-1">None</option>` : '') +
      S.names
        .map(
          (n, i) =>
            `<option value="${i}" ${+value === i ? 'selected' : ''}>CH${i}${n !== GENERIC[i] ? ` · ${esc(n)}` : ''}</option>`,
        )
        .join('')
    );
  }

  function renderDecoders() {
    const box = $('#decoders');
    if (!S.decoders.length) {
      box.innerHTML = `<p class="empty-note">No decoders yet. Add UART, I2C or SPI to turn edges into bytes.</p>`;
      return;
    }
    box.innerHTML = S.decoders
      .map(d => {
        const def = PLA.DECODERS[d.type];
        const fields = def.params
          .map(p => {
            const v = d.params[p.key] ?? p.default;
            if (p.type === 'channel')
              return `<label class="field"><span>${p.label}</span><select data-dec="${d.id}" data-key="${p.key}">${channelOptions(v, p.optional)}</select></label>`;
            if (p.type === 'select')
              return `<label class="field"><span>${p.label}</span><select data-dec="${d.id}" data-key="${p.key}">${p.options
                .map(
                  o =>
                    `<option value="${o}" ${+v === o ? 'selected' : ''}>${p.key === 'baud' ? PLA.fmtCount(o) : o}</option>`,
                )
                .join('')}</select></label>`;
            return `<label class="check"><input type="checkbox" data-dec="${d.id}" data-key="${p.key}" ${v ? 'checked' : ''}/> ${p.label}</label>`;
          })
          .join('');
        const main = +(d.params.rx ?? d.params.sda ?? d.params.mosi ?? 0);
        return `<div class="dec ${entering === d.id ? 'enter' : ''}" data-id="${d.id}">
          <div class="dec-name"><i style="background:var(--ch${main})"></i>${def.name}</div>
          ${fields}
          <button class="text-btn remove" data-remove="${d.id}" aria-label="Remove ${def.name} decoder">Remove</button>
        </div>`;
      })
      .join('');
  }

  $('#decoders').addEventListener('change', e => {
    const t = e.target;
    const d = S.decoders.find(x => x.id === +t.dataset.dec);
    if (!d) return;
    d.params[t.dataset.key] = t.type === 'checkbox' ? t.checked : +t.value;
    save();
    renderDecoders();
    decodeAll();
  });
  $('#decoders').addEventListener('click', e => {
    const id = e.target.closest('[data-remove]')?.dataset.remove;
    if (!id) return;
    S.decoders = S.decoders.filter(d => d.id !== +id);
    save();
    decodeAll();
    // Let the card slide out before the list closes the gap.
    e.target.closest('.dec').classList.add('leaving');
    setTimeout(renderDecoders, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220);
  });
  document.querySelectorAll('[data-add]').forEach(b =>
    b.addEventListener('click', () => {
      const type = b.dataset.add;
      const params = {};
      PLA.DECODERS[type].params.forEach(p => (params[p.key] = p.default));
      entering = nextId;
      S.decoders.push({ id: nextId++, type, params });
      save();
      renderDecoders();
      entering = null;
      decodeAll();
    }),
  );

  // ---------------------------------------------------------------- labels beside the canvas

  function renderLabels() {
    const box = $('#labels');
    const rows = view.rows || [];
    box.style.height = view.height + 'px';
    let html = `<div class="ruler-pad">${cap ? 'time' : ''}</div>`;
    for (const row of rows) {
      const i = row.ch;
      html += `<div class="chan" style="top:${row.y}px;height:${row.h}px">
        <span class="sw" style="background:var(--ch${i})"></span>
        <input value="${esc(S.names[i])}" data-name="${i}" aria-label="Name for channel ${i}" spellcheck="false" maxlength="24" />
        <span class="gp">GP${i}</span>
        <button class="hide" data-hide="${i}" title="Hide this channel" aria-label="Hide ${esc(S.names[i])}">
          <svg viewBox="0 0 16 16"><path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z"/><path d="M3 13L13 3"/></svg>
        </button>
      </div>`;
      for (const lane of row.lanes)
        html += `<div class="lane-label" style="top:${lane.y}px">${lane.name}${lane.warning ? ` <span class="warn" title="${esc(lane.warning)}">${esc(lane.warning)}</span>` : ''}</div>`;
    }
    box.innerHTML = html;
    const hidden = S.visible.map((v, i) => (v ? null : i)).filter(i => i !== null);
    $('#hidden-ch').innerHTML = hidden.length
      ? `Hidden: ${hidden.map(i => `<button class="chip-btn" data-show="${i}">${esc(S.names[i])}</button>`).join('')}`
      : '';
  }

  $('#labels').addEventListener('change', e => {
    const i = e.target.dataset.name;
    if (i === undefined) return;
    S.names[+i] = e.target.value.trim() || GENERIC[+i];
    save();
    fillTrigger();
    renderDecoders();
    renderLog();
    updateMeasurements();
  });
  $('#labels').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.dataset.name !== undefined) e.target.blur();
  });
  $('#labels').addEventListener('click', e => {
    const i = e.target.closest('[data-hide]')?.dataset.hide;
    if (i === undefined) return;
    S.visible[+i] = false;
    save();
    decodeAll();
  });
  $('#hidden-ch').addEventListener('click', e => {
    const i = e.target.closest('[data-show]')?.dataset.show;
    if (i === undefined) return;
    S.visible[+i] = true;
    save();
    decodeAll();
  });

  // ---------------------------------------------------------------- decoded log

  function renderLog() {
    // Rows ease in only when a new capture arrives, not on every rename.
    const fresh = freshLog;
    freshLog = false;
    logRows = [];
    for (const { d, r } of results) {
      r.lanes.forEach((lane, n) => {
        const name = PLA.DECODERS[d.type].name + (r.lanes.length > 1 ? (n ? ' MISO' : ' MOSI') : '');
        for (const item of lane.items)
          if (item.kind === 'data' || item.kind === 'addr' || item.kind === 'error' || item.kind === 'nack')
            logRows.push({ item, decoder: name, channel: lane.channel });
      });
    }
    logRows.sort((a, b) => a.item.s - b.item.s);
    const shown = logRows.slice(0, LOG_LIMIT);
    $('#log-count').textContent = logRows.length
      ? `${PLA.fmtCount(logRows.length)} value${logRows.length === 1 ? '' : 's'}${logRows.length > LOG_LIMIT ? `, first ${PLA.fmtCount(LOG_LIMIT)} shown` : ''}`
      : '';
    if (!shown.length) {
      $('#log').innerHTML = `<tr><td class="muted" style="border:0;padding:4px 0">${
        cap
          ? S.decoders.length
            ? 'No complete frames in this capture.'
            : 'Add a decoder to list the bytes here.'
          : 'Decoded bytes will be listed here.'
      }</td></tr>`;
      return;
    }
    $('#log').innerHTML =
      `<thead><tr><th>Time</th><th>Decoder</th><th>Channel</th><th>Value</th><th>Detail</th></tr></thead><tbody>` +
      shown
        .map(
          (
            r,
            n,
          ) => `<tr class="row ${r.item.kind === 'error' || r.item.kind === 'nack' ? 'err' : ''} ${fresh && n < 30 ? 'in' : ''}" style="--d:${n}" data-row="${n}">
          <td class="num">${PLA.fmtTime(r.item.s / cap.rate, 3)}</td>
          <td><span class="kind">${r.decoder}</span></td>
          <td>${esc(S.names[r.channel])}</td>
          <td class="num">${esc(r.item.text)}</td>
          <td class="num muted">${esc(r.item.detail || '')}</td></tr>`,
        )
        .join('') +
      '</tbody>';
  }

  $('#log').addEventListener('click', e => {
    const n = e.target.closest('[data-row]')?.dataset.row;
    if (n === undefined) return;
    const { item } = logRows[+n];
    view.cursors.a = item.s;
    view.show(item.s, item.e);
    $('.scope').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // ---------------------------------------------------------------- readout and measurements

  function updateReadout() {
    if (!cap) {
      $('#readout').innerHTML = '<span>No capture</span>';
      return;
    }
    const t0 = view.start / cap.rate,
      span = view.visibleSamples / cap.rate;
    $('#readout').innerHTML =
      `<span>Showing <b>${PLA.fmtTime(span)}</b></span><span>from <b>${PLA.fmtTime(t0)}</b></span><span>${PLA.fmtRate(cap.rate)}</span>`;
  }

  function updateMeasurements() {
    const a = view.cursors.a,
      b = view.cursors.b;
    const t = s => (s == null || !cap ? '–' : PLA.fmtTime(s / cap.rate, 4));
    const dt = a != null && b != null && cap ? Math.abs(b - a) / cap.rate : null;
    $('#cursors').innerHTML = `
      <div><dt><i style="background:var(--cursor-a)"></i>Cursor A</dt><dd>${t(a)}</dd></div>
      <div><dt><i style="background:var(--cursor-b)"></i>Cursor B</dt><dd>${t(b)}</dd></div>
      <div><dt>B − A</dt><dd>${dt ? PLA.fmtTime(dt, 4) : '–'}</dd></div>
      <div><dt>1 / (B − A)</dt><dd>${dt ? PLA.fmtFreq(1 / dt) : '–'}</dd></div>`;

    if (!cap) {
      $('#meas-scope').textContent = '';
      $('#stats').innerHTML = '';
      return;
    }
    let from, to;
    if (a != null && b != null && a !== b) {
      from = Math.min(a, b);
      to = Math.max(a, b);
      $('#meas-scope').textContent = 'between A and B';
    } else {
      from = Math.max(0, Math.floor(view.start));
      to = Math.min(cap.n, Math.ceil(view.start + view.visibleSamples));
      $('#meas-scope').textContent = 'in view';
    }
    const rows = S.names
      .map((n, i) => ({ n, i }))
      .filter(({ i }) => S.visible[i])
      .map(({ n, i }) => {
        const e = cap.edges[i];
        const count = PLA.lowerBound(e, to) - PLA.lowerBound(e, from + 1);
        const m = cap.measure(i, from, to);
        return `<tr><td><span class="dot" style="background:var(--ch${i})"></span>${esc(n)}</td>
          <td class="num">${m ? PLA.fmtFreq(m.freq) : '–'}</td>
          <td class="num">${m ? (m.duty * 100).toFixed(1) + ' %' : '–'}</td>
          <td class="num">${PLA.fmtCount(count)}</td></tr>`;
      })
      .join('');
    $('#stats').innerHTML =
      `<thead><tr><th>Channel</th><th>Frequency</th><th>Duty</th><th>Edges</th></tr></thead><tbody>${rows}</tbody>`;
  }

  function updateTools() {
    const has = !!cap;
    ['#zoom-in', '#zoom-out', '#fit', '#export-vcd', '#export-csv'].forEach(s => ($(s).disabled = !has));
    $('#export-csv').disabled = !logRows.length;
  }

  let measureQueued = false;
  view.onChange = () => {
    updateReadout();
    if (measureQueued) return;
    measureQueued = true;
    requestAnimationFrame(() => {
      measureQueued = false;
      updateMeasurements();
    });
  };

  view.onHover = h => {
    const tip = $('#tip');
    if (!h || !cap || !h.hit) {
      tip.classList.remove('show');
      return;
    }
    const { item, row } = h.hit;
    tip.innerHTML = `<b>${esc(item.text)}</b>${item.detail ? `<br>${esc(item.detail)}` : ''}<br>${PLA.fmtTime(item.s / cap.rate, 4)} · ${esc(S.names[row.ch])}`;
    tip.classList.add('show');
    const box = tip.parentElement.getBoundingClientRect();
    const w = tip.offsetWidth;
    tip.style.left = Math.min(box.width - w - 8, Math.max(8, h.px + 14)) + 'px';
    tip.style.top = h.py + 16 + 'px';
  };

  // ---------------------------------------------------------------- connecting

  async function connect() {
    if (device) {
      await device.close();
      device = null;
      setConn();
      fillSettings();
      status('Disconnected.');
      return;
    }
    if (!PLA.Device.supported) {
      toast(
        "This browser can't talk to USB serial. Use Chrome or Edge on a computer. The demo still works here.",
      );
      return;
    }
    const d = new PLA.Device();
    try {
      status(`<span class="spin"></span>Pick the Pico in the browser's list…`);
      await d.connect();
      device = d;
      demo = false;
      device.onDisconnect = () => {
        device = null;
        setConn();
        fillSettings();
        setBusy(false);
        status('The Pico was unplugged.', 'error');
      };
      if (d.info.board && PLA.BOARDS.some(b => b.id === d.info.board)) {
        S.board = d.info.board;
        save();
        renderBoard();
      }
      setSetup(false, false);
      setConn();
      fillSettings();
      status(
        `Connected to a ${PLA.boardShortName(d.info.board)}. Firmware v${d.info.version}, up to <b>${PLA.fmtCount(d.info.maxSamples)}</b> samples. Press Capture.`,
      );
      $('#empty-text').textContent = 'Connected. Set the trigger and press Capture.';
    } catch (e) {
      if (e.name === 'NotFoundError') status('');
      else status(esc(e.message), 'error');
    }
  }

  // ---------------------------------------------------------------- buttons and keys

  $('#capture-btn').addEventListener('click', capture);
  $('#connect-btn').addEventListener('click', connect);
  $('#empty-connect').addEventListener('click', connect);
  $('#setup-connect').addEventListener('click', connect);
  $('#demo-btn').addEventListener('click', () => startDemo());
  $('#empty-demo').addEventListener('click', () => startDemo());
  $('#zoom-in').addEventListener('click', () => view.zoomAt(view.width / 2, 0.5));
  $('#zoom-out').addEventListener('click', () => view.zoomAt(view.width / 2, 2));
  $('#fit').addEventListener('click', () => view.fit());
  $('#export-vcd').addEventListener('click', () => {
    if (cap) PLA.download(`capture-${stamp()}.vcd`, PLA.toVCD(cap, S.names), 'text/plain');
  });
  $('#export-csv').addEventListener('click', () => {
    if (cap && logRows.length)
      PLA.download(
        `decoded-${stamp()}.csv`,
        PLA.toCSV(
          cap,
          logRows.map(r => ({ ...r, channel: S.names[r.channel] })),
        ),
        'text/csv',
      );
  });
  const stamp = () => new Date(cap.at).toISOString().slice(0, 19).replace(/[:T]/g, '-');

  document.addEventListener('keydown', e => {
    if (e.target.matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'c' || e.key === 'C') capture();
    else if (!cap) return;
    else if (e.key === 'f' || e.key === 'F') view.fit();
    else if (e.key === '+' || e.key === '=') view.zoomAt(view.width / 2, 0.5);
    else if (e.key === '-' || e.key === '_') view.zoomAt(view.width / 2, 2);
    else if (e.key === 'ArrowLeft') view.panBy(-view.width * 0.2);
    else if (e.key === 'ArrowRight') view.panBy(view.width * 0.2);
    else if (e.key === 'Escape') {
      view.cursors = { a: null, b: null };
      view.draw();
      view.onChange();
    } else return;
    e.preventDefault();
  });

  // ---------------------------------------------------------------- start

  renderBoard();
  fillSettings();
  setConn();
  renderDecoders();
  decodeAll();
  updateReadout();
  updateMeasurements();
  updateTools();
  if (!PLA.Device.supported) {
    $('#empty-text').textContent =
      "This browser can't talk to USB serial, so connecting a Pico needs Chrome or Edge on a computer. The demo works anywhere.";
    $('#empty-connect').hidden = true;
    $('#setup-browser').textContent =
      "This browser can't connect to a Pico. Download the firmware here, then open this page in Chrome or Edge on a computer.";
  }
  const wantDemo = new URLSearchParams(location.search).has('demo');
  // First visit: show the setup steps, unless the link asked for the demo.
  setSetup(PLA.store.get('pla-setup-open', !wantDemo), false);
  if (wantDemo) startDemo();
})();
