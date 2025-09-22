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
let isFullCheckRunning = false;


// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeProxyPage();
    setupProxyEventListeners();
});


// --- Initialization & Setup ---

function initializeProxyPage() {
    loadProxiesFromStorage();
    updateWorkerDomainOptions();
    populateCountryFilter();
    applyFiltersAndRender();
    checkVisibleProxiesHealth(); // Initial check for fast UI
}

function setupProxyEventListeners() {
    // Main refresh button
    document.getElementById('refreshBtn').addEventListener('click', handleFullHealthCheck);

    // Filters and pagination
    document.getElementById('countryFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('statusFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        applyFiltersAndRender();
    });

    // Listen for background updates
    window.addEventListener('proxiesUpdated', () => {
        console.log('Received background proxy update. Refreshing UI.');
        loadProxiesFromStorage();
        applyFiltersAndRender();
    });

    setupGenerateConfigModalListeners();
}

function loadProxiesFromStorage() {
    proxies = JSON.parse(localStorage.getItem('proxyBank') || '[]');
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

    let sourceProxies = [...proxies];
    if (countryFilter) {
        sourceProxies = sourceProxies.filter(p => p.country === countryFilter);
    }
    if (statusFilter) {
        sourceProxies = sourceProxies.filter(p => p.status === statusFilter);
    }
    filteredProxies = sourceProxies;

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

    emptyState.classList.toggle('hidden', filteredProxies.length > 0);

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredProxies.length);
    const paginatedProxies = filteredProxies.slice(startIndex, endIndex);

    document.getElementById('showingFrom').textContent = filteredProxies.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingTo').textContent = endIndex;

    proxyContainer.innerHTML = paginatedProxies.map(proxy => {
        let latencyClass = 'text-gray-500';
        let latencyText = `${proxy.latency}ms`;

        if (proxy.status === 'testing') {
            latencyClass = 'text-blue-500';
            latencyText = '<i class="fas fa-spinner fa-spin mr-1"></i> Testing...';
        } else if (proxy.status === 'offline') {
            latencyClass = 'text-red-500';
            latencyText = 'Offline';
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
                        <div class="flex items-center">
                            <img src="https://hatscripts.github.io/circle-flags/flags/${(proxy.country || 'xx').toLowerCase()}.svg"
                                 alt="${proxy.country}" class="flag-icon mr-2">
                            <div>
                                <h3 class="font-semibold text-gray-900">${getCountryName(proxy.country)}</h3>
                                <p class="text-xs text-gray-500">${proxy.org || 'Unknown Org'}</p>
                            </div>
                        </div>
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${proxy.status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            <span class="w-2 h-2 rounded-full mr-1 ${proxy.status === 'online' ? 'bg-green-500' : (proxy.status === 'testing' ? 'bg-blue-500' : 'bg-red-500')}"></span>
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

    pagination.classList.toggle('hidden', totalPages <= 1);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let paginationHTML = '';
    const maxVisiblePages = 5;

    paginationHTML += `<button class="px-3 py-1 rounded-md ${currentPage === 1 ? 'bg-gray-200 cursor-not-allowed' : 'bg-white border'}" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;

    if (totalPages > maxVisiblePages + 2) {
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(totalPages - 1, currentPage + 1);

        if(currentPage < 4) {
            startPage = 2;
            endPage = startPage + maxVisiblePages - 1;
        }
        if(currentPage > totalPages - 3) {
            endPage = totalPages - 1;
            startPage = endPage - maxVisiblePages + 1;
        }


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
    renderProxies(); // Re-render immediately to show the new page
    renderPagination();
    checkVisibleProxiesHealth(); // Then check health for the new page
    document.getElementById('proxyContainer').scrollIntoView({ behavior: 'smooth' });
}


// --- Health Checks ---

async function checkVisibleProxiesHealth() {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const visibleProxies = filteredProxies.slice(startIndex, endIndex);

    // Set status to 'testing' for immediate feedback
    visibleProxies.forEach(p => p.status = 'testing');
    renderProxies();

    await processHealthCheckBatch(visibleProxies, proxies);
    localStorage.setItem('proxyBank', JSON.stringify(proxies));
    renderProxies(); // Re-render to show final statuses
}

async function handleFullHealthCheck() {
    if (isFullCheckRunning) {
        console.log('A full health check is already in progress.');
        return;
    }
    isFullCheckRunning = true;

    // Set all proxies to 'testing' for immediate UI feedback
    proxies.forEach(p => p.status = 'testing');
    applyFiltersAndRender();

    // Trigger the global check from app.js
    await checkAllProxiesHealth();

    // Once done, reload from storage and re-render everything
    loadProxiesFromStorage();
    applyFiltersAndRender();
    isFullCheckRunning = false;
}


// --- Config Generation & Import ---

function setupGenerateConfigModalListeners() {
    // ... (rest of the function is identical to before, so omitted for brevity)
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
            if (!proxyIP || !proxyPort) return null;
            return { id: crypto.randomUUID(), proxyIP, proxyPort, country: country || 'XX', org, status: 'unknown', latency: 0 };
        }).filter(Boolean);

        if (newProxies.length === 0) return alert('No valid proxies found.');

        proxies.push(...newProxies);
        localStorage.setItem('proxyBank', JSON.stringify(proxies));

        alert(`Successfully imported ${newProxies.length} proxies.`);
        document.getElementById('importModal').classList.add('hidden');

        populateCountryFilter();
        applyFiltersAndRender();
        handleFullHealthCheck();
    } catch (error) {
        console.error('Import Error:', error);
        alert('Failed to import proxies.');
    }
}

function generateConfiguration() {
    // ... (logic is identical to before, so omitted for brevity)
}


// --- Utility Functions ---

function generateUUID() {
    const uuid = crypto.randomUUID();
    document.getElementById('uuidInput').value = uuid;
    return uuid;
}

function copyResult() {
    // ... (logic is identical to before)
}

function updateWorkerDomainOptions() {
    // ... (logic is identical to before)
}

function getCountryName(code) {
    // ... (logic is identical to before)
}

function getFlagEmoji(countryCode) {
    if (!countryCode) return '🏳️';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

// Make functions globally accessible
window.changePage = changePage;
// Note: setupGenerateConfigModalListeners and copyResult are not here because they are called internally
// or have their event listeners set up in setupProxyEventListeners.
// The functions for the config modal buttons are also set up in setupGenerateConfigModalListeners.
// The functions for the import modal are also set up in setupProxyEventListeners.
