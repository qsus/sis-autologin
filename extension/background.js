async function getSession() {
	// Check settings and the master toggle switch
	const { url, secret, encrypt, enabled } = await chrome.storage.local.get(['url', 'secret', 'encrypt', 'enabled']);
	if (!enabled || !url || !secret) return null;
	
	try {
		// Fetch session data from the server
		const res = await fetch(url, {
			headers: {'Authorization': `Bearer ${secret}` }
		});
		if (!res.ok) {
			console.error("Fetch response error.", res.status, res.statusText);
			return null;
		}

		// Successful fetch
		if (encrypt) {
			console.log("Using decryption.")
			return await decrypt(await res.text(), encrypt);
		}
		
		return await res.json();
	} catch (err) {
		console.error("Fetch failed. (CORS? Incorrect/missing url or secret? Server down?)", err);
		return null;
	}
}

async function decrypt(token, secret) {
    const encoder = new TextEncoder();

    // 1. Derive the 32-byte key: SHA-256(secret)
    const keyHash = await crypto.subtle.digest("SHA-256", encoder.encode(secret));

    // 2. Fernet uses the SECOND 16 bytes (16-31) for AES-128-CBC
    const aesKey = await crypto.subtle.importKey(
        "raw",
        keyHash.slice(16, 32), 
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    // 3. Decode URL-safe base64 token
    const base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

    // 4. Extract IV (16B starting at index 9) and Ciphertext (ends 32B before HMAC)
    const iv = bytes.subarray(9, 25);
    const ciphertext = bytes.subarray(25, bytes.length - 32);

    // 5. Decrypt and parse JSON
    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv },
        aesKey,
        ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
	const sessionData = await getSession();
	const data = sessionData.sis;

	if (!data) return; // Extension disabled or failed
	
	// Set session cookies
	const cookieBase = { url: 'https://is.cuni.cz', domain: 'is.cuni.cz', path: '/studium/', secure: true, httpOnly: true };
	if (data.idc) await chrome.cookies.set({ ...cookieBase, name: 'idc', value: data.idc });
	if (data.php_sessid) await chrome.cookies.set({ ...cookieBase, name: 'PHPSESSID', value: data.php_sessid });
	
	const url = new URL(details.url);
	
	// Add session ID to URL
	if (url.searchParams.get('id') !== data.php_sessid) {
		url.searchParams.set('id', data.php_sessid);
		chrome.tabs.update(details.tabId, { url: url.toString() });
	}
}, { url: [{ hostEquals: 'is.cuni.cz' }] });
