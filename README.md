# sis-autologin

## Idea
SIS is annoying. Doesn't allow two sessions to be opened at the same time. Requires the same id in url parameter for all of your opened tabs. Will have mandatory 2FA from this autumn.

This tool maintains a valid session on your server. Whenever you access SIS from any of your devices, the browser extension will ask the server for current session cookie. These are injected into your browser, logging you in.

## Security and other considerations
- Anyone with the `SECRET` now has access to your SIS.
- Anyone with access to your VPS now has access to your SIS.
- Your password is stored in plaintext on your server.
- Logging in to SIS in a different way than using this extension will invalidate the session maintained by your server until it creates a new one.
- You are completely throwing away the benefits of 2FA. It is literally emulated on the server.
- Something could break if a new session is created on the server exactly when you are clicking a link.
- If your server is down, you need to log in manually. You will need another way to obtain OTP.
- Reverse proxy with https is required, otherwise you are leaking your `SECRET`.

## Details
This extension does basically three things:
1. Redirects you from `is.cuni.cz` to `is.cuni.cz/studium/` (declarativeNetRequest, `rules.json`)
2. Fetches a valid session cookie from the server (onBeforeNavigate, `background.js`)
3. Fills in CAS login forms (even if you don't have a server) (content_scripts, `cas-autofill.js`)
4. TODO: themes?

## Setup
1. Get your own secure server (VPS or home server accessible from the internet).
1. Enable 2FA in [ldap](https://ldapuser.cuni.cz/idportal/mfa). When scanning the QR code, copy the seed and save it to `.env` as `OTP_SECRET`.
1. Fill in the rest of the `.env` file. Create your own `SECRET` (any string for authentication between the extension and the server).
1. Run the script (TODO: in tmux, as a service or inside docker).
   - Docker: `docker compose up -d --build`
1. Set up a reverse proxy (Caddy is recommended for its simplicity and automatic https, which you definitely want).
1. Test the connection. Example: `curl http://localhost:7791/ -H "Authorization: Bearer cb70f221-f961-43bf-bf7e-6af598aa4a20"` (If you get Binary output warning, you are seeing the image returned on incorrect authentication.)
1. Install the [firefox](https://addons.mozilla.org/en-US/firefox/addon/sis-server-side-autologin/) browser extension.
1. Enable the extension and fill in the server URL and secret.
1. For CAS autologin, open the extension popup and set whether to register the device, the device name, OTP seed, username, and password.
   - You may want to skip the password (and username) for security reasons and instead fill them manually or from your browser manager before clicking the autofill button.
1. Enjoy SIS autologin.

## Demo
This is how quick it is... Only one click, everything else is automated.

https://github.com/user-attachments/assets/4d362464-2f41-46a7-a470-ffd878733f9b

SIS load with cleared browser cache, and then with cache (equivalent to opening a new tab).

https://github.com/user-attachments/assets/4b87b310-fcec-422c-99b8-6d35ac3f6be5

## TODO
- caching: script will know when the next session will be created, and will use this as cache validity
- .service file
- add option to disable cache

## Issues
- direct download links like https://is.cuni.cz/studium/?ABc01DEfG are redirected to SIS main page
- on phone, going to is.cuni.cz does not trigger the autologin after redirecting; you have to reload the page to trigger it
- potential race condition if only some of the authentication data was up to date?
