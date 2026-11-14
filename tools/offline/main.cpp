#include "FastLED.h"
#include <cstdio>
#include <string>
uint32_t virtual_ms = 0;
uint32_t host_seed = 0;
uint64_t rng_state = 1;
void pushValueToFifo(CRGB value[]);
#include "sketch.inc"
int main(int argc, char** argv) {
    if (argc != 7) return 2;
    host_seed = static_cast<uint32_t>(std::stoul(argv[1]));
    setup();
    if (std::string(argv[2]) != "random") t = static_cast<uint32_t>(std::stoul(argv[2]));
    uint32_t initial_t = t;
    uint64_t start = std::stoull(argv[3]);
    uint32_t interval = static_cast<uint32_t>(std::stoul(argv[4]));
    bool scale = std::stoi(argv[5]) != 0;
    uint64_t count = std::stoull(argv[6]);
    static_assert(NUM_STRIPS == 8 && NUM_LEDS_PER_STRIP >= 64, "Unexpected geometry");
    std::printf("LED_FRAMES 1\nWIDTH 16\nHEIGHT 64\nFRAMES %llu\n",
                static_cast<unsigned long long>(count));
    std::printf("FRAME_MS %u\nINITIAL_T %u\nFORMAT %s\n", interval, initial_t,
                scale ? "RGB_HEX_STATIC_BRIGHTNESS" : "RGB_HEX_UNSCALED");
    std::printf("SEED %u\nSTART_FRAME %llu\nFIFO BOUNDED\n", host_seed,
                static_cast<unsigned long long>(start));
    for (uint64_t frame = 0; frame < start + count; ++frame) {
        virtual_ms = static_cast<uint32_t>(frame * interval);
        loop();
        if (frame < start) continue;
        std::printf("FRAME %llu\n", static_cast<unsigned long long>(frame - start));
        // Crop the last 64 pixels from the actual 300-pixel strip buffers.
        for (int row = NUM_LEDS_PER_STRIP - 64; row < NUM_LEDS_PER_STRIP; ++row) {
            for (int col = 0; col < 16; ++col) {
                CRGB pixel = leds[col < 8 ? col : 15 - col][row];
                unsigned factor = static_cast<unsigned>(FastLED.brightness) + 1;
                auto channel = [=](uint8_t v) { return scale ? (v * factor) >> 8 : v; };
                std::printf("%02X%02X%02X%s", channel(pixel.r), channel(pixel.g),
                            channel(pixel.b), col == 15 ? "\n" : " ");
            }
        }
    }
    return 0;
}
