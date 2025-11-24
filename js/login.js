document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const loginIdentifier = document.getElementById('loginIdentifier');
    const loginPassword = document.getElementById('loginPassword');

    const registerEmail = document.getElementById('registerEmail');
    const registerUsername = document.getElementById('registerUsername');
    const registerPassword = document.getElementById('registerPassword');

    const currentUserHint = document.getElementById('currentUserHint');
    const currentUserLabel = document.getElementById('currentUserLabel');

    const existingUserKey = typeof localStorage !== 'undefined'
        ? localStorage.getItem('vpnManager_userKey')
        : null;

    if (existingUserKey && currentUserHint && currentUserLabel) {
        currentUserLabel.textContent = existingUserKey;
        currentUserHint.classList.remove('hidden');
    }

    function switchToLogin() {
        tabLogin.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        tabLogin.classList.remove('text-gray-500');
        tabRegister.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        tabRegister.classList.add('text-gray-500');
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    }

    function switchToRegister() {
        tabRegister.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        tabRegister.classList.remove('text-gray-500');
        tabLogin.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        tabLogin.classList.add('text-gray-500');
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
    }

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', (e) => {
            e.preventDefault();
            switchToLogin();
        });
        tabRegister.addEventListener('click', (e) => {
            e.preventDefault();
            switchToRegister();
        });
    }

    // Default view: Login
    switchToLogin();

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = (registerEmail.value || '').trim();
            const username = (registerUsername.value || '').trim();
            const password = (registerPassword.value || '').trim();

            if (!email || !username || !password) {
                alert('Please fill in all fields.');
                return;
            }

            try {
                const res = await fetch('/api/auth-register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, username, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || data.details || 'Registration failed.');
                }

                // On success, save username as userKey and redirect
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('vpnManager_userKey', data.username);
                    }
                } catch (err) {
                    console.error('Failed to store user key in localStorage:', err);
                }

                window.location.href = 'index.html';
            } catch (err) {
                console.error('[Login] Register error:', err);
                alert(`Register error: ${err.message}`);
            }
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const identifier = (loginIdentifier.value || '').trim();
            const password = (loginPassword.value || '').trim();

            if (!identifier || !password) {
                alert('Please fill in both fields.');
                return;
            }

            try {
                const res = await fetch('/api/auth-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || data.details || 'Login failed.');
                }

                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('vpnManager_userKey', data.username);
                    }
                } catch (err) {
                    console.error('Failed to store user key in localStorage:', err);
                }

                window.location.href = 'index.html';
            } catch (err) {
                console.error('[Login] Login error:', err);
                alert(`Login error: ${err.message}`);
            }
        });
    }
});