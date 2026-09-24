import http.server
import json
import threading
import time
import os
from dotenv import load_dotenv
# Login emulator
from playwright.sync_api import sync_playwright
import pyotp

load_dotenv(override=True) # override ensures USER isn't overriden by the system

# Auth for cas
OTP_SECRET = os.getenv("OTP_SECRET")
USER = os.getenv("USER")
PASS = os.getenv("PASS")
# Auth from user
SECRET = os.getenv("SECRET")
# Other
PORT = int(os.getenv("PORT", 7791))
UPDATE_INTERVAL = int(os.getenv("INTERVAL", 3600))

def fetch_data():
    """Emulate login with OTP and return data for SIS and Canteen"""
    updated = time.time()
    with sync_playwright() as p:
        ## LOGIN TO CAS
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # First login screen
        page.goto("https://cas.cuni.cz/cas/login")
        page.fill("input[name='username']", USER)
        page.fill("input[name='password']", PASS)
        page.get_by_role("button", name="PŘIHLÁSIT").click()
        # 2FA
        page.locator("#mfa-gauth").get_by_role("button", name="Použít").click() # Choose 2FA method
        totp = pyotp.TOTP(OTP_SECRET)
        code = totp.now()
        page.get_by_role("textbox", name="Ověřovací kód:*").fill(code)
        page.get_by_role("button", name="PŘIHLÁSIT").click()
        # Remember device screen
        page.get_by_role("button", name="Přeskočit").click()

        ## SIS
        page.goto("https://is.cuni.cz/studium/index.php?sso")
        sis_cookies = {c["name"]: c["value"] for c in page.context.cookies()}

        ## Canteen
        page.goto("https://kam-septim-fe.is.cuni.cz/ext-login")
        # Wait until the auth data appears in localStorage
        canteen_local_storage = page.wait_for_function(
            """() => {
                for (const [key, raw] of Object.entries(localStorage)) {
                    if (key.startsWith("septim-canteen")) {
                        try {
                            const info = JSON.parse(raw)?.userSystemInfo;
                            if (info?.auth?.login && info?.authentication?.sessionToken) {
                                return { [key]: raw };
                            }
                        } catch {}
                    }
                }
                return false;
            }""",
            timeout=15000,
        ).json_value() # {"septim-canteen-1.25.18~~JS-1304": "<object as string>"}

        return {
            "sis": {
                "idc": sis_cookies.get("idc"),
                "php_sessid": sis_cookies.get("PHPSESSID")
            },
            "canteen": canteen_local_storage,
            "updated": updated
        }

data = {}

def cache_max_age():
    return max(0, int(data["updated"] + UPDATE_INTERVAL - time.time()))

def session_renewer():
    """Periodically obtain new session data"""
    global data
    while True:
        time.sleep(UPDATE_INTERVAL)
        print("Renewing session data")
        try:
            data = fetch_data()
        except Exception as e:
            print(f"Error obtaining new session data: {e}")

class TokenHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self): # needed to allow the extension to send Authorization header
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):
        # This line now guards your entire SIS access
        if self.headers.get("Authorization") != "Bearer " + SECRET:
            print("Invalid request")
            self.send_response(401)
            self.send_header("Content-Type", "image/gif")
            self.end_headers()
            
            with open("nosis.gif", "rb") as gif:
                self.wfile.write(gif.read())

            return # do not proceed

        # Authenticated, can return session data
        print("Valid request")
        response_data = json.dumps(data).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", f"private, max-age={cache_max_age()}, must-revalidate")
        self.send_header("Vary", "Authorization")
        self.send_header("Content-Length", str(len(response_data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        self.wfile.write(response_data)


if __name__ == "__main__":
    # Get new session now and get another one periodically using a new thread
    print("Getting initial data...")
    data = fetch_data()
    print("Starting renewer thread...")
    threading.Thread(target=session_renewer, daemon=True).start()

    # Server
    print("Starting server...")
    server = http.server.HTTPServer(("0.0.0.0", PORT), TokenHandler)
    print(f"Serving on 0.0.0.0:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
