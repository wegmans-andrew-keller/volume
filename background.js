const tabVolumes = new Map();
const tabLastDomain = new Map();

// Helper to get hostname from url
function getHostname(urlStr) {
    if (!urlStr) return null;
    try {
        return new URL(urlStr).hostname;
    } catch (e) {
        return null;
    }
}

async function initializeTabVolume(tabId, url) {
    const hostname = getHostname(url);
    
    // Check if we already have a session volume for this tab
    if (tabVolumes.has(tabId)) {
        return tabVolumes.get(tabId);
    }

    let volume = 1.0;
    if (hostname) {
        const key = `domain_volume_${hostname}`;
        const result = await browser.storage.local.get(key);
        volume = result[key] !== undefined ? result[key] : 1.0;
    }
    
    tabVolumes.set(tabId, volume);
    tabLastDomain.set(tabId, hostname);
    return volume;
}

// Listen for messages from popup and content scripts
browser.runtime.onMessage.addListener((message, sender) => {
    if (message.type === 'SET_VOLUME') {
        const tabId = message.tabId || (sender.tab ? sender.tab.id : null);
        if (tabId) {
            tabVolumes.set(tabId, message.volume);
        }
    } else if (message.type === 'GET_VOLUME') {
        const tabId = sender.tab ? sender.tab.id : null;
        return initializeTabVolume(tabId, sender.tab ? sender.tab.url : null)
            .then(volume => ({ volume }));
            
    } else if (message.type === 'GET_VOLUME_FOR_TAB') {
        return initializeTabVolume(message.tabId, message.tabUrl)
            .then(volume => ({ volume }));
    }
    // Return true to indicate we will respond asynchronously
    return true; 
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        const newHostname = getHostname(changeInfo.url);
        const oldHostname = tabLastDomain.get(tabId);
        if (newHostname !== oldHostname) {
            tabVolumes.delete(tabId); // Reset session volume for new domain
            initializeTabVolume(tabId, changeInfo.url);
        }
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    tabVolumes.delete(tabId);
    tabLastDomain.delete(tabId);
});
