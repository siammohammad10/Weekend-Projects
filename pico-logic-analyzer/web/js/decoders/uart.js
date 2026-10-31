// UART, 8 data bits, no parity, 1 stop bit. Each frame starts with the line leaving its idle level;
// the bits are read in the middle of each bit time, least significant first.

(function () {
  const PLA = globalThis.PLA;
  PLA.DECODERS = PLA.DECODERS || {};

  const ESCAPES = { 10: '\\n', 13: '\\r', 9: '\\t', 0: '\\0' };
  PLA.charLabel = v => (v >= 0x20 && v < 0x7f ? String.fromCharCode(v) : ESCAPES[v] || PLA.hex(v));

  PLA.DECODERS.uart = {
    name: 'UART',
    params: [
      { key: 'rx', label: 'Data', type: 'channel', default: 1 },
      {
        key: 'baud',
        label: 'Baud',
        type: 'select',
        default: 115200,
        options: [9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600, 1000000],
      },
      { key: 'invert', label: 'Inverted', type: 'bool', default: false },
    ],

    decode(cap, p) {
      const ch = +p.rx,
        baud = +p.baud;
      const bit = cap.rate / baud;
      if (bit < 3) {
        return {
          lanes: [{ channel: ch, items: [] }],
          warning: `Sample at least ${PLA.fmtRate(baud * 4)} for ${baud} baud`,
        };
      }
      const idle = p.invert ? 0 : 1;
      const level = pos => cap.levelAt(ch, pos);
      const edges = cap.edges[ch];
      const items = [];
      let next = 0;

      // A capture triggered on the start bit begins inside it, with no edge at sample 0.
      for (let k = cap.bit(ch, 0) === idle ? 0 : -1; k < edges.length; k++) {
        const s = k < 0 ? 0 : edges[k];
        if (s < next || cap.bit(ch, s) === idle) continue;
        if (s + bit * 10 > cap.n) break;
        // A real start bit is still low in its middle; anything shorter is a glitch.
        if (level(s + bit * 0.5) === idle) continue;

        let value = 0;
        for (let b = 0; b < 8; b++) {
          const v = level(s + bit * (1.5 + b)) ^ (p.invert ? 1 : 0);
          value |= v << b;
        }
        const framed = level(s + bit * 9.5) === idle;
        items.push({
          s,
          e: Math.round(s + bit * 10),
          text: framed ? PLA.charLabel(value) : `${PLA.charLabel(value)} framing error`,
          short: PLA.charLabel(value),
          value,
          kind: framed ? 'data' : 'error',
          detail: `${PLA.hex(value)}${value >= 0x20 && value < 0x7f ? ` '${String.fromCharCode(value)}'` : ''}`,
        });
        next = s + bit * 9.5;
      }
      return { lanes: [{ channel: ch, items }] };
    },
  };
})();
