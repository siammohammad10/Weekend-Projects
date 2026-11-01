First release, tested on a Raspberry Pi Pico H.

Download the file for your board below, hold BOOTSEL while plugging the Pico in, and drag the file onto the drive that appears. Then open the [web app](https://siammohammad10.github.io/Weekend-Projects/pico-logic-analyzer/web/) in Chrome or Edge and click **Connect Pico**.

| Board | File |
| --- | --- |
| Pico, Pico H | `pico-logic-analyzer-pico.uf2` |
| Pico W, Pico WH | `pico-logic-analyzer-pico_w.uf2` |
| Pico 2 | `pico-logic-analyzer-pico2.uf2` |
| Pico 2 W | `pico-logic-analyzer-pico2_w.uf2` |

- 8 channels on GP0 to GP7, up to 100 MS/s
- 200,000 samples on the RP2040 boards, 400,000 on the RP2350 boards
- Rising or falling edge trigger on any channel
- UART, I2C and SPI decoding in the browser
- VCD and CSV export

Setup steps, wiring and troubleshooting are in the [README](https://github.com/siammohammad10/Weekend-Projects/tree/main/pico-logic-analyzer#readme).
