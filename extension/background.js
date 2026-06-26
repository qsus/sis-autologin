async function getSession() {
    // Check settings and the master toggle switch
    const { url, secret, cache, enabled } = await chrome.storage.local.get(['url', 'secret', 'cache', 'enabled']);
    if (!enabled || !url || !secret) return null;

    // Return from cache if valid
    if (cache && cache.validUntil && Date.now() < cache.validUntil) {
		console.log("Using cached session data");
        return cache.data;
    }

    try {
		// Fetch session data from the server
        const res = await fetch(url, {
			headers: {'Authorization': `Bearer ${secret}` }
		});
        if (!res.ok) return null;
        const data = await res.json();
        
        /* Ignore caching, browser should handle it for us
		// Store in cache
        let validUntil = 0;
        if (data.ttl) {
            validUntil = Date.now() + (data.ttl * 1000);
        } else if (data.expiresAt) {
            validUntil = data.expiresAt;
        }
		await chrome.storage.local.set({ cache: { data, validUntil } });
		*/

        return data;
    } catch (err) {
        console.error("Fetch failed (CORS? Incorrect/missing url or secret? Server down?)", err);
        return null;
    }
}

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;

    const data = await getSession();
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
