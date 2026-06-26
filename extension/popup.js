// Load saved settings
chrome.storage.local.get(['url', 'secret', 'enabled', 'registerDevice', 'deviceName', 'otpSeed', 'username', 'password'], (res) => {
	document.getElementById('url').value = res.url || '';
	document.getElementById('secret').value = res.secret || '';
	document.getElementById('enabled').checked = res.enabled !== false; // Defaults to true on first run
	document.getElementById('registerDevice').checked = res.registerDevice === true;
	document.getElementById('deviceName').value = res.deviceName || '';
	document.getElementById('otpSeed').value = res.otpSeed || '';
	document.getElementById('username').value = res.username || '';
	document.getElementById('password').value = res.password || '';
});

// Save settings and clear cache
document.getElementById('save').addEventListener('click', () => {
	const url = document.getElementById('url').value.trim();
	const secret = document.getElementById('secret').value.trim();
	const enabled = document.getElementById('enabled').checked;
	const registerDevice = document.getElementById('registerDevice').checked;
	const deviceName = document.getElementById('deviceName').value.trim();
	const otpSeed = document.getElementById('otpSeed').value.trim();
	const username = document.getElementById('username').value.trim();
	const password = document.getElementById('password').value.trim();
	
	chrome.storage.local.set({ url, secret, enabled, registerDevice, deviceName, otpSeed, username, password, cache: null }, () => {
		const btn = document.getElementById('save');
		btn.textContent = 'Saved!';
		setTimeout(() => btn.textContent = 'Save Settings', 1500);
	});
});

// Enabled button
document.getElementById('enabled').addEventListener('change', (e) => {
	chrome.storage.local.set({ enabled: e.target.checked });
});
