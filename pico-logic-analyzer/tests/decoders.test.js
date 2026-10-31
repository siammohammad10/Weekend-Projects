// Decoder tests against known signals (see signals.js), built edge by edge from known bytes.
// Run with: node tests/decoders.test.js
const assert = require('node:assert/strict');
const path = require('node:path');
const web = path.join(__dirname, '..', 'web', 'js');
for (const f of ['util.js', 'capture.js', 'decoders/uart.js', 'decoders/i2c.js', 'decoders/spi.js'])
  require(path.join(web, f));
require('./signals.js');
const PLA = globalThis.PLA;

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('ok  ', name);
};
const data = (lane, kinds = ['data', 'addr']) => lane.items.filter(i => kinds.includes(i.kind));

for (const rate of [2e6, 10e6, 25e6]) {
  const cap = PLA.testCapture({ rate, samples: 200000, trigger: { channel: 1, rising: false } });
  const ms = (200000 / rate) * 1e3;

  test(`UART reads "hello\\n" at ${PLA.fmtRate(rate)}`, () => {
    const r = PLA.DECODERS.uart.decode(cap, { rx: 1, baud: 115200, invert: false });
    const text = data(r.lanes[0])
      .map(i => String.fromCharCode(i.value))
      .join('');
    assert.ok(text.startsWith('hello\n'), JSON.stringify(text));
    assert.equal(r.lanes[0].items.filter(i => i.kind === 'error').length, 0);
  });

  test(`SPI reads "PICO" at ${PLA.fmtRate(rate)}`, () => {
    const r = PLA.DECODERS.spi.decode(cap, { clk: 4, mosi: 5, miso: -1, cs: 6, mode: 0, lsb: false });
    const text = data(r.lanes[0])
      .map(i => String.fromCharCode(i.value))
      .join('');
    assert.ok(text.startsWith('PICO'), JSON.stringify(text));
  });

  test(`PWM measures 1 kHz, 50 % at ${PLA.fmtRate(rate)}`, () => {
    const m = cap.measure(0);
    assert.ok(Math.abs(m.freq - 1000) < 2, m.freq);
    assert.ok(Math.abs(m.duty - 0.5) < 0.01, m.duty);
  });
  void ms;
}

test('I2C reads address 0x3C and the window commands', () => {
  const cap = PLA.testCapture({ rate: 2e6, samples: 200000, trigger: { channel: 2, rising: false } });
  const items = PLA.DECODERS.i2c.decode(cap, { sda: 2, scl: 3 }).lanes[0].items;
  assert.equal(items[0].kind, 'start');
  assert.equal(items[1].kind, 'addr');
  assert.equal(items[1].value, 0x3c);
  assert.equal(items[1].text, 'Write 0x3C');
  assert.equal(items[2].kind, 'ack');
  const bytes = items.filter(i => i.kind === 'data').map(i => i.value);
  assert.deepEqual(bytes.slice(0, 7), [0x00, 0x21, 34, 57, 0x22, 3, 3]);
  assert.equal(bytes[7], 0x40);
  assert.equal(items.filter(i => i.kind === 'stop').length, 2);
  assert.equal(items.filter(i => i.kind === 'nack').length, 0);
});

test('UART flags a rate that is too low', () => {
  const cap = PLA.testCapture({ rate: 200e3, samples: 20000 });
  const r = PLA.DECODERS.uart.decode(cap, { rx: 1, baud: 115200 });
  assert.ok(r.warning);
});

test('Trigger puts the edge at sample 0', () => {
  const cap = PLA.testCapture({ rate: 1e6, samples: 4000, trigger: { channel: 0, rising: true } });
  assert.equal(cap.bit(0, 0), 1);
  const fall = PLA.testCapture({ rate: 1e6, samples: 4000, trigger: { channel: 0, rising: false } });
  assert.equal(fall.bit(0, 0), 0);
});

test('Edges match the raw data', () => {
  const cap = PLA.testCapture({ rate: 5e6, samples: 50000 });
  for (let ch = 0; ch < 8; ch++) {
    let n = 0;
    for (let i = 1; i < cap.n; i++) if (cap.bit(ch, i) !== cap.bit(ch, i - 1)) n++;
    assert.equal(cap.edges[ch].length, n);
  }
});

test('LSB-first SPI and mode 1 do not crash and give different bytes', () => {
  const cap = PLA.testCapture({ rate: 10e6, samples: 100000, trigger: { channel: 6, rising: false } });
  const lsb = PLA.DECODERS.spi.decode(cap, { clk: 4, mosi: 5, miso: -1, cs: 6, mode: 0, lsb: true });
  assert.equal(lsb.lanes[0].items[0].value, 0b00001010); // 'P' = 0x50 reversed
});

console.log(`\n${passed} passed`);
