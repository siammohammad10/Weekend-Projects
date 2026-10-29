// App state, demo seed data and the budget, cart and limit rules.
// The demo keeps everything in localStorage. A production build would swap save() and the
// initial load for calls to a shared API.

// Demo state
const KEY = 'ece-stockroom-demo-v4';
function seed() {
  ITEMS = clone(BASE_ITEMS);
  CATS = clone(BASE_CATS);
  const t = Date.now();
  const mk = (id, team, by, lines, status, ago, doneAgo, note = '') => ({
    id,
    team,
    by,
    status,
    at: t - ago,
    doneAt: doneAgo != null ? t - doneAgo : null,
    note,
    items: lines.map(([s, q, m = 'buy', retAgo = null]) => [
      s,
      q,
      unit(item(s), m),
      m,
      retAgo != null ? t - retAgo : null,
    ]),
  });
  const obj = {
    session: null,
    seq: 1044,
    stock: Object.fromEntries(ITEMS.map(i => [i.sku, i.stock])),
    carts: {},
    instructors: [
      { id: 'i1', name: 'Dr. Elena Park', course: 'Project Lab I', section: 'Sec. 001' },
      { id: 'i2', name: 'Dr. Marcus Bell', course: 'Project Lab I', section: 'Sec. 002' },
      { id: 'i3', name: 'Dr. Naomi Price', course: 'Intro to Robotics', section: 'Sec. 001' },
      { id: 'i4', name: 'Dr. Samuel Ortega', course: 'Senior Design', section: 'Sec. 001' },
      { id: 'i5', name: 'Dr. Ruth Okafor', course: 'Digital Logic Lab', section: 'Sec. 003' },
    ],
    teams: [
      {
        id: 't7',
        name: 'Team 07',
        project: 'Line-following delivery bot',
        instructor: 'i1',
        budget: 300,
        members: ['Jordan Reyes', 'Sam Ortiz', 'Maya Chen', 'Luis Gómez'],
      },
      {
        id: 't3',
        name: 'Team 03',
        project: 'Greenhouse climate monitor',
        instructor: 'i1',
        budget: 300,
        members: ['Arjun Mehta', 'Bella Ruiz', 'Chris Tran'],
      },
      {
        id: 't4',
        name: 'Team 04',
        project: 'Self-balancing robot',
        instructor: 'i2',
        budget: 300,
        members: ['Diego Alvarez', 'Erin Walsh', 'Farah Siddiqui', 'Gabe Lin'],
      },
      {
        id: 't12',
        name: 'Team 12',
        project: 'Smart parking sensor',
        instructor: 'i2',
        budget: 300,
        members: ['Kofi Mensah', 'Lena Ford', 'Omar Haddad'],
      },
      {
        id: 't9',
        name: 'Team 09',
        project: 'Robotic arm sorter',
        instructor: 'i3',
        budget: 250,
        members: ['Hana Kim', 'Isaac Moore', 'Jade Patel'],
      },
      {
        id: 't5',
        name: 'Team 05',
        project: 'Maze-solving micromouse',
        instructor: 'i3',
        budget: 250,
        members: ['Priya Rao', 'Quinn Avery', 'Rosa Diaz', 'Tyler Brooks'],
      },
      {
        id: 't21',
        name: 'Team 21',
        project: 'Solar-powered weather station',
        instructor: 'i4',
        budget: 600,
        members: ['Nadia Brooks', 'Victor Lee', 'Sofia Martins', 'Ethan Cole'],
      },
      {
        id: 't15',
        name: 'Team 15',
        project: 'FPGA reaction-time game',
        instructor: 'i5',
        budget: 150,
        members: ['Grace Wu', 'Ben Ortega', 'Leo Park'],
      },
    ],
    orders: [
      mk(
        'SR-1028',
        't3',
        'Bella Ruiz',
        [
          ['MCU-UNO-R3', 1],
          ['SEN-DHT22', 2],
          ['PRO-BB830', 1],
        ],
        'purchased',
        6 * D,
        5.8 * D,
      ),
      mk(
        'SR-1031',
        't7',
        'Sam Ortiz',
        [
          ['MOT-TT-48', 2],
          ['PRO-WHEEL65', 1],
          ['DRV-L298N', 1],
          ['PWR-AA4', 1],
        ],
        'purchased',
        5 * D,
        4.9 * D,
      ),
      mk(
        'SR-1032',
        't7',
        'Maya Chen',
        [
          ['EQ-DMM', 1, 'rent'],
          ['EQ-SOLDER', 1, 'rent'],
        ],
        'purchased',
        4.6 * D,
        4.5 * D,
      ),
      mk(
        'SR-1033',
        't4',
        'Erin Walsh',
        [
          ['SEN-MPU6050', 1],
          ['MOT-N20-100', 2],
          ['DRV-TB6612', 1],
          ['PWR-18650', 2],
          ['EQ-LOGIC', 1, 'rent'],
        ],
        'purchased',
        3 * D,
        2.8 * D,
      ),
      mk('SR-1034', 't3', 'Chris Tran', [['EQ-PSU', 1, 'rent', 1 * D]], 'purchased', 3.2 * D, 3 * D),
      mk(
        'SR-1036',
        't9',
        'Isaac Moore',
        [
          ['MOT-MG996R', 4],
          ['PWR-LM2596', 1],
          ['MCU-NANO', 1],
        ],
        'purchased',
        2 * D,
        1.5 * D,
      ),
      mk(
        'SR-1035',
        't12',
        'Omar Haddad',
        [
          ['SEN-HCSR04', 4],
          ['MCU-ESP32', 1],
        ],
        'purchased',
        1.2 * D,
        5 * H,
      ),
      mk(
        'SR-1037',
        't21',
        'Victor Lee',
        [
          ['MCU-ESP32', 1],
          ['PWR-LM2596', 2],
          ['PWR-18650', 2],
          ['SEN-DHT22', 1],
        ],
        'purchased',
        2.5 * D,
        2.2 * D,
      ),
      mk(
        'SR-1038',
        't5',
        'Priya Rao',
        [
          ['PAS-RES-KIT', 1],
          ['PAS-LED-5MM', 1],
        ],
        'cancelled',
        1.5 * D,
        1.4 * D,
      ),
      mk(
        'SR-1039',
        't7',
        'Jordan Reyes',
        [
          ['SEN-HCSR04', 1],
          ['SEN-IR-TCRT', 3],
          ['PRO-JMP-MM', 1],
        ],
        'requested',
        3 * H,
        null,
        'Can we grab these after the 2 pm lab?',
      ),
      mk(
        'SR-1040',
        't5',
        'Quinn Avery',
        [
          ['MOT-N20-100', 2],
          ['SEN-IR-TCRT', 4],
          ['MCU-PICO-W', 1],
          ['EQ-SOLDER', 1, 'rent'],
        ],
        'requested',
        2 * H,
      ),
      mk(
        'SR-1041',
        't3',
        'Arjun Mehta',
        [
          ['MCU-ESP32', 1],
          ['PAS-RES-KIT', 1],
        ],
        'requested',
        55 * 60e3,
      ),
      mk(
        'SR-1042',
        't9',
        'Hana Kim',
        [
          ['MOT-SG90', 2],
          ['PRO-BB830', 1],
        ],
        'requested',
        18 * 60e3,
      ),
      mk(
        'SR-1043',
        't15',
        'Grace Wu',
        [
          ['PAS-LED-5MM', 1],
          ['PRO-BB830', 2],
          ['PRO-JMP-MM', 1],
        ],
        'requested',
        35 * 60e3,
      ),
    ],
    certs: [
      {
        id: 'c1',
        student: 'Maya Chen',
        team: 't7',
        status: 'verified',
        file: 'lab-safety-maya.pdf',
        kind: 'pdf',
        preview: null,
        at: t - 4 * D,
      },
      {
        id: 'c2',
        student: 'Arjun Mehta',
        team: 't3',
        status: 'pending',
        file: 'EHS_certificate_arjun.jpg',
        kind: 'demo',
        preview: null,
        at: t - 2 * H,
      },
      {
        id: 'c3',
        student: 'Hana Kim',
        team: 't9',
        status: 'pending',
        file: 'safety-training.png',
        kind: 'demo',
        preview: null,
        at: t - 6 * H,
      },
      {
        id: 'c4',
        student: 'Diego Alvarez',
        team: 't4',
        status: 'rejected',
        file: 'cert_photo.jpg',
        kind: 'demo',
        preview: null,
        at: t - D,
        note: 'The photo is too blurry to read the completion date.',
      },
    ],
  };
  const uname = n => {
    const w = n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\s+/);
    return (w[0][0] + w[w.length - 1]).replace(/[^a-z0-9]/g, '');
  };
  obj.accounts = obj.teams.flatMap(tm =>
    tm.members.map(n => ({ u: uname(n), name: n, team: tm.id, role: 'student', avatar: null })),
  );
  obj.accounts.push({ u: 'stockroom', name: 'Stockroom Staff', team: null, role: 'admin', avatar: null });
  obj.items = ITEMS;
  obj.cats = CATS;
  obj.charges = seedCharges(t);
  obj.prints = seedPrints(t);
  return obj;
}
function seedPrints(t) {
  return [
    {
      id: 'J1',
      team: 't9',
      desc: 'Wrist joint bracket, PLA',
      status: 'ready',
      at: t - 3 * H,
      startedAt: t - 2 * H,
      readyAt: t - 20 * 60e3,
    },
    {
      id: 'J2',
      team: 't21',
      desc: 'Panel hinge set, PETG',
      status: 'ready',
      at: t - 5 * H,
      startedAt: t - 4 * H,
      readyAt: t - 70 * 60e3,
    },
    {
      id: 'J3',
      team: 't5',
      desc: 'Micromouse chassis, PLA',
      status: 'printing',
      at: t - 2 * H,
      startedAt: t - 35 * 60e3,
    },
    { id: 'J4', team: 't12', desc: 'Sensor enclosure, PETG', status: 'queued', at: t - 60 * 60e3 },
    { id: 'J5', team: 't3', desc: 'Soil probe holder, PLA', status: 'queued', at: t - 40 * 60e3 },
    { id: 'J6', team: 't7', desc: 'Line sensor mount, PLA', status: 'queued', at: t - 12 * 60e3 },
    {
      id: 'J7',
      team: 't4',
      desc: 'Battery bracket, PLA, 28 g',
      status: 'collected',
      at: t - 26 * H,
      startedAt: t - 25 * H,
      readyAt: t - 22 * H,
      collectedAt: t - 20 * H,
    },
    {
      id: 'J8',
      team: 't21',
      desc: 'Solar panel mount, PETG, 160 g',
      status: 'collected',
      at: t - 3.4 * D,
      startedAt: t - 3.3 * D,
      readyAt: t - 3 * D,
      collectedAt: t - 2.8 * D,
    },
    {
      id: 'J9',
      team: 't9',
      desc: 'Gripper fingers, PLA, 42 g',
      status: 'collected',
      at: t - 1.9 * D,
      startedAt: t - 1.8 * D,
      readyAt: t - 1.6 * D,
      collectedAt: t - 1.5 * D,
    },
  ];
}
function seedCharges(t) {
  return [
    { id: 'P1', team: 't9', desc: 'Gripper fingers, PLA, 42 g', amount: 3.8, at: t - 1.6 * D, job: 'J9' },
    { id: 'P2', team: 't21', desc: 'Solar panel mount, PETG, 160 g', amount: 9.6, at: t - 3 * D, job: 'J8' },
    { id: 'P3', team: 't4', desc: 'Battery bracket, PLA, 28 g', amount: 2.1, at: t - 22 * H, job: 'J7' },
    { id: 'P4', team: 't9', desc: 'Wrist joint bracket, PLA', amount: 5.4, at: t - 20 * 60e3, job: 'J1' },
    { id: 'P5', team: 't21', desc: 'Panel hinge set, PETG', amount: 6.75, at: t - 70 * 60e3, job: 'J2' },
  ];
}
let S;
try {
  S = JSON.parse(localStorage.getItem(KEY));
} catch (e) {
  S = null;
}
if (!S || !S.orders || !S.accounts) S = seed();
if (!S.items || !S.cats) {
  S.items = clone(BASE_ITEMS);
  S.cats = clone(BASE_CATS);
}
ITEMS = S.items;
CATS = S.cats;
if (!S.charges) S.charges = seedCharges(Date.now());
if (!S.prints) {
  const t0 = Date.now();
  S.prints = seedPrints(t0);
  const link = { P1: 'J9', P2: 'J8', P3: 'J7' };
  S.charges.forEach(c => {
    if (link[c.id] && !c.job) c.job = link[c.id];
  });
  seedCharges(t0)
    .filter(c => c.id === 'P4' || c.id === 'P5')
    .forEach(c => {
      if (!S.charges.some(x => x.id === c.id)) S.charges.push(c);
    });
}
function wireMe() {
  Object.defineProperty(S, 'me', {
    get() {
      return S.accounts.find(a => a.u === S.session) || null;
    },
    configurable: true,
  });
  Object.defineProperty(S, 'role', {
    get() {
      return S.me ? S.me.role : null;
    },
    configurable: true,
  });
}
wireMe();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
    return true;
  } catch (e) {
    return !(
      e &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22)
    );
  }
};
const U = {
  view: S.role === 'admin' ? 'desk' : 'dash',
  cat: null,
  q: '',
  instF: null,
  certTab: 'pending',
  flash: null,
  sq: 1,
  mode: 'buy',
  sheetSku: null,
  lastFocus: null,
};

const CART = () => (S.carts[S.session] ||= {});
const teamOf = id => S.teams.find(t => t.id === id);
const inst = id => S.instructors.find(i => i.id === id);
const myTeam = () => teamOf(S.me.team);
const myCert = () => {
  let c = S.certs.find(x => x.student === S.me.name);
  if (!c) {
    c = {
      id: 'c-' + S.me.u,
      student: S.me.name,
      team: S.me.team,
      status: 'none',
      file: null,
      kind: null,
      preview: null,
      at: null,
      note: null,
    };
    S.certs.push(c);
  }
  return c;
};
const certName = c => c.student;
const orderTotal = o => o.items.reduce((s, [, q, p]) => s + q * p, 0);
const orderQty = o => o.items.reduce((s, [, q]) => s + q, 0);
const lineMode = l => l[3] || 'buy';
function budget(tid) {
  const t = teamOf(tid);
  let spent = 0,
    hold = 0,
    items = 0,
    open = 0,
    rentOut = 0;
  S.orders.forEach(o => {
    if (o.team !== tid) return;
    const v = orderTotal(o);
    if (o.status === 'purchased') {
      spent += v;
      o.items.forEach(l => {
        if (lineMode(l) === 'buy') items += l[1];
        else if (!l[4]) rentOut += l[1];
      });
    } else if (o.status === 'requested') {
      hold += v;
      open++;
    }
  });
  const printed = (S.charges || []).filter(c => c.team === tid).reduce((s, c) => s + c.amount, 0);
  spent += printed;
  return { total: t.budget, spent, hold, left: t.budget - spent - hold, items, open, rentOut, printed };
}
const inCart = (sku, m) =>
  Object.entries(CART()).reduce((s, [k, q]) => {
    const [a, b] = k.split(':');
    return s + (a === sku && (!m || b === m) ? q : 0);
  }, 0);
const avail = sku => S.stock[sku] - inCart(sku);
const usedBuy = (tid, sku) =>
  S.orders.reduce(
    (s, o) =>
      o.team === tid && o.status !== 'cancelled'
        ? s + o.items.reduce((a, l) => a + (l[0] === sku && lineMode(l) === 'buy' ? l[1] : 0), 0)
        : s,
    0,
  );
function maxAdd(it, m) {
  let n = avail(it.sku);
  if (m === 'buy' && it.limit)
    n = Math.min(n, it.limit.n - usedBuy(S.me.team, it.sku) - inCart(it.sku, 'buy'));
  return Math.max(0, n);
}
const limitReached = (it, m) =>
  m === 'buy' && it.limit && it.limit.n - usedBuy(S.me.team, it.sku) - inCart(it.sku, 'buy') <= 0;
const defMode = it => (it.mode === 'rent' ? 'rent' : 'buy');
const cartLines = () =>
  Object.entries(CART())
    .filter(([, q]) => q > 0)
    .map(([key, q]) => {
      const [sku, m] = key.split(':');
      return { key, it: item(sku), m, q };
    });
const cartCount = () => cartLines().reduce((s, l) => s + l.q, 0);
const cartTotal = () => cartLines().reduce((s, l) => s + l.q * unit(l.it, l.m), 0);
function rentLines(team) {
  const out = [];
  S.orders.forEach(o => {
    if (o.status === 'cancelled' || (team && o.team !== team)) return;
    o.items.forEach((l, idx) => {
      if (lineMode(l) === 'rent') out.push({ o, l, idx });
    });
  });
  return out;
}

const avatar = (name, cls = '') => {
  const ac = S.accounts.find(a => a.name === name),
    img = ac && ac.avatar ? `<img src="${ac.avatar}" alt="">` : initials(name);
  return `<span class="av c${hue(name)} ${cls}" title="${esc(name)}">${img}</span>`;
};
const LABEL = {
  requested: 'Requested',
  purchased: 'Purchased',
  cancelled: 'Cancelled',
  none: 'Not uploaded',
  pending: 'Under review',
  verified: 'Verified',
  rejected: 'Needs re-upload',
  queued: 'In line',
  printing: 'Printing',
  ready: 'Ready for pickup',
  collected: 'Picked up',
};
const chip = s => `<span class="chip ${s}">${LABEL[s]}</span>`;
const stockTag = sku => {
  const st = S.stock[sku];
  return st <= 0
    ? '<span class="stock out">Out of stock</span>'
    : st <= 8
      ? `<span class="stock low">Only ${st} left</span>`
      : `<span class="stock">${st} in stock</span>`;
};
const fee = n => (n ? money(n) : 'Free');
const perLabel = p => (p === 'term' ? 'term' : 'course');
const tagsHTML = it => {
  const t = [];
  if (it.mode === 'rent') t.push('<span class="tag rent">Rent only</span>');
  else if (it.mode === 'both') t.push('<span class="tag both">Buy or rent</span>');
  if (it.limit) t.push(`<span class="tag lim">Limit ${it.limit.n} per ${perLabel(it.limit.per)}</span>`);
  return t.length ? `<span class="tags">${t.join('')}</span>` : '';
};
const priceHTML = it =>
  it.mode === 'rent'
    ? `<span class="pricebox"><span class="price">${fee(it.rent)}</span><span class="per">to rent</span></span>`
    : `<span class="pricebox"><span class="price">${money(it.price)}</span>${it.mode === 'both' ? `<span class="per">or rent ${it.rent ? money(it.rent) : 'free'}</span>` : ''}</span>`;
const modeTag = l =>
  lineMode(l) === 'rent' ? '<span class="tag rent">Rent</span>' : '<span class="tag buy">Buy</span>';
const countSpan = (v, dec = 0, pre = '') =>
  `<span data-count="${v}" data-dec="${dec}" data-pre="${pre}">${pre}${Number(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })}</span>`;
