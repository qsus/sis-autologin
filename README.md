# sis-autologin

## Idea
SIS is annoying. Doesn't allow two sessions to be opened at the same time. Requires the same id in url parameter for all of your opened tabs. Has mandatory 2FA.

This tool maintains a valid session on your server. Whenever you access SIS from any of your devices, the browser extension will ask the server for current session cookie. These are injected into your browser, logging you in.

## Security and other considerations
- Anyone with the `SECRET` now has access to your SIS.
- Anyone with access to your VPS now has access to your sis.
- Logging in to SIS in a different way than using this extention will invalidate this session.
- You are completely throwing out away the benefits of 2FA. It is literally emulated on the server.
- Every SIS page load now requires an additional request.
- Something could break if a new session is created on the server just as you are clicking a link.
- If your server is down, you need to log in manually. You will need another way to obtain OTP.

## Setup
1. Get your own server (VPS or home server accessible from the internet).
1. Enable 2FA in [ldap](https://ldapuser.cuni.cz/idportal/mfa). When scanning the QR code, copy the seed and save it to `.env` as `OTP_SECRET`.
1. Fill in the rest of the `.env` file. Create your own `SECRET` (used for authentication between the extension and the server).
1. Run the script (TODO: in tmux, as a service or inside docker).
1. Optional: set up a reverse proxy.
1. Test the connection. Example: `curl http://localhost:7791/ -H "Authorization: Bearer cb70f221-f961-43bf-bf7e-6af598aa4a20"` (If you get Binary output warning, you are seeing the image returned on incorrect authentication.)
1. Install the browser extension. (TODO: how?)
1. Enable the extension and fill in the server URL and secret.
1. Enjoy SIS autologin.

## TODO
- caching: script will know when the next session will be created, and will use this as cache validity
- .service file
- docker
