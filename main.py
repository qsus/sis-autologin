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
PORT = 7791

def fetch_session_data():
    """Emulate login with OTP and return session data"""
    with sync_playwright() as p: 
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # First login screen
        page.goto("https://is.cuni.cz/studium/index.php?sso")
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

        # Read data
        cookies = {c["name"]: c["value"] for c in page.context.cookies()}
        return {
            "idc": cookies.get("idc"),
            "php_sessid": cookies.get("PHPSESSID")
        }

session_data = {}
def update_session_data():
    global session_data
    session_data = fetch_session_data()

def session_renewer():
    """Periodically obtain new session data"""
    while True:
        print("Renewing session data")
        try:
            update_session_data()
        except Exception as e:
            print(f"Error obtaining new session data: {e}")
        time.sleep(3600)

class TokenHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Authorization")
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
        response_data = json.dumps(session_data).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Content-Length", str(len(response_data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        self.wfile.write(response_data)

    #def log_message(self, format, *args): # Disable request log
    #    return

if __name__ == "__main__":
    # Get new session now and get another one periodically using a new thread
    update_session_data()
    threading.Thread(target=session_renewer, daemon=True).start()

    # Server
    server = http.server.HTTPServer(("127.0.0.1", PORT), TokenHandler)
    print(f"Serving on 127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
