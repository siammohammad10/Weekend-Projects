// Pico Logic Analyzer firmware.
//
// The host talks to the Pico over USB serial with one text command per line:
//
//   ID                         -> "PLA 1 <max samples> <clock hz>"
//   CAP <rate> <samples> <trig> -> "ARMED <rate>", later "DATA <rate> <samples>" + raw bytes
//   ABORT                      -> "ABORTED"
//
// <trig> is N for no trigger, or a channel and an edge: 3R is a rising edge on channel 3, 0F a
// falling edge on channel 0. The sample rate is rounded to the nearest whole divider of the
// 100 MHz system clock, and the reply carries the rate actually used. Errors reply "ERR <reason>".
//
// After DATA the Pico sends exactly <samples> bytes. Bit n of each byte is channel n (GPn).

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "capture.h"
#include "hardware/clocks.h"
#include "pico/stdio_usb.h"
#include "pico/stdlib.h"
#include "test_signals.h"

#define SYS_CLOCK_HZ 100000000u
#define PROTOCOL_VERSION 1

static char line[64];
static size_t line_len;
static uint32_t armed_rate;
static uint32_t armed_samples;

static void led(bool on) {
#ifdef PICO_DEFAULT_LED_PIN
    gpio_put(PICO_DEFAULT_LED_PIN, on);
#else
    (void)on;
#endif
}

static void reply(const char *text) {
    fputs(text, stdout);
    fputc('\n', stdout);
    fflush(stdout);
}

static void send_capture(void) {
    printf("DATA %lu %lu\n", (unsigned long)armed_rate, (unsigned long)armed_samples);
    fwrite(capture_buffer(), 1, armed_samples, stdout);
    fflush(stdout);
}

static void command_cap(char *args) {
    char *trig = NULL;
    unsigned long rate = strtoul(args, &args, 10);
    unsigned long samples = strtoul(args, &args, 10);
    trig = strtok(args, " \t");
    if (!rate || !samples || !trig) {
        reply("ERR usage: CAP <rate> <samples> <N|0R..7F>");
        return;
    }
    if (rate > SYS_CLOCK_HZ) {
        reply("ERR rate too high");
        return;
    }
    uint32_t divider = (SYS_CLOCK_HZ + rate / 2) / rate;
    if (divider < 1) divider = 1;
    if (divider > 65535) {
        reply("ERR rate too low");
        return;
    }

    int channel = TRIGGER_NONE;
    bool rising = true;
    if (trig[0] != 'N') {
        if (trig[0] < '0' || trig[0] > '7' || (trig[1] != 'R' && trig[1] != 'F')) {
            reply("ERR bad trigger");
            return;
        }
        channel = trig[0] - '0';
        rising = trig[1] == 'R';
    }
    if (samples < 4 || samples > CAPTURE_MAX_SAMPLES || samples % 4) {
        reply("ERR samples must be a multiple of 4, at most the buffer size");
        return;
    }

    if (!capture_start(divider, samples, channel, rising)) {
        reply("ERR could not start");
        return;
    }
    armed_rate = SYS_CLOCK_HZ / divider;
    armed_samples = samples;
    led(true);
    printf("ARMED %lu\n", (unsigned long)armed_rate);
    fflush(stdout);
}

static void handle(char *cmd) {
    while (*cmd == ' ') cmd++;
    if (!*cmd) return;
    if (!strcmp(cmd, "ID")) {
        printf("PLA %d %u %u\n", PROTOCOL_VERSION, CAPTURE_MAX_SAMPLES, SYS_CLOCK_HZ);
        fflush(stdout);
    } else if (!strncmp(cmd, "CAP ", 4)) {
        command_cap(cmd + 4);
    } else if (!strcmp(cmd, "ABORT")) {
        capture_stop();
        led(false);
        reply("ABORTED");
    } else {
        reply("ERR unknown command");
    }
}

static void read_commands(void) {
    int c;
    while ((c = getchar_timeout_us(0)) != PICO_ERROR_TIMEOUT) {
        if (c == '\n' || c == '\r') {
            line[line_len] = 0;
            handle(line);
            line_len = 0;
        } else if (line_len < sizeof line - 1) {
            line[line_len++] = (char)c;
        }
    }
}

int main(void) {
    // 100 MHz divides evenly into every sample rate the web app offers.
    set_sys_clock_khz(SYS_CLOCK_HZ / 1000, true);

    stdio_usb_init();
    // Captures are binary, so newlines must go out untouched.
    stdio_set_translate_crlf(&stdio_usb, false);

#ifdef PICO_DEFAULT_LED_PIN
    gpio_init(PICO_DEFAULT_LED_PIN);
    gpio_set_dir(PICO_DEFAULT_LED_PIN, GPIO_OUT);
#endif

    capture_init();
    test_signals_init();

    while (true) {
        read_commands();
        if (capture_done()) {
            send_capture();
            capture_stop();
            led(false);
        }
        test_signals_poll();
    }
}
