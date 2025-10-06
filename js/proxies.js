// =================================================================================
// Proxies Page Logic (Final Corrected Version)
// =================================================================================

// --- Page State ---
let allProxies = [];
let filteredProxies = [];
let currentPage = 1;
let pageSize = 12;
let selectedProxy = null;

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

    populateCountryFilter();
    setupProxyEventListeners();
    applyFiltersAndRender();

    loadingIndicator.classList.add('hidden');
    if (allProxies.length > 0) {
        proxyContainer.classList.remove('hidden');
    }

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
        if (element) element.addEventListener('click', callback);
    };
    const addChangeListener = (id, callback) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener('change', callback);
    };

    addClickListener('refreshBtn', () => checkProxies(allProxies, true));
    addChangeListener('countryFilter', applyFiltersAndRender);
    addChangeListener('statusFilter', applyFiltersAndRender);
    addChangeListener('pageSize', (e) => {
        pageSize = parseInt(e.target.value);
        applyFiltersAndRender();
    });
    addClickListener('importBtn', () => document.getElementById('importModal').classList.remove('hidden'));
    addClickListener('emptyStateImportBtn', () => document.getElementById('importModal').classList.remove('hidden'));
    addClickListener('cancelImportBtn', () => document.getElementById('importModal').classList.add('hidden'));
    addClickListener('confirmImportBtn', importProxies);
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

    let tempProxies = [...allProxies];
    if (countryFilter) {
        tempProxies = tempProxies.filter(p => p.country === countryFilter);
    }
    if (statusFilter) {
        tempProxies = tempProxies.filter(p => p.status === statusFilter);
    }
    filteredProxies = tempProxies;
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
    const hasProxies = filteredProxies.length > 0;

    emptyState.classList.toggle('hidden', hasProxies);
    proxyContainer.classList.toggle('hidden', !hasProxies);

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedProxies = filteredProxies.slice(startIndex, startIndex + pageSize);

    document.getElementById('showingFrom').textContent = hasProxies ? startIndex + 1 : 0;
    document.getElementById('showingTo').textContent = startIndex + paginatedProxies.length;

    proxyContainer.innerHTML = paginatedProxies.map(createProxyCardHTML).join('');
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
                        <img src="https://hatscripts.github.io/circle-flags/flags/${(proxy.country || 'xx').toLowerCase()}.svg" alt="${proxy.country}" class="flag-icon mr-2 flex-shrink-0">
                        <div class="min-w-0">
                            <h3 class="font-semibold text-gray-900 truncate">${getCountryName(proxy.country)}</h3>
                            <p class="text-xs text-gray-500 truncate">${proxy.org || 'Unknown Org'}</p>
                        </div>
                    </div>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${displayStatus === 'online' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        <span class="w-2 h-2 rounded-full mr-1 ${displayStatus === 'online' ? 'bg-green-500' : (proxy.status === 'testing' ? 'bg-blue-500' : 'bg-yellow-500')}"></span>
                        ${proxy.status === 'testing' ? 'testing' : displayStatus}
                    </span>
                </div>
                <div class="mb-4 space-y-2">
                    <div class="text-sm text-gray-600"><i class="fas fa-server mr-2"></i><span class="font-medium">${proxy.proxyIP}</span></div>
                    <div class="text-sm text-gray-600"><i class="fas fa-network-wired mr-2"></i>Port: <span class="font-medium">${proxy.proxyPort}</span></div>
                    <div class="text-sm ${latencyClass}"><i class="fas fa-clock mr-2"></i>Latency: <span class="font-medium">${latencyText}</span></div>
                </div>
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
        if (!response.ok) throw new Error(`Failed to fetch proxy data from API. Status: ${response.status}`);
        const proxies = await response.json();
        return proxies.map(p => {
            const parts = p.proxy_data.split(':');
            p.proxyIP = parts[0];
            p.proxyPort = parts[1];
            return p;
        });
    } catch (error) {
        console.error(error);
        showToast('Could not load proxy data.', 'error');
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
    } catch (error) {
        console.error('Failed to save proxy status updates to API:', error);
        showToast('Could not save proxy test results.', 'error');
    }
}

async function checkProxies(proxiesToCheck, isManualTrigger) {
    if (isManualTrigger) {
        showToast(`Testing ${proxiesToCheck.length} proxies...`, 'info');
    }
    proxiesToCheck.forEach(p => {
        const proxy = allProxies.find(ap => ap.id === p.id);
        if (proxy) proxy.status = 'testing';
    });
    renderProxies();

    const batchSize = 10;
    for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
        const batch = proxiesToCheck.slice(i, i + batchSize);
        const updates = await processHealthCheckBatch(batch);
        await saveProxyStatusUpdates(updates);
        renderProxies();
    }
    if (isManualTrigger) {
        showToast('All proxies have been tested.', 'success');
    }
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
                proxy_data: proxyToUpdate.proxy_data,
                status: proxyToUpdate.status,
                latency: proxyToUpdate.latency,
                last_checked: proxyToUpdate.last_checked,
                country: proxyToUpdate.country,
                org: proxyToUpdate.org
            });
        }
    });
    return updatesForApi;
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

        // Final, Corrected Parsing Logic
        // Format: IP,PORT,COUNTRY,ORG...
        const newProxyObjects = lines.map(line => {
            const parts = line.split(',');
            if (parts.length < 4) return null;

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
        if (!createdProxies) throw new Error("Backend did not return the created proxies.");

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
        checkProxies(processedProxies, true);

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
    // This is a placeholder for a proper toast library like Toastify
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function generateUUID() {
    return crypto.randomUUID();
}