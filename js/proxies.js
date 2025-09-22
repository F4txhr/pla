// =================================================================================
// Proxies Page Logic
// =================================================================================

// Global variables for the proxies page
let proxies = [];
let filteredProxies = [];
let currentPage = 1;
let pageSize = 12;
let selectedProxy = null;
let selectedVpnType = 'trojan';
let selectedPort = '443';
let selectedFormat = 'uri';

document.addEventListener('DOMContentLoaded', () => {
    initializeProxyData();
    setupProxyEventListeners();
    renderProxies();
    renderPagination();
});

/**
 * Initializes proxy data from localStorage.
 */
function initializeProxyData() {
    const savedProxies = localStorage.getItem('proxyBank');
    proxies = savedProxies ? JSON.parse(savedProxies) : [];

    // The tunnel data is loaded by the shared app.js, but we need to populate the dropdown
    updateWorkerDomainOptions();

    applyFilters();
}

/**
 * Updates the options in the worker domain select dropdown.
 */
function updateWorkerDomainOptions() {
    const workerDomainSelect = document.getElementById('workerDomainSelect');
    if (!workerDomainSelect) return;

    // 'tunnels' is a global from app.js
    workerDomainSelect.innerHTML = '<option value="">Select a worker domain</option>';
    tunnels.forEach(tunnel => {
        const option = document.createElement('option');
        option.value = `https://${tunnel.domain}`;
        option.textContent = `${tunnel.name} (${tunnel.domain})`;
        workerDomainSelect.appendChild(option);
    });
}

/**
 * Sets up event listeners specific to the proxies page.
 */
function setupProxyEventListeners() {
    // FAB menu
    const fabBtn = document.getElementById('fabBtn');
    const fabMenu = document.getElementById('fabMenu');
    fabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fabMenu.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!fabBtn.contains(e.target) && !fabMenu.contains(e.target)) {
            fabMenu.classList.add('hidden');
        }
    });

    // Import modal
    document.getElementById('importBtn').addEventListener('click', openImportModal);
    document.getElementById('emptyStateImportBtn').addEventListener('click', openImportModal);
    document.getElementById('cancelImportBtn').addEventListener('click', closeImportModal);
    document.getElementById('confirmImportBtn').addEventListener('click', importProxies);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', checkAllProxiesHealth);

    // Filters and pagination
    document.getElementById('countryFilter').addEventListener('change', handleFilterChange);
    document.getElementById('statusFilter').addEventListener('change', handleFilterChange);
    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        currentPage = 1;
        renderProxies();
        renderPagination();
    });

    // Generate Config Modal
    setupGenerateConfigModalListeners();
}

function openImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
}

function closeImportModal() {
    document.getElementById('importModal').classList.add('hidden');
    document.getElementById('proxyUrlInput').value = '';
    document.getElementById('sourceNameInput').value = '';
}

function handleFilterChange() {
    currentPage = 1;
    applyFilters();
    renderProxies();
    renderPagination();
}

/**
 * Sets up event listeners for the generate config modal.
 */
function setupGenerateConfigModalListeners() {
    // Button clicks
    document.querySelectorAll('.vpn-type-btn').forEach(btn => btn.addEventListener('click', selectVpnType));
    document.querySelectorAll('.port-btn').forEach(btn => btn.addEventListener('click', selectPort));
    document.querySelectorAll('.format-btn').forEach(btn => btn.addEventListener('click', selectFormat));

    // Actions
    document.getElementById('generateUuidBtn').addEventListener('click', generateUUID);
    document.getElementById('cancelGenerateBtn').addEventListener('click', () => document.getElementById('generateConfigModal').classList.add('hidden'));
    document.getElementById('confirmGenerateBtn').addEventListener('click', generateConfiguration);

    // Result modal
    document.getElementById('closeResultBtn').addEventListener('click', () => document.getElementById('resultModal').classList.add('hidden'));
    document.getElementById('copyResultBtn').addEventListener('click', copyResult);

    // Set defaults
    document.querySelector('.vpn-type-btn[data-type="trojan"]').classList.add('bg-blue-600', 'text-white');
    document.querySelector('.port-btn[data-port="443"]').classList.add('bg-blue-600', 'text-white');
    document.querySelector('.format-btn[data-format="uri"]').classList.add('bg-blue-600', 'text-white');
}

function selectVpnType(e) {
    document.querySelectorAll('.vpn-type-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    e.target.classList.add('bg-blue-600', 'text-white');
    selectedVpnType = e.target.dataset.type;
}

function selectPort(e) {
    document.querySelectorAll('.port-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    e.target.classList.add('bg-blue-600', 'text-white');
    selectedPort = e.target.dataset.port;
}

function selectFormat(e) {
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    e.target.classList.add('bg-blue-600', 'text-white');
    selectedFormat = e.target.dataset.format;
}

/**
 * Applies filters to the main proxy list.
 */
function applyFilters() {
    const countryFilter = document.getElementById('countryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredProxies = proxies;
    if (countryFilter) {
        filteredProxies = filteredProxies.filter(p => p.country === countryFilter);
    }
    if (statusFilter) {
        filteredProxies = filteredProxies.filter(p => p.status === statusFilter);
    }

    document.getElementById('totalProxies').textContent = filteredProxies.length;
}

/**
 * Renders the proxy cards to the page.
 */
function renderProxies() {
    const proxyContainer = document.getElementById('proxyContainer');
    const emptyState = document.getElementById('emptyState');

    if (filteredProxies.length === 0) {
        proxyContainer.innerHTML = '';
        emptyState.classList.remove('hidden');
        document.getElementById('showingFrom').textContent = 0;
        document.getElementById('showingTo').textContent = 0;
        return;
    }

    emptyState.classList.add('hidden');

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProxies.length);
    const paginatedProxies = filteredProxies.slice(startIndex, endIndex);

    document.getElementById('showingFrom').textContent = startIndex + 1;
    document.getElementById('showingTo').textContent = endIndex;

    proxyContainer.innerHTML = paginatedProxies.map(proxy => {
        const latencyClass = proxy.latency < 70 ? 'latency-low' : proxy.latency < 150 ? 'latency-medium' : 'latency-high';
        const latencyText = proxy.status === 'offline' ? '-' : `${proxy.latency}ms`;

        return `
            <div class="proxy-card bg-white rounded-lg shadow-md overflow-hidden slide-in">
                <div class="p-4">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center">
                            <img src="https://hatscripts.github.io/circle-flags/flags/${proxy.country.toLowerCase()}.svg"
                                 alt="${proxy.country}" class="flag-icon mr-2">
                            <div>
                                <h3 class="font-semibold text-gray-900">${getCountryName(proxy.country)}</h3>
                                <p class="text-xs text-gray-500">${proxy.org || 'Unknown Org'}</p>
                            </div>
                        </div>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${proxy.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            <span class="w-2 h-2 rounded-full mr-1 ${proxy.status === 'online' ? 'bg-green-500' : 'bg-red-500'}"></span>
                            ${proxy.status}
                        </span>
                    </div>
                    <div class="mb-4 space-y-2">
                        <div class="text-sm text-gray-600"><i class="fas fa-server mr-2"></i><span class="font-medium">${proxy.proxyIP}</span></div>
                        <div class="text-sm text-gray-600"><i class="fas fa-network-wired mr-2"></i>Port: <span class="font-medium">${proxy.proxyPort}</span></div>
                        <div class="text-sm ${latencyClass}"><i class="fas fa-clock mr-2"></i>Latency: <span class="font-medium">${latencyText}</span></div>
                    </div>
                    <button class="generate-config-btn w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                            data-proxy='${JSON.stringify(proxy)}'>
                        <i class="fas fa-cog mr-2"></i> Generate Config
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.generate-config-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedProxy = JSON.parse(e.currentTarget.dataset.proxy);
            document.getElementById('generateConfigModal').classList.remove('hidden');
            generateUUID(); // pre-fill a new UUID
        });
    });
}

/**
 * Renders pagination controls.
 */
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredProxies.length / pageSize);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    // Previous button
    paginationHTML += `<button class="px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-white border'}" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button class="px-3 py-1 rounded-md ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white border'}" onclick="changePage(${i})">${i}</button>`;
    }

    // Next button
    paginationHTML += `<button class="px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-white border'}" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;

    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProxies.length / pageSize);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderProxies();
    renderPagination();
    document.getElementById('proxyContainer').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Imports proxies from a given URL.
 */
async function importProxies() {
    const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
    const sourceName = document.getElementById('sourceNameInput').value.trim() || 'Manual Import';
    if (!proxyUrl) return alert('Please enter a URL.');

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

        const text = await response.text();
        const lines = text.split('\n').filter(Boolean);

        const newProxies = lines.map(line => {
            const [proxyIP, proxyPort, country, org] = line.split(',');
            return {
                id: crypto.randomUUID(),
                proxyIP: proxyIP || 'N/A',
                proxyPort: proxyPort || 'N/A',
                country: country || 'N/A',
                org: org || 'N/A',
                status: 'unknown',
                latency: 0,
                addedAt: new Date().toISOString()
            };
        });

        if (newProxies.length === 0) return alert('No valid proxies found.');

        proxies.push(...newProxies);
        localStorage.setItem('proxyBank', JSON.stringify(proxies));

        alert(`Successfully imported ${newProxies.length} proxies.`);
        closeImportModal();
        handleFilterChange(); // Re-render everything
        checkAllProxiesHealth(); // Check health of all proxies
    } catch (error) {
        console.error('Import Error:', error);
        alert('Failed to import proxies.');
    }
}

/**
 * Checks the health of all proxies.
 */
async function checkAllProxiesHealth() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('proxyContainer').classList.add('hidden');

    // This is a simplified health check. In a real app, you'd use the API.
    for (const proxy of proxies) {
        // Simulate a health check
        const isOnline = Math.random() > 0.3; // 70% chance of being online
        proxy.status = isOnline ? 'online' : 'offline';
        proxy.latency = isOnline ? Math.floor(Math.random() * 200) + 30 : 0;
    }

    localStorage.setItem('proxyBank', JSON.stringify(proxies));

    // Simulate network delay
    setTimeout(() => {
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('proxyContainer').classList.remove('hidden');
        applyFilters();
        renderProxies();
        renderPagination();
    }, 1000);
}

/**
 * Generates a VPN configuration URI.
 */
function generateConfiguration() {
    const workerDomain = document.getElementById('workerDomainSelect').value;
    const uuid = document.getElementById('uuidInput').value;
    if (!workerDomain || !selectedProxy) return alert('Please select a worker domain and a proxy.');

    const domain = new URL(workerDomain).hostname;
    let config = '';

    if (selectedVpnType === 'trojan') {
        config = `trojan://${uuid}@${domain}:${selectedPort}?path=/${selectedProxy.proxyIP}:${selectedProxy.proxyPort}&type=ws&host=${domain}&security=${selectedPort === '443' ? 'tls' : 'none'}#Trojan-${selectedProxy.country}`;
    } else if (selectedVpnType === 'vless') {
        config = `vless://${uuid}@${domain}:${selectedPort}?path=/${selectedProxy.proxyIP}:${selectedProxy.proxyPort}&type=ws&host=${domain}&encryption=none&security=${selectedPort === '443' ? 'tls' : 'none'}#VLESS-${selectedProxy.country}`;
    } else if (selectedVpnType === 'ss') {
        const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
        config = `ss://${encodedPassword}@${domain}:${selectedPort}?plugin=v2ray-plugin;mode=websocket;path=/${selectedProxy.proxyIP}:${selectedProxy.proxyPort};host=${domain}${selectedPort === '443' ? ';tls' : ''}#SS-${selectedProxy.country}`;
    }

    const resultContent = document.getElementById('resultContent');
    if (selectedFormat === 'qrcode') {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(config)}`;
        resultContent.innerHTML = `<div class="text-center"><img src="${qrUrl}" alt="QR Code" class="mx-auto"></div>`;
    } else {
        resultContent.innerHTML = `<pre class="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">${config}</pre>`;
    }

    document.getElementById('generateConfigModal').classList.add('hidden');
    document.getElementById('resultModal').classList.remove('hidden');
}

function generateUUID() {
    const uuid = crypto.randomUUID();
    document.getElementById('uuidInput').value = uuid;
    return uuid;
}

function copyResult() {
    const content = document.querySelector('#resultContent pre')?.textContent;
    if (!content) return alert('No configuration to copy.');

    navigator.clipboard.writeText(content).then(() => {
        const copyBtn = document.getElementById('copyResultBtn');
        copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy mr-2"></i> Copy'; }, 2000);
    }).catch(err => alert('Failed to copy.'));
}

function getCountryName(code) {
    const names = { 'US': 'United States', 'SG': 'Singapore', 'JP': 'Japan', 'DE': 'Germany', 'FR': 'France' };
    return names[code] || code;
}

// Make functions globally accessible for onclick handlers
window.changePage = changePage;
