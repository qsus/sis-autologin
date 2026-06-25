(function () {
	'use strict';
	
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
	
	if (true) { // Debug
		console.log(
			"Form:", form, "\n",
			"Username input:", usernameInput, "\n",
			"Password input:", passwordInput, "\n",
			"Login button:", loginButton, "\n",
			"Use button:", useButton, "\n",
			"Token input:", tokenInput, "\n",
			"Submit button:", submitButton, "\n"
		);
	}

	// Create autofill button
	const autoBtn = document.createElement('button');
	autoBtn.id = 'autofill';
	autoBtn.type = 'button';
	autoBtn.innerText = '⚡ Autofill';
	autoBtn.style.cssText = "background:#ff9400; color:#fff; border:none; padding:8px; margin:4px; cursor:pointer;";
	autoBtn.addEventListener('click', () => {
		console.log("Autofill clicked!");
		if (!usernameInput.value) {
			usernameInput.value = "TODO";
		}
		if (!passwordInput.value) {
			passwordInput.value = "TODO";
		}
		loginButton.click();
	});
	form.appendChild(autoBtn);
		
})();
