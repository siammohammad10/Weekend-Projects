// Sampling with one PIO state machine and one DMA channel.
//
// The PIO program is built at run time so the trigger can be changed per capture:
//
//     wait !edge pin T     ; only with a trigger: first wait for the opposite level...
//     wait  edge pin T     ; ...then for the edge itself
//   .wrap_target
//     in pins, 8           ; one sample of all 8 channels per state machine clock
//   .wrap
//
// Autopush packs four samples into each 32-bit word, and the DMA moves the words from the RX FIFO
// into RAM without the CPU. The ISR shifts right, so the first sample of each word ends up in its
// lowest byte and the buffer reads in time order.

#include "capture.h"

#include "hardware/dma.h"
#include "hardware/gpio.h"
#include "hardware/pio.h"

static uint8_t buffer[CAPTURE_MAX_SAMPLES] __attribute__((aligned(4)));

static const PIO pio = pio0;
static uint sm;
static int dma_chan;

static uint16_t program_code[3];
static pio_program_t program;
static uint program_offset;
static bool program_loaded;
static bool armed;

void capture_init(void) {
    for (uint pin = CAPTURE_PIN_BASE; pin < CAPTURE_PIN_BASE + CAPTURE_CHANNELS; pin++) {
        gpio_init(pin);
        gpio_set_dir(pin, GPIO_IN);
        // A weak pull-down keeps unconnected channels at a steady 0 instead of picking up noise.
        gpio_pull_down(pin);
    }
    sm = pio_claim_unused_sm(pio, true);
    dma_chan = dma_claim_unused_channel(true);
}

void capture_stop(void) {
    pio_sm_set_enabled(pio, sm, false);
    dma_channel_abort(dma_chan);
    if (program_loaded) {
        pio_remove_program(pio, &program, program_offset);
        program_loaded = false;
    }
    armed = false;
}

bool capture_start(uint32_t divider, uint32_t samples, int trigger_channel, bool rising) {
    if (divider < 1 || divider > 65535) return false;
    if (samples < 4 || samples > CAPTURE_MAX_SAMPLES || samples % 4) return false;
    if (trigger_channel != TRIGGER_NONE && (trigger_channel < 0 || trigger_channel >= CAPTURE_CHANNELS))
        return false;

    capture_stop();

    uint len = 0;
    if (trigger_channel != TRIGGER_NONE) {
        program_code[len++] = pio_encode_wait_pin(!rising, (uint)trigger_channel);
        program_code[len++] = pio_encode_wait_pin(rising, (uint)trigger_channel);
    }
    uint wrap = len;
    program_code[len++] = pio_encode_in(pio_pins, CAPTURE_CHANNELS);

    program = (pio_program_t){.instructions = program_code, .length = (uint8_t)len, .origin = -1};
    program_offset = pio_add_program(pio, &program);
    program_loaded = true;

    pio_sm_config c = pio_get_default_sm_config();
    sm_config_set_in_pins(&c, CAPTURE_PIN_BASE);
    sm_config_set_wrap(&c, program_offset + wrap, program_offset + wrap);
    sm_config_set_in_shift(&c, true, true, 32);
    sm_config_set_fifo_join(&c, PIO_FIFO_JOIN_RX);
    sm_config_set_clkdiv_int_frac(&c, (uint16_t)divider, 0);

    pio_sm_init(pio, sm, program_offset, &c);
    pio_sm_clear_fifos(pio, sm);

    dma_channel_config dc = dma_channel_get_default_config(dma_chan);
    channel_config_set_transfer_data_size(&dc, DMA_SIZE_32);
    channel_config_set_read_increment(&dc, false);
    channel_config_set_write_increment(&dc, true);
    channel_config_set_dreq(&dc, pio_get_dreq(pio, sm, false));
    dma_channel_configure(dma_chan, &dc, buffer, &pio->rxf[sm], samples / 4, true);

    armed = true;
    pio_sm_set_enabled(pio, sm, true);
    return true;
}

bool capture_armed(void) { return armed; }

bool capture_done(void) { return armed && !dma_channel_is_busy(dma_chan); }

const uint8_t *capture_buffer(void) { return buffer; }
