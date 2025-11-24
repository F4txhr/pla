// =================================================================================
// Proxies Page Logic
// =================================================================================

// --- Page State ---
let allProxies = [];
let filteredProxies = [];
let currentPage = 1;
let pageSize = 12;
let selectedProxy = null;

// Multi-selection state
let selectedProxyIds = new Set();
let isBulkGenerate = false;

const SELECTION_STORAGE_KEY = 'vpnManager_selectedProxyIds';
const SELECTION_TTL_MS = 10 * 60 * 1000; // 10 minutes

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
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

    // Restore multi-selection state from previous session (if not expired)
    restoreSelectionFromStorage();

    populateCountryFilter();
    setupProxyEventListeners();
    applyFiltersAndRender();
    updateBulkActionsVisibility();

    loadingIndicator.classList.add('hidden');
    if (allProxies.length > 0) {
        proxyContainer.classList.remove('hidden');
    }
}

function setupProxyEventListeners() {
    const addListener = (id, event, callback) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, callback);
    };

    addListener('refreshBtn', 'click', () => checkProxies());
    addListener('countryFilter', 'change', applyFiltersAndRender);
    addListener('statusFilter', 'change', applyFiltersAndRender);
    addListener('pageSize', 'change', (e) => {
        pageSize = parseInt(e.target.value);
        applyFiltersAndRender();
    });
    addListener('importBtn', 'click', () => document.getElementById('importModal').classList.remove('hidden'));
    addListener('emptyStateImportBtn', 'click', () => document.getElementById('importModal').classList.remove('hidden'));
    addListener('cancelImportBtn', 'click', () => document.getElementById('importModal').classList.add('hidden'));
    addListener('confirmImportBtn', 'click', importProxies);

    // Bulk generate/reset selection
    addListener('bulkGenerateBtn', 'click', openBulkGenerateModal);
    addListener('bulkResetBtn', 'click', resetSelection);

    // Search
    addListener('searchInput', 'input', applyFiltersAndRender);

    // Generate Config modal
    addListener('cancelGenerateBtn', 'click', () => document.getElementById('generateConfigModal').classList.add('hidden'));
    addListener('confirmGenerateBtn', 'click', handleGenerateConfig);
    addListener('generateUuidBtn', 'click', () => {
        document.getElementById('uuidInput').value = generateUUID();
    });
    addListener('closeResultBtn', 'click', () => document.getElementById('resultModal').classList.add('hidden'));
    addListener('copyResultBtn', 'click', copyResultToClipboard);

    document.querySelectorAll('.vpn-type-btn').forEach(btn =>
        btn.addEventListener('click', () => handleButtonGroup(btn, 'vpn-type-btn'))
    );
    document.querySelectorAll('.port-btn').forEach(btn =>
        btn.addEventListener('click', () => handleButtonGroup(btn, 'port-btn'))
    );
    document.querySelectorAll('.format-btn').forEach(btn =>
        btn.addEventListener('click', () => handleButtonGroup(btn, 'format-btn'))
    );
}

// --- Filtering & Rendering ---
function applyFiltersAndRender() {
    applyFilters();
    currentPage = 1;
    renderProxies();
    renderPagination();
}

function applyFilters() {
    const countryFilter = document.getElementById('countryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();

    let tempProxies = [...allProxies];

    if (countryFilter) {
        tempProxies = tempProxies.filter(p => p.country === countryFilter);
    }
    if (statusFilter) {
        tempProxies = tempProxies.filter(p => p.status === statusFilter);
    }
    if (searchTerm) {
        tempProxies = tempProxies.filter(p =>
            p.proxy_data.toLowerCase().includes(searchTerm) ||
            (p.org && p.org.toLowerCase().includes(searchTerm)) ||
            (p.country && getCountryName(p.country).toLowerCase().includes(searchTerm))
        );
    }

    filteredProxies = tempProxies;
    const totalEl = document.getElementById('totalProxies');
    if (totalEl) totalEl.textContent = filteredProxies.length;
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
    const hasProxies = filteredProxies.length > 0;

    emptyState.classList.toggle('hidden', hasProxies);
    proxyContainer.classList.toggle('hidden', !hasProxies);

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedProxies = filteredProxies.slice(startIndex, startIndex + pageSize);

    const fromEl = document.getElementById('showingFrom');
    const toEl = document.getElementById('showingTo');
    if (fromEl) fromEl.textContent = hasProxies ? startIndex + 1 : 0;
    if (toEl) toEl.textContent = startIndex + paginatedProxies.length;

    proxyContainer.innerHTML = paginatedProxies.map(createProxyCardHTML).join('');

    updateBulkActionsVisibility();
}

// Helper: get proxies shown on the current page
function getCurrentPageProxies() {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProxies.slice(startIndex, startIndex + pageSize);
}

function createProxyCardHTML(proxy) {
    const displayStatus = proxy.status || 'unknown';
    let latencyClass = 'text-gray-500';
    let latencyText = `${proxy.latency || 0}ms`;

    if (displayStatus === 'testing') {
        latencyClass = 'text-blue-500';
        latencyText = '<i class="fas fa-spinner fa-spin mr-1"></i> Testing...';
    } else if (displayStatus === 'offline') {
        latencyClass = 'text-red-500';
        latencyText = 'Offline';
    } else if (displayStatus === 'unknown') {
        latencyClass = 'text-yellow-500';
        latencyText = 'Unknown';
    } else if (proxy.latency < 150) {
        latencyClass = 'latency-low';
    } else if (proxy.latency < 500) {
        latencyClass = 'latency-medium';
    } else {
        latencyClass = 'latency-high';
    }

    let statusDotColor = 'bg-yellow-500';
    if (displayStatus === 'online') statusDotColor = 'bg-green-500';
    else if (displayStatus === 'testing') statusDotColor = 'bg-blue-500';
    else if (displayStatus === 'offline') statusDotColor = 'bg-red-500';

    const isChecked = selectedProxyIds.has(proxy.id);
    const selectedClass = isChecked ? ' ring-2 ring-purple-400' : '';

    return `
        <div id="proxy-card-${proxy.id}" class="proxy-card bg-white rounded-lg shadow-md overflow-hidden slide-in flex flex-col justify-between${selectedClass}" onclick="selectProxy(${proxy.id})">
            <div class="p-4">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center min-w-0">
                        <input type="checkbox" class="mr-2 proxy-select-checkbox" onclick="toggleProxySelection(event, ${proxy.id})" ${isChecked ? 'checked' : ''}>
                        <img src="https://hatscripts.github.io/circle-flags/flags/${(proxy.country || 'xx').toLowerCase()}.svg" alt="${proxy.country}" class="flag-icon mr-2 flex-shrink-0">
                        <div class="min-w-0">
                            <h3 class="font-semibold text-gray-900 truncate">${getCountryName(proxy.country)}</h3>
                            <p class="text-xs text-gray-500 truncate">${proxy.org || 'Unknown Org'}</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${displayStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        <span class="w-2 h-2 rounded-full mr-1 ${statusDotColor}"></span>
                        ${displayStatus}
                    </span>
                </div>
                <div class="mb-4 space-y-2">
                    <div class="text-sm text-gray-600"><i class="fas fa-server mr-2"></i><span class="font-medium">${proxy.proxyIP}</span></div>
                    <div class="text-sm text-gray-600"><i class="fas fa-network-wired mr-2"></i>Port: <span class="font-medium">${proxy.proxyPort}</span></div>
                    <div class="text-sm ${latencyClass} cursor-pointer" onclick="testProxyLatency(event, ${proxy.id})">
                        <i class="fas fa-clock mr-2"></i>
                        Latency:
                        <span class="font-medium">${latencyText}</span>
                    </div>
                </div>
            </div>
            <div class="p-2 bg-gray-50 border-t border-gray-200">
                <button class="w-full text-center px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-semibold hover:bg-blue-600 transition-colors config-btn" onclick="openGenerateConfigModalForProxy(event, ${proxy.id})">
                    <i class="fas fa-file-export mr-1"></i> Generate
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
        console.log('[UI] Fetching proxies from /api/proxies ...');
        const response = await fetch('/api/proxies', { cache: 'no-cache' });

        console.log('[UI] /api/proxies response status:', response.status);

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('[UI] /api/proxies error body:', text);
            throw new Error(`Failed to fetch proxy data from API. Status: ${response.status}`);
        }

        const proxies = await response.json();
        console.log('[UI] /api/proxies returned rows:', Array.isArray(proxies) ? proxies.length : 'invalid');

        return proxies.map(p => {
            const parts = p.proxy_data.split(':');
            p.proxyIP = parts[0];
            p.proxyPort = parts[1];
            return p;
        });
    } catch (error) {
        console.error('[UI] Error in loadProxiesFromApi:', error);
        showToast('Could not load proxy data.', 'error');
        return [];
    }
}

// This function triggers a full backend health check for all proxies.
async function checkProxies() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn && refreshBtn.disabled) return;

    try {
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Starting check...';
        }
        showToast('Starting full proxy health check in the background. This may take a few minutes.', 'info');

        const resp = await fetch('/api/trigger-full-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('[UI] checkProxies -> POST /api/trigger-full-check status:', resp.status);

        if (resp.status !== 202 && resp.status !== 200) {
            const errorData = await resp.json().catch(() => ({}));
            console.error('[UI] checkProxies -> trigger error body:', errorData);
            throw new Error(errorData.details || `Failed to trigger full check (status ${resp.status}).`);
        }

        allProxies = await loadProxiesFromApi();
        applyFiltersAndRender();

        showToast('Full proxy health check started. You can navigate pages; results will update as checks complete.', 'success');
    } catch (error) {
        console.error('Error triggering full proxy check:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i> Refresh';
        }
    }
}

async function importProxies() {
    const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
    if (!proxyUrl) return showToast('Please enter a URL.', 'warning');

    showToast('Importing proxies...', 'info');

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch from URL: ${response.statusText}`);
        const text = await response.text();
        const lines = text.split('\n').filter(Boolean);

        if (lines.length === 0) return showToast('No proxies found in the provided URL.', 'warning');

        const newProxyObjects = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 2 || !parts[0] || !parts[1]) {
                console.warn(`Skipping invalid line: ${line}`);
                return null;
            }

            const proxy_data = `${parts[0]}:${parts[1]}`;
            const country = parts[2] || 'XX';
            const org = parts.slice(3).join(',').trim() || 'Unknown Org';

            return { proxy_data, country, org };
        }).filter(Boolean);

        const existingProxySet = new Set(allProxies.map(p => p.proxy_data));
        const uniqueNewProxies = newProxyObjects.filter(p => !existingProxySet.has(p.proxy_data));

        if (uniqueNewProxies.length === 0) {
            document.getElementById('importModal').classList.add('hidden');
            return showToast('All proxies from the list are already in your collection.', 'info');
        }

        const postResponse = await fetch('/api/proxies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(uniqueNewProxies)
        });

        if (!postResponse.ok) {
            const errorData = await postResponse.json();
            throw new Error(errorData.details || 'Backend failed to save new proxies.');
        }

        const { data: createdProxies } = await postResponse.json();
        if (!createdProxies) throw new Error('Backend did not return the created proxies.');

        const processedProxies = createdProxies.map(p => {
            const parts = p.proxy_data.split(':');
            p.proxyIP = parts[0];
            p.proxyPort = parts[1];
            return p;
        });

        allProxies.push(...processedProxies);
        showToast(`Successfully imported ${processedProxies.length} new proxies.`, 'success');
        document.getElementById('importModal').classList.add('hidden');

        applyFiltersAndRender();

        // Remember this URL as the primary source so we can auto-sync later
        try {
            await fetch('/api/proxy-source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceUrl: proxyUrl })
            });
        } catch (e) {
            console.warn('Failed to save proxy source URL:', e);
        }

    } catch (error) {
        console.error('Import Error:', error);
        showToast(`Import failed: ${error.message}`, 'error');
    }
}

// --- Utilities & Modal Logic ---
function getCountryName(code) {
    const names = { 'US': 'United States', 'SG': 'Singapore', 'JP': 'Japan', 'DE': 'Germany', 'FR': 'France', 'XX': 'Unknown', 'at': 'Austria' };
    return names[code] || code;
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === 'XX') return '🏳️';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

function showToast(message, type = 'info') {
    const options = {
        text: message,
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        stopOnFocus: true,
    };

    switch (type) {
        case 'success':
            options.style = { background: "linear-gradient(to right, #00b09b, #96c93d)" };
            break;
        case 'error':
            options.style = { background: "linear-gradient(to right, #ff5f6d, #ffc371)" };
            break;
        case 'warning':
            options.style = { background: "linear-gradient(to right, #f1e05a, #f7b733)" };
            break;
        default:
            options.style = { background: "linear-gradient(to right, #00d2ff, #3a7bd5)" };
            break;
    }

    Toastify(options).showToast();
}

// --- Multi-selection helpers ---

function restoreSelectionFromStorage() {
    try {
        if (typeof localStorage === 'undefined') return;
        const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.ids) || typeof parsed.timestamp !== 'number') return;
        if (Date.now() - parsed.timestamp > SELECTION_TTL_MS) {
            localStorage.removeItem(SELECTION_STORAGE_KEY);
            return;
        }
        const existingIds = new Set(allProxies.map(p => p.id));
        selectedProxyIds = new Set(parsed.ids.filter(id => existingIds.has(id)));
    } catch (e) {
        console.warn('[UI] Failed to restore proxy selection:', e);
        selectedProxyIds = new Set();
    }
}

function persistSelection() {
    try {
        if (typeof localStorage === 'undefined') return;
        if (!selectedProxyIds.size) {
            localStorage.removeItem(SELECTION_STORAGE_KEY);
            return;
        }
        const payload = {
            ids: Array.from(selectedProxyIds),
            timestamp: Date.now()
        };
        localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
        console.warn('[UI] Failed to persist proxy selection:', e);
    }
}

function updateBulkActionsVisibility() {
    const bulkGenerateBtn = document.getElementById('bulkGenerateBtn');
    const bulkResetBtn = document.getElementById('bulkResetBtn');
    const hasSelection = selectedProxyIds.size > 0;
    if (bulkGenerateBtn) bulkGenerateBtn.classList.toggle('hidden', !hasSelection);
    if (bulkResetBtn) bulkResetBtn.classList.toggle('hidden', !hasSelection);
}

function toggleProxySelection(event, proxyId) {
    if (event) event.stopPropagation();

    if (selectedProxyIds.has(proxyId)) {
        selectedProxyIds.delete(proxyId);
    } else {
        selectedProxyIds.add(proxyId);
    }

    persistSelection();
    updateBulkActionsVisibility();
}
window.toggleProxySelection = toggleProxySelection;

function resetSelection() {
    selectedProxyIds.clear();
    persistSelection();
    updateBulkActionsVisibility();
    renderProxies();
}
window.resetSelection = resetSelection;

function openBulkGenerateModal() {
    if (!selectedProxyIds.size) {
        showToast('Please select at least one proxy using the checkboxes.', 'warning');
        return;
    }

    isBulkGenerate = true;

    const workerSelect = document.getElementById('workerDomainSelect');
    workerSelect.innerHTML = '';

    const tunnels = Array.isArray(window.tunnels) ? window.tunnels : [];
    if (tunnels.length > 0) {
        const anyOption = document.createElement('option');
        anyOption.value = 'any';
        anyOption.textContent = 'Any worker (Mix)';
        workerSelect.appendChild(anyOption);

        tunnels.forEach(tunnel => {
            const option = document.createElement('option');
            option.value = tunnel.domain;
            option.textContent = tunnel.name;
            workerSelect.appendChild(option);
        });
    } else {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No tunnels configured';
        workerSelect.appendChild(opt);
    }

    document.getElementById('uuidInput').value = generateUUID();
    document.getElementById('generateConfigModal').classList.remove('hidden');
}
window.openBulkGenerateModal = openBulkGenerateModal;

function selectProxy(proxyId) {
    selectedProxy = allProxies.find(p => p.id === proxyId);

    document.querySelectorAll('.proxy-card.ring-2').forEach(card => {
        card.classList.remove('ring-2', 'ring-blue-500');
    });

    if (selectedProxy) {
        const cardElement = document.getElementById(`proxy-card-${proxyId}`);
        if (cardElement) {
            cardElement.classList.add('ring-2', 'ring-blue-500');
        }
        showToast(`${selectedProxy.proxy_data} selected.`, 'info');
    }
}
window.selectProxy = selectProxy;

function openGenerateConfigModalForProxy(event, proxyId) {
    event.stopPropagation();
    isBulkGenerate = false;
    selectProxy(proxyId);
    openGenerateConfigModal();
}
window.openGenerateConfigModalForProxy = openGenerateConfigModalForProxy;

function openGenerateConfigModal() {
    if (!isBulkGenerate && !selectedProxy) {
        showToast('Please select a proxy first by clicking on its card.', 'warning');
        return;
    }

    const workerSelect = document.getElementById('workerDomainSelect');
    workerSelect.innerHTML = '';

    const tunnels = Array.isArray(window.tunnels) ? window.tunnels : [];
    if (tunnels.length > 0) {
        const anyOption = document.createElement('option');
        anyOption.value = 'any';
        anyOption.textContent = 'Any worker (Mix)';
        workerSelect.appendChild(anyOption);

        tunnels.forEach(tunnel => {
            const option = document.createElement('option');
            option.value = tunnel.domain;
            option.textContent = tunnel.name;
            workerSelect.appendChild(option);
        });
    } else {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No tunnels configured';
        workerSelect.appendChild(opt);
    }

    document.getElementById('uuidInput').value = generateUUID();

    document.getElementById('generateConfigModal').classList.remove('hidden');
}

function handleButtonGroup(selectedBtn, groupClass) {
    document.querySelectorAll(`.${groupClass}`).forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('border-gray-300');
    });
    selectedBtn.classList.add('bg-blue-600', 'text-white');
    selectedBtn.classList.remove('border-gray-300');
}

async function handleGenerateConfig() {
    const getSelectedValue = (groupClass) => document.querySelector(`.${groupClass}.bg-blue-600`)?.dataset.type;
    const getSelectedPort = (groupClass) => document.querySelector(`.${groupClass}.bg-blue-600`)?.dataset.port;
    const getSelectedFormat = (groupClass) => document.querySelector(`.${groupClass}.bg-blue-600`)?.dataset.format;

    const vpnTypeSelection = getSelectedValue('vpn-type-btn'); // trojan | vless | ss | any
    const port = getSelectedPort('port-btn');
    const format = getSelectedFormat('format-btn');
    const workerSelection = document.getElementById('workerDomainSelect').value;
    const uuidField = document.getElementById('uuidInput').value;
    const bugInputEl = document.getElementById('bugListInput');
    const bugListRaw = bugInputEl ? bugInputEl.value : '';
    const bugList = bugListRaw.split('\n').map(v => v.trim()).filter(Boolean);
    const bulkMode = isBulkGenerate;

    if (!vpnTypeSelection || !port || !format || !workerSelection) {
        return showToast('Please fill out all fields in the form.', 'warning');
    }
    if (!bulkMode && (!selectedProxy || !uuidField)) {
        return showToast('Please select a proxy and UUID/Password for single generation.', 'warning');
    }

    const tunnels = Array.isArray(window.tunnels) ? window.tunnels : [];
    let workerCandidates;
    if (workerSelection === 'any') {
        workerCandidates = tunnels;
    } else {
        workerCandidates = tunnels.filter(t => t.domain === workerSelection);
    }
    if (workerCandidates.length === 0) {
        return showToast('No worker tunnels available for this selection.', 'error');
    }

    const availableProtocols = vpnTypeSelection === 'any'
        ? ['trojan', 'vless', 'ss']
        : [vpnTypeSelection];

    const pickProtocol = () =>
        availableProtocols[Math.floor(Math.random() * availableProtocols.length)];

    const pickWorkerHost = () => {
        const idx = Math.floor(Math.random() * workerCandidates.length);
        return workerCandidates[idx].domain;
    };

    const security = 'tls';

    const buildUriForProxy = (proxy, protocol, uuid, workerHost, bugHost, remark) => {
        let ipPart = '';
        let portPart = '';
        if (proxy.proxyIP && proxy.proxyPort) {
            ipPart = proxy.proxyIP;
            portPart = proxy.proxyPort;
        } else if (proxy.proxy_data) {
            const [ip, prt] = proxy.proxy_data.split(':');
            ipPart = ip || '';
            portPart = prt || '443';
        }
        const path = encodeURIComponent(`/${ipPart}-${portPart}`);

        switch (protocol) {
            case 'trojan':
                return `trojan://${uuid}@${bugHost}:${port}?path=${path}&security=${security}&host=${workerHost}&type=ws&sni=${workerHost}#${remark}`;
            case 'vless':
                return `vless://${uuid}@${bugHost}:${port}?path=${path}&security=${security}&encryption=none&host=${workerHost}&type=ws&sni=${workerHost}#${remark}`;
            case 'ss': {
                const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
                return `ss://${encodedPassword}@${bugHost}:${port}?plugin=v2ray-plugin;mode=websocket;path=${path};host=${workerHost};tls;sni=${workerHost}#${remark}`;
            }
            default:
                throw new Error('Unsupported VPN type selected.');
        }
    };

    let uris = [];
    let firstUri = '';
    let resultString = '';

    try {
        if (bulkMode) {
            const proxiesToUse = allProxies.filter(p => selectedProxyIds.has(p.id));
            if (!proxiesToUse.length) {
                return showToast('No proxies selected. Please select at least one proxy.', 'warning');
            }

            uris = proxiesToUse.map((proxy, index) => {
                const protocol = pickProtocol();
                const workerHost = pickWorkerHost();
                const bugHost = bugList.length ? bugList[Math.floor(Math.random() * bugList.length)] : workerHost;
                const uuid = crypto.randomUUID();

                // Tag: PROTOCOL + FLAG + ISP + GLOBAL_INDEX
                const flag = getFlagEmoji(proxy.country || 'XX');
                const isp = proxy.org || 'Unknown ISP';
                const tagBase = `${protocol.toUpperCase()} ${flag} ${isp} ${index + 1}`;
                const remark = encodeURIComponent(tagBase);

                return buildUriForProxy(proxy, protocol, uuid, workerHost, bugHost, remark);
            });

            firstUri = uris[0];

            if (format === 'uri' || format === 'qrcode') {
                resultString = uris.join('\n');
            } else if (format === 'clash' || format === 'singbox') {
                const level = 'standard';
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        links: uris,
                        format,
                        level
                    })
                });

                if (!response.ok) {
                    let errorData = null;
                    try {
                        errorData = await response.json();
                    } catch (_) {
                        // ignore
                    }
                    console.error('[Proxy] Bulk converter error:', errorData || response.statusText);
                    throw new Error(errorData?.error || errorData?.details || `API conversion failed (${response.status}): ${response.statusText}`);
                }

                const payload = await response.json();
                resultString = payload.content || '';
            }
        } else {
            const protocol = pickProtocol();
            const workerHost = workerSelection === 'any'
                ? pickWorkerHost()
                : (workerSelection || pickWorkerHost());
            const bugHost = bugList.length ? bugList[Math.floor(Math.random() * bugList.length)] : workerHost;

            const flag = getFlagEmoji(selectedProxy.country || 'XX');
            const isp = selectedProxy.org || 'Unknown ISP';
            const tagBase = `${protocol.toUpperCase()} ${flag} ${isp} 1`;
            const remark = encodeURIComponent(tagBase);

            const uri = buildUriForProxy(selectedProxy, protocol, uuidField, workerHost, bugHost, remark);
            uris = [uri];
            firstUri = uri;

            if (format === 'uri') {
                resultString = uri;
            } else if (format === 'clash' || format === 'singbox') {
                const level = 'standard';
                const response = await fetch('/api/convert', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        links: [uri],
                        format,
                        level
                    })
                });

                if (!response.ok) {
                    let errorData = null;
                    try {
                        errorData = await response.json();
                    } catch (_) {
                        // ignore
                    }
                    console.error('[Proxy] Converter error:', errorData || response.statusText);
                    throw new Error(errorData?.error || errorData?.details || `API conversion failed (${response.status}): ${response.statusText}`);
                }

                const payload = await response.json();
                resultString = payload.content || '';
            } else if (format === 'qrcode') {
                resultString = uri;
            }
        }
    } catch (err) {
        console.error('[Proxy] Error while generating/converting config:', err);
        showToast(`Converter error: ${err.message}`, 'error');
        isBulkGenerate = false;
        return;
    }

    const resultContent = document.getElementById('resultContent');
    const resultModal = document.getElementById('resultModal');

    if (format === 'qrcode' && !bulkMode) {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(firstUri)}`;
        resultContent.innerHTML = `<div class="text-center"><img src="${qrCodeUrl}" alt="QR Code" class="mx-auto mb-4"></div>`;
    } else {
        const textToShow = format === 'qrcode' ? uris.join('\n') : resultString;
        resultContent.innerHTML = `<pre class="bg-gray-100 p-4 rounded-md text-sm break-all whitespace-pre-wrap">${textToShow}</pre>`;
    }

    document.getElementById('generateConfigModal').classList.add('hidden');
    resultModal.classList.remove('hidden');
    isBulkGenerate = false;
}

async function copyResultToClipboard() {
    const resultText = document.querySelector('#resultContent pre')?.textContent;
    if (resultText) {
        try {
            await navigator.clipboard.writeText(resultText);
            showToast('Copied to clipboard!', 'success');
        } catch (err) {
            showToast('Failed to copy.', 'error');
        }
    }
}

function generateUUID() {
    return crypto.randomUUID();
}

// Test a single proxy from its card (latency row click)
async function testProxyLatency(event, proxyId) {
    if (event) {
        event.stopPropagation();
    }

    const proxy = allProxies.find(p => p.id === proxyId);
    if (!proxy) return;

    if (proxy.status === 'testing') {
        return;
    }

    proxy.status = 'testing';
    renderProxies();

    try {
        const healthUrl = `${PROXY_HEALTH_API_BASE}/check?ip=${encodeURIComponent(proxy.proxy_data)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(healthUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        const result = await response.json();

        const isUp = response.ok && result.proxyip === true;
        const prevOffline = proxy.offline_count || 0;
        const newOfflineCount = isUp ? 0 : prevOffline + 1;

        const update = {
            id: proxy.id,
            proxy_data: proxy.proxy_data,
            status: isUp ? 'online' : 'offline',
            latency: typeof result.delay === 'number' ? result.delay : 0,
            last_checked: new Date().toISOString(),
            country: proxy.country,
            org: proxy.org,
            offline_count: newOfflineCount
        };

        if (!isUp && newOfflineCount >= 3) {
            console.log('[UI] testProxyLatency -> deleting proxy after 3x offline:', proxy.id);
            const deleteResponse = await fetch('/api/proxies', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [proxy.id] })
            });

            if (!deleteResponse.ok) {
                const errorData = await deleteResponse.json().catch(() => ({}));
                console.error('[UI] testProxyLatency -> DELETE error body:', errorData);
                throw new Error(errorData.details || 'Failed to delete proxy after repeated failures.');
            }

            allProxies = allProxies.filter(p => p.id !== proxyId);
            applyFiltersAndRender();
            showToast(`Proxy ${proxy.proxy_data} removed after 3 failed checks.`, 'warning');
            return;
        }

        const saveResponse = await fetch('/api/proxies', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([update])
        });

        if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({}));
            throw new Error(errorData.details || 'Failed to save proxy status.');
        }

        const idx = allProxies.findIndex(p => p.id === proxyId);
        if (idx !== -1) {
            allProxies[idx] = { ...allProxies[idx], ...update };
        }

        applyFiltersAndRender();
        showToast(`Proxy ${proxy.proxy_data} is ${update.status}.`, 'success');
    } catch (error) {
        console.error(`Error testing proxy ${proxy.proxy_data}:`, error);
        showToast(`Error checking proxy: ${error.message}`, 'error');

        const idx = allProxies.findIndex(p => p.id === proxyId);
        if (idx !== -1) {
            allProxies[idx] = {
                ...allProxies[idx],
                status: 'offline',
                latency: 0,
                last_checked: new Date().toISOString()
            };
        }
        applyFiltersAndRender();
    }
}
window.testProxyLatency = testProxyLatency;