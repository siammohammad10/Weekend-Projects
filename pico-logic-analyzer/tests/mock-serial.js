// A stand-in for navigator.serial that answers like the firmware, for browser tests.
// Load it before the app. Trigger channel 7 never fires, to exercise ABORT.
(() => {
  const enc = new TextEncoder();
  const log = (globalThis.__serialLog = []);
  let ctrl,
    pending = null,
    line = '';
  const send = bytes => ctrl.enqueue(bytes);
  const say = text => send(enc.encode(text));

  function handle(cmd) {
    log.push(cmd);
    if (cmd === 'ID') return say('PLA 1 200000 100000000\n');
    if (cmd === 'ABORT') {
      if (pending) clearTimeout(pending);
      pending = null;
      return say('ABORTED\n');
    }
    const m = cmd.match(/^CAP (\d+) (\d+) (N|[0-7][RF])$/);
    if (!m) return say('ERR unknown command\n');
    const rate = +m[1],
      n = +m[2],
      trig = m[3];
    const div = Math.round(1e8 / rate);
    if (div > 65535) return say('ERR rate too low\n');
    if (n % 4 || n > 200000) return say('ERR samples must be a multiple of 4, at most the buffer size\n');
    say(`ARMED ${1e8 / div}\n`);
    if (trig[0] === '7') return; // waits forever
    pending = setTimeout(() => {
      const trigger = trig === 'N' ? null : { channel: +trig[0], rising: trig[1] === 'R' };
      const data = globalThis.PLA.demoCapture({ rate: 1e8 / div, samples: n, trigger, counter: 3 }).data;
      say(`DATA ${1e8 / div} ${n}\n`);
      for (let i = 0; i < data.length; i += 4096) send(data.slice(i, i + 4096));
      pending = null;
    }, 300);
  }

  const port = {
    readable: new ReadableStream({ start: c => (ctrl = c) }),
    writable: new WritableStream({
      write(chunk) {
        line += new TextDecoder().decode(chunk);
        let nl;
        while ((nl = line.indexOf('\n')) >= 0) {
          const cmd = line.slice(0, nl).trim();
          line = line.slice(nl + 1);
          if (cmd) setTimeout(() => handle(cmd), 5);
        }
      },
    }),
    open: async () => {},
    close: async () => {},
    setSignals: async () => {},
    getInfo: () => ({ usbVendorId: 0x2e8a, usbProductId: 0x000a }),
  };
  Object.defineProperty(navigator, 'serial', {
    configurable: true,
    value: { requestPort: async () => port, addEventListener() {}, removeEventListener() {} },
  });
})();
