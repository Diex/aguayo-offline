#pragma once
#include <cstdint>
#include <cstdlib>
#include <iterator>
#include <algorithm>
using byte = uint8_t;
constexpr int A0 = 0;
constexpr int NEOPIXEL = 0;
extern uint32_t virtual_ms;
extern uint32_t host_seed;
extern uint64_t rng_state;
inline uint32_t newlib_rand() {
    rng_state = rng_state * UINT64_C(6364136223846793005) + 1;
    return static_cast<uint32_t>((rng_state >> 32) & 0x7fffffff);
}
template<typename Iterator> void offline_shuffle(Iterator first, Iterator last) {
    // GCC 8 libstdc++ random_shuffle algorithm, driven by newlib rand().
    for (Iterator i = first + 1; i != last; ++i)
        std::iter_swap(i, first + newlib_rand() % (i - first + 1));
}
inline uint32_t millis() { return virtual_ms; }
inline void delay(int) {} // Harness advances one configurable interval per loop.
inline int analogRead(int) { return 0; }
inline void randomSeed(unsigned long) { rng_state = host_seed; }
inline long random(long maximum) {
    // ESP32 Arduino receives a signed 32-bit long, even on a 64-bit host.
    int32_t bound = static_cast<int32_t>(maximum);
    if (bound == 0) return 0;
    if (bound < 0) bound = -bound;
    return newlib_rand() % bound;
}
struct CRGB {
    uint8_t r = 0, g = 0, b = 0;
    CRGB() = default;
    CRGB(int red, int green, int blue) : r(red), g(green), b(blue) {}
};
struct SerialShim {
    void begin(int) {}
    template<typename T> void println(T) {}
};
static SerialShim Serial;
struct FastLEDShim {
    uint8_t brightness = 255;
    template<int CHIPSET, int PIN> void addLeds(CRGB*, int) {}
    void setBrightness(uint8_t value) { brightness = value; }
    void show() {}
};
static FastLEDShim FastLED;
