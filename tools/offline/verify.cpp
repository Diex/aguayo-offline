// Test-only executable: verify the actual sketch, not a second renderer.
#define main renderer_main
#include "main.cpp"
#undef main
#include <cassert>
int main() {
    const uint32_t inputs[] = {0u,1u,15u,16u,255u,4096u,8192u,65535u,305419896u,4294967295u};
    const uint8_t expected[9][10] = {
        {0,0,0,0,0,0,0,193,72,193},
        {0,1,15,18,255,128,0,255,191,255},
        {0,0,105,160,129,0,0,1,136,1},
        {0,0,15,32,225,0,0,1,8,1},
        {0,0,15,32,225,0,0,1,136,1},
        {0,0,0,0,7,128,0,253,173,241},
        {0,0,252,251,192,0,0,0,97,0},
        {0,8,120,128,255,128,0,255,179,255},
        {0,2,30,32,251,64,128,1,169,1}
    };
    for (int k = 0; k < 9; ++k)
        for (int i = 0; i < 10; ++i)
            assert(bytebeatRoutine(k, inputs[i]) == expected[k][i]);
    host_seed = 42;
    setup();
    assert(t == 0); // random(ULONG_MAX) => random(-1) => random(1).
    int black = 0;
    for (auto pixel : lookupTable) black += pixel.r == 0 && pixel.g == 0 && pixel.b == 0;
    assert(black == 39);
    t = UINT32_MAX;
    virtual_ms = 0;
    loop();
    assert(t == 0); // Only the global increment counts.
    formula = 0;
    lastChange = 0;
    virtual_ms = 25000;
    loop();
    assert(formula == 0); // Strict > comparison.
    virtual_ms = 25001;
    loop();
    assert(formula == 1 && lastChangeFormula == 25001);
    virtual_ms = 25002;
    loop();
    assert(formula == 2); // Timer bug: advances again immediately.
    virtual_ms = 30000;
    loop();
    assert(formula == 3 && lastChange == 0);
    virtual_ms = 30001;
    loop();
    assert(formula == 3 && lastChange == 30001); // Shuffle resets formula window.
    virtual_ms = 55001;
    loop();
    assert(formula == 3);
    virtual_ms = 55002;
    loop();
    assert(formula == 4);
    for (int strip = 0; strip < 8; ++strip) {
        for (int i = 0; i < NUM_LEDS_PER_STRIP; ++i) leds[strip][i] = CRGB(i & 255, strip, 0);
        temp[strip] = CRGB(99, 88, strip);
    }
    pushValueToFifo(temp);
    for (int strip = 0; strip < 8; ++strip) {
        for (int i = 0; i < NUM_LEDS_PER_STRIP - 1; ++i) {
            assert(leds[strip][i].r == ((i + 1) & 255));
            assert(leds[strip][i].g == strip);
        }
        assert(leds[strip][NUM_LEDS_PER_STRIP - 1].r == 99 && leds[strip][NUM_LEDS_PER_STRIP - 1].b == strip);
    }
    rng_state = 42;
    assert(newlib_rand() == 2104627054u);
    assert(newlib_rand() == 2013331137u);
    assert(newlib_rand() == 258660947u);
    assert(newlib_rand() == 107061148u);
    assert(newlib_rand() == 317460219u);
}
