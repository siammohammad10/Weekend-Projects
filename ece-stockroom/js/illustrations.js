// Flat illustrations for the demo catalog, drawn as inline SVG so the demo needs no image files.
// Real product photos uploaded through Inventory take priority over these.

// Part illustrations
const sh = '<ellipse cx="100" cy="125" rx="68" ry="6" fill="#000" opacity=".1"/>';
const pins = (x, y, n, g = 7, c = '#d8b24a', w = 4, h = 4) =>
  rep(n, i => `<rect x="${x + i * g}" y="${y}" width="${w}" height="${h}" rx="1" fill="${c}"/>`);
const dots = (x, y, cols, rows, g, c, r = 1.5) => {
  let s = '';
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++)
      s += `<circle cx="${(x + i * g).toFixed(1)}" cy="${(y + j * g).toFixed(1)}" r="${r}" fill="${c}"/>`;
  return s;
};
const wire = (d, c) => `<path d="${d}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const A = {
  tt: () =>
    sh +
    `<rect x="30" y="44" width="98" height="56" rx="8" fill="#e5ab12"/><rect x="34" y="48" width="90" height="48" rx="6" fill="#f7c935"/><circle cx="56" cy="72" r="5" fill="#d99a06"/><circle cx="104" cy="72" r="5" fill="#d99a06"/><rect x="74" y="20" width="14" height="30" rx="3" fill="#fbfaf4" stroke="#d8d4c2"/><rect x="78" y="20" width="6" height="30" fill="#ebe8db"/><rect x="126" y="54" width="42" height="36" rx="9" fill="#bcc1c7"/><rect x="126" y="61" width="42" height="22" fill="#d5d9dd"/><rect x="166" y="64" width="8" height="16" rx="2" fill="#959ba2"/>` +
    wire('M172 67 C188 60 190 44 180 36', '#d6392f') +
    wire('M172 77 C192 74 196 52 188 42', '#222'),
  servo: (c, c2, l) =>
    sh +
    `<rect x="38" y="62" width="124" height="14" rx="3" fill="${c}"/><circle cx="46" cy="69" r="3" fill="#000" opacity=".25"/><circle cx="154" cy="69" r="3" fill="#000" opacity=".25"/><rect x="54" y="40" width="92" height="76" rx="6" fill="${c2}"/><rect x="54" y="40" width="92" height="14" rx="6" fill="${c}"/><circle cx="78" cy="40" r="13" fill="${c}"/><rect x="52" y="31" width="74" height="11" rx="5.5" fill="#fafafa" stroke="#dddddd"/><circle cx="78" cy="36" r="4" fill="#bbbbbb"/><text x="100" y="94" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="#ffffff" opacity=".85">${l}</text>` +
    wire('M146 100 C164 100 170 114 186 114', '#7a4a22') +
    wire('M146 105 C162 105 168 119 186 119', '#d6392f') +
    wire('M146 110 C160 110 166 124 186 124', '#f39a1e'),
  stepper: () =>
    sh +
    `<rect x="54" y="22" width="92" height="92" rx="10" fill="#26282c"/><rect x="60" y="28" width="80" height="80" rx="7" fill="#3a3d43"/>` +
    [
      [67, 35],
      [133, 35],
      [67, 101],
      [133, 101],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#15161a"/>`)
      .join('') +
    `<circle cx="100" cy="68" r="22" fill="#8f959c"/><circle cx="100" cy="68" r="15" fill="#c9cdd2"/><circle cx="100" cy="68" r="5" fill="#eef0f2"/><rect x="72" y="96" width="56" height="8" rx="2" fill="#f2f2f2" opacity=".8"/>` +
    ['#d6392f', '#2f6fde', '#2ecc71', '#222']
      .map((c, i) => wire(`M${88 + i * 8} 114 C${88 + i * 8} 122 ${80 + i * 14} 124 ${70 + i * 20} 130`, c))
      .join(''),
  dc: () =>
    sh +
    `<rect x="40" y="56" width="16" height="32" rx="4" fill="#ece5d6"/><rect x="52" y="44" width="96" height="56" rx="22" fill="#b6bcc3"/><rect x="52" y="54" width="96" height="36" fill="#d0d4d9"/><rect x="62" y="56" width="76" height="4" fill="#eceef0" opacity=".8"/><rect x="148" y="62" width="10" height="20" rx="3" fill="#959ba2"/><rect x="158" y="69" width="26" height="6" rx="3" fill="#e8eaec"/><rect x="32" y="60" width="10" height="5" fill="#c79a3a"/><rect x="32" y="79" width="10" height="5" fill="#c79a3a"/>`,
  n20: () =>
    sh +
    `<rect x="22" y="69" width="26" height="6" rx="3" fill="#e8eaec"/><rect x="46" y="54" width="46" height="36" rx="3" fill="#b88d2e"/><rect x="50" y="58" width="38" height="28" rx="2" fill="#d4ae52"/><circle cx="58" cy="64" r="2" fill="#8a6a20"/><circle cx="80" cy="80" r="2" fill="#8a6a20"/><rect x="92" y="56" width="62" height="32" rx="13" fill="#b8bdc3"/><rect x="92" y="63" width="62" height="18" fill="#d2d6da"/><rect x="154" y="62" width="12" height="20" rx="3" fill="#2a2a2a"/>` +
    wire('M166 67 C180 64 184 52 178 44', '#d6392f') +
    wire('M166 77 C186 76 190 58 184 48', '#222'),
  uno: () =>
    sh +
    `<rect x="38" y="28" width="128" height="88" rx="7" fill="#0b6670"/><rect x="40" y="30" width="124" height="84" rx="6" fill="#108593"/><rect x="28" y="40" width="26" height="22" rx="2" fill="#c8ccd1"/><rect x="30" y="42" width="22" height="18" rx="1" fill="#aeb3b9"/><rect x="30" y="80" width="20" height="20" rx="2" fill="#1d1d1f"/>` +
    pins(62, 34, 14, 7, '#1d1d1f', 5, 6) +
    pins(78, 104, 11, 7, '#1d1d1f', 5, 6) +
    `<rect x="88" y="60" width="56" height="16" rx="2" fill="#1a1a1c"/>` +
    pins(90, 56, 8, 7, '#c9ccd1', 2, 4) +
    pins(90, 76, 8, 7, '#c9ccd1', 2, 4) +
    `<text x="70" y="96" font-family="ui-monospace,monospace" font-size="11" font-weight="700" fill="#e9f7f8" opacity=".9">UNO</text><circle cx="152" cy="50" r="2.5" fill="#7cfca0"/><circle cx="152" cy="58" r="2.5" fill="#ffd25e"/>`,
  esp: () =>
    sh +
    `<rect x="34" y="40" width="132" height="60" rx="5" fill="#1b1c1f"/>` +
    pins(44, 42, 17, 7, '#d8b24a', 3, 3) +
    pins(44, 95, 17, 7, '#d8b24a', 3, 3) +
    `<rect x="70" y="52" width="66" height="36" rx="3" fill="#c9cdd2"/><rect x="74" y="56" width="58" height="28" rx="2" fill="#b4b9bf"/><text x="103" y="74" text-anchor="middle" font-family="ui-monospace,monospace" font-size="9" font-weight="700" fill="#555555">ESP32</text><path d="M142 54h14v6h-11v6h11v6h-11v6h11" stroke="#d8b24a" stroke-width="2" fill="none"/><rect x="26" y="60" width="16" height="20" rx="2" fill="#aeb3b9"/>`,
  pico: () =>
    sh +
    `<rect x="24" y="44" width="152" height="54" rx="4" fill="#1e6b3c"/><rect x="26" y="46" width="148" height="50" rx="3" fill="#24834a"/>` +
    dots(32, 49, 20, 1, 7.4, '#e2c56b', 2.2) +
    dots(32, 93, 20, 1, 7.4, '#e2c56b', 2.2) +
    `<rect x="16" y="62" width="16" height="18" rx="2" fill="#bfc4ca"/><rect x="82" y="58" width="26" height="26" rx="2" fill="#1a1a1c"/><text x="95" y="73" text-anchor="middle" font-family="ui-monospace,monospace" font-size="6" fill="#aaaaaa">RP2040</text><rect x="122" y="60" width="34" height="22" rx="2" fill="#c9cdd2"/><rect x="46" y="62" width="14" height="8" rx="1" fill="#f2f2f2"/>`,
  nano: () =>
    sh +
    `<rect x="30" y="50" width="140" height="42" rx="4" fill="#0f4fa8"/><rect x="32" y="52" width="136" height="38" rx="3" fill="#1663c7"/>` +
    dots(40, 56, 15, 1, 8.6, '#e2c56b', 2) +
    dots(40, 86, 15, 1, 8.6, '#e2c56b', 2) +
    `<rect x="22" y="62" width="16" height="18" rx="2" fill="#bfc4ca"/><rect x="88" y="62" width="20" height="20" rx="1" fill="#1a1a1c" transform="rotate(45 98 72)"/><text x="138" y="75" font-family="ui-monospace,monospace" font-size="8" font-weight="700" fill="#e8f0ff" text-anchor="middle">NANO</text>`,
  ultra: () =>
    sh +
    `<rect x="26" y="40" width="148" height="66" rx="4" fill="#1c5aa6"/><rect x="28" y="42" width="144" height="62" rx="3" fill="#2368bd"/>` +
    [66, 134]
      .map(
        x =>
          `<circle cx="${x}" cy="73" r="27" fill="#c5cad0"/><circle cx="${x}" cy="73" r="22" fill="#9ca2a9"/><circle cx="${x}" cy="73" r="17" fill="#2c2f34"/>` +
          dots(x - 9, 64, 4, 4, 6, '#4a4e55', 1.6),
      )
      .join('') +
    `<rect x="92" y="52" width="16" height="8" rx="4" fill="#d9dcdf"/>` +
    pins(86, 102, 4, 8, '#d8b24a', 4, 12),
  ir: () =>
    sh +
    `<rect x="64" y="24" width="72" height="94" rx="4" fill="#1f1f22"/><rect x="66" y="26" width="68" height="90" rx="3" fill="#2b2c30"/>` +
    pins(82, 14, 3, 14, '#d8b24a', 4, 12) +
    `<rect x="84" y="40" width="32" height="26" rx="2" fill="#2f6fde"/><circle cx="100" cy="53" r="8" fill="#e9eef6"/><path d="M95 53h10M100 48v10" stroke="#8a93a0" stroke-width="2"/><circle cx="88" cy="96" r="9" fill="#111111"/><circle cx="112" cy="96" r="9" fill="#cfe2ff"/><circle cx="112" cy="96" r="5" fill="#9fc2f7"/><circle cx="76" cy="76" r="2.5" fill="#ff5a5a"/>`,
  imu: () =>
    sh +
    `<rect x="52" y="34" width="96" height="74" rx="5" fill="#2a3c94"/><rect x="54" y="36" width="92" height="70" rx="4" fill="#3449b2"/>` +
    dots(62, 44, 8, 1, 10.8, '#e2c56b', 3) +
    `<rect x="84" y="60" width="32" height="32" rx="2" fill="#151517"/><circle cx="88" cy="64" r="1.5" fill="#666666"/><text x="100" y="80" text-anchor="middle" font-family="ui-monospace,monospace" font-size="7" fill="#99aaaa">MPU</text><circle cx="136" cy="98" r="5" fill="none" stroke="#e2c56b" stroke-width="2"/><circle cx="64" cy="98" r="5" fill="none" stroke="#e2c56b" stroke-width="2"/>`,
  dht: () =>
    sh +
    `<rect x="66" y="16" width="68" height="86" rx="5" fill="#f2f2f0" stroke="#d6d6d0"/>` +
    rep(
      24,
      k =>
        `<rect x="${76 + (k % 4) * 13}" y="${26 + Math.floor(k / 4) * 11}" width="9" height="6" rx="1.5" fill="#cfd0ca"/>`,
    ) +
    pins(86, 102, 3, 12, '#c9ccd1', 4, 18),
  l298: () =>
    sh +
    `<rect x="38" y="30" width="124" height="88" rx="5" fill="#b3151b"/><rect x="40" y="32" width="120" height="84" rx="4" fill="#d02127"/><rect x="76" y="20" width="48" height="56" rx="2" fill="#1b1b1d"/>` +
    rep(7, i => `<rect x="${79 + i * 6.5}" y="22" width="3" height="50" fill="#333333"/>`) +
    `<rect x="42" y="40" width="22" height="30" rx="2" fill="#1f9a4f"/><rect x="136" y="40" width="22" height="30" rx="2" fill="#1f9a4f"/><rect x="74" y="96" width="52" height="16" rx="2" fill="#1f9a4f"/>` +
    [
      [53, 48],
      [53, 62],
      [147, 48],
      [147, 62],
      [84, 104],
      [100, 104],
      [116, 104],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#cfd3d7"/>`)
      .join('') +
    `<rect x="48" y="82" width="14" height="14" rx="7" fill="#20232a"/>` +
    pins(82, 84, 6, 7, '#d8b24a', 4, 5),
  tb: () =>
    sh +
    `<rect x="56" y="36" width="88" height="70" rx="4" fill="#7a1c8c"/><rect x="58" y="38" width="84" height="66" rx="3" fill="#9126a6"/>` +
    dots(64, 44, 8, 1, 10.6, '#e2c56b', 3) +
    dots(64, 98, 8, 1, 10.6, '#e2c56b', 3) +
    `<rect x="84" y="58" width="32" height="24" rx="2" fill="#151517"/><text x="100" y="73" text-anchor="middle" font-family="ui-monospace,monospace" font-size="6" fill="#aaaaaa">TB6612</text>`,
  a4988: () =>
    sh +
    `<rect x="64" y="36" width="72" height="72" rx="4" fill="#1a6b3b"/><rect x="66" y="38" width="68" height="68" rx="3" fill="#228b4a"/>` +
    dots(72, 44, 7, 1, 9.4, '#e2c56b', 2.6) +
    dots(72, 100, 7, 1, 9.4, '#e2c56b', 2.6) +
    `<rect x="80" y="54" width="40" height="36" rx="2" fill="#c3c8ce"/>` +
    rep(6, i => `<rect x="${83 + i * 6}" y="56" width="3" height="32" fill="#9aa0a7"/>`),
  aa: () =>
    sh +
    `<rect x="34" y="34" width="132" height="80" rx="6" fill="#1d1e21"/>` +
    rep(
      4,
      i =>
        `<rect x="42" y="${42 + i * 17}" width="116" height="13" rx="6.5" fill="${i % 2 ? '#2f6fde' : '#d64b2a'}"/><rect x="${i % 2 ? 136 : 42}" y="${42 + i * 17}" width="22" height="13" rx="6.5" fill="#c9ccd1"/>`,
    ) +
    wire('M166 52 C182 52 184 40 190 34', '#d6392f') +
    wire('M166 60 C186 62 190 50 194 44', '#222'),
  cell: () =>
    sh +
    `<rect x="26" y="46" width="148" height="52" rx="6" fill="#1d1e21"/><rect x="38" y="52" width="124" height="40" rx="20" fill="#14a39a"/><rect x="44" y="55" width="112" height="9" rx="4.5" fill="#3cc4ba" opacity=".7"/><rect x="152" y="58" width="12" height="28" rx="4" fill="#c9ccd1"/><text x="98" y="78" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" font-weight="700" fill="#e8fffd">18650</text>`,
  buck: () =>
    sh +
    `<rect x="40" y="38" width="120" height="66" rx="4" fill="#1c5aa6"/><rect x="42" y="40" width="116" height="62" rx="3" fill="#2368bd"/><circle cx="76" cy="71" r="19" fill="#3a3a3c"/><circle cx="76" cy="71" r="14" fill="#b87333"/><circle cx="76" cy="71" r="7" fill="#3a3a3c"/><rect x="104" y="50" width="16" height="16" rx="2" fill="#2f6fde" stroke="#aac4f5"/><circle cx="112" cy="58" r="3" fill="#d9e5fb"/><circle cx="138" cy="60" r="10" fill="#1d1d1f" stroke="#9aa0a6" stroke-width="2"/><rect x="104" y="78" width="24" height="16" rx="2" fill="#151517"/>` +
    [48, 152]
      .map(
        x =>
          `<circle cx="${x}" cy="46" r="3" fill="#e2c56b"/><circle cx="${x}" cy="96" r="3" fill="#e2c56b"/>`,
      )
      .join(''),
  res: () =>
    sh +
    [
      [28, '#e9d9b4', ['#7a4a22', '#222222', '#d6392f']],
      [58, '#cfe0f5', ['#f39a1e', '#f39a1e', '#7a4a22']],
      [88, '#e9d9b4', ['#2f6fde', '#8a5bd6', '#222222']],
    ]
      .map(
        ([y, b, bands]) =>
          `<path d="M24 ${y + 10}H176" stroke="#a8adb3" stroke-width="2.5"/><rect x="68" y="${y}" width="64" height="20" rx="9" fill="${b}"/>` +
          bands
            .map((c, i) => `<rect x="${80 + i * 11}" y="${y}" width="5" height="20" fill="${c}"/>`)
            .join('') +
          `<rect x="117" y="${y}" width="5" height="20" fill="#c9a227"/>`,
      )
      .join(''),
  cer: () =>
    sh +
    [
      [56, '#e98a2b', '104'],
      [100, '#d9792a', '103'],
      [144, '#e98a2b', '222'],
    ]
      .map(
        ([x, c, t], i) =>
          `<path d="M${x - 6} 70V${120 - i * 4}M${x + 6} 70V${116 - i * 4}" stroke="#a8adb3" stroke-width="2.5"/><ellipse cx="${x}" cy="56" rx="22" ry="20" fill="${c}"/><text x="${x}" y="60" text-anchor="middle" font-family="ui-monospace,monospace" font-size="10" font-weight="700" fill="#5a2b07">${t}</text>`,
      )
      .join(''),
  elec: () =>
    sh +
    [
      [60, 30, '#1c3f8f', 66],
      [104, 26, '#1b1b1d', 56],
      [146, 20, '#1c3f8f', 44],
    ]
      .map(([x, w, c, h]) => {
        const y = 96 - h;
        return `<path d="M${x - 5} 96V122M${x + 5} 96V117" stroke="#a8adb3" stroke-width="2.5"/><rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="5" fill="${c}"/><rect x="${x + w / 2 - 9}" y="${y}" width="6" height="${h}" fill="#c9ccd1" opacity=".75"/><ellipse cx="${x}" cy="${y + 2}" rx="${w / 2 - 2}" ry="3" fill="#c9ccd1"/>`;
      })
      .join(''),
  led: () =>
    sh +
    [
      ['#ff4747', 44],
      ['#2ecc71', 80],
      ['#3a8bff', 116],
      ['#ffd23f', 152],
    ]
      .map(
        ([c, x]) =>
          `<path d="M${x - 4} 86V122M${x + 4} 86V116" stroke="#a8adb3" stroke-width="2.5"/><rect x="${x - 13}" y="82" width="26" height="6" rx="2" fill="${c}"/><path d="M${x - 11} 84V58a11 11 0 0 1 22 0V84Z" fill="${c}" opacity=".9"/><path d="M${x - 5} 60a5 5 0 0 1 4-5" stroke="#ffffff" stroke-width="2.5" fill="none" opacity=".65" stroke-linecap="round"/>`,
      )
      .join(''),
  bb: () =>
    sh +
    `<rect x="22" y="28" width="156" height="92" rx="5" fill="#f4f4f1" stroke="#dcdcd5"/><path d="M30 36H170M30 112H170" stroke="#e05555" stroke-width="1.5"/><path d="M30 42H170M30 106H170" stroke="#4a7be0" stroke-width="1.5"/><rect x="22" y="72" width="156" height="4" fill="#e3e3dc"/>` +
    dots(32, 52, 20, 3, 7.2, '#9a9b95', 1.4) +
    dots(32, 82, 20, 3, 7.2, '#9a9b95', 1.4),
  jmp: () =>
    sh +
    ['#d6392f', '#f39a1e', '#f1c40f', '#2ecc71', '#2f6fde', '#8a5bd6', '#222222']
      .map((c, i) => {
        const y = 32 + i * 11;
        return (
          wire(`M40 ${y} C80 ${y - 20} 120 ${y + 30} 160 ${y + 6}`, c) +
          `<rect x="26" y="${y - 4}" width="16" height="8" rx="2" fill="#1a1a1c"/><rect x="158" y="${y + 2}" width="16" height="8" rx="2" fill="#1a1a1c"/>`
        );
      })
      .join(''),
  wheel: () =>
    sh +
    [68, 132]
      .map(
        x =>
          `<circle cx="${x}" cy="72" r="44" fill="#1d1e21"/>` +
          rep(
            20,
            k =>
              `<rect x="${x - 3}" y="26" width="6" height="7" rx="1" fill="#3a3b3f" transform="rotate(${k * 18} ${x} 72)"/>`,
          ) +
          `<circle cx="${x}" cy="72" r="28" fill="#f2c230"/><circle cx="${x}" cy="72" r="24" fill="#f7d35a"/>` +
          [0, 60, 120]
            .map(
              r =>
                `<rect x="${x - 2.5}" y="50" width="5" height="44" rx="2" fill="#e0a800" transform="rotate(${r} ${x} 72)"/>`,
            )
            .join('') +
          `<circle cx="${x}" cy="72" r="7" fill="#e0a800"/><rect x="${x - 3}" y="69" width="6" height="6" fill="#fbfaf4"/>`,
      )
      .join(''),
  perf: () =>
    sh +
    `<rect x="36" y="22" width="128" height="100" rx="4" fill="#c99a5b"/><rect x="38" y="24" width="124" height="96" rx="3" fill="#d9ad6e"/>` +
    dots(46, 32, 14, 11, 8.4, '#a87a3b', 2.6) +
    dots(46, 32, 14, 11, 8.4, '#3b2a14', 1.1),
  dmm: () =>
    sh +
    wire('M86 104 C60 112 38 100 26 72', '#d6392f') +
    wire('M114 104 C140 116 164 100 176 70', '#222') +
    `<rect x="64" y="10" width="72" height="112" rx="12" fill="#f2b705"/><rect x="70" y="16" width="60" height="100" rx="8" fill="#2b2d31"/><rect x="76" y="22" width="48" height="24" rx="3" fill="#b9c7a6"/><text x="100" y="40" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="#2b3324">12.47</text><circle cx="100" cy="74" r="15" fill="#43464c"/><circle cx="100" cy="74" r="11" fill="#5a5e65"/><rect x="98" y="60" width="4" height="12" rx="2" fill="#e8eaec"/>` +
    [
      [86, '#d6392f'],
      [100, '#111111'],
      [114, '#111111'],
    ]
      .map(([x, c]) => `<circle cx="${x}" cy="104" r="4.5" fill="${c}" stroke="#777777"/>`)
      .join(''),
  iron: () =>
    sh +
    `<rect x="24" y="62" width="88" height="56" rx="6" fill="#2a2c31"/><rect x="32" y="70" width="44" height="22" rx="2" fill="#120c0c"/><text x="54" y="86" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="#ff5a3c">350°</text><circle cx="94" cy="81" r="10" fill="#4a4d54"/><circle cx="94" cy="81" r="3" fill="#d6392f"/><rect x="32" y="100" width="26" height="8" rx="2" fill="#4a4d54"/>` +
    wire('M112 100 C130 100 132 80 142 72', '#222') +
    `<rect x="126" y="108" width="40" height="8" rx="3" fill="#3a3d43"/>` +
    rep(
      6,
      i =>
        `<ellipse cx="${140 + i * 3}" cy="${102 - i * 8}" rx="9" ry="3.5" fill="none" stroke="#c9ccd1" stroke-width="2"/>`,
    ) +
    `<rect x="139" y="18" width="12" height="64" rx="6" fill="#cc2b2b" transform="rotate(24 145 50)"/><path d="M157 20 L166 4" stroke="#c9ccd1" stroke-width="3" stroke-linecap="round"/>`,
  psu: () =>
    sh +
    `<rect x="24" y="32" width="152" height="86" rx="6" fill="#d9dce0"/><rect x="30" y="38" width="140" height="74" rx="4" fill="#2a2c31"/><rect x="38" y="46" width="56" height="24" rx="2" fill="#140c0c"/><text x="66" y="63" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="#ff4a3a">12.00</text><rect x="104" y="46" width="56" height="24" rx="2" fill="#0c140e"/><text x="132" y="63" text-anchor="middle" font-family="ui-monospace,monospace" font-size="13" font-weight="700" fill="#4ade80">0.500</text><circle cx="56" cy="91" r="10" fill="#5a5e65"/><circle cx="84" cy="91" r="10" fill="#5a5e65"/><circle cx="114" cy="92" r="5.5" fill="#d6392f"/><circle cx="133" cy="92" r="5.5" fill="#111111" stroke="#777777"/><circle cx="152" cy="92" r="5.5" fill="#1f9a4f"/>`,
  logic: () =>
    sh +
    ['#222222', '#7a4a22', '#d6392f', '#f39a1e', '#f1c40f', '#2ecc71', '#2f6fde', '#8a5bd6']
      .map((c, i) =>
        wire(`M124 ${54 + i * 4.5} C146 ${54 + i * 4.5} 152 ${30 + i * 11} 178 ${26 + i * 12}`, c),
      )
      .join('') +
    `<rect x="58" y="42" width="68" height="54" rx="9" fill="#b8bec6"/><rect x="64" y="48" width="56" height="42" rx="6" fill="#cfd4da"/><text x="92" y="73" text-anchor="middle" font-family="ui-monospace,monospace" font-size="8" font-weight="700" fill="#555555">LOGIC 8</text><rect x="38" y="62" width="22" height="14" rx="2" fill="#9aa0a6"/>`,
};
const artCache = {};
const placeholderArt = it =>
  `<svg viewBox="0 0 200 140" aria-hidden="true"><ellipse cx="100" cy="124" rx="56" ry="6" fill="#000000" opacity=".08"/><rect x="60" y="28" width="80" height="82" rx="14" fill="#d1d1d6"/><rect x="60" y="28" width="80" height="24" rx="14" fill="#c7c7cc"/><rect x="60" y="42" width="80" height="10" fill="#c7c7cc"/><rect x="84" y="62" width="32" height="5" rx="2.5" fill="#aeaeb2"/><text x="100" y="94" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="12" font-weight="700" fill="#6e6e73">${esc(
    String(it.sku || '')
      .split('-')[0]
      .slice(0, 5),
  )}</text></svg>`;
const drawArt = it =>
  it.art && A[it.art[0]]
    ? `<svg viewBox="0 0 200 140" aria-hidden="true">${A[it.art[0]](...it.art.slice(1))}</svg>`
    : placeholderArt(it);
const art = it =>
  it.photo
    ? `<img class="ph" src="${it.photo}" alt="">`
    : artCache[it.sku] || (artCache[it.sku] = drawArt(it));
const certArt = () =>
  `<svg viewBox="0 0 120 86" aria-hidden="true"><rect x="2" y="2" width="116" height="82" rx="4" style="fill:var(--surface);stroke:var(--line-strong)"/><rect x="8" y="8" width="104" height="70" rx="2" fill="none" style="stroke:var(--warn)" stroke-dasharray="3 2"/><rect x="34" y="17" width="52" height="6" rx="3" style="fill:var(--ink)" opacity=".75"/><rect x="24" y="30" width="72" height="4" rx="2" style="fill:var(--muted)" opacity=".5"/><rect x="30" y="38" width="60" height="4" rx="2" style="fill:var(--muted)" opacity=".5"/><rect x="20" y="58" width="30" height="2" style="fill:var(--muted)"/><circle cx="88" cy="60" r="9" style="fill:var(--accent)" opacity=".85"/><path d="M84 68l-2 8 6-3 6 3-2-8" style="fill:var(--accent)" opacity=".7"/></svg>`;
