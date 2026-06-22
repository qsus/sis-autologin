// ==UserScript==
// @name         is.cuni.cz Autologin
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Přesměrování z is.cuni.cz do SISu a autologin
// @match        *://is.cuni.cz/*
// @match        *://*.is.cuni.cz/*
// @match        *://it.cuni.cz/MYLIFE-1.html*
// @run-at       document-start
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

(async function() {
    'use strict';

    let PARAM, COOKIE;
    const CACHE_TTL = 1000 * 60 * 5;
    const cached = await GM.getValue('sis_creds');

    // Retrieve our login data
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) { // From cache
        PARAM = cached.data.php_sessid;
        COOKIE = cached.data.idc;
    } else { // Or from server
        const response = await fetch('https://your.provider.tld/', {
            headers: {
                'Authorization': 'Bearer YOUR_TOKEN'
            }
        });
        const data = await response.json();

        GM.setValue('sis_creds', { timestamp: Date.now(), data: data }); // Store to cache
        PARAM = data.php_sessid;
        COOKIE = data.idc;
    }

    // Current URL
    const url = new URL(window.location.href);

    if (url.hostname === 'it.cuni.cz') { // Redirect from "is.cuni.cz", which usually redirects to "https://it.cuni.cz/MYLIFE-1.html"
        window.location.replace(`https://is.cuni.cz/studium/?id=${PARAM}`);
        return;
    }

    if (url.searchParams.get('id') !== PARAM) { // Missing ID in url
        url.searchParams.set('id', PARAM);
        window.location.replace(url.toString());
        return;
    }

    const expectedCookie = `idc=${COOKIE}`;
    if (!document.cookie.includes(expectedCookie)) { // Missing idc cookie
        document.cookie = `${expectedCookie}; domain=is.cuni.cz; path=/studium/; secure; max-age=31536000`;
        window.location.reload();
        return;
    }
})();
