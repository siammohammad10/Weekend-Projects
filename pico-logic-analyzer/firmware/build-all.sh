#!/bin/sh
# Builds the firmware for every board and copies the .uf2 files into dist/.
# Needs PICO_SDK_PATH and the Arm GCC toolchain.
set -e
cd "$(dirname "$0")"
mkdir -p dist
for board in pico pico_w pico2 pico2_w; do
    cmake -S . -B "build-$board" -G Ninja -DPICO_BOARD="$board" > /dev/null
    cmake --build "build-$board"
    cp "build-$board/logic_analyzer.uf2" "dist/pico-logic-analyzer-$board.uf2"
done
ls -l dist
