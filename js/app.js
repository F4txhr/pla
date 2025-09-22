// =================================================================================
// Shared Application Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    setupCommonEventListeners();

    // The tunnel management UI only exists on some pages.
    if (document.getElementById('tunnelDropdownBtn')) {
        setupTunnelManagement();
    }
});

/**
 * Sets up common event listeners for elements present on all pages,
 * such as menus and the theme toggle.
 */
function setupCommonEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (mobileMenuBtn && mobileMenu && closeMobileMenu) {
        mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.add('active'));
        closeMobileMenu.addEventListener('click', () => mobileMenu.classList.remove('active'));
    }

    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');

    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the global click listener from closing it immediately
            userMenu.classList.toggle('hidden');
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Apply saved theme on initial load
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
        // Add click listener to toggle theme
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDarkMode = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            themeToggle.querySelector('i').classList.replace(isDarkMode ? 'fa-moon' : 'fa-sun', isDarkMode ? 'fa-sun' : 'fa-moon');
        });
    }

    // Global click listener to close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (userMenu && !userMenu.classList.contains('hidden') && !userMenuBtn.contains(e.target)) {
            userMenu.classList.add('hidden');
        }
        const tunnelDropdown = document.getElementById('tunnelDropdown');
        const tunnelDropdownBtn = document.getElementById('tunnelDropdownBtn');
        if (tunnelDropdown && tunnelDropdownBtn && !tunnelDropdown.classList.contains('hidden') && !tunnelDropdownBtn.contains(e.target)) {
            tunnelDropdown.classList.add('hidden');
        }
    });
}


// =================================================================================
// Tunnel Management Logic (Refactored to use API/KV)
// =================================================================================

let tunnels = [];
let editingTunnelId = null;

// --- API Helper Functions ---
async function loadTunnelsFromApi() {
    try {
        const response = await fetch('/api/tunnels');
        if (!response.ok) throw new Error('Failed to fetch tunnels from API');
        tunnels = await response.json();
    } catch (error) {
        console.error('Error loading tunnels:', error);
        tunnels = []; // Fallback to an empty array on error
    }
}

async function saveTunnelsToApi() {
    try {
        await fetch('/api/tunnels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tunnels)
        });
    } catch (error) {
        console.error('Error saving tunnels:', error);
        // Optionally, show an error message to the user here
    }
}


async function setupTunnelManagement() {
    await loadTunnelsFromApi();

    const tunnelDropdownBtn = document.getElementById('tunnelDropdownBtn');
    const tunnelDropdown = document.getElementById('tunnelDropdown');
    if (tunnelDropdownBtn) {
        tunnelDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            tunnelDropdown.classList.toggle('hidden');
        });
    }

    document.getElementById('addTunnelBtn').addEventListener('click', openAddTunnelModal);
    document.getElementById('tunnelForm').addEventListener('submit', saveTunnel);
    document.getElementById('cancelTunnelBtn').addEventListener('click', () => {
        document.getElementById('tunnelModal').classList.add('hidden');
    });

    renderTunnelList();
}

function renderTunnelList() {
    const tunnelList = document.getElementById('tunnelList');
    const tunnelEmptyState = document.getElementById('tunnelEmptyState');
    if (!tunnelList || !tunnelEmptyState) return;

    tunnelEmptyState.classList.toggle('hidden', tunnels.length > 0);
    tunnelList.innerHTML = tunnels.map(tunnel => {
        const statusClass = tunnel.status === 'online' ? 'text-green-600' : 'text-red-600';
        const statusIcon = tunnel.status === 'online' ? 'fa-check-circle' : 'fa-times-circle';
        return `
            <div class="tunnel-item p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${tunnel.name}</h4>
                        <p class="text-sm text-gray-600">${tunnel.domain}</p>
                    </div>
                    <div class="flex items-center space-x-2 ml-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                            <i class="fas ${statusIcon} mr-1"></i>
                            ${tunnel.status || 'unknown'}
                        </span>
                        <button onclick="editTunnel('${tunnel.id}')" class="p-1 text-gray-500 hover:text-blue-600"><i class="fas fa-edit"></i></button>
                        <button onclick="confirmDeleteTunnel('${tunnel.id}')" class="p-1 text-gray-500 hover:text-red-600"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Notify other parts of the app that tunnels might have changed (e.g., the proxy config modal)
    window.dispatchEvent(new CustomEvent('tunnelsUpdated'));
}

function openAddTunnelModal() {
    editingTunnelId = null;
    document.getElementById('tunnelModalTitle').textContent = 'Add New Tunnel';
    document.getElementById('tunnelForm').reset();
    document.getElementById('tunnelModal').classList.remove('hidden');
}

async function saveTunnel(e) {
    e.preventDefault();
    const name = document.getElementById('tunnelName').value;
    const domain = document.getElementById('tunnelDomain').value;
    let newTunnel = null;

    if (editingTunnelId) {
        const index = tunnels.findIndex(t => t.id === editingTunnelId);
        if (index !== -1) tunnels[index] = { ...tunnels[index], name, domain };
    } else {
        newTunnel = { id: crypto.randomUUID(), name, domain, status: 'unknown' };
        tunnels.push(newTunnel);
    }

    await saveTunnelsToApi();
    renderTunnelList();

    document.getElementById('tunnelModal').classList.add('hidden');
    if (newTunnel) {
        await checkSingleTunnelStatus(newTunnel);
    }
}

function editTunnel(tunnelId) {
    const tunnel = tunnels.find(t => t.id === tunnelId);
    if (!tunnel) return;
    editingTunnelId = tunnelId;
    document.getElementById('tunnelModalTitle').textContent = 'Edit Tunnel';
    document.getElementById('tunnelId').value = tunnel.id;
    document.getElementById('tunnelName').value = tunnel.name;
    document.getElementById('tunnelDomain').value = tunnel.domain;
    document.getElementById('tunnelModal').classList.remove('hidden');
}

function confirmDeleteTunnel(tunnelId) {
    if (confirm('Are you sure you want to delete this tunnel?')) {
        deleteTunnel(tunnelId);
    }
}

async function deleteTunnel(tunnelId) {
    tunnels = tunnels.filter(t => t.id !== tunnelId);
    await saveTunnelsToApi();
    renderTunnelList();
}

async function checkSingleTunnelStatus(tunnel) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`https://${tunnel.domain}`, { signal: controller.signal, mode: 'no-cors' });
        clearTimeout(timeoutId);
        // For 'no-cors', we can't read response status, so we assume success if it doesn't throw.
        // This is a basic check; a more robust solution would involve a server-side check.
        tunnel.status = 'online';
    } catch (error) {
        tunnel.status = 'offline';
    }
    await saveTunnelsToApi();
    renderTunnelList();
}

// Expose functions to be called from HTML onclick attributes
window.editTunnel = editTunnel;
window.confirmDeleteTunnel = confirmDeleteTunnel;
