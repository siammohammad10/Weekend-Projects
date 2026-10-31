#pragma once

#include <stdbool.h>
#include <stdint.h>

// Capture inputs are GP0 to GP7. Channel n is GPn.
#define CAPTURE_PIN_BASE 0
#define CAPTURE_CHANNELS 8

// One byte per sample, one bit per channel. The RP2350 on a Pico 2 has twice the RAM.
#if PICO_RP2350
#define CAPTURE_MAX_SAMPLES 400000u
#else
#define CAPTURE_MAX_SAMPLES 200000u
#endif

#define TRIGGER_NONE -1

void capture_init(void);

// Arms a capture. divider = system clock / sample rate. trigger_channel is 0 to 7, or TRIGGER_NONE
// to start right away. Sampling starts on the chosen edge and runs until the buffer holds
// `samples` bytes. Returns false if the arguments are out of range.
bool capture_start(uint32_t divider, uint32_t samples, int trigger_channel, bool rising);

// True once an armed capture has filled its buffer.
bool capture_done(void);

bool capture_armed(void);

// Stops the state machine and the DMA and frees the PIO program.
void capture_stop(void);

const uint8_t *capture_buffer(void);
