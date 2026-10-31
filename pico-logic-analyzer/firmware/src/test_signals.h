#pragma once

// Signals the Pico makes on its own spare pins, so every feature can be tested with jumper wires
// and nothing else. See the wiring table in the README.
//
//   GP16  PWM, 1 kHz square wave             -> jumper to GP0
//   GP20  UART1 TX, 115200 8N1, "hello\n"     -> jumper to GP1
//   GP14  I2C1 SDA, 100 kHz, SSD1306 OLED     -> jumper to GP2
//   GP15  I2C1 SCL                            -> jumper to GP3
//   GP18  SPI0 SCK, 500 kHz, mode 0, "PICO"   -> jumper to GP4
//   GP19  SPI0 MOSI                           -> jumper to GP5
//   GP17  SPI chip select (active low)        -> jumper to GP6

void test_signals_init(void);

// Call from the main loop. Redraws the OLED counter every 250 ms.
void test_signals_poll(void);
