// The waveform canvas: a time ruler, one row per channel, a lane of decoded values under any
// channel a decoder reads, the trigger mark and two measurement cursors.
//
// The view is a window onto the capture: `start` is the sample at the left edge and `spp` is
// samples per pixel. Each pixel column is drawn from the edge list, so a 400,000-sample capture
// draws as fast as a short one. Columns with several edges are drawn as a solid band.
//
// Zooming and panning ease toward a goal instead of jumping, and a new capture sweeps in from the
// left like a scope trace. Both are skipped when the device asks for reduced motion.

(function () {
  const PLA = globalThis.PLA;
  const RULER = 30,
    ROW = 46,
    LANE = 26,
    PAD = 11;
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  class WaveView {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cap = null;
      this.start = 0;
      this.spp = 1;
      this.width = 0;
      this.channels = [];
      this.lanes = {};
      this.cursors = { a: null, b: null };
      this.hover = null;
      this.onChange = () => {};
      this.onHover = () => {};
      this.colors = {};
      this.goal = null; // { start, spp } the view is easing toward
      this.reveal = 1; // 0 to 1 while a new capture sweeps in
      this.frame = 0;
      this.bind();
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        this.readColors();
        this.draw();
      });
      this.readColors();
    }

    readColors() {
      const cs = getComputedStyle(document.documentElement);
      const v = name => cs.getPropertyValue(name).trim();
      this.colors = {
        bg: v('--canvas'),
        ruler: v('--ruler'),
        grid: v('--grid'),
        line: v('--line'),
        text: v('--muted'),
        ink: v('--ink'),
        accent: v('--accent'),
        cursorA: v('--cursor-a'),
        cursorB: v('--cursor-b'),
        good: v('--good'),
        bad: v('--bad'),
        glow: parseFloat(v('--trace-glow')) || 0,
        ch: Array.from({ length: PLA.CHANNELS }, (_, i) => v(`--ch${i}`)),
      };
    }

    // channels: [{ index, visible }], lanes: { [channel]: [{ items, color }] }
    setLayout(channels, lanes) {
      this.channels = channels;
      this.lanes = lanes;
      this.layout();
      this.resize();
    }

    layout() {
      let y = RULER;
      this.rows = [];
      for (const c of this.channels) {
        if (!c.visible) continue;
        const lanes = this.lanes[c.index] || [];
        const row = { ch: c.index, y, h: ROW + lanes.length * LANE, lanes: [] };
        lanes.forEach((l, n) => row.lanes.push({ ...l, y: y + ROW + n * LANE }));
        this.rows.push(row);
        y += row.h;
      }
      this.height = Math.max(y, RULER + ROW);
      return this.rows;
    }

    setCapture(cap, keepView) {
      const prev = this.cap;
      this.cap = cap;
      this.goal = null;
      if (!keepView || !prev || prev.n !== cap.n) {
        this.spp = cap.n / this.width;
        this.start = 0;
      }
      this.cursors = keepView ? this.cursors : { a: null, b: null };
      this.sweep();
      this.onChange();
    }

    get visibleSamples() {
      return this.width * this.spp;
    }

    // Clamped copy of a view: never past either end, never closer than 60 pixels per sample.
    clamped(start, spp) {
      if (!this.cap) return { start, spp };
      spp = Math.min(this.cap.n / this.width, Math.max(1 / 60, spp));
      start = Math.min(Math.max(0, this.cap.n - this.width * spp), Math.max(0, start));
      return { start, spp };
    }

    clamp() {
      Object.assign(this, this.clamped(this.start, this.spp));
    }

    // Moves the view to a new start and scale, easing there over a few frames.
    animateTo(start, spp) {
      this.goal = this.clamped(start, spp);
      if (still()) {
        Object.assign(this, this.goal);
        this.goal = null;
        this.draw();
        this.onChange();
        return;
      }
      this.loop();
    }

    // Where the view is heading, or where it is if it isn't moving.
    get target() {
      return this.goal || { start: this.start, spp: this.spp };
    }

    fit() {
      if (!this.cap || !this.width) return;
      this.animateTo(0, this.cap.n / this.width);
    }

    zoomAt(px, factor) {
      if (!this.cap) return;
      const t = this.target;
      const s = t.start + px * t.spp;
      const spp = this.clamped(0, t.spp * factor).spp;
      this.animateTo(s - px * spp, spp);
    }

    panBy(px) {
      if (!this.cap) return;
      const t = this.target;
      this.animateTo(t.start + px * t.spp, t.spp);
    }

    // Show samples [s, e) with a little room around them.
    show(s, e) {
      if (!this.cap) return;
      const span = Math.max(e - s, 8);
      const spp = this.clamped(0, (span * 3) / this.width).spp;
      this.animateTo((s + e) / 2 - (this.width * spp) / 2, spp);
    }

    // Draws a new capture in from the left.
    sweep() {
      if (still()) {
        this.reveal = 1;
        this.draw();
        return;
      }
      this.reveal = 0;
      this.sweepStart = performance.now();
      this.loop();
    }

    loop() {
      if (this.frame) return;
      let last = performance.now();
      const tick = now => {
        const dt = Math.min(64, now - last);
        last = now;
        let busy = false;
        if (this.goal) {
          // Ease the scale in log space so zooming in and out feel the same.
          const k = 1 - Math.exp(-dt / 55);
          const ls = Math.log(this.spp),
            lg = Math.log(this.goal.spp);
          this.spp = Math.exp(ls + (lg - ls) * k);
          this.start += (this.goal.start - this.start) * k;
          const px = Math.abs(this.goal.start - this.start) / this.spp;
          if (px < 0.25 && Math.abs(lg - Math.log(this.spp)) < 0.002) {
            Object.assign(this, this.goal);
            this.goal = null;
          } else busy = true;
          this.onChange();
        }
        if (this.reveal < 1) {
          this.reveal = Math.min(1, easeOut((now - this.sweepStart) / 520));
          busy = busy || this.reveal < 1;
        }
        this.draw();
        this.frame = busy ? requestAnimationFrame(tick) : 0;
      };
      this.frame = requestAnimationFrame(tick);
    }

    x(sample) {
      return (sample - this.start) / this.spp;
    }

    sampleAt(px) {
      return this.start + px * this.spp;
    }

    resize() {
      const box = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(200, Math.floor(box.width));
      const h = this.layout() && this.height;
      const wasFit = this.cap && Math.abs(this.spp - this.cap.n / (this.width || w)) < 1e-9;
      this.width = w;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.cap) {
        if (wasFit) this.spp = this.cap.n / w;
        this.clamp();
      }
      this.draw();
      this.onChange();
    }

    // ------------------------------------------------------------------ drawing

    draw() {
      const { ctx, colors: c } = this;
      const W = this.width,
        H = this.height;
      if (!W) return;
      ctx.fillStyle = c.bg;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = c.ruler;
      ctx.fillRect(0, 0, W, RULER);

      for (const row of this.rows) {
        ctx.fillStyle = c.line;
        ctx.fillRect(0, row.y + row.h - 1, W, 1);
      }
      if (!this.cap) return;

      this.drawRuler();
      const edge = this.reveal * W;
      ctx.save();
      if (this.reveal < 1) {
        ctx.beginPath();
        ctx.rect(0, RULER, edge, H - RULER);
        ctx.clip();
      }
      for (const row of this.rows) {
        this.drawTrace(row);
        row.lanes.forEach(l => this.drawLane(l, row));
      }
      ctx.restore();
      if (this.reveal < 1) {
        const g = ctx.createLinearGradient(edge - 60, 0, edge, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, c.accent);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = g;
        ctx.fillRect(edge - 60, RULER, 60, H - RULER);
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent;
        ctx.fillRect(edge - 1, RULER, 2, H - RULER);
      }
      this.drawMarkers();
    }

    niceStep(raw) {
      const p = Math.pow(10, Math.floor(Math.log10(raw)));
      const m = raw / p;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
    }

    drawRuler() {
      const { ctx, colors: c, cap } = this;
      const W = this.width,
        H = this.height;
      const step = this.niceStep((110 * this.spp) / cap.rate);
      const minor = step / 5;
      const t0 = this.start / cap.rate,
        t1 = (this.start + this.visibleSamples) / cap.rate;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textBaseline = 'middle';
      for (let t = Math.ceil(t0 / minor) * minor; t <= t1; t += minor) {
        const x = Math.round(this.x(t * cap.rate)) + 0.5;
        const major = Math.abs(t / step - Math.round(t / step)) < 1e-6;
        ctx.fillStyle = c.grid;
        if (major) {
          ctx.fillRect(x - 0.5, RULER, 1, H - RULER);
          ctx.fillStyle = c.text;
          ctx.fillRect(x - 0.5, RULER - 8, 1, 8);
          // Keep the label clear of the trigger flag at time zero.
          const nearTrigger = cap.trigger && Math.abs(x - this.x(0)) < 10;
          ctx.fillText(PLA.fmtTime(Math.round(t / step) * step, 3), x + (nearTrigger ? 21 : 5), 12);
        } else {
          ctx.fillStyle = c.line;
          ctx.fillRect(x - 0.5, RULER - 4, 1, 4);
        }
      }
      ctx.fillStyle = c.line;
      ctx.fillRect(0, RULER - 1, W, 1);
    }

    drawTrace(row) {
      const { ctx, cap } = this;
      const color = this.colors.ch[row.ch];
      const hi = row.y + PAD,
        lo = row.y + ROW - PAD;
      const Y = l => (l ? hi : lo);
      const E = cap.edges[row.ch];
      const W = this.width;
      let k = PLA.lowerBound(E, Math.floor(this.start) + 1);
      let level = cap.levelAt(row.ch, this.start);
      const busy = [];
      let busyStart = -1;

      ctx.beginPath();
      ctx.moveTo(0, Y(level));
      for (let px = 0; px < W; px++) {
        const b = this.start + (px + 1) * this.spp;
        let count = 0,
          first = 0;
        while (k < E.length && E[k] <= b) {
          if (!count) first = E[k];
          count++;
          k++;
        }
        if (!count) {
          if (busyStart >= 0) {
            busy.push([busyStart, px]);
            busyStart = -1;
            ctx.moveTo(px, Y(level));
          }
          continue;
        }
        if (count === 1 && busyStart < 0) {
          const x = this.x(first);
          ctx.lineTo(x, Y(level));
          level ^= 1;
          ctx.lineTo(x, Y(level));
        } else {
          if (busyStart < 0) {
            ctx.lineTo(px, Y(level));
            busyStart = px;
          }
          level ^= count & 1;
        }
      }
      if (busyStart >= 0) busy.push([busyStart, W]);
      else ctx.lineTo(W, Y(level));
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'miter';
      if (this.colors.glow) {
        // A soft glow under the trace in dark mode, like a phosphor screen.
        ctx.shadowColor = color;
        ctx.shadowBlur = this.colors.glow;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.75;
      for (const [a, z] of busy) ctx.fillRect(a, hi, Math.max(1, z - a), lo - hi);
      ctx.globalAlpha = 1;
    }

    drawLane(lane, row) {
      const { ctx, colors: c } = this;
      const color = this.colors.ch[row.ch];
      const top = lane.y + 3,
        bot = lane.y + LANE - 4,
        mid = (top + bot) / 2;
      const items = lane.items;
      const s0 = this.start,
        s1 = this.start + this.visibleSamples;
      ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      // Items are in time order and never longer than a frame, so start a little before the window.
      let i = Math.max(0, lowerBoundBy(items, s0) - 4);
      for (; i < items.length && items[i].s <= s1; i++) {
        const it = items[i];
        if (it.e < s0) continue;
        const x0 = this.x(it.s),
          x1 = this.x(it.e);
        const tint =
          it.kind === 'error' || it.kind === 'nack'
            ? c.bad
            : it.kind === 'start'
              ? c.good
              : it.kind === 'stop'
                ? c.bad
                : color;

        if (it.s === it.e) {
          ctx.fillStyle = tint;
          ctx.fillRect(Math.round(x0) - 1, top, 2, bot - top);
          if (this.spp < 2 && it.short) {
            ctx.fillText(it.short, x0 + (it.kind === 'start' ? 9 : -9), mid);
          }
          continue;
        }
        const w = x1 - x0;
        if (w < 3) {
          ctx.fillStyle = tint;
          ctx.globalAlpha = 0.6;
          ctx.fillRect(x0, top + 4, Math.max(1, w), bot - top - 8);
          ctx.globalAlpha = 1;
          continue;
        }
        const tip = Math.min(5, w / 3);
        ctx.beginPath();
        ctx.moveTo(x0, mid);
        ctx.lineTo(x0 + tip, top);
        ctx.lineTo(x1 - tip, top);
        ctx.lineTo(x1, mid);
        ctx.lineTo(x1 - tip, bot);
        ctx.lineTo(x0 + tip, bot);
        ctx.closePath();
        ctx.fillStyle = tint;
        ctx.globalAlpha = it.kind === 'ack' ? 0.08 : it.kind === 'addr' ? 0.32 : 0.18;
        ctx.fill();
        ctx.globalAlpha = it.kind === 'ack' ? 0.35 : 0.9;
        ctx.strokeStyle = tint;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        const label =
          ctx.measureText(it.text).width + 12 < w
            ? it.text
            : ctx.measureText(it.short).width + 8 < w
              ? it.short
              : '';
        if (label) {
          ctx.fillStyle = it.kind === 'ack' ? c.text : c.ink;
          const cx = Math.min(
            Math.max((x0 + x1) / 2, ctx.measureText(label).width / 2 + 4),
            this.width - ctx.measureText(label).width / 2 - 4,
          );
          ctx.fillText(label, cx, mid + 0.5);
        }
      }
      ctx.textAlign = 'left';
    }

    drawMarkers() {
      const { ctx, colors: c, cap } = this;
      const H = this.height;
      const flag = (x, color, label, line = true) => {
        if (x < -20 || x > this.width + 20) return;
        ctx.fillStyle = color;
        if (line) ctx.fillRect(Math.round(x) - 0.5, RULER, 1, H - RULER);
        // The flag stays fully on screen even when its line sits at the very edge.
        x = Math.max(9, Math.min(this.width - 9, x));
        ctx.beginPath();
        ctx.moveTo(x - 8, 2);
        ctx.lineTo(x + 8, 2);
        ctx.lineTo(x + 8, RULER - 9);
        ctx.lineTo(x, RULER - 1);
        ctx.lineTo(x - 8, RULER - 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c.bg;
        ctx.font = '700 11px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, 11);
        ctx.textAlign = 'left';
      };
      if (cap.trigger) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = c.accent;
        const x = Math.round(this.x(0)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(x, RULER);
        ctx.lineTo(x, H);
        ctx.stroke();
        ctx.restore();
        flag(x, c.accent, 'T', false);
      }
      if (this.hover != null) {
        ctx.fillStyle = c.text;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(Math.round(this.hover) - 0.5, RULER, 1, H - RULER);
        ctx.globalAlpha = 1;
      }
      if (this.cursors.a != null) flag(this.x(this.cursors.a), c.cursorA, 'A');
      if (this.cursors.b != null) flag(this.x(this.cursors.b), c.cursorB, 'B');
    }

    // ------------------------------------------------------------------ interaction

    itemAt(px, py) {
      for (const row of this.rows || []) {
        for (const lane of row.lanes) {
          if (py < lane.y || py > lane.y + LANE) continue;
          const s = this.sampleAt(px);
          const slack = 3 * this.spp;
          const items = lane.items;
          for (
            let i = Math.max(0, lowerBoundBy(items, s - slack) - 4);
            i < items.length && items[i].s <= s + slack;
            i++
          ) {
            const it = items[i];
            if (s >= it.s - slack && s <= it.e + slack) return { item: it, lane, row };
          }
        }
      }
      return null;
    }

    bind() {
      const cv = this.canvas;
      let drag = null;
      cv.addEventListener(
        'wheel',
        e => {
          if (!this.cap) return;
          e.preventDefault();
          const px = e.offsetX;
          const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
          if (horizontal && !e.ctrlKey) this.panBy(e.shiftKey ? e.deltaY : e.deltaX);
          else this.zoomAt(px, Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)));
        },
        { passive: false },
      );
      cv.addEventListener('pointerdown', e => {
        if (!this.cap || e.button !== 0) return;
        cv.setPointerCapture(e.pointerId);
        this.goal = null;
        drag = { x: e.offsetX, start: this.start, moved: false };
      });
      cv.addEventListener('pointermove', e => {
        if (!this.cap) return;
        if (drag) {
          const dx = e.offsetX - drag.x;
          if (Math.abs(dx) > 3) drag.moved = true;
          if (drag.moved) {
            this.start = drag.start - dx * this.spp;
            this.clamp();
            cv.style.cursor = 'grabbing';
          }
        }
        this.hover = e.offsetX;
        const hit = this.itemAt(e.offsetX, e.offsetY);
        this.onHover({ px: e.offsetX, py: e.offsetY, sample: this.sampleAt(e.offsetX), hit });
        this.draw();
        if (drag && drag.moved) this.onChange();
      });
      cv.addEventListener('pointerup', e => {
        if (!drag) return;
        const wasDrag = drag.moved;
        drag = null;
        cv.style.cursor = '';
        if (wasDrag) return;
        const s = Math.round(this.sampleAt(e.offsetX));
        if (e.shiftKey || e.altKey) this.cursors.b = s;
        else this.cursors.a = s;
        this.draw();
        this.onChange();
      });
      cv.addEventListener('pointerleave', () => {
        this.hover = null;
        this.onHover(null);
        this.draw();
      });
      cv.addEventListener('contextmenu', e => {
        if (!this.cap) return;
        e.preventDefault();
        this.cursors.b = Math.round(this.sampleAt(e.offsetX));
        this.draw();
        this.onChange();
      });
    }
  }

  function lowerBoundBy(items, s) {
    let lo = 0,
      hi = items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (items[mid].s < s) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  PLA.WaveView = WaveView;
  PLA.VIEW = { RULER, ROW, LANE };
})();
