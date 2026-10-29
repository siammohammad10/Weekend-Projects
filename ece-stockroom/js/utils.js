// Small DOM and formatting helpers shared by every view.

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const H = 3600e3,
  D = 24 * H;
const money = n => '$' + (Math.round(n * 100) / 100).toFixed(2);
const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
const rel = ts => {
  const d = Date.now() - ts;
  if (d < 60e3) return 'just now';
  if (d < H) return Math.round(d / 60e3) + ' min ago';
  if (d < D) return Math.round(d / H) + ' h ago';
  return Math.round(d / D) + ' d ago';
};
const initials = n =>
  String(n)
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
const hue = n => [...String(n)].reduce((a, c) => a + c.charCodeAt(0), 0) % 4;
const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
const DUE = RENTAL_DUE.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
