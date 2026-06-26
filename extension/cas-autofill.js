(async function () {
	'use strict';
	
	const { registerDevice = false, deviceName = '', otpSeed = '', username = '', password = '' } = await chrome.storage.local.get([
		'registerDevice',
		'deviceName',
		'otpSeed',
		'username',
		'password'
	]);
	
	const form = document.querySelector('form[id="fm1"]');
	// login page
	const usernameInput = document.querySelector('input[id="username"]');
	const passwordInput = document.querySelector('input[id="password"]');
	const loginButton = document.querySelector('button[name="submitBtn"]');
	// 2fa choose page
	const useButton = document.querySelector('button[value="Use"]'); 
	// verification page code
	const tokenInput = document.querySelector('input[id="token"]');
	const submitButton = document.querySelector('button[id="login"]');
	// register device page
	const deviceNameInput = document.querySelector('input[id="deviceName"]');
	const registerButton = document.querySelector('button[accesskey="s"]');
	const skipButton = document.querySelector('button[accesskey="k"]');
	
	const OTPEngine = (() => {
		function base32ToBuf(base32) {
			const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
			const cleanStr = base32.replace(/=+$/, "").toUpperCase();
			const len = cleanStr.length;
			const buf = new Uint8Array(Math.floor((len * 5) / 8));
			
			let bits = 0;
			let value = 0;
			let index = 0;
			
			for (let i = 0; i < len; i++) {
				const val = alphabet.indexOf(cleanStr.charAt(i));
				if (val === -1) throw new Error("Invalid Base32 character");
				value = (value << 5) | val;
				bits += 5;
				if (bits >= 8) {
					bits -= 8;
					buf[index++] = (value >> bits) & 255;
				}
			}
			return buf;
		}
		
		return {
			/**
			* @param {string} seed - Base32 encoded secret seed
			* @returns {Promise<string>} 6-digit OTP token
			*/
			async getOTP(seed) {
				const counter = Math.floor(Date.now() / 1000 / 30);
				const counterBuf = new ArrayBuffer(8);
				const view = new DataView(counterBuf);
				view.setUint32(4, counter, false); 
				
				const keyBuf = base32ToBuf(seed);
				
				const cryptoKey = await crypto.subtle.importKey(
					"raw",
					keyBuf,
					{ name: "HMAC", hash: { name: "SHA-1" } },
					false,
					["sign"]
				);
				
				const hmacResult = await crypto.subtle.sign("HMAC", cryptoKey, counterBuf);
				const hmacBytes = new Uint8Array(hmacResult);
				
				const offset = hmacBytes[hmacBytes.length - 1] & 0xf;
				const binary =
				((hmacBytes[offset] & 0x7f) << 24) |
				((hmacBytes[offset + 1] & 0xff) << 16) |
				((hmacBytes[offset + 2] & 0xff) << 8) |
				(hmacBytes[offset + 3] & 0xff);
				
				return (binary % 1000000).toString().padStart(6, "0");
			}
		};
	})();
	
	
	// Used to remember that user clicked the autologin button across page reloads
	function getAutologin() {
		return sessionStorage.getItem("casAutologinActive") === '1';
	}
	
	function setAutologin(value) { // bool please
		sessionStorage.setItem("casAutologinActive", value ? '1' : '0');
	}
	
	if (true) { // Debug
		console.log(
			"CAS: autofill script loaded; forms:\n",
			"Form:", form, "\n",
			"Username input:", usernameInput, "\n",
			"Password input:", passwordInput, "\n",
			"Login button:", loginButton, "\n",
			"Use button:", useButton, "\n",
			"Token input:", tokenInput, "\n",
			"Submit button:", submitButton, "\n"
		);
	}
	
	function autofillOTP() {
		OTPEngine.getOTP(otpSeed).then(token => {
			console.log("CAS: filling OTP");
			tokenInput.value = token;
			submitButton.click();
		});
	}
	
	// Create autofill button
	const autoBtn = document.createElement('button');
	autoBtn.id = 'autofill';
	autoBtn.type = 'button';
	autoBtn.innerText = '⚡ Autofill';
	autoBtn.style.cssText = "background:#ff9400; color:#fff; border:none; padding:8px; margin:4px; cursor:pointer;";
	autoBtn.addEventListener('click', () => { // this appears on the first login page and the OTP page
		setAutologin(true);
		
		// OTP page
		if (tokenInput && otpSeed) {
			autofillOTP();
			return;
		}
		
		// First login page
		if (!usernameInput.value) {
			usernameInput.value = username;
		}
		if (!passwordInput.value) {
			passwordInput.value = password;
		}
		loginButton.click();
	});
	if (form) form.appendChild(autoBtn);
	
	// Other pages
	if (getAutologin()) {
		// 2FA choose page
		if (useButton) {
			console.log("CAS: clicking 'Use' button");
			useButton.click();
		}
		
		// OTP page
		if (tokenInput) {
			console.log("CAS: filling OTP");
			autofillOTP();
		}
		
		// Register device page
		if (deviceNameInput) {
			if (registerDevice) {
				console.log("CAS: registering device")
				if (deviceName) deviceNameInput.value = deviceName; // fill in if set by user
				registerButton.click();
			} else {
				console.log("CAS: skipping device registration")
				skipButton.click();
			}
		}
	}
})();
