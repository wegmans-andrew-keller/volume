# Volume Control

A Firefox extension (Manifest V3) for granular, per-tab volume control with audio boosting.

## Features

- **Per-Tab Volume:** Independent volume levels for every open tab.
- **Volume Boosting:** Increase audio up to 400% using the Web Audio API.
- **Persistence:** Remembers volume settings per domain across sessions.
- **Dynamic Detection:** Automatically hooks into new video and audio elements as they appear.

## Technical Details

- **Manifest V3:** Built for modern browser extension standards.
- **Audio Engine:** Utilizes `GainNode` and `AudioContext` for precise volume manipulation.
- **Scoped Storage:** Uses `browser.storage.local` for domain-level persistence and background script state for tab-specific overrides.

## Installation

1. Clone this repository.
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
3. Click "Load Temporary Add-on...".
4. Select `manifest.json` from the project directory.
