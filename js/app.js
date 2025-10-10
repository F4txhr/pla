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
// Tunnel Management Logic
// =================================================================================

let tunnels = [];
let editingTunnelId = null;

async function loadTunnelsFromApi() {
    try {
        const response = await fetch('/api/tunnels');
        if (!response.ok) throw new Error('Failed to fetch tunnels from API');
        tunnels = await response.json();
    } catch (error) {
        console.error('Error loading tunnels:', error);
        tunnels = [];
    }
}

async function setupTunnelManagement() {
    // 1. Load tunnels with their last known status from the database.
    await loadTunnelsFromApi();
    // 2. Render the list immediately with the stored data.
    renderTunnelList();
    // 3. Asynchronously check the live status of all tunnels and update the UI.
    checkAllTunnelStatuses();

    // Setup event listeners for the modal and buttons.
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
    const method = editingTunnelId ? 'PATCH' : 'POST';
    const body = editingTunnelId ? { id: editingTunnelId, name, domain } : { name, domain };

    try {
        const response = await fetch('/api/tunnels', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to save tunnel.');
        }

        await loadTunnelsFromApi();
        renderTunnelList();
        document.getElementById('tunnelModal').classList.add('hidden');

        const savedTunnel = await response.json();
        const tunnelToCheck = tunnels.find(t => t.id === savedTunnel.id);
        if (tunnelToCheck) {
            await checkSingleTunnelStatus(tunnelToCheck);
        }
    } catch (error) {
        console.error('Error saving tunnel:', error);
        alert(`Error: ${error.message}`);
    }
}

function editTunnel(tunnelId) {
    const idAsNumber = parseInt(tunnelId, 10);
    const tunnel = tunnels.find(t => t.id === idAsNumber);
    if (!tunnel) return;

    editingTunnelId = idAsNumber;
    document.getElementById('tunnelModalTitle').textContent = 'Edit Tunnel';
    document.getElementById('tunnelName').value = tunnel.name;
    document.getElementById('tunnelDomain').value = tunnel.domain;
    document.getElementById('tunnelModal').classList.remove('hidden');
}

function confirmDeleteTunnel(tunnelId) {
    if (confirm('Are you sure you want to delete this tunnel?')) {
        deleteTunnel(parseInt(tunnelId, 10));
    }
}

async function deleteTunnel(tunnelId) {
    try {
        const response = await fetch('/api/tunnels', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tunnelId })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to delete tunnel.');
        }
        await loadTunnelsFromApi();
        renderTunnelList();
    } catch (error) {
        console.error('Error deleting tunnel:', error);
        alert(`Error: ${error.message}`);
    }
}

async function checkAllTunnelStatuses() {
    if (tunnels.length === 0) return;
    const checkPromises = tunnels.map(tunnel => checkSingleTunnelStatus(tunnel, false));
    await Promise.all(checkPromises);
    renderTunnelList();
}

async function checkSingleTunnelStatus(tunnel, shouldRender = true) {
    let newStatus;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(`https://${tunnel.domain}`, { signal: controller.signal, mode: 'no-cors' });
        clearTimeout(timeoutId);
        newStatus = 'online';
    } catch (error) {
        newStatus = 'offline';
    }

    if (tunnel.status !== newStatus) {
        try {
            const response = await fetch('/api/tunnels', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tunnel.id, status: newStatus })
            });

            if (!response.ok) {
                console.error(`Failed to update status for tunnel ${tunnel.id}`);
                return;
            }
            const updatedTunnel = await response.json();
            const index = tunnels.findIndex(t => t.id === updatedTunnel.id);
            if (index !== -1) {
                tunnels[index] = updatedTunnel;
            }
        } catch (error) {
            console.error('Error saving tunnel status:', error);
        }
    }

    if (shouldRender) {
        renderTunnelList();
    }
}

window.editTunnel = editTunnel;
window.confirmDeleteTunnel = confirmDeleteTunnel;