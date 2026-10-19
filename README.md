# GraphDLC

[English](README.md)〡[Русский](README.ru.md)

**Makes Logic Arrows blazing fast 😱 😱 (tested by Chubrik and Onigiri)**  
**Supported:** Chromium〡Firefox〡Tampermonkey〡Via.

## Features

- **Dark theme**
- **Ring-based RAM optimization**
- **New speed modes**
- **Consistent TPS regardless of FPS**
- **Current tick display next to FPS**
- **Improved save system**
- **Debug modes** \[View unused arrows\]
- **Toggle arrows on/off** \[P / Shift+P\]
- **Path drawing** \[RMB\]
- **Path highlighting/pinning** \[Alt / Alt+LMB\]
- **Move selected circuit** \[Ctrl+LMB\]
- **Tick rollback** \[Shift+Enter\]
- **Breakpoints** \[Two blockers facing each other\]
- **Screenshot/Video recording** \[L / Shift+L\]
- **Relative tick counter** \[Toggle by clicking the FPS display\]

## Benchmarks (20 FPS〡Experimental native engine)

| Map                                                                             | Before      | After          | Speedup    |
| ------------------------------------------------------------------------------- | ----------- | -------------- | ---------- |
| [Chubrik's Computer Running Game of Life](https://logic-arrows.io/map-computer) | ~570 TPS    | ~3,750,000 TPS | **x6,600** |
| [Benchmark](https://logic-arrows.io/map-cz9Xil8p)                               | ~40,000 TPS | ~1,125,000 TPS | **x28**    |

# Installation

All the latest builds are available on the [GitHub Releases](https://github.com/MerinPrime/GraphDLC/releases) page.

---

### PC (Chrome / Edge / Brave / Opera)

1. **Download the archive** from Releases:
   - `newchrome.zip` — for modern browsers (Manifest V3).
   - `oldchrome.zip` — for older browser versions that support Manifest V2.
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
