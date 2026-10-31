// Exports: the capture as a VCD file (opens in PulseView and GTKWave) and the decoded values as CSV.

(function () {
  const PLA = globalThis.PLA;

  PLA.toVCD = (cap, names) => {
    const ids = Array.from({ length: PLA.CHANNELS }, (_, i) => String.fromCharCode(33 + i));
    const clean = s => s.replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'ch';
    const ns = i => Math.round((i * 1e9) / cap.rate);
    const out = [
      `$date ${new Date(cap.at).toISOString()} $end`,
      '$version Pico Logic Analyzer $end',
      '$timescale 1 ns $end',
      '$scope module pico $end',
      ...ids.map(
        (id, ch) =>
          `$var wire 1 ${id} ${names[ch] === `CH${ch}` ? `CH${ch}` : `${clean(names[ch])}_CH${ch}`} $end`,
      ),
      '$upscope $end',
      '$enddefinitions $end',
      '#0',
      '$dumpvars',
      ...ids.map((id, ch) => `${cap.bit(ch, 0)}${id}`),
      '$end',
    ];
    const d = cap.data;
    let prev = d[0];
    for (let i = 1; i < d.length; i++) {
      const changed = d[i] ^ prev;
      if (!changed) continue;
      out.push(`#${ns(i)}`);
      for (let ch = 0; ch < PLA.CHANNELS; ch++)
        if (changed & (1 << ch)) out.push(`${(d[i] >> ch) & 1}${ids[ch]}`);
      prev = d[i];
    }
    out.push(`#${ns(d.length)}`);
    return out.join('\n') + '\n';
  };

  PLA.toCSV = (cap, rows) => {
    const q = v => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
    const lines = ['time_s,decoder,channel,kind,value,text'];
    for (const r of rows) {
      lines.push(
        [
          (r.item.s / cap.rate).toFixed(9),
          r.decoder,
          r.channel,
          r.item.kind,
          r.item.value === undefined ? '' : PLA.hex(r.item.value),
          q(r.item.text),
        ].join(','),
      );
    }
    return lines.join('\n') + '\n';
  };

  PLA.download = (name, text, type) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
})();
