// I2C. A falling SDA while SCL is high is a start, a rising SDA while SCL is high is a stop, and
// SDA is read on every rising SCL: 8 bits most significant first, then the ACK bit. The first
// byte after a start is the 7-bit address and the read/write bit.

(function () {
  const PLA = globalThis.PLA;
  PLA.DECODERS = PLA.DECODERS || {};

  PLA.DECODERS.i2c = {
    name: 'I2C',
    params: [
      { key: 'sda', label: 'SDA', type: 'channel', default: 2 },
      { key: 'scl', label: 'SCL', type: 'channel', default: 3 },
    ],

    decode(cap, p) {
      const sda = +p.sda,
        scl = +p.scl;
      const items = [];
      if (sda === scl)
        return { lanes: [{ channel: sda, items }], warning: 'SDA and SCL must be different channels' };

      const es = cap.edges[sda],
        ec = cap.edges[scl];
      let i = 0,
        j = 0;
      let sdaLv = cap.initial[sda],
        sclLv = cap.initial[scl];
      let active = false,
        bits = 0,
        value = 0,
        byteIndex = 0,
        rises = [];

      const startFrame = (at, repeated) => {
        items.push({
          s: at,
          e: at,
          text: repeated ? 'Repeated start' : 'Start',
          short: repeated ? 'Sr' : 'S',
          kind: 'start',
        });
        active = true;
        bits = 0;
        value = 0;
        byteIndex = 0;
        rises = [];
      };

      // A capture triggered on the start condition begins with SDA already low and SCL high.
      if (sdaLv === 0 && sclLv === 1) startFrame(0, false);

      while (i < es.length || j < ec.length) {
        const at = Math.min(i < es.length ? es[i] : Infinity, j < ec.length ? ec[j] : Infinity);
        const sdaChanged = i < es.length && es[i] === at;
        const sclChanged = j < ec.length && ec[j] === at;
        if (sdaChanged) i++;
        if (sclChanged) j++;
        const newSda = cap.bit(sda, at),
          newScl = cap.bit(scl, at);

        if (sdaChanged && !sclChanged && sclLv === 1) {
          if (newSda === 0) startFrame(at, active);
          else if (active) {
            items.push({ s: at, e: at, text: 'Stop', short: 'P', kind: 'stop' });
            active = false;
          }
        } else if (sclChanged && newScl === 1 && active) {
          if (bits < 8) {
            value = (value << 1) | newSda;
            rises.push(at);
            bits++;
          } else {
            const period = rises.length > 1 ? (rises[7] - rises[0]) / 7 : 1;
            const s = Math.max(0, Math.round(rises[0] - period / 2));
            const ack = newSda === 0;
            if (byteIndex === 0) {
              const addr = value >> 1,
                read = value & 1;
              items.push({
                s,
                e: Math.round(at - period / 2),
                text: `${read ? 'Read' : 'Write'} ${PLA.hex(addr)}`,
                short: PLA.hex(addr),
                value: addr,
                kind: 'addr',
                detail: `address ${PLA.hex(addr)}, ${read ? 'read' : 'write'}`,
              });
            } else {
              items.push({
                s,
                e: Math.round(at - period / 2),
                text: PLA.hex(value),
                short: value.toString(16).toUpperCase().padStart(2, '0'),
                value,
                kind: 'data',
                detail: PLA.hex(value),
              });
            }
            items.push({
              s: Math.round(at - period / 2),
              e: Math.round(at + period / 2),
              text: ack ? 'ACK' : 'NACK',
              short: ack ? 'A' : 'N',
              kind: ack ? 'ack' : 'nack',
            });
            bits = 0;
            value = 0;
            rises = [];
            byteIndex++;
          }
        }
        sdaLv = newSda;
        sclLv = newScl;
      }
      return { lanes: [{ channel: sda, items }] };
    },
  };
})();
