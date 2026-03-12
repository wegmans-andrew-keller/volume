# Project Knowledge & Lessons Learned

## Architecture: Per-Tab Volume Control (Firefox MV3)

- **Manifest V3:** Utilizes `background.scripts` for the background service (Firefox implementation) and `action` for the popup.
- **State Management:** 
    - Tab-specific volume state is managed in `background.js` using a `Map` keyed by `tabId` (cleared when the tab is closed).
    - Domain-level volume is persisted using `browser.storage.local` with keys formatted as `domain_volume_${hostname}`.
    - When a tab initializes or the popup opens, the background script checks for a tab-specific volume. If none exists, it falls back to the domain-level volume from `browser.storage.local`.
- **Content Script (`volume.js`):** 
    - Runs on all URLs at `document_start` to catch media elements as early as possible.
    - Requests initial volume from the background script upon loading.

## Technical Insights: Volume Boosting (>100%)

- **Web Audio API:** Standard HTML media element `volume` properties are capped at `1.0` (100%). To achieve "boosting" (e.g., up to 400%), a `GainNode` must be inserted into the audio graph.
- **Audio Graph Setup:**
    1. Create/Resume an `AudioContext`.
    2. Create a `MediaElementSource` from the `<video>` or `<audio>` element.
    3. Connect the source to a `GainNode`.
    4. Connect the `GainNode` to the `AudioContext.destination`.
- **Constraints & Challenges:**
    - **CORS:** `createMediaElementSource` will fail or throw security errors if the media source is cross-origin and lacks proper CORS headers. This is a common limitation on some high-security streaming sites.
    - **User Gesture:** `AudioContext` often starts in a `suspended` state. It must be resumed (`ctx.resume()`) during or after a user interaction (like clicking "Play" or adjusting the slider).
    - **Dynamic Content:** Sites often inject media elements dynamically. A `MutationObserver` is required to detect and "hook" new elements.
    - **Memory Management:** `WeakMap` is used to associate media elements with their respective `AudioNodes` without preventing garbage collection of the media elements.

## Implementation Details

- **Slider Range:** Configured from `0` to `400` in `popup.html`.
- **Smoothing:** `gainNode.gain.setTargetAtTime` is used for smooth volume transitions and to avoid audible "clicks" during rapid slider movement.
- **Resiliency:** Added a `play` event listener to media elements to attempt audio graph setup only when playback starts, which helps bypass some browser restrictions on early `AudioContext` initialization.
