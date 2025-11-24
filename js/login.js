document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const usernameInput = document.getElementById('usernameInput');
    const currentUserHint = document.getElementById('currentUserHint');
    const currentUserLabel = document.getElementById('currentUserLabel');

    const existingUserKey = typeof localStorage !== 'undefined'
        ? localStorage.getItem('vpnManager_userKey')
        : null;

    if (existingUserKey) {
        if (currentUserHint && currentUserLabel) {
            currentUserLabel.textContent = existingUserKey;
            currentUserHint.classList.remove('hidden');
        }
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const value = (usernameInput.value || '').trim();
            if (!value) {
                usernameInput.focus();
                return;
            }

            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('vpnManager_userKey', value);
                }
            } catch (err) {
                console.error('Failed to store user key in localStorage:', err);
            }

            window.location.href = 'index.html';
        });
    }
});