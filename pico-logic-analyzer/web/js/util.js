// Shared helpers. Every script adds to one global, PLA, so the files load as plain scripts and
// also run under Node for the tests.

const PLA = (globalThis.PLA = globalThis.PLA || {});

PLA.CHANNELS = 8;

// Seconds to a short readable string: 1.5 ms, 870 ns, 2.25 s.
PLA.fmtTime = (s, digits = 3) => {
  const a = Math.abs(s);
  if (a === 0) return '0 s';
  const units = [
    [1, 's'],
    [1e-3, 'ms'],
    [1e-6, 'µs'],
    [1e-9, 'ns'],
  ];
  for (const [scale, unit] of units) {
    if (a >= scale * 0.9995 || unit === 'ns') return `${trim((s / scale).toFixed(digits))} ${unit}`;
  }
};

PLA.fmtFreq = hz => {
  const a = Math.abs(hz);
  if (a >= 1e6) return `${trim((hz / 1e6).toFixed(3))} MHz`;
  if (a >= 1e3) return `${trim((hz / 1e3).toFixed(3))} kHz`;
  return `${trim(hz.toFixed(2))} Hz`;
};

PLA.fmtRate = hz => {
  if (hz >= 1e6) return `${trim((hz / 1e6).toFixed(2))} MS/s`;
  if (hz >= 1e3) return `${trim((hz / 1e3).toFixed(2))} kS/s`;
  return `${hz} S/s`;
};

PLA.fmtCount = n => n.toLocaleString('en-US');

PLA.hex = (v, width = 2) => '0x' + v.toString(16).toUpperCase().padStart(width, '0');

function trim(str) {
  return str.includes('.') ? str.replace(/\.?0+$/, '') : str;
}

// Index of the first element of a sorted array that is >= value.
PLA.lowerBound = (arr, value) => {
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// Local storage that never throws (private windows, blocked storage).
PLA.store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  },
};

if (typeof module !== 'undefined') module.exports = PLA;
