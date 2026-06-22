// Load saved settings
chrome.storage.local.get(['url', 'secret', 'enabled'], (res) => {
    document.getElementById('url').value = res.url || '';
    document.getElementById('secret').value = res.secret || '';
    document.getElementById('enabled').checked = res.enabled !== false; // Defaults to true on first run
});

// Save settings and clear cache
document.getElementById('save').addEventListener('click', () => {
    const url = document.getElementById('url').value.trim();
    const secret = document.getElementById('secret').value.trim();
    const enabled = document.getElementById('enabled').checked;
    
    chrome.storage.local.set({ url, secret, enabled, cache: null }, () => {
        const btn = document.getElementById('save');
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = 'Save Settings', 1500);
    });
});

// Enabled button
document.getElementById('enabled').addEventListener('change', (e) => {
    chrome.storage.local.set({ enabled: e.target.checked });
});
