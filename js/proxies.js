// =================================================================================
// Proxies Page Logic
// =================================================================================

// --- Page State ---
let allProxies = [];
let filteredProxies = [];
let currentPage = 1;
let pageSize = 12;
let selectedProxy = null;

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we are on the proxies page
    if (document.getElementById('proxyContainer')) {
        initializeProxyPage();
    }
});

// --- Initialization ---
async function initializeProxyPage() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const proxyContainer = document.getElementById('proxyContainer');

    loadingIndicator.classList.remove('hidden');
    proxyContainer.classList.add('hidden');

    allProxies = await loadProxiesFromApi();

    populateCountryFilter();
    setupProxyEventListeners();
    applyFiltersAndRender();

    loadingIndicator.classList.add('hidden');
    proxyContainer.classList.remove('hidden');

    const now = Date.now();
    const staleProxies = allProxies.filter(p => !p.last_checked || (now - new Date(p.last_checked).getTime()) > CACHE_DURATION_MS);
    if (staleProxies.length > 0) {
        console.log(`Found ${staleProxies.length} stale proxies. Starting background health check...`);
        checkProxies(staleProxies, false);
    }
}

function setupProxyEventListeners() {
    const addClickListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', callback);
        }
    };

    const addChangeListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', callback);
        }
    };

    const addInputListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', callback);
        }
    };

    addClickListener('refreshBtn', () => checkProxies(allProxies, true));
    addChangeListener('countryFilter', applyFiltersAndRender);
    addChangeListener('statusFilter', applyFiltersAndRender);
    addInputListener('searchInput', applyFiltersAndRender);
    addChangeListener('pageSize', (e) => {
        pageSize = parseInt(e.target.value);
        applyFiltersAndRender();
    });
    addClickListener('importBtn', () => document.getElementById('importModal').classList.remove('hidden'));
    addClickListener('emptyStateImportBtn', () => document.getElementById('importModal').classList.remove('hidden'));
    addClickListener('cancelImportBtn', () => document.getElementById('importModal').classList.add('hidden'));
    addClickListener('confirmImportBtn', importProxies);
    addClickListener('clearFiltersBtn', clearFilters);

    if (document.getElementById('generateConfigModal')) {
        setupGenerateConfigModalListeners();
    }
}

// --- Filtering & Rendering ---
function applyFiltersAndRender() {
    applyFilters();
    currentPage = 1;
    renderProxies();
    renderPagination();
}

function applyFilters() {
    const countryFilterEl = document.getElementById('countryFilter');
    const statusFilterEl = document.getElementById('statusFilter');
    const searchInputEl = document.getElementById('searchInput');

    const countryFilter = countryFilterEl ? countryFilterEl.value : '';
    const statusFilter = statusFilterEl ? statusFilterEl.value : '';
    const searchTerm = searchInputEl ? searchInputEl.value.toLowerCase() : '';

    let tempProxies = [...allProxies];

    if (searchTerm) {
        tempProxies = tempProxies.filter(p => {
            const countryName = getCountryName(p.country).toLowerCase();
            const orgName = p.org ? p.org.toLowerCase() : '';
            return p.proxyIP.includes(searchTerm) || countryName.includes(searchTerm) || orgName.includes(searchTerm);
        });
    }
    if (countryFilter) {
        tempProxies = tempProxies.filter(p => p.country === countryFilter);
    }
    if (statusFilter) {
        tempProxies = tempProxies.filter(p => p.status === statusFilter);
    }

    filteredProxies = tempProxies;

    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
        if (countryFilter || statusFilter || searchTerm) {
            clearFiltersBtn.classList.remove('hidden');
        } else {
            clearFiltersBtn.classList.add('hidden');
        }
    }

    document.getElementById('totalProxies').textContent = filteredProxies.length;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProxies.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProxies();
    renderPagination();
    document.getElementById('proxyContainer').scrollIntoView({ behavior: 'smooth' });
}
window.changePage = changePage;

// --- UI Rendering ---
function populateCountryFilter() {
    const countryFilter = document.getElementById('countryFilter');
    const uniqueCountries = [...new Set(allProxies.map(p => p.country).filter(Boolean))].sort();
    while (countryFilter.options.length > 1) countryFilter.remove(1);
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
    emptyState.classList.toggle('hidden', filteredProxies.length > 0);

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedProxies = filteredProxies.slice(startIndex, startIndex + pageSize);

    document.getElementById('showingFrom').textContent = filteredProxies.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingTo').textContent = startIndex + paginatedProxies.length;

    proxyContainer.innerHTML = paginatedProxies.map(createProxyCardHTML).join('');

    document.querySelectorAll('.generate-config-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            selectedProxy = allProxies.find(p => p.id === e.currentTarget.dataset.proxyId);
            await updateWorkerDomainOptions();
            document.getElementById('generateConfigModal').classList.remove('hidden');
            document.getElementById('uuidInput').value = generateUUID();
        });
    });
}

function createProxyCardHTML(proxy) {
    const now = Date.now();
    const isStale = !proxy.last_checked || (now - new Date(proxy.last_checked).getTime()) >= CACHE_DURATION_MS;
    const displayStatus = isStale ? 'unknown' : proxy.status;

    let latencyClass = 'text-gray-500';
    let latencyText = `${proxy.latency || 0}ms`;

    if (proxy.status === 'testing') {
        latencyClass = 'text-blue-500';
        latencyText = '<i class="fas fa-spinner fa-spin mr-1"></i> Testing...';
    } else if (displayStatus === 'offline' || displayStatus === 'unknown') {
        latencyClass = 'text-red-500';
        latencyText = isStale ? 'Stale' : 'Offline';
    } else if (proxy.latency < 150) {
        latencyClass = 'latency-low';
    } else if (proxy.latency < 500) {
        latencyClass = 'latency-medium';
    } else {
        latencyClass = 'latency-high';
    }

    return `
        <div class="proxy-card bg-white rounded-lg shadow-md overflow-hidden slide-in">
            <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center min-w-0">
                        <img src="https://hatscripts.github.io/circle-flags/flags/${(proxy.country || 'xx').toLowerCase()}.svg"
                             alt="${proxy.country}" class="flag-icon mr-2 flex-shrink-0">
                        <div class="min-w-0">
                            <h3 class="font-semibold text-gray-900 truncate">${getCountryName(proxy.country)}</h3>
                            <p class="text-xs text-gray-500 truncate">${proxy.org || 'Unknown Org'}</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${displayStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        <span class="w-2 h-2 rounded-full mr-1 ${displayStatus === 'online' ? 'bg-green-500' : (proxy.status === 'testing' ? 'bg-blue-500' : 'bg-yellow-500')}"></span>
                        ${proxy.status === 'testing' ? 'testing' : displayStatus}
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
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(filteredProxies.length / pageSize);
    pagination.innerHTML = '';
    if (totalPages <= 1) return;

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

// --- API & Data Functions ---
async function loadProxiesFromApi() {
    try {
        const response = await fetch('/api/proxies');
        if (!response.ok) throw new Error('Failed to fetch proxy data from API.');
        const proxies = await response.json();
        // The API returns 'proxy_data', but we need 'proxyIP' and 'proxyPort' for testing.
        return proxies.map(p => {
            try {
                // Basic parsing for format: user:pass@host:port or host:port
                const url = new URL(p.proxy_data.includes('://') ? p.proxy_data : `http://${p.proxy_data}`);
                p.proxyIP = url.hostname;
                p.proxyPort = url.port;
            } catch (e) {
                // Handle cases without a scheme, e.g., 1.2.3.4:8080
                const parts = p.proxy_data.split(':');
                p.proxyIP = parts[0];
                p.proxyPort = parts[1];
            }
            // Ensure status is initialized
            if (!p.status) p.status = 'unknown';
            return p;
        });
    } catch (error) {
        console.error(error);
        showToast('Could not load proxy data. Please try again later.', 'error');
        return [];
    }
}

async function saveProxyStatusUpdates(updates) {
    if (updates.length === 0) return;
    try {
        const response = await fetch('/api/proxies', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to save proxy statuses.');
        }
        console.log('Successfully saved proxy status updates.');
    } catch (error) {
        console.error('Failed to save proxy status updates to API:', error);
        showToast('Could not save proxy test results.', 'error');
    }
}

async function checkProxies(proxiesToCheck, isManualTrigger) {
    proxiesToCheck.forEach(p => {
        const proxy = allProxies.find(ap => ap.id === p.id);
        if (proxy) proxy.status = 'testing';
    });
    renderProxies(); // Initial render to show "testing" status

    const batchSize = 10; // Smaller batch size for better UI responsiveness
    for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
        const batch = proxiesToCheck.slice(i, i + batchSize);
        const updates = await processHealthCheckBatch(batch);
        renderProxies(); // Re-render after each batch is processed
        await saveProxyStatusUpdates(updates); // Save the updates to the database
        window.dispatchEvent(new CustomEvent('proxyDataUpdated'));
    }
    console.log('Health check cycle complete.');
    showToast('All proxies have been tested.', 'success');
}

async function processHealthCheckBatch(batch) {
    const healthChecks = batch.map(proxy => {
        const url = `${API_BASE_URL}/health?proxy=${proxy.proxyIP}:${proxy.proxyPort}`;
        return fetch(url)
            .then(res => res.ok ? res.json() : Promise.reject(`HTTP error ${res.status}`))
            .catch(() => ({ success: false, proxy: `${proxy.proxyIP}:${proxy.proxyPort}`, latency_ms: 0, error: 'Network Error' }));
    });

    const results = await Promise.all(healthChecks);
    const updatesForApi = [];

    results.forEach(result => {
        const proxyToUpdate = allProxies.find(p => `${p.proxyIP}:${p.proxyPort}` === result.proxy);
        if (proxyToUpdate) {
            proxyToUpdate.status = result.success ? 'online' : 'offline';
            proxyToUpdate.latency = result.latency_ms || 0;
            proxyToUpdate.last_checked = new Date().toISOString();

            updatesForApi.push({
                id: proxyToUpdate.id,
                proxy_data: proxyToUpdate.proxy_data, // Ensure proxy_data is included in the update
                status: proxyToUpdate.status,
                latency: proxyToUpdate.latency,
                last_checked: proxyToUpdate.last_checked
            });
        }
    });
    return updatesForApi;
}

async function importProxies() {
    const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
    if (!proxyUrl) {
        return showToast('Please enter a URL.', 'warning');
    }
    showToast('Importing proxies...', 'info');

    try {
        // Step 1: Fetch the raw proxy list from the provided URL
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${response.statusText}`);
        const text = await response.text();
        const rawProxyStrings = text.split('\n').filter(Boolean);

        if (rawProxyStrings.length === 0) {
            return showToast('No proxies found in the provided URL.', 'warning');
        }

        // Step 2: Filter out proxies that already exist in the frontend state
        const existingProxySet = new Set(allProxies.map(p => p.proxy_data));
        const uniqueNewProxyStrings = rawProxyStrings.filter(p => !existingProxySet.has(p));

        if (uniqueNewProxyStrings.length === 0) {
            return showToast('All proxies from the list are already in your collection.', 'info');
        }

        // Step 3: Send only the new, unique proxies to the backend to be created
        const postResponse = await fetch('/api/proxies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uniqueNewProxyStrings)
        });

        if (!postResponse.ok) {
            const errorData = await postResponse.json();
            throw new Error(errorData.details || 'Backend failed to save new proxies.');
        }

        const { data: newlyCreatedProxies } = await postResponse.json();

        if (!newlyCreatedProxies || newlyCreatedProxies.length === 0) {
            return showToast('Backend did not return any new proxies.', 'warning');
        }

        // Step 4: Process the newly created proxies returned from the backend
        const processedNewProxies = newlyCreatedProxies.map(p => {
            try {
                const url = new URL(p.proxy_data.includes('://') ? p.proxy_data : `http://${p.proxy_data}`);
                p.proxyIP = url.hostname;
                p.proxyPort = url.port;
            } catch (e) {
                const parts = p.proxy_data.split(':');
                p.proxyIP = parts[0];
                p.proxyPort = parts[1];
            }
            if (!p.status) p.status = 'unknown';
            return p;
        });

        // Step 5: Update the global state, render the UI, and start testing the new proxies
        allProxies.push(...processedNewProxies);
        showToast(`Successfully imported and saved ${processedNewProxies.length} new proxies.`, 'success');
        document.getElementById('importModal').classList.add('hidden');

        applyFiltersAndRender();
        checkProxies(processedNewProxies, true); // Automatically test the new proxies

    } catch (error) {
        console.error('Import Error:', error);
        showToast(`Import failed: ${error.message}`, 'error');
    }
}

// --- Utilities & Modal Logic ---
function clearFilters() {
    document.getElementById('countryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchInput').value = '';
    applyFiltersAndRender();
}

function setupGenerateConfigModalListeners() {
    let selectedVpnType = 'trojan', selectedPort = '443', selectedFormat = 'uri';
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
    document.getElementById('generateUuidBtn').addEventListener('click', () => {
        document.getElementById('uuidInput').value = generateUUID();
    });
    document.getElementById('cancelGenerateBtn').addEventListener('click', () => document.getElementById('generateConfigModal').classList.add('hidden'));
    document.getElementById('confirmGenerateBtn').addEventListener('click', () => generateConfiguration(selectedVpnType, selectedPort, selectedFormat));
    document.getElementById('closeResultBtn').addEventListener('click', () => document.getElementById('resultModal').classList.add('hidden'));
    document.getElementById('copyResultBtn').addEventListener('click', copyResult);

    // Set default selections
    const vpnBtn = document.querySelector('.vpn-type-btn[data-type="trojan"]');
    if (vpnBtn) vpnBtn.classList.add('bg-blue-600', 'text-white');
    const portBtn = document.querySelector('.port-btn[data-port="443"]');
    if (portBtn) portBtn.classList.add('bg-blue-600', 'text-white');
    const formatBtn = document.querySelector('.format-btn[data-format="uri"]');
    if (formatBtn) formatBtn.classList.add('bg-blue-600', 'text-white');
}

function generateConfiguration(selectedVpnType, selectedPort, selectedFormat) {
    const workerDomain = document.getElementById('workerDomainSelect').value;
    const uuid = document.getElementById('uuidInput').value;
    if (!workerDomain || !selectedProxy) {
        showToast('Please select a worker domain and a proxy.', 'warning');
        return;
    }
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

function copyResult() {
    const content = document.querySelector('#resultContent pre')?.textContent;
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
        showToast('Copied to clipboard!', 'success');
        const copyBtn = document.getElementById('copyResultBtn');
        copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy mr-2"></i> Copy'; }, 2000);
    });
}

async function updateWorkerDomainOptions() {
    const workerDomainSelect = document.getElementById('workerDomainSelect');
    if (!workerDomainSelect) return;
    try {
        const response = await fetch('/api/tunnels');
        if (!response.ok) throw new Error('Failed to fetch tunnels');
        const tunnels = await response.json();
        workerDomainSelect.innerHTML = '<option value="">Select a worker domain</option>';
        tunnels.forEach(tunnel => {
            const option = document.createElement('option');
            option.value = `https://${tunnel.domain}`;
            option.textContent = `${tunnel.name} (${tunnel.domain})`;
            workerDomainSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading tunnels for modal:', error);
        workerDomainSelect.innerHTML = '<option value="">Error loading domains</option>';
    }
}

function getCountryName(code) {
    const names = { 'US': 'United States', 'SG': 'Singapore', 'JP': 'Japan', 'DE': 'Germany', 'FR': 'France', 'XX': 'Unknown' };
    return names[code] || code;
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === 'XX') return '🏳️';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

function showToast(message, type = 'info') {
    if (typeof Toastify === 'undefined') {
        console.warn('Toastify library not loaded. Falling back to alert.');
        alert(message);
        return;
    }
    const color = {
        success: 'linear-gradient(to right, #00b09b, #96c93d)',
        error: 'linear-gradient(to right, #ff5f6d, #ffc371)',
        warning: 'linear-gradient(to right, #f7b733, #fc4a1a)',
        info: 'linear-gradient(to right, #00d2ff, #3a7bd5)'
    }[type];
    Toastify({
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
        style: {
            background: color,
        }
    }).showToast();
}

function generateUUID() {
    return crypto.randomUUID();
}