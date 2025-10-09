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

    // Restore search functionality
    addListener('searchInput', 'input', applyFiltersAndRender);

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
        const popover = document.getElementById('generatePopover');
        if (popover && !popover.classList.contains('hidden') && !popover.contains(e.target)) {
            // Check if the click was on a generate button to avoid immediate closing
            if (!e.target.closest('.proxy-card button')) {
                popover.classList.add('hidden');
            }
        }
    });

    // Close QR Code modal
    addListener('closeResultBtn', 'click', () => document.getElementById('resultModal').classList.add('hidden'));
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
    // UI now DIRECTLY reflects the database status. No more client-side "stale" logic.
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

    // Determine the color of the status indicator dot
    let statusDotColor = 'bg-yellow-500'; // Default for unknown
    if (displayStatus === 'online') {
        statusDotColor = 'bg-green-500';
    } else if (displayStatus === 'testing') {
        statusDotColor = 'bg-blue-500';
    } else if (displayStatus === 'offline') {
        statusDotColor = 'bg-red-500';
    }

    return `
        <div id="proxy-card-${proxy.id}" class="proxy-card bg-white rounded-lg shadow-md overflow-hidden slide-in" onclick="selectProxy(${proxy.id})">
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
                        <span class="w-2 h-2 rounded-full mr-1 ${statusDotColor}"></span>
                        ${displayStatus}
                    </span>
                </div>
                <div class="mb-4 space-y-2">
                    <div class="text-sm text-gray-600"><i class="fas fa-server mr-2"></i><span class="font-medium">${proxy.proxyIP}</span></div>
                    <div class="text-sm text-gray-600"><i class="fas fa-network-wired mr-2"></i>Port: <span class="font-medium">${proxy.proxyPort}</span></div>
                    <div class="text-sm ${latencyClass}"><i class="fas fa-clock mr-2"></i>Latency: <span class="font-medium">${latencyText}</span></div>
                </div>
                <div class="border-t border-gray-200 pt-3 flex justify-end">
                    <button onclick="generateConfigForProxy(event, ${proxy.id})" class="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                        <i class="fas fa-file-export mr-1"></i> Generate Config
                    </button>
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
        // Add { cache: 'no-cache' } to force the browser to always fetch fresh data.
        // This prevents the UI from getting stuck showing a 'testing' state from the cache.
        const response = await fetch('/api/proxies', { cache: 'no-cache' });
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

let pollingInterval = null;
const POLLING_DURATION_MS = 5 * 60 * 1000; // Poll for 5 minutes
const POLLING_FREQUENCY_MS = 5000; // Poll every 5 seconds

// Stops any active polling and re-enables the refresh button.
function stopPolling() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log('Polling stopped.');
    }
    if (refreshBtn) {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i> Refresh';
    }
}

// Triggers the full, asynchronous check on the backend and starts polling.
async function checkProxies() {
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn && refreshBtn.disabled) return; // Prevent multiple clicks

    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Testing...';

    try {
        const response = await fetch('/api/trigger-full-check', {
            method: 'POST'
        });

        if (response.status !== 202) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to trigger the check.');
        }

        showToast('Test triggered! Live updates will appear automatically.', 'info');

        // Immediately load data to show the initial 'testing' state
        allProxies = await loadProxiesFromApi();
        applyFiltersAndRender();

        // Start polling to show progress
        stopPolling(); // Ensure no multiple polls are running
        console.log('Polling started for live UI updates...');
        const startTime = Date.now();

        pollingInterval = setInterval(async () => {
            if (Date.now() - startTime > POLLING_DURATION_MS) {
                stopPolling();
                showToast('Live update session finished.', 'info');
                return;
            }

            console.log('Polling for updates...');
            allProxies = await loadProxiesFromApi();
            applyFiltersAndRender();

            // Check if all proxies are done and stop polling early
            const isDone = !allProxies.some(p => p.status === 'testing');
            if (isDone) {
                console.log('All proxies tested. Stopping polling.');
                stopPolling();
                showToast('All proxies have been tested.', 'success');
            }
        }, POLLING_FREQUENCY_MS);

    } catch (error) {
        console.error('Error triggering full check:', error);
        showToast(`Error: ${error.message}`, 'error');
        stopPolling(); // Make sure button is re-enabled on error
    }
}

async function importProxies() {
    const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
    if (!proxyUrl) return showToast('Please enter a URL.', 'warning');

    showToast('Importing proxies...', 'info');

    try {
        // Use the new server-side endpoint to bypass CORS issues
        const response = await fetch('/api/fetch-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: proxyUrl })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ details: 'Could not parse error from server.' }));
            throw new Error(errorData.details || `Failed to fetch from URL. Status: ${response.statusText}`);
        }

        const text = await response.text();
        const lines = text.split('\n').filter(Boolean);

        if (lines.length === 0) return showToast('No proxies found in the provided URL.', 'warning');

        // More robust parsing logic to prevent malformed data
        const newProxyObjects = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            // Ensure that IP and Port are present and not empty
            if (parts.length < 2 || !parts[0] || !parts[1]) {
                console.warn(`Skipping invalid line: ${line}`);
                return null;
            }

            const proxy_data = `${parts[0]}:${parts[1]}`;
            const country = parts[2] || 'XX';
            const org = parts.slice(3).join(',').trim() || 'Unknown Org';

            return { proxy_data, country, org };
        }).filter(Boolean); // This will filter out any null entries from invalid lines

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
        gravity: "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        stopOnFocus: true, // Prevents dismissing of toast on hover
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
        default: // info
            options.style = { background: "linear-gradient(to right, #00d2ff, #3a7bd5)" };
            break;
    }

    Toastify(options).showToast();
}

function selectProxy(proxyId) {
    selectedProxy = allProxies.find(p => p.id === proxyId);

    // Remove highlight from previously selected card
    document.querySelectorAll('.proxy-card.ring-2').forEach(card => {
        card.classList.remove('ring-2', 'ring-blue-500');
    });

    // Highlight the new selected card
    if (selectedProxy) {
        const cardElement = document.getElementById(`proxy-card-${proxyId}`);
        if (cardElement) {
            cardElement.classList.add('ring-2', 'ring-blue-500');
        }
        showToast(`${selectedProxy.proxy_data} selected.`, 'info');
    }
}
window.selectProxy = selectProxy;

// --- Popover Logic ---

let activeProxyIdForPopover = null;

/**
 * Shows and positions the generation popover next to the clicked button.
 * @param {Event} event - The click event.
 * @param {number} proxyId - The ID of the proxy to configure.
 */
function generateConfigForProxy(event, proxyId) {
    event.stopPropagation();
    const popover = document.getElementById('generatePopover');
    const button = event.currentTarget;

    // If the same button is clicked again, just close the popover.
    if (activeProxyIdForPopover === proxyId && !popover.classList.contains('hidden')) {
        popover.classList.add('hidden');
        return;
    }

    selectProxy(proxyId);
    activeProxyIdForPopover = proxyId;

    // Populate the tunnel dropdown
    const tunnelSelect = document.getElementById('popoverTunnelSelect');
    tunnelSelect.innerHTML = '';
    const onlineTunnels = window.tunnels ? window.tunnels.filter(t => t.status === 'online') : [];

    if (onlineTunnels.length > 0) {
        onlineTunnels.forEach(tunnel => {
            const option = document.createElement('option');
            option.value = tunnel.domain;
            option.textContent = tunnel.name;
            tunnelSelect.appendChild(option);
        });
    } else {
        tunnelSelect.innerHTML = '<option value="" disabled>No online tunnels</option>';
    }

    // --- Smart Popover Positioning ---
    const rect = button.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth;
    const windowWidth = window.innerWidth;

    // Position it vertically below the button
    popover.style.top = `${rect.bottom + window.scrollY + 5}px`;

    // Try to align the popover's right edge with the button's right edge
    let leftPosition = rect.right - popoverWidth;

    // If aligning to the right makes it go off-screen to the left, align to the left edge of the screen instead.
    if (leftPosition < 10) { // 10px margin
        leftPosition = 10;
    }

    popover.style.left = `${leftPosition + window.scrollX}px`;
    popover.classList.remove('hidden');

    // Add event listeners to the new protocol buttons
    popover.querySelectorAll('.popover-protocol-btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const protocol = e.currentTarget.dataset.protocol;
            generateAndCopyConfig(protocol);
        });
    });
}
window.generateConfigForProxy = generateConfigForProxy;

/**
 * Generates a config URI for the selected protocol and copies it to the clipboard.
 * @param {string} protocol - The selected protocol ('vless', 'trojan', or 'ss').
 */
async function generateAndCopyConfig(protocol) {
    const popover = document.getElementById('generatePopover');
    try {
        const tunnelDomain = document.getElementById('popoverTunnelSelect').value;
        if (!selectedProxy || !tunnelDomain) {
            throw new Error("No online tunnel selected.");
        }

        const uuid = crypto.randomUUID();
        const port = 443;
        const remark = encodeURIComponent(`${selectedProxy.country} - ${selectedProxy.org}`);
        const newPath = encodeURIComponent(`/${selectedProxy.proxyIP}-${port}`);
        let configLink = '';

        switch (protocol) {
            case 'vless':
                configLink = `vless://${uuid}@${tunnelDomain}:${port}?path=${newPath}&security=tls&encryption=none&host=${tunnelDomain}&type=ws&sni=${tunnelDomain}#${remark}`;
                break;
            case 'trojan':
                configLink = `trojan://${uuid}@${tunnelDomain}:${port}?security=tls&sni=${tunnelDomain}&type=ws&host=${tunnelDomain}&path=${newPath}#${remark}`;
                break;
            case 'ss':
                const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
                configLink = `ss://${encodedPassword}@${tunnelDomain}:${port}?plugin=v2ray-plugin;mode=websocket;path=${newPath};host=${tunnelDomain};tls;sni=${tunnelDomain}#${remark}`;
                break;
            default:
                throw new Error("Invalid protocol selected.");
        }

        await navigator.clipboard.writeText(configLink);
        showToast(`${protocol.toUpperCase()} config copied!`, 'success');
        popover.classList.add('hidden');

    } catch (error) {
        console.error("Config generation error:", error);
        showToast(error.message, 'error');
        popover.classList.add('hidden');
    }
}

function generateUUID() {
    return crypto.randomUUID();
}