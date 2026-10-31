// Known signals for the decoder tests. Only the tests load this file; the app never does.
// The signals match what the firmware puts on its spare pins, built edge by edge from known bytes
// and then sampled at the rate under test:
//
//   CH0  1 kHz PWM
//   CH1  UART, 115200 baud, "hello\n" every 50 ms
//   CH2  I2C SDA ┐ 100 kHz, OLED at 0x3C, every 250 ms
//   CH3  I2C SCL ┘
//   CH4  SPI clock ┐
//   CH5  SPI MOSI  ├ 500 kHz, mode 0, "PICO" every 50 ms
//   CH6  SPI CS    ┘

(function () {
  const PLA = globalThis.PLA;

  class Wave {
    constructor(level) {
      this.initial = level;
      this.level = level;
      this.t = [];
      this.v = [];
    }
    set(t, level) {
      if (level === this.level) return;
      this.t.push(t);
      this.v.push(level);
      this.level = level;
    }
  }

  const DIGITS = [
    [0x3e, 0x51, 0x49, 0x45, 0x3e],
    [0x00, 0x42, 0x7f, 0x40, 0x00],
    [0x42, 0x61, 0x51, 0x49, 0x46],
    [0x21, 0x41, 0x45, 0x4b, 0x31],
    [0x18, 0x14, 0x12, 0x7f, 0x10],
    [0x27, 0x45, 0x45, 0x45, 0x39],
    [0x3c, 0x4a, 0x49, 0x49, 0x30],
    [0x01, 0x71, 0x09, 0x05, 0x03],
    [0x36, 0x49, 0x49, 0x49, 0x36],
    [0x06, 0x49, 0x49, 0x29, 0x1e],
  ];

  function build(until, counter) {
    const w = [0, 1, 1, 1, 0, 0, 1, 0].map(l => new Wave(l));

    // CH0: PWM, 1 kHz, 50 % duty.
    for (let t = 0.0001; t < until; t += 1e-3) {
      w[0].set(t, 1);
      w[0].set(t + 0.5e-3, 0);
    }

    // CH1 UART and CH4-6 SPI, every 50 ms.
    const ub = 1 / 115200;
    const sh = 1 / 500e3 / 2;
    for (let t0 = 0.003; t0 < until; t0 += 0.05) {
      let t = t0;
      for (const c of 'hello\n') {
        const v = c.charCodeAt(0);
        w[1].set(t, 0);
        for (let b = 0; b < 8; b++) w[1].set(t + (1 + b) * ub, (v >> b) & 1);
        w[1].set(t + 9 * ub, 1);
        t += 10.5 * ub;
      }
      t = t0 + 0.0007;
      w[6].set(t, 0);
      t += sh;
      for (const c of 'PICO') {
        const v = c.charCodeAt(0);
        for (let b = 7; b >= 0; b--) {
          w[5].set(t, (v >> b) & 1);
          w[4].set(t + sh, 1);
          w[4].set(t + 2 * sh, 0);
          t += 2 * sh;
        }
        t += 2 * sh;
      }
      w[5].set(t, 0);
      w[6].set(t + sh, 1);
    }

    // CH2/CH3 I2C to an SSD1306 at 0x3C, every 250 ms: set a window, then draw two digits.
    const bt = 1 / 100e3;
    const sda = w[2],
      scl = w[3];
    const sendByte = (t, v, ack) => {
      for (let b = 0; b <= 8; b++) {
        const level = b < 8 ? (v >> (7 - b)) & 1 : ack ? 0 : 1;
        sda.set(t + bt / 4, level);
        scl.set(t + bt / 2, 1);
        scl.set(t + bt, 0);
        t += bt;
      }
      return t;
    };
    const transaction = (t, bytes) => {
      sda.set(t, 0);
      scl.set(t + bt / 2, 0);
      t += bt / 2;
      t = sendByte(t, 0x3c << 1, true);
      for (const b of bytes) t = sendByte(t, b, true);
      sda.set(t + bt / 4, 0);
      scl.set(t + bt / 2, 1);
      sda.set(t + bt, 1);
      return t + bt;
    };
    let n = counter;
    for (let t0 = 0.012; t0 < until; t0 += 0.25, n++) {
      const tens = Math.floor(n / 10) % 10,
        ones = n % 10;
      let t = transaction(t0, [0x00, 0x21, 34, 57, 0x22, 3, 3]);
      transaction(t + 100e-6, [0x40, ...DIGITS[tens], 0x00, ...DIGITS[ones], 0x00]);
    }
    return w;
  }

  // Returns a Capture of `samples` samples at `rate`. With a trigger, sample 0 is the first matching
  // edge after 0.5 ms, just as the firmware would start it.
  PLA.testCapture = ({ rate = 2e6, samples = 200000, trigger = null, counter = 7 } = {}) => {
    const span = samples / rate;
    const waves = build(0.6 + span, counter);

    let t0 = 0.0021 + (counter % 9) * 0.0011;
    if (trigger) {
      const wv = waves[trigger.channel];
      const want = trigger.rising ? 1 : 0;
      const k = wv.t.findIndex((t, idx) => t > 0.0005 && wv.v[idx] === want);
      if (k >= 0) t0 = wv.t[k];
    }

    const data = new Uint8Array(samples);
    waves.forEach((wv, ch) => {
      let k = 0,
        level = wv.initial;
      while (k < wv.t.length && wv.t[k] <= t0) level = wv.v[k++];
      const mask = 1 << ch;
      for (let i = 0; i < samples; i++) {
        const t = t0 + i / rate;
        while (k < wv.t.length && wv.t[k] <= t) level = wv.v[k++];
        if (level) data[i] |= mask;
      }
    });
    return new PLA.Capture(data, rate, { trigger, source: 'test' });
  };
})();
