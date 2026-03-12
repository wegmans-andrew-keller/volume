const volumeSlider = document.getElementById('volume-slider');
const volumeDisplay = document.getElementById('volume-display');
const domainToggle = document.getElementById('domain-toggle');
const muteBtn = document.getElementById('mute-btn');
const shortcutButtons = document.querySelectorAll('.shortcut-btn[data-value]');

let currentHostname = null;
let lastNonMuteVolume = 100;
let currentTabId = null;

// Helper to extract hostname
function getHostname(urlStr) {
    if (!urlStr) return null;
    try {
        return new URL(urlStr).hostname;
    } catch (e) {
        return null;
    }
}

async function updateVolume(value) {
    const volumeValue = parseInt(value);
    const volumeScale = volumeValue / 100;
    
    volumeSlider.value = volumeValue;
    updateDisplay(volumeValue);
    
    if (volumeValue > 0) {
        lastNonMuteVolume = volumeValue;
        muteBtn.textContent = 'Mute';
        muteBtn.classList.remove('muted');
    } else {
        muteBtn.textContent = 'Unmute';
        muteBtn.classList.add('muted');
    }

    if (currentTabId) {
        // Update background state
        browser.runtime.sendMessage({
            type: 'SET_VOLUME',
            tabId: currentTabId,
            volume: volumeScale
        });
        
        // Update domain storage if toggle is checked
        if (domainToggle.checked && currentHostname) {
            const key = `domain_volume_${currentHostname}`;
            browser.storage.local.set({ [key]: volumeScale });
        }
        
        // Update content script
        try {
            browser.tabs.sendMessage(currentTabId, {
                type: 'SET_VOLUME',
                volume: volumeScale
            });
        } catch (error) {
            console.warn("Could not send message to tab.", error);
        }
    }
}

async function init() {
    // We don't want to wait for browser.tabs.query to render something
    // though in most cases it's very fast.
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;
    
    currentTabId = tab.id;
    currentHostname = getHostname(tab.url);
    
    // Check if domain is saved in storage immediately
    if (currentHostname) {
        const key = `domain_volume_${currentHostname}`;
        const storageResult = await browser.storage.local.get(key);
        if (storageResult[key] !== undefined) {
            domainToggle.checked = true;
        }
    } else {
        domainToggle.disabled = true;
    }

    // Get current tab/domain volume from background
    const response = await browser.runtime.sendMessage({ 
        type: 'GET_VOLUME_FOR_TAB', 
        tabId: currentTabId,
        tabUrl: tab.url
    }).catch(() => null);

    const volume = (response && response.volume !== undefined) ? Math.round(response.volume * 100) : 100;
    
    volumeSlider.value = volume;
    if (volume > 0) lastNonMuteVolume = volume;
    updateDisplay(volume);
    
    if (volume === 0) {
        muteBtn.textContent = 'Unmute';
        muteBtn.classList.add('muted');
    }
}

function updateDisplay(value) {
    volumeDisplay.textContent = `${value}%`;
}

volumeSlider.addEventListener('input', (event) => {
    updateVolume(event.target.value);
});

muteBtn.addEventListener('click', () => {
    if (parseInt(volumeSlider.value) > 0) {
        updateVolume(0);
    } else {
        updateVolume(lastNonMuteVolume);
    }
});

shortcutButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        updateVolume(btn.dataset.value);
    });
});

domainToggle.addEventListener('change', async (event) => {
    if (!currentHostname) return;
    const key = `domain_volume_${currentHostname}`;
    
    if (event.target.checked) {
        const volumeScale = parseFloat(volumeSlider.value) / 100;
        await browser.storage.local.set({ [key]: volumeScale });
    } else {
        await browser.storage.local.remove(key);
    }
});

init();
