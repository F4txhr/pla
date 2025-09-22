// =================================================================================
// Proxies Page Logic
// =================================================================================

// --- Page State ---
let proxies = [];
let filteredProxies = [];
let currentPage = 1;
let pageSize = 12;
let selectedProxy = null;
let selectedVpnType = 'trojan';
let selectedPort = '443';
let selectedFormat = 'uri';

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeProxyPage();
    setupProxyEventListeners();
});


// --- Initialization ---

function initializeProxyPage() {
    const savedProxies = localStorage.getItem('proxyBank');
    proxies = savedProxies ? JSON.parse(savedProxies) : [];

    updateWorkerDomainOptions();
    populateCountryFilter();
    applyFiltersAndRender();

    // Check health of visible proxies for a fast initial load
    checkVisibleProxiesHealth();
}

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
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    document.getElementById('emptyStateImportBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    document.getElementById('cancelImportBtn').addEventListener('click', () => document.getElementById('importModal').classList.add('hidden'));
    document.getElementById('confirmImportBtn').addEventListener('click', importProxies);

    // Main refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => checkAllProxiesHealth(true));

    // Filters and pagination
    document.getElementById('countryFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('statusFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        applyFiltersAndRender();
    });

    setupGenerateConfigModalListeners();
}


// --- UI Rendering & Filtering ---

function applyFiltersAndRender() {
    applyFilters();
    currentPage = 1;
    renderProxies();
    renderPagination();
}

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

function populateCountryFilter() {
    const countryFilter = document.getElementById('countryFilter');
    const uniqueCountries = [...new Set(proxies.map(p => p.country).filter(Boolean))].sort();

    // Clear existing options except the first one
    while (countryFilter.options.length > 1) {
        countryFilter.remove(1);
    }

    uniqueCountries.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${getFlagEmoji(code)} ${getCountryName(code)}`;
        countryFilter.appendChild(option);
    });
}

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
        const latencyClass = proxy.latency < 150 ? 'latency-low' : proxy.latency < 500 ? 'latency-medium' : 'latency-high';
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
                            data-proxy-id='${proxy.id}'>
                        <i class="fas fa-cog mr-2"></i> Generate Config
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.generate-config-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedProxy = proxies.find(p => p.id === e.currentTarget.dataset.proxyId);
            document.getElementById('generateConfigModal').classList.remove('hidden');
            generateUUID();
        });
    });
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredProxies.length / pageSize);

    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    const maxVisiblePages = 5;

    paginationHTML += `<button class="px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-white border'}" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

    if (totalPages > maxVisiblePages + 2) {
        let startPage = Math.max(2, currentPage - 2);
        let endPage = Math.min(totalPages - 1, currentPage + 2);

        paginationHTML += `<button class="px-3 py-1 rounded-md ${1 === currentPage ? 'bg-blue-600 text-white' : 'bg-white border'}" onclick="changePage(1)">1</button>`;
        if (startPage > 2) paginationHTML += `<span class="px-3 py-1">...</span>`;

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `<button class="px-3 py-1 rounded-md ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white border'}" onclick="changePage(${i})">${i}</button>`;
        }

        if (endPage < totalPages - 1) paginationHTML += `<span class="px-3 py-1">...</span>`;
        paginationHTML += `<button class="px-3 py-1 rounded-md ${totalPages === currentPage ? 'bg-blue-600 text-white' : 'bg-white border'}" onclick="changePage(${totalPages})">${totalPages}</button>`;
    } else {
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `<button class="px-3 py-1 rounded-md ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white border'}" onclick="changePage(${i})">${i}</button>`;
        }
    }

    paginationHTML += `<button class="px-3 py-1 rounded-md ${currentPage === totalPages ? 'bg-gray-200 cursor-not-allowed' : 'bg-white border'}" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;

    pagination.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProxies.length / pageSize);
    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderProxies();
    renderPagination();
    checkVisibleProxiesHealth();
    document.getElementById('proxyContainer').scrollIntoView({ behavior: 'smooth' });
}


// --- Health Checks ---

async function checkVisibleProxiesHealth() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const visibleProxies = filteredProxies.slice(startIndex, endIndex);
    await processHealthCheckBatch(visibleProxies);
    renderProxies(); // Re-render to show updated statuses
}

async function checkAllProxiesHealth(showIndicator = false) {
    if (showIndicator) {
        document.getElementById('loadingIndicator').classList.remove('hidden');
        document.getElementById('proxyContainer').classList.add('hidden');
        document.getElementById('pagination').classList.add('hidden');
    }

    const batchSize = 50;
    for (let i = 0; i < proxies.length; i += batchSize) {
        const batch = proxies.slice(i, i + batchSize);
        await processHealthCheckBatch(batch);
    }

    localStorage.setItem('proxyBank', JSON.stringify(proxies));

    if (showIndicator) {
        setTimeout(() => {
            document.getElementById('loadingIndicator').classList.add('hidden');
            document.getElementById('proxyContainer').classList.remove('hidden');
            document.getElementById('pagination').classList.remove('hidden');
            applyFiltersAndRender();
        }, 500);
    }
}

async function processHealthCheckBatch(batch) {
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
        const proxyToUpdate = proxies.find(p => `${p.proxyIP}:${p.proxyPort}` === result.proxy);
        if (proxyToUpdate) {
            proxyToUpdate.status = result.success ? 'online' : 'offline';
            proxyToUpdate.latency = result.latency_ms || 0;
            proxyToUpdate.lastChecked = new Date().toISOString();
        }
    });
}


// --- Config Generation & Import ---

function setupGenerateConfigModalListeners() {
    document.querySelectorAll('.vpn-type-btn').forEach(btn => btn.addEventListener('click', (e) => {
        document.querySelectorAll('.vpn-type-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        e.target.classList.add('bg-blue-600', 'text-white');
        selectedVpnType = e.target.dataset.type;
    }));
    document.querySelectorAll('.port-btn').forEach(btn => btn.addEventListener('click', (e) => {
        document.querySelectorAll('.port-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        e.target.classList.add('bg-blue-600', 'text-white');
        selectedPort = e.target.dataset.port;
    }));
    document.querySelectorAll('.format-btn').forEach(btn => btn.addEventListener('click', (e) => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
        e.target.classList.add('bg-blue-600', 'text-white');
        selectedFormat = e.target.dataset.format;
    }));

    document.getElementById('generateUuidBtn').addEventListener('click', generateUUID);
    document.getElementById('cancelGenerateBtn').addEventListener('click', () => document.getElementById('generateConfigModal').classList.add('hidden'));
    document.getElementById('confirmGenerateBtn').addEventListener('click', generateConfiguration);
    document.getElementById('closeResultBtn').addEventListener('click', () => document.getElementById('resultModal').classList.add('hidden'));
    document.getElementById('copyResultBtn').addEventListener('click', copyResult);

    document.querySelector('.vpn-type-btn[data-type="trojan"]').classList.add('bg-blue-600', 'text-white');
    document.querySelector('.port-btn[data-port="443"]').classList.add('bg-blue-600', 'text-white');
    document.querySelector('.format-btn[data-format="uri"]').classList.add('bg-blue-600', 'text-white');
}

async function importProxies() {
    const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
    if (!proxyUrl) return alert('Please enter a URL.');

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const text = await response.text();
        const lines = text.split('\n').filter(Boolean);

        const newProxies = lines.map(line => {
            const [proxyIP, proxyPort, country, org] = line.split(',');
            return { id: crypto.randomUUID(), proxyIP, proxyPort, country, org, status: 'unknown', latency: 0 };
        });

        if (newProxies.length === 0) return alert('No valid proxies found.');

        proxies.push(...newProxies);
        localStorage.setItem('proxyBank', JSON.stringify(proxies));

        alert(`Successfully imported ${newProxies.length} proxies.`);
        document.getElementById('importModal').classList.add('hidden');
        populateCountryFilter();
        applyFiltersAndRender();
        checkAllProxiesHealth(true);
    } catch (error) {
        console.error('Import Error:', error);
        alert('Failed to import proxies.');
    }
}

function generateConfiguration() {
    const workerDomain = document.getElementById('workerDomainSelect').value;
    const uuid = document.getElementById('uuidInput').value;
    if (!workerDomain || !selectedProxy) return alert('Please select a worker domain and a proxy.');

    const host = new URL(workerDomain).hostname;
    const security = selectedPort === '443' ? 'tls' : 'none';
    const path = encodeURIComponent(`/${selectedProxy.proxyIP}-${selectedProxy.proxyPort}`);
    const remark = encodeURIComponent(`${selectedVpnType.toUpperCase()}-${selectedProxy.country}`);
    let config = '';

    if (selectedVpnType === 'trojan') {
        config = `trojan://${uuid}@${host}:${selectedPort}?path=${path}&security=${security}&host=${host}&type=ws&sni=${host}#${remark}`;
    } else if (selectedVpnType === 'vless') {
        config = `vless://${uuid}@${host}:${selectedPort}?path=${path}&security=${security}&encryption=none&host=${host}&type=ws&sni=${host}#${remark}`;
    } else if (selectedVpnType === 'ss') {
        const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
        config = `ss://${encodedPassword}@${host}:${selectedPort}?plugin=v2ray-plugin;mode=websocket;path=${path};host=${host}${security === 'tls' ? ';tls' : ''};sni=${host}#${remark}`;
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


// --- Utility Functions ---

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

function updateWorkerDomainOptions() {
    const workerDomainSelect = document.getElementById('workerDomainSelect');
    if (!workerDomainSelect) return;
    workerDomainSelect.innerHTML = '<option value="">Select a worker domain</option>';
    tunnels.forEach(tunnel => {
        const option = document.createElement('option');
        option.value = `https://${tunnel.domain}`;
        option.textContent = `${tunnel.name} (${tunnel.domain})`;
        workerDomainSelect.appendChild(option);
    });
}

function getCountryName(code) {
    const names = { 'US': 'United States', 'SG': 'Singapore', 'JP': 'Japan', 'DE': 'Germany', 'FR': 'France' };
    return names[code] || code;
}

function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Make functions globally accessible for onclick handlers
window.changePage = changePage;
