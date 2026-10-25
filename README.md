# GraphDLC

[![GitHub Release](https://img.shields.io/github/v/release/MerinPrime/GraphDLC?style=for-the-badge&color=blue)](https://github.com/MerinPrime/GraphDLC/releases)
[![Downloads](https://img.shields.io/github/downloads/MerinPrime/GraphDLC/total?style=for-the-badge&color=green)](https://github.com/MerinPrime/GraphDLC/releases)
[![Game](https://img.shields.io/badge/Game-Logic--Arrows.io-orange?style=for-the-badge)](https://logic-arrows.io)

[English](README.md) | [Русский](README.ru.md)

**Make Logic Arrows blazing fast. ⚡** \
A performance-focused mod for Logic Arrows, featuring an optimized simulation engine, advanced debugging, and powerful tools for logic design.

**Supported:** Chromium-based browsers, Firefox, Tampermonkey, and Via Browser. \
**Mod settings are available in the in-game Settings menu!**

## Features

- **Dark theme**
- **Ring-based RAM optimization**
- **Additional speed modes**
- **Consistent TPS regardless of FPS**
- **Current tick counter next to FPS**
- **Improved save system**
- **Steam save import** \[Paste saves directly from the Steam version\]
- **Debug modes** \[View unused arrows\]
- **Toggle arrows on/off** \[P / Shift+P\]
- **Path autorouting** \[RMB\]
- **Path highlighting/pinning** \[Alt / Alt+LMB\]
- **Move selected arrows** \[Ctrl+LMB\]
- **Select all arrows** \[Ctrl+A\]
- **Tick rollback** \[Shift+Enter\]
- **Breakpoints** \[Automatic pause when signal reaches two opposing blockers\]
- **Screenshot/Video recording** \[L / Shift+L\]
- **Relative tick counter** \[Toggle by clicking the FPS display\]

## Benchmarks (20 FPS | Experimental native engine with pathes)

| Map                                                                             |     Vanilla |       GraphDLC |     Speedup |
| ------------------------------------------------------------------------------- | ----------: | -------------: | ----------: |
| [Chubrik's Computer Running Game of Life](https://logic-arrows.io/map-computer) |    ~570 TPS | ~6,600,000 TPS | **12,000x** |
| [Benchmark](https://logic-arrows.io/map-cz9Xil8p)                               | ~40,000 TPS | ~1,500,000 TPS |     **38x** |

## Installation

All the latest builds are available on the [GitHub Releases](https://github.com/MerinPrime/GraphDLC/releases) page.

---

### PC (Chrome / Edge / Brave / Opera)

1. **Download the archive** from Releases:
   - `newchrome.zip` — **Recommended** (Chrome 109+, Edge, Opera, Brave).
   - `oldchrome.zip` — for legacy browsers (older Chromium versions without Manifest V3).
2. **Extract** the archive to a permanent folder _(do not delete this folder after installation)_.
3. Open the extensions page: `chrome://extensions` (or `edge://extensions`).
4. Enable **Developer mode**.
5. Click **Load unpacked** and select the folder containing the extracted extension files.

> **How to update:** Replace the files in the folder with the new ones and click the refresh button on the `chrome://extensions` page. If anything goes wrong, remove the old version and load it again.

---

### Mobile (Via Browser)

1. Download `viamobile.zip` from Releases and extract it.
2. Open Via Browser and go to **Settings** ➔ **Scripts**.
3. Tap **`\+`** ➔ **Import from file**.
4. Select the extracted `.js` file.

---

### Tampermonkey / Violentmonkey

1. Download `tampermonkey.zip` from Releases and extract it.
2. Open Tampermonkey and click **Create a new script**.
3. Paste the contents of `tampermonkey.js` into the editor and save (**Ctrl+S** / **Cmd+S**).
