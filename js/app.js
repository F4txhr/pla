// =================================================================================
// Shared Application Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Setup common event listeners for all pages
    setupCommonEventListeners();

    // Check if the tunnel management UI elements exist before setting them up
    if (document.getElementById('tunnelDropdownBtn')) {
        setupTunnelManagement();
    }
});

/**
 * Sets up common event listeners for elements present on all pages.
 */
function setupCommonEventListeners() {
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (mobileMenuBtn && mobileMenu && closeMobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.add('active');
        });

        closeMobileMenu.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
        });
    }

    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenu = document.getElementById('userMenu');

    if (userMenuBtn && userMenu) {
        userMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // Apply saved theme on load
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }

        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDarkMode = document.body.classList.contains('dark');
            const icon = themeToggle.querySelector('i');

            if (isDarkMode) {
                icon.classList.replace('fa-moon', 'fa-sun');
                localStorage.setItem('theme', 'dark');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        // Close user menu
        if (userMenu && !userMenu.classList.contains('hidden') && !userMenuBtn.contains(e.target)) {
            userMenu.classList.add('hidden');
        }

        // Close tunnel dropdown
        const tunnelDropdown = document.getElementById('tunnelDropdown');
        const tunnelDropdownBtn = document.getElementById('tunnelDropdownBtn');
        if (tunnelDropdown && tunnelDropdownBtn && !tunnelDropdown.classList.contains('hidden') && !tunnelDropdownBtn.contains(e.target)) {
            tunnelDropdown.classList.add('hidden');
        }
    });
}


// =================================================================================
// Tunnel Management Logic (Used on Proxy and Subscription pages)
// =================================================================================

let tunnels = [];
let editingTunnelId = null;

/**
 * Sets up event listeners for tunnel management UI.
 */
function setupTunnelManagement() {
    // Load tunnels from localStorage
    const savedTunnels = localStorage.getItem('tunnelServices');
    tunnels = savedTunnels ? JSON.parse(savedTunnels) : [];

    // Dropdown toggle
    const tunnelDropdownBtn = document.getElementById('tunnelDropdownBtn');
    const tunnelDropdown = document.getElementById('tunnelDropdown');
    tunnelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tunnelDropdown.classList.toggle('hidden');
    });

    // Modal controls
    document.getElementById('addTunnelBtn').addEventListener('click', openAddTunnelModal);
    document.getElementById('tunnelForm').addEventListener('submit', saveTunnel);
    document.getElementById('cancelTunnelBtn').addEventListener('click', () => {
        document.getElementById('tunnelModal').classList.add('hidden');
    });

    // Initial render
    renderTunnelList();
}

/**
 * Renders the list of tunnels in the dropdown.
 */
function renderTunnelList() {
    const tunnelList = document.getElementById('tunnelList');
    const tunnelEmptyState = document.getElementById('tunnelEmptyState');

    if (!tunnelList || !tunnelEmptyState) return;

    if (tunnels.length === 0) {
        tunnelList.innerHTML = '';
        tunnelEmptyState.classList.remove('hidden');
        return;
    }

    tunnelEmptyState.classList.add('hidden');

    tunnelList.innerHTML = tunnels.map(tunnel => {
        const statusClass = tunnel.status === 'online' ? 'text-green-600' :
                          tunnel.status === 'offline' ? 'text-red-600' : 'text-yellow-600';
        const statusIcon = tunnel.status === 'online' ? 'check-circle' :
                         tunnel.status === 'offline' ? 'times-circle' : 'exclamation-circle';

        return `
            <div class="tunnel-item p-3">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center mb-1">
                            <h4 class="font-medium text-gray-900">${tunnel.name}</h4>
                            <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                                <i class="fas fa-${statusIcon} mr-1"></i>
                                ${tunnel.status || 'unknown'}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600">${tunnel.domain}</p>
                    </div>
                    <div class="flex space-x-1 ml-2">
                        <button onclick="editTunnel('${tunnel.id}')" class="p-1 text-gray-500 hover:text-blue-600">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteTunnel('${tunnel.id}')" class="p-1 text-gray-500 hover:text-red-600">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openAddTunnelModal() {
    editingTunnelId = null;
    document.getElementById('tunnelModalTitle').textContent = 'Add New Tunnel';
    document.getElementById('tunnelForm').reset();
    document.getElementById('tunnelModal').classList.remove('hidden');
}

function saveTunnel(e) {
    e.preventDefault();

    const name = document.getElementById('tunnelName').value;
    const domain = document.getElementById('tunnelDomain').value;

    if (editingTunnelId) {
        const index = tunnels.findIndex(t => t.id === editingTunnelId);
        if (index !== -1) {
            tunnels[index] = { ...tunnels[index], name, domain };
        }
    } else {
        const newTunnel = {
            id: crypto.randomUUID(),
            name,
            domain,
            status: 'unknown'
        };
        tunnels.push(newTunnel);
    }

    localStorage.setItem('tunnelServices', JSON.stringify(tunnels));
    renderTunnelList();

    // If the page has a function to update its selects, call it
    if (typeof populateSelects === 'function') {
        populateSelects();
    }
    if (typeof updateWorkerDomainOptions === 'function') {
        updateWorkerDomainOptions();
    }

    document.getElementById('tunnelModal').classList.add('hidden');

    if (!editingTunnelId) {
        checkTunnelStatus(tunnels[tunnels.length - 1]);
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

function deleteTunnel(tunnelId) {
    tunnels = tunnels.filter(t => t.id !== tunnelId);
    localStorage.setItem('tunnelServices', JSON.stringify(tunnels));
    renderTunnelList();

    // If the page has a function to update its selects, call it
    if (typeof populateSelects === 'function') {
        populateSelects();
    }
     if (typeof updateWorkerDomainOptions === 'function') {
        updateWorkerDomainOptions();
    }
}

async function checkTunnelStatus(tunnel) {
    try {
        const response = await fetch(`https://${tunnel.domain}`);
        tunnel.status = response.ok ? 'online' : 'offline';
    } catch (error) {
        tunnel.status = 'offline';
    }
    localStorage.setItem('tunnelServices', JSON.stringify(tunnels));
    renderTunnelList();
}

// Make tunnel functions globally accessible for onclick handlers
window.editTunnel = editTunnel;
window.confirmDeleteTunnel = confirmDeleteTunnel;
