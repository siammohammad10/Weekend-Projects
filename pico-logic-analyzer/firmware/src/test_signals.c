#include "test_signals.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#include "hardware/gpio.h"
#include "hardware/i2c.h"
#include "hardware/pwm.h"
#include "hardware/spi.h"
#include "hardware/uart.h"
#include "pico/stdlib.h"

#define PWM_PIN 16
#define UART_TX_PIN 20
#define I2C_SDA_PIN 14
#define I2C_SCL_PIN 15
#define SPI_SCK_PIN 18
#define SPI_MOSI_PIN 19
#define SPI_CS_PIN 17

#define OLED_ADDR 0x3C
#define I2C_TIMEOUT_US 20000

static repeating_timer_t burst_timer;
static absolute_time_t next_oled;
static bool oled_ready;
static uint32_t counter;

// ---------------------------------------------------------------- UART and SPI bursts

// Every 50 ms: "hello\n" on the UART and "PICO" on SPI. Both fit in the hardware FIFOs, so the
// callback never waits long.
static bool burst(repeating_timer_t *t) {
    (void)t;
    uart_puts(uart1, "hello\n");
    static const uint8_t word[] = {'P', 'I', 'C', 'O'};
    gpio_put(SPI_CS_PIN, 0);
    spi_write_blocking(spi0, word, sizeof word);
    gpio_put(SPI_CS_PIN, 1);
    return true;
}

// ---------------------------------------------------------------- SSD1306 OLED

// 5x7 glyphs, one byte per column, bit 0 at the top. Only the characters drawn here.
static const char glyph_chars[] = "0123456789ACEGILNOPRYZ ";
static const uint8_t glyphs[][5] = {
    {0x3E, 0x51, 0x49, 0x45, 0x3E}, {0x00, 0x42, 0x7F, 0x40, 0x00}, {0x42, 0x61, 0x51, 0x49, 0x46},
    {0x21, 0x41, 0x45, 0x4B, 0x31}, {0x18, 0x14, 0x12, 0x7F, 0x10}, {0x27, 0x45, 0x45, 0x45, 0x39},
    {0x3C, 0x4A, 0x49, 0x49, 0x30}, {0x01, 0x71, 0x09, 0x05, 0x03}, {0x36, 0x49, 0x49, 0x49, 0x36},
    {0x06, 0x49, 0x49, 0x29, 0x1E}, {0x7E, 0x11, 0x11, 0x11, 0x7E}, {0x3E, 0x41, 0x41, 0x41, 0x22},
    {0x7F, 0x49, 0x49, 0x49, 0x41}, {0x3E, 0x41, 0x49, 0x49, 0x7A}, {0x00, 0x41, 0x7F, 0x41, 0x00},
    {0x7F, 0x40, 0x40, 0x40, 0x40}, {0x7F, 0x04, 0x08, 0x10, 0x7F}, {0x3E, 0x41, 0x41, 0x41, 0x3E},
    {0x7F, 0x09, 0x09, 0x09, 0x06}, {0x7F, 0x09, 0x19, 0x29, 0x46}, {0x07, 0x08, 0x70, 0x08, 0x07},
    {0x61, 0x51, 0x49, 0x45, 0x43}, {0x00, 0x00, 0x00, 0x00, 0x00},
};

static const uint8_t *glyph(char c) {
    const char *p = strchr(glyph_chars, c);
    return glyphs[p ? (size_t)(p - glyph_chars) : sizeof glyph_chars - 2];
}

static bool oled_write(const uint8_t *bytes, size_t len) {
    return i2c_write_timeout_us(i2c1, OLED_ADDR, bytes, len, false, I2C_TIMEOUT_US) == (int)len;
}

static bool oled_commands(const uint8_t *cmds, size_t len) {
    uint8_t buf[32];
    buf[0] = 0x00;  // control byte: commands follow
    memcpy(buf + 1, cmds, len);
    return oled_write(buf, len + 1);
}

// Sets the drawing window to columns c0..c1 of pages p0..p1.
static bool oled_window(uint8_t c0, uint8_t c1, uint8_t p0, uint8_t p1) {
    const uint8_t cmds[] = {0x21, c0, c1, 0x22, p0, p1};
    return oled_commands(cmds, sizeof cmds);
}

static bool oled_data(const uint8_t *data, size_t len) {
    uint8_t buf[129];
    buf[0] = 0x40;  // control byte: display data follows
    while (len) {
        size_t n = len > 128 ? 128 : len;
        memcpy(buf + 1, data, n);
        if (!oled_write(buf, n + 1)) return false;
        data += n;
        len -= n;
    }
    return true;
}

static bool oled_text(uint8_t col, uint8_t page, const char *s) {
    uint8_t row[128];
    size_t n = 0;
    for (; *s && n + 6 <= sizeof row; s++) {
        memcpy(row + n, glyph(*s), 5);
        row[n + 5] = 0;
        n += 6;
    }
    return oled_window(col, (uint8_t)(col + n - 1), page, page) && oled_data(row, n);
}

// Doubles a 7-pixel column into 14 pixels across two pages.
static uint16_t stretch(uint8_t b) {
    uint16_t out = 0;
    for (int i = 0; i < 8; i++)
        if (b & (1 << i)) out |= 3u << (2 * i);
    return out;
}

// Draws digits at twice the normal size, starting at the given column on pages 3 and 4.
static bool oled_big_number(uint8_t col, const char *digits) {
    uint8_t top[128], bottom[128];
    size_t n = 0;
    for (const char *s = digits; *s && n + 12 <= sizeof top; s++) {
        const uint8_t *g = glyph(*s);
        for (int x = 0; x < 6; x++) {
            uint16_t v = x < 5 ? stretch(g[x]) : 0;
            top[n] = top[n + 1] = (uint8_t)v;
            bottom[n] = bottom[n + 1] = (uint8_t)(v >> 8);
            n += 2;
        }
    }
    return oled_window(col, (uint8_t)(col + n - 1), 3, 4) && oled_data(top, n) && oled_data(bottom, n);
}

static bool oled_init(void) {
    static const uint8_t init[] = {
        0xAE,        // display off
        0xD5, 0x80,  // clock divide
        0xA8, 0x3F,  // multiplex: 64 rows
        0xD3, 0x00,  // no display offset
        0x40,        // start line 0
        0x8D, 0x14,  // charge pump on
        0x20, 0x00,  // horizontal addressing
        0xA1, 0xC8,  // flip so (0,0) is top left
        0xDA, 0x12,  // COM pins
        0x81, 0x8F,  // contrast
        0xD9, 0xF1,  // precharge
        0xDB, 0x40,  // VCOM detect
        0xA4, 0xA6,  // show RAM, not inverted
        0xAF,        // display on
    };
    if (!oled_commands(init, sizeof init)) return false;
    static const uint8_t blank[128] = {0};
    if (!oled_window(0, 127, 0, 7)) return false;
    for (int p = 0; p < 8; p++)
        if (!oled_data(blank, sizeof blank)) return false;
    return oled_text(7, 0, "PICO LOGIC ANALYZER");
}

// ---------------------------------------------------------------- setup

void test_signals_init(void) {
    // PWM: 100 MHz / 100 / 1000 = 1 kHz, 50% duty.
    gpio_set_function(PWM_PIN, GPIO_FUNC_PWM);
    uint slice = pwm_gpio_to_slice_num(PWM_PIN);
    pwm_config pc = pwm_get_default_config();
    pwm_config_set_clkdiv_int(&pc, 100);
    pwm_config_set_wrap(&pc, 999);
    pwm_init(slice, &pc, false);
    pwm_set_gpio_level(PWM_PIN, 500);
    pwm_set_enabled(slice, true);

    uart_init(uart1, 115200);
    gpio_set_function(UART_TX_PIN, GPIO_FUNC_UART);

    spi_init(spi0, 500 * 1000);
    spi_set_format(spi0, 8, SPI_CPOL_0, SPI_CPHA_0, SPI_MSB_FIRST);
    gpio_set_function(SPI_SCK_PIN, GPIO_FUNC_SPI);
    gpio_set_function(SPI_MOSI_PIN, GPIO_FUNC_SPI);
    gpio_init(SPI_CS_PIN);
    gpio_set_dir(SPI_CS_PIN, GPIO_OUT);
    gpio_put(SPI_CS_PIN, 1);

    i2c_init(i2c1, 100 * 1000);
    gpio_set_function(I2C_SDA_PIN, GPIO_FUNC_I2C);
    gpio_set_function(I2C_SCL_PIN, GPIO_FUNC_I2C);
    gpio_pull_up(I2C_SDA_PIN);
    gpio_pull_up(I2C_SCL_PIN);

    add_repeating_timer_ms(50, burst, NULL, &burst_timer);
    next_oled = make_timeout_time_ms(250);
}

void test_signals_poll(void) {
    if (!time_reached(next_oled)) return;
    next_oled = make_timeout_time_ms(250);

    // Without an OLED the address is NACKed, which is still a useful thing to see on the bus.
    if (!oled_ready) {
        oled_ready = oled_init();
        if (!oled_ready) return;
    }
    char digits[8];
    uint32_t v = counter++ % 100000;
    for (int i = 4; i >= 0; i--, v /= 10) digits[i] = (char)('0' + v % 10);
    digits[5] = 0;
    if (!oled_big_number(34, digits)) oled_ready = false;
}
