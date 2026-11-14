# Agent Instructions

## Project overview

This is an Arduino firmware project managed by PlatformIO for an ESP32 development board. The main sketch is `src/aguayo_MACRO_4_macbook.ino`. It uses FastLED to drive eight NEOPIXEL strips, each with 300 LEDs, using bytebeat formulas and color lookup tables.

## Layout and dependencies

- `platformio.ini` defines the `esp32dev` environment with the `espressif32` platform and Arduino framework.
- Libraries currently resolve from `~/Documents/Arduino/libraries` through `lib_extra_dirs`; FastLED is not declared in `lib_deps`.
- Sketch comments record ESP32 Arduino 2.0.14 and FastLED 3.9.14 as a working combination; the configuration does not pin those versions.
- `include/`, `lib/`, and `test/` contain PlatformIO placeholder documentation. There are no project tests yet.
- `.pio/` contains generated build artifacts. Do not edit it.

## Hardware and behavior

- Active strip GPIOs, in array order: 32, 33, 25, 26, 27, 14, 12, 13.
- The ESP32-C3 pin mapping in the sketch is commented out and is not the configured board.
- Serial output uses 115200 baud. Startup sets brightness to 127, loads the GPT palette, seeds randomness from A0, and shuffles the lookup table.
- The loop derives eight strip colors from a bytebeat value, shifts colors through the LED buffers, calls `FastLED.show()`, and delays 33 ms.
- Preserve pin assignments, strip lengths, brightness, palettes, and animation behavior unless the task requires changing them. Hardware changes should be explicit.

## Working conventions

Keep changes focused and follow the surrounding Arduino/C++ style. Do not rename the sketch, migrate frameworks, or update dependencies as incidental cleanup. Preserve intentional bytebeat bitwise arithmetic and 8-bit truncation when refactoring.

Known issues visible in the current source, to consider when relevant:

- `pushValueToFifo()` reads and writes index `NUM_LEDS_PER_STRIP`, outside the valid range `0..NUM_LEDS_PER_STRIP - 1`.
- Formula timing checks `lastChange` although `lastChangeFormula` is maintained separately.
- Some palette counts exclude the final initialized entry, and shuffling operates on all 64 lookup entries rather than only the active palette.

These observations do not authorize unrelated behavior changes.

## Validation

Run `pio run -e esp32dev` from this project directory for firmware changes when the local toolchain and libraries are available. Report dependency or toolchain failures accurately; do not claim a successful build without running it. A build may require downloads when dependencies are missing.

There are no automated tests currently. Verify buffer bounds and timing logic during review. Visual output, wiring, and timing on physical LEDs require hardware validation.

Upload only when requested: `pio run -e esp32dev -t upload`. For a requested serial session, use `pio device monitor -b 115200`. Do not flash a connected device as part of routine build validation.
