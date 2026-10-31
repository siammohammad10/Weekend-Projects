cmake_minimum_required(VERSION 3.13)

# Set PICO_SDK_PATH, or pass -DPICO_SDK_PATH=..., before configuring.
# Pick the board with -DPICO_BOARD=pico, pico_w, pico2 or pico2_w (pico is the default).
if(NOT PICO_BOARD)
    set(PICO_BOARD pico)
endif()
include(pico_sdk_import.cmake)

project(pico_logic_analyzer C CXX ASM)
set(CMAKE_C_STANDARD 11)

pico_sdk_init()

add_executable(logic_analyzer
    src/main.c
    src/capture.c
    src/test_signals.c
)

target_link_libraries(logic_analyzer
    pico_stdlib
    hardware_pio
    hardware_dma
    hardware_pwm
    hardware_spi
    hardware_i2c
    hardware_uart
    hardware_clocks
)

target_compile_options(logic_analyzer PRIVATE -Wall -Wextra)
# The web app shows which board it's talking to.
target_compile_definitions(logic_analyzer PRIVATE PLA_BOARD="${PICO_BOARD}")

pico_enable_stdio_usb(logic_analyzer 1)
pico_enable_stdio_uart(logic_analyzer 0)

pico_add_extra_outputs(logic_analyzer)
