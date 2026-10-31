// Talks to the firmware over Web Serial. Commands go out as text lines; replies come back as text
// lines, except the capture itself, which is a DATA line followed by raw bytes.

(function () {
  const PLA = globalThis.PLA;
  const RASPBERRY_PI_USB_VENDOR = 0x2e8a;

  class Device {
    constructor() {
      this.port = null;
      this.reader = null;
      this.buf = new Uint8Array(1 << 16);
      this.len = 0;
      this.waiters = [];
      this.info = null;
      this.closed = false;
      this.onDisconnect = null;
    }

    static get supported() {
      return 'serial' in navigator;
    }

    async connect() {
      this.port = await navigator.serial.requestPort({ filters: [{ usbVendorId: RASPBERRY_PI_USB_VENDOR }] });
      await this.port.open({ baudRate: 115200, bufferSize: 1 << 16 });
      // The Pico's USB serial only sends once the host raises DTR.
      try {
        await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
      } catch (e) {}
      this.closed = false;
      this.pump();
      navigator.serial.addEventListener(
        'disconnect',
        (this.lost = e => {
          if (e.target === this.port) this.handleLost();
        }),
      );

      await this.write('ABORT\n');
      await this.sleep(150);
      this.len = 0;
      await this.write('ID\n');
      const id = await this.readLine(2000).catch(() => null);
      const m = id && id.match(/^PLA (\d+) (\d+) (\d+)(?: (\S+))?/);
      if (!m) {
        await this.close();
        throw new Error("That port didn't answer like the analyzer firmware. Flash the .uf2 file first.");
      }
      this.info = { version: +m[1], maxSamples: +m[2], clock: +m[3], board: m[4] || null };
      return this.info;
    }

    handleLost() {
      this.closed = true;
      this.fail(new Error('The Pico was unplugged'));
      if (this.onDisconnect) this.onDisconnect();
    }

    async close() {
      this.closed = true;
      try {
        if (this.reader) await this.reader.cancel();
      } catch (e) {}
      try {
        await this.port.close();
      } catch (e) {}
      if (this.lost) navigator.serial.removeEventListener('disconnect', this.lost);
      this.port = null;
    }

    async pump() {
      while (this.port && this.port.readable && !this.closed) {
        this.reader = this.port.readable.getReader();
        try {
          for (;;) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value && value.length) this.push(value);
          }
        } catch (e) {
          // A read error ends this reader; the loop opens a new one unless the port is gone.
        } finally {
          try {
            this.reader.releaseLock();
          } catch (e) {}
        }
      }
    }

    push(chunk) {
      if (this.len + chunk.length > this.buf.length) {
        let size = this.buf.length;
        while (size < this.len + chunk.length) size *= 2;
        const next = new Uint8Array(size);
        next.set(this.buf.subarray(0, this.len));
        this.buf = next;
      }
      this.buf.set(chunk, this.len);
      this.len += chunk.length;
      this.waiters.slice().forEach(w => w.check());
    }

    take(n) {
      const out = this.buf.slice(0, n);
      this.buf.copyWithin(0, n, this.len);
      this.len -= n;
      return out;
    }

    // Resolves when `test` returns a value, checking again on every chunk that arrives.
    when(test, timeout) {
      return new Promise((resolve, reject) => {
        const w = {
          check: () => {
            const v = test();
            if (v === undefined) return;
            this.waiters.splice(this.waiters.indexOf(w), 1);
            clearTimeout(w.timer);
            resolve(v);
          },
          reject,
        };
        this.waiters.push(w);
        if (timeout) {
          w.timer = setTimeout(() => {
            this.waiters.splice(this.waiters.indexOf(w), 1);
            reject(new Error('The Pico stopped answering'));
          }, timeout);
        }
        w.check();
      });
    }

    fail(err) {
      this.waiters.splice(0).forEach(w => {
        clearTimeout(w.timer);
        w.reject(err);
      });
    }

    readLine(timeout) {
      return this.when(() => {
        const nl = this.buf.subarray(0, this.len).indexOf(10);
        if (nl < 0) return undefined;
        const bytes = this.take(nl + 1);
        return new TextDecoder().decode(bytes.subarray(0, nl)).replace(/\r$/, '');
      }, timeout);
    }

    readBytes(n, onProgress) {
      return this.when(() => {
        if (onProgress) onProgress(Math.min(this.len, n) / n);
        return this.len >= n ? this.take(n) : undefined;
      }, 0);
    }

    async write(text) {
      const w = this.port.writable.getWriter();
      try {
        await w.write(new TextEncoder().encode(text));
      } finally {
        w.releaseLock();
      }
    }

    sleep(ms) {
      return new Promise(r => setTimeout(r, ms));
    }

    // Arms a capture and resolves with a Capture once the data is in. `onState` hears 'armed' and
    // then 'receiving' with a 0-1 progress value.
    async capture({ rate, samples, trigger }, onState = () => {}) {
      const trig = trigger ? `${trigger.channel}${trigger.rising ? 'R' : 'F'}` : 'N';
      this.aborting = false;
      await this.write(`CAP ${rate} ${samples} ${trig}\n`);
      const armed = await this.readLine(2000);
      if (armed.startsWith('ERR')) throw new Error(armed.slice(4));
      if (!armed.startsWith('ARMED')) throw new Error(`Unexpected reply: ${armed}`);
      onState('armed');

      let line;
      do {
        line = await this.readLine(0);
        if (line === 'ABORTED') {
          const err = new Error('Capture stopped');
          err.aborted = true;
          throw err;
        }
      } while (!line.startsWith('DATA'));
      const [, actualRate, count] = line.split(' ').map(Number);
      const started = performance.now();
      const data = await this.readBytes(count, p => onState('receiving', p));
      return new PLA.Capture(data, actualRate, {
        trigger,
        source: 'device',
        transferMs: performance.now() - started,
      });
    }

    abort() {
      return this.write('ABORT\n');
    }
  }

  PLA.Device = Device;
})();
