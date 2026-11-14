# Aguayo panel tester

An offline formula and color editor for an eight-strip LED panel. Try C-style
bytebeat expressions in a live mirrored preview, build RGB lookup tables, and
export horizontal PNG sequences or Arduino snippets.

Built with plain JavaScript and Canvas. No npm, Python, PlatformIO, Arduino IDE,
or build step is needed to use the editor. Everything runs locally in your browser.

## Clone and run on macOS

In Terminal:

```sh
git clone https://github.com/Diex/aguayo-offline.git
cd aguayo-offline
open tools/panel_editor/index.html
```

If you use SSH with GitHub, the clone command is:

```sh
git clone git@github.com:Diex/aguayo-offline.git
```

After cloning, you can also double-click **Start Panel Tester.command** in Finder.
It opens the editor in your default browser and exits; there is no server to keep
running. If the launcher is not executable, run:

```sh
chmod +x "Start Panel Tester.command"
```

Or open `tools/panel_editor/index.html` directly from Finder. Use a modern browser
with JavaScript enabled. An internet connection is only needed to clone/update
this repository, not to use the editor.

## Use the editor

- Click **Play**, then choose or edit a formula. **Apply formula** activates edits.
  Formula and palette changes preserve playback and the existing panel history.
- Choose a palette or edit its swatches. **Random formula** and **Random palette**
  pick another entry from their respective libraries.
- Paste a hex string such as `ff2dd1fdffb84dffbe63c8ff`, then click
  **Parse & add colors**. Each parse appends four colors in this example; the
  palette can contain up to 64 active RGB colors.
- **Download PNG ZIP** exports a sequence at 64 × 16 pixels by default, rotated
  clockwise from the vertical preview. Increase pixel scale for larger images.
- **Download Arduino snippet** exports the selected formula and a FastLED
  `CRGB lookupTable[64]` declaration for manual integration into your sketch.

**Save project JSON** before moving the repository, switching browsers, or
updating your checkout. The editor saves applied changes in browser storage,
but local-file storage behavior depends on the browser and file location.
**Load project** restores a JSON backup. Downloads use the browser's normal
save location. Pending formula/settings edits must be applied before saving.

## Optional: localhost launcher

If Python 3 is installed, you can instead use a stable localhost address:

```sh
python3 tools/render_offline.py
```

This opens the browser and serves only the editor directory on `127.0.0.1:8765`.
Keep Terminal running; press Ctrl+C to stop. If that port is busy, use
`python3 tools/render_offline.py --port 8766`. Use the same address and port
between sessions to retain that origin's browser storage. File and localhost
sessions have separate storage; transfer projects with JSON.

See [the editor guide](tools/README.md) for arithmetic details, export settings,
and developer validation commands.

## Repository contents

- `tools/panel_editor/`: standalone browser editor.
- `tools/render_offline.py`: optional Python static-file server.
- `src/aguayo_MACRO_4_macbook.ino`: ESP32/FastLED firmware, separate from the editor.
- `platformio.ini`: firmware project configuration; not required for the editor.

The editor does not parse, change, or upload firmware. No hardware connection
is needed. Firmware development has its own toolchain and local library paths
in `platformio.ini`; cloning this repository does not configure those dependencies.
