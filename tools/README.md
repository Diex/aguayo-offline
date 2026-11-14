# Offline panel formula tester

A local plain JavaScript/Canvas editor for the fixed Aguayo panel: eight strips,
64 rows, mirrored into a 16 × 64 image. Open `tools/panel_editor/index.html` directly in a modern browser, or double-click
`Start Panel Tester.command` on macOS. No installation or build is needed.
The optional Python launcher serves the files and opens the browser. No Arduino source parsing, C++ compilation, packages, CDNs, or remote
services are used by the editor. Firmware is not modified.

Optional localhost mode (requires Python 3):

```sh
python3 tools/render_offline.py
# Optional:
python3 tools/render_offline.py --port 8766 --no-browser
```

Open the printed localhost URL. Ctrl+C stops the server. Keep the same port to
retain browser storage (storage belongs to the page's origin). Local-file and
localhost sessions have separate storage; use project JSON to transfer between
them. Local-file storage can vary by browser and file location, so keep JSON
backups. See [the root README](../README.md) for clone-and-run instructions.

## Edit and try

- Select a formula, edit its name/expression, and click **Apply formula**.
  New, duplicate, and delete manage the formula library. The nine original
  expressions are independent presets, not read from the `.ino`.
- Select a color LUT table and edit its indexed RGB swatches. Add/remove colors
  from the end. Each palette has 1–64 active entries, corresponding to a global
  `CRGB lookupTable[64]` and `maxColors`. Unused entries are zero-filled and never
  included in shuffles or selection. The preset counts are GPT 25, Aguayo 13,
  and 8bit 6, including the original final entries.
- Paste a continuous hex string into **Paste colors** and click **Parse & add colors**
  to append colors to the selected palette (64 total maximum). For example, `ff2dd1fdffb84dffbe63c8ff`
  creates four RGB colors. Input must contain 1–64 complete six-digit colors.
- Play, pause, step, or reset. Formula and color changes apply live, preserving
  playback/paused state, t, frame count, random state, and existing panel rows.
  New colors appear in subsequent rows; changing the palette uses its listed
  order until the next scheduled shuffle. Renaming does not change the live LUT.
  Random formula / Random palette selects another library entry when available.
  Applied simulation settings and loading a project still reset with black buffers.
  Formula selection is manual; there is no automatic formula timer.
  Pending formula/settings edits must be
  applied before previewing, saving JSON, or exporting.
- Libraries, selections, and applied settings save automatically in browser
  localStorage. Save/load project JSON provides portable backups. Loading JSON
  replaces the current project. Names and colors are saved as they change;
  a formula's name is saved with Apply formula.

## Arithmetic and panel behavior

`t` is unsigned 32-bit and advances by one per frame, wrapping at 2^32.
The default starting t is 305419896 (0x12345678) so the first preset produces
visible output immediately; set it to 0 to test from the beginning. Every
arithmetic intermediate is unsigned 32-bit; final output is truncated to eight
bits. The editor supports integer literals (decimal or hex, optional U suffix),
parentheses, `+ - * / % ~ ! << >> & ^ |`, comparisons, `&& ||`, and `?:` with C
precedence and short-circuit evaluation. No functions, casts, statements, floating
point, or increments. Division by zero and shifts outside 0–31 stop playback or
export with an error. Decimal literals with leading zeros are rejected to avoid
C octal ambiguity. JavaScript is interpreted, never evaluated with eval().

Because this is a deliberately unsigned expression subset, arbitrary C expressions
with signed-only subexpressions may differ from a direct paste into C. Download
Arduino snippet emits explicit uint32_t casts and unsigned constants to preserve
the tested arithmetic. This is FastLED C++ (as Arduino sketches use), with a
C-compatible bytebeat function. It includes the selected formula and an initialized
64-slot `CRGB lookupTable` with the exact active `maxColors`. Integrate it into
firmware manually; this tool never changes or uploads the sketch.

Bit x controls strip x: an active bit selects `(colorIndex + x) % maxColors`,
and an inactive bit is black. With 4% probability each frame, the color index
advances before choosing colors. Rows shift upward and the new row enters at
index 63. Columns are `[0,1,2,3,4,5,6,7,7,6,5,4,3,2,1,0]`. All buffers start black.
Brightness uses `(channel * (brightness + 1)) >> 8`, default 127; use 255 for
unscaled RGB. This is not a simulation of LED dithering or physical brightness.

Optional shuffling permutes only active colors at reset and after each elapsed
30-second interval (strictly greater than, like the sketch). Simulation uses an
explicit seeded 32-bit LCG, not ESP32 random(): repeatable preview/export is
provided, rather than exact hardware RNG parity. Frame duration drives playback
and palette timing, not the rate of increment of t. Browser playback can slow
under load without skipping simulation steps.

## PNG sequences

Choose start frame, frame count (1–10,000), and integer pixel scale (1–16).
Download PNG ZIP produces numbered PNGs, project.json, and sequence.json with
export settings. Start frame is zero based; frame 0 is the panel **after** the
first update. Export always restarts from applied settings and warms up to the
chosen frame, independent of playback. PNGs are rotated 90° clockwise from the live preview. Scale 1 exports
64 × 16 pixels; larger scales use nearest-neighbor enlargement. The live
preview remains vertical. sequence.json records output dimensions and rotation. Cancel discards an export.
ZIP generation holds compressed PNGs in browser memory; use shorter exports or
scale 1 for long sequences. No filesystem permission is required beyond normal
browser downloads.

## Local validation

Python 3, Node.js, and a local C++ compiler are required for tests only:

```sh
python3 -m unittest discover -s tools -p 'test_*.py'
```

Tests compare all nine presets with a compiled C++ oracle at representative
uint32 boundaries, compare emitted expressions, verify arithmetic errors,
FIFO/mirroring, brightness, active palette bounds, seeded repeatability, and ZIP
integrity. The old `tools/offline/` sketch harness files are historical and unused.
