// A finished capture: one byte per sample, bit n is channel n. Edges are found once up front, so
// drawing and decoding only ever look at the places where something changes.

(function () {
  const PLA = globalThis.PLA;

  class Capture {
    constructor(data, rate, meta = {}) {
      this.data = data;
      this.rate = rate;
      this.n = data.length;
      this.trigger = meta.trigger || null; // { channel, rising } when the capture was triggered
      this.source = meta.source || 'device';
      this.at = meta.at || Date.now();
      this.transferMs = meta.transferMs || 0;
      this.edges = [];
      this.initial = [];
      this.findEdges();
    }

    findEdges() {
      const lists = Array.from({ length: PLA.CHANNELS }, () => []);
      const d = this.data;
      let prev = d[0] || 0;
      for (let i = 1; i < d.length; i++) {
        const v = d[i];
        const changed = v ^ prev;
        if (changed) {
          for (let ch = 0; ch < PLA.CHANNELS; ch++) if (changed & (1 << ch)) lists[ch].push(i);
          prev = v;
        }
      }
      for (let ch = 0; ch < PLA.CHANNELS; ch++) {
        this.edges[ch] = Uint32Array.from(lists[ch]);
        this.initial[ch] = (d[0] >> ch) & 1;
      }
    }

    bit(ch, i) {
      return (this.data[i] >> ch) & 1;
    }

    // Level of a channel at a fractional sample position, clamped to the capture.
    levelAt(ch, pos) {
      const i = Math.min(this.n - 1, Math.max(0, Math.floor(pos)));
      return this.bit(ch, i);
    }

    get duration() {
      return this.n / this.rate;
    }

    time(i) {
      return i / this.rate;
    }

    // Frequency and duty cycle from the full periods in [from, to), or null if there are too few edges.
    measure(ch, from = 0, to = this.n) {
      const e = this.edges[ch];
      const a = PLA.lowerBound(e, from),
        b = PLA.lowerBound(e, to);
      const rises = [];
      for (let k = a; k < b; k++) if (this.bit(ch, e[k]) === 1) rises.push(e[k]);
      if (rises.length < 2) return null;
      const period = (rises[rises.length - 1] - rises[0]) / (rises.length - 1);
      // Bursts of data aren't a frequency: only report signals whose periods agree within 10 %.
      for (let r = 1; r < rises.length; r++)
        if (Math.abs(rises[r] - rises[r - 1] - period) > period * 0.1 + 1) return null;
      let high = 0;
      for (let r = 0; r < rises.length - 1; r++) {
        const fall = e[PLA.lowerBound(e, rises[r] + 1)];
        if (fall !== undefined && fall < rises[r + 1]) high += fall - rises[r];
      }
      return {
        freq: this.rate / period,
        duty: high / (period * (rises.length - 1)),
      };
    }
  }

  PLA.Capture = Capture;
})();
