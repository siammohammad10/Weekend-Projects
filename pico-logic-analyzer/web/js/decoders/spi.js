// SPI with an optional active-low chip select. Data is read on the sampling edge for the chosen
// mode: rising for modes 0 and 3, falling for modes 1 and 2. Chip select going high, or changing at
// all, starts a new word.

(function () {
  const PLA = globalThis.PLA;
  PLA.DECODERS = PLA.DECODERS || {};

  PLA.DECODERS.spi = {
    name: 'SPI',
    params: [
      { key: 'clk', label: 'Clock', type: 'channel', default: 4 },
      { key: 'mosi', label: 'MOSI', type: 'channel', default: 5 },
      { key: 'miso', label: 'MISO', type: 'channel', default: -1, optional: true },
      { key: 'cs', label: 'CS', type: 'channel', default: 6, optional: true },
      { key: 'mode', label: 'Mode', type: 'select', default: 0, options: [0, 1, 2, 3] },
      { key: 'lsb', label: 'LSB first', type: 'bool', default: false },
    ],

    decode(cap, p) {
      const clk = +p.clk,
        cs = +p.cs;
      const lines = [+p.mosi, +p.miso].filter(c => c >= 0 && c !== clk);
      const mode = +p.mode;
      const cpol = mode >> 1,
        cpha = mode & 1;
      const sampleLevel = cpol ^ cpha ? 0 : 1; // the clock level right after a sampling edge
      const lanes = lines.map(channel => ({ channel, items: [] }));
      if (!lines.length) return { lanes: [], warning: 'Pick a MOSI or MISO channel' };

      const ce = cap.edges[clk];
      const csEdges = cs >= 0 ? cap.edges[cs] : null;
      let csIdx = -1,
        bits = 0,
        first = 0;
      let values = lines.map(() => 0);

      for (let k = 0; k < ce.length; k++) {
        const e = ce[k];
        if (cap.bit(clk, e) !== sampleLevel) continue;
        if (csEdges) {
          const idx = PLA.lowerBound(csEdges, e + 1);
          if (idx !== csIdx) {
            csIdx = idx;
            bits = 0;
          }
          if (cap.bit(cs, e) !== 0) {
            bits = 0;
            continue;
          }
        }
        if (bits === 0) {
          first = e;
          values = lines.map(() => 0);
        }
        lines.forEach((ch, n) => {
          const v = cap.bit(ch, e);
          values[n] = p.lsb ? values[n] | (v << bits) : (values[n] << 1) | v;
        });
        bits++;
        if (bits === 8) {
          const half = bits > 1 ? (e - first) / 14 : 1;
          lanes.forEach((lane, n) => {
            lane.items.push({
              s: Math.max(0, Math.round(first - half)),
              e: Math.round(e + half),
              text: PLA.hex(values[n]),
              short: values[n].toString(16).toUpperCase().padStart(2, '0'),
              value: values[n],
              kind: 'data',
              detail: `${PLA.hex(values[n])}${values[n] >= 0x20 && values[n] < 0x7f ? ` '${String.fromCharCode(values[n])}'` : ''}`,
            });
          });
          bits = 0;
        }
      }
      return { lanes };
    },
  };
})();
