// The boards the firmware is built for. Each one has its own .uf2 file in firmware/dist.

(function () {
  const PLA = globalThis.PLA;

  PLA.FIRMWARE_DIR = '../firmware/dist/';

  PLA.BOARDS = [
    {
      id: 'pico',
      name: 'Raspberry Pi Pico / Pico H',
      chip: 'RP2040',
      samples: 200000,
      drive: 'RPI-RP2',
      look: 'No silver metal can on the board. The Pico H is the same board with headers already soldered on.',
      led: 'The green LED stays on while it waits for a trigger.',
    },
    {
      id: 'pico_w',
      name: 'Raspberry Pi Pico W / Pico WH',
      chip: 'RP2040 + Wi-Fi',
      samples: 200000,
      drive: 'RPI-RP2',
      look: 'Has a silver metal can and an antenna at the end opposite the USB port. The WH comes with headers.',
      led: 'The LED stays off: on the W boards it is wired to the wireless chip.',
    },
    {
      id: 'pico2',
      name: 'Raspberry Pi Pico 2',
      chip: 'RP2350',
      samples: 400000,
      drive: 'RP2350',
      look: 'The main chip is marked RP2350, and there is no metal can. Twice the RAM, so twice the capture length.',
      led: 'The green LED stays on while it waits for a trigger.',
    },
    {
      id: 'pico2_w',
      name: 'Raspberry Pi Pico 2 W',
      chip: 'RP2350 + Wi-Fi',
      samples: 400000,
      drive: 'RP2350',
      look: 'The main chip is marked RP2350, and it has the silver metal can and antenna of the W boards.',
      led: 'The LED stays off: on the W boards it is wired to the wireless chip.',
    },
  ];

  PLA.board = id => PLA.BOARDS.find(b => b.id === id) || PLA.BOARDS[0];
  PLA.firmwareFile = b => `pico-logic-analyzer-${b.id}.uf2`;
  PLA.boardShortName = id =>
    ({ pico: 'Pico', pico_w: 'Pico W', pico2: 'Pico 2', pico2_w: 'Pico 2 W' })[id] || 'Pico';
})();
