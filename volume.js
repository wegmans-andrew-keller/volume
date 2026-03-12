let currentVolume = 1.0;
const mediaNodes = new WeakMap();

// Lazy-initialize AudioContext
let audioCtx;
function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function setupMedia(media) {
    if (mediaNodes.has(media)) return;

    const attemptSetup = () => {
        if (mediaNodes.has(media)) return;
        try {
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            const source = ctx.createMediaElementSource(media);
            const gainNode = ctx.createGain();
            
            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            // Initial gain
            gainNode.gain.value = currentVolume;
            
            mediaNodes.set(media, { source, gainNode });
            media.removeEventListener('play', attemptSetup);
        } catch (e) {
            // CORS restriction usually
            console.warn("Volume extension: Could not boost volume for this element.", e);
        }
    };

    media.addEventListener('play', attemptSetup);
    attemptSetup();
}

function applyVolume(volume) {
    currentVolume = volume;
    
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach(media => {
        setupMedia(media);
        
        const nodes = mediaNodes.get(media);
        if (nodes) {
            // Apply gain directly. 1.0 = no change, 4.0 = 4x boost.
            nodes.gainNode.gain.setTargetAtTime(currentVolume, getAudioContext().currentTime, 0.01);
        } else {
            // Fallback for elements we couldn't hook with WebAudio (CORS)
            // In this case, we can only go up to 1.0.
            const clampedVolume = Math.min(1.0, currentVolume);
            media.volume = clampedVolume;
        }
    });
}

// Listen for messages from popup or background script
browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'SET_VOLUME') {
        applyVolume(message.volume);
    }
});

// Request initial volume on load
async function init() {
    try {
        const response = await browser.runtime.sendMessage({ type: 'GET_VOLUME' });
        if (response && response.volume !== undefined) {
            applyVolume(response.volume);
        }
    } catch (error) {}
}

// Monitor for new media elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
                    setupMedia(node);
                    applyVolume(currentVolume);
                } else {
                    const mediaElements = node.querySelectorAll('video, audio');
                    mediaElements.forEach(media => {
                        setupMedia(media);
                        applyVolume(currentVolume);
                    });
                }
            }
        });
    });
});

observer.observe(document.documentElement, {
    childList: true,
    subtree: true
});

document.querySelectorAll('video, audio').forEach(media => {
    setupMedia(media);
});

init();
