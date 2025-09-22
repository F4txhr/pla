// =================================================================================
// Shared Application Logic
// =================================================================================

// --- Global State & Config ---
let tunnels = [];
let editingTunnelId = null;
const HEALTH_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupCommonEventListeners();

    if (document.getElementById('tunnelDropdownBtn')) {
        setupTunnelManagement();
    }

    // Start the background health check timer
    setTimeout(checkAllProxiesHealth, 2000); // Initial check after 2s
    setInterval(checkAllProxiesHealth, HEALTH_CHECK_INTERVAL);
});


// --- Common Event Listeners ---
function setupCommonEventListeners() {
    // Mobile menu
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (mobileMenuBtn && mobileMenu && closeMobileMenu) {
        mobileMenuBtn.addEventListener('click', () => mobileMenu.classList.add('active'));
        closeMobileMenu.addEventListener('click', () => mobileMenu.classList.remove('active'));
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
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark');
            themeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
        }
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            const isDarkMode = document.body.classList.contains('dark');
            localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
            themeToggle.querySelector('i').classList.replace(isDarkMode ? 'fa-moon' : 'fa-sun', isDarkMode ? 'fa-sun' : 'fa-moon');
        });
    }

    // Global click listener to close menus
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


// --- Centralized Health Check Logic ---

async function checkAllProxiesHealth() {
    console.log(`[${new Date().toLocaleTimeString()}] Starting background health check for all proxies.`);
    let proxies = JSON.parse(localStorage.getItem('proxyBank') || '[]');
    if (proxies.length === 0) return;

    const batchSize = 50;
    for (let i = 0; i < proxies.length; i += batchSize) {
        const batch = proxies.slice(i, i + batchSize);
        await processHealthCheckBatch(batch, proxies);
    }

    localStorage.setItem('proxyBank', JSON.stringify(proxies));
    console.log(`[${new Date().toLocaleTimeString()}] Background health check complete.`);

    // Dispatch a custom event to notify other pages of the update
    window.dispatchEvent(new CustomEvent('proxiesUpdated'));
}

async function processHealthCheckBatch(batch, allProxies) {
    const healthChecks = batch.map(proxy => {
        const url = `${API_BASE_URL}/health?proxy=${proxy.proxyIP}:${proxy.proxyPort}`;
        return fetch(url)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .catch(err => ({
                success: false,
                proxy: `${proxy.proxyIP}:${proxy.proxyPort}`,
                status: 'DOWN',
                latency_ms: 0,
                error: err.message
            }));
    });

    const results = await Promise.all(healthChecks);

    results.forEach(result => {
        const proxyToUpdate = allProxies.find(p => `${p.proxyIP}:${p.proxyPort}` === result.proxy);
        if (proxyToUpdate) {
            proxyToUpdate.status = result.success ? 'online' : 'offline';
            proxyToUpdate.latency = result.latency_ms || 0;
            proxyToUpdate.lastChecked = new Date().toISOString();
        }
    });
}


// --- Tunnel Management Logic ---

function setupTunnelManagement() {
    const savedTunnels = localStorage.getItem('tunnelServices');
    tunnels = savedTunnels ? JSON.parse(savedTunnels) : [];

    const tunnelDropdownBtn = document.getElementById('tunnelDropdownBtn');
    const tunnelDropdown = document.getElementById('tunnelDropdown');
    tunnelDropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tunnelDropdown.classList.toggle('hidden');
    });

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
        const statusIcon = tunnel.status === 'online' ? 'check-circle' : 'times-circle';
        return `
            <div class="tunnel-item p-3">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${tunnel.name}</h4>
                        <p class="text-sm text-gray-600">${tunnel.domain}</p>
                    </div>
                    <div class="flex items-center space-x-2 ml-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}">
                            <i class="fas fa-${statusIcon} mr-1"></i>
                            ${tunnel.status || 'unknown'}
                        </span>
                        <button onclick="editTunnel('${tunnel.id}')" class="p-1 text-gray-500 hover:text-blue-600"><i class="fas fa-edit"></i></button>
                        <button onclick="confirmDeleteTunnel('${tunnel.id}')" class="p-1 text-gray-500 hover:text-red-600"><i class="fas fa-trash"></i></button>
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
        if (index !== -1) tunnels[index] = { ...tunnels[index], name, domain };
    } else {
        const newTunnel = { id: crypto.randomUUID(), name, domain, status: 'unknown' };
        tunnels.push(newTunnel);
    }

    localStorage.setItem('tunnelServices', JSON.stringify(tunnels));
    renderTunnelList();

    if (typeof populateSelects === 'function') populateSelects();
    if (typeof updateWorkerDomainOptions === 'function') updateWorkerDomainOptions();

    document.getElementById('tunnelModal').classList.add('hidden');
    if (!editingTunnelId) checkSingleTunnelStatus(tunnels[tunnels.length - 1]);
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
    if (confirm('Are you sure you want to delete this tunnel?')) deleteTunnel(tunnelId);
}

function deleteTunnel(tunnelId) {
    tunnels = tunnels.filter(t => t.id !== tunnelId);
    localStorage.setItem('tunnelServices', JSON.stringify(tunnels));
    renderTunnelList();
    if (typeof populateSelects === 'function') populateSelects();
    if (typeof updateWorkerDomainOptions === 'function') updateWorkerDomainOptions();
}

async function checkSingleTunnelStatus(tunnel) {
    try {
        const response = await fetch(`https://${tunnel.domain}`);
        tunnel.status = response.ok ? 'online' : 'offline';
    } catch (error) {
        tunnel.status = 'offline';
    }
    localStorage.setItem('tunnelServices', JSON.stringify(tunnels));
    renderTunnelList();
}

window.editTunnel = editTunnel;
window.confirmDeleteTunnel = confirmDeleteTunnel;
