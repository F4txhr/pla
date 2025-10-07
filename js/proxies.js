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

    addListener('refreshBtn', 'click', () => checkProxies(allProxies, true));
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

    // Restore "Generate Config" functionality
    addListener('generateConfigBtn', 'click', openGenerateConfigModal);
    addListener('cancelGenerateBtn', 'click', () => document.getElementById('generateConfigModal').classList.add('hidden'));
    addListener('confirmGenerateBtn', 'click', handleGenerateConfig);
    addListener('generateUuidBtn', 'click', () => {
        document.getElementById('uuidInput').value = generateUUID();
    });
    addListener('closeResultBtn', 'click', () => document.getElementById('resultModal').classList.add('hidden'));
    addListener('copyResultBtn', 'click', copyResultToClipboard);

    document.querySelectorAll('.vpn-type-btn').forEach(btn => btn.addEventListener('click', () => handleButtonGroup(btn, 'vpn-type-btn')));
    document.querySelectorAll('.port-btn').forEach(btn => btn.addEventListener('click', () => handleButtonGroup(btn, 'port-btn')));
    document.querySelectorAll('.format-btn').forEach(btn => btn.addEventListener('click', () => handleButtonGroup(btn, 'format-btn')));
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

// Orchestrates the new "reset-then-test" proxy check process.
async function checkProxies(proxiesToCheck) {
    if (!proxiesToCheck || proxiesToCheck.length === 0) {
        return showToast('No proxies to test.', 'info');
    }

    showToast(`Resetting and testing ${proxiesToCheck.length} proxies...`, 'info');
    const proxyIds = proxiesToCheck.map(p => p.id);

    try {
        // Step 1: Reset all proxies to 'testing' via the backend.
        const resetResponse = await fetch('/api/reset-proxies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ proxyIds })
        });

        if (!resetResponse.ok) {
            throw new Error('Failed to reset proxy statuses before testing.');
        }

        // Step 2: Immediately reload data from the DB and render to show the 'testing' state.
        console.log('Proxies reset. Reloading UI to show "testing" status...');
        allProxies = await loadProxiesFromApi();
        applyFiltersAndRender();

        // Step 3: Process proxies in large batches sequentially.
        const largeBatchSize = 1000;
        const batches = [];
        for (let i = 0; i < proxiesToCheck.length; i += largeBatchSize) {
            batches.push(proxiesToCheck.slice(i, i + largeBatchSize));
        }

        console.log(`Processing ${batches.length} batches sequentially...`);
        for (const [index, batch] of batches.entries()) {
            console.log(`- Checking batch ${index + 1} of ${batches.length}...`);
            const checkResponse = await fetch('/api/check-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            });

            if (!checkResponse.ok) {
                console.error(`Error processing batch ${index + 1}:`, await checkResponse.json());
                // Don't stop; continue to the next batch.
            }

            // After each batch, reload and re-render to show real-time progress.
            console.log(`- Batch ${index + 1} complete. Reloading UI...`);
            allProxies = await loadProxiesFromApi();
            applyFiltersAndRender();
        }

        showToast('All proxies have been tested.', 'success');

    } catch (error) {
        console.error('A critical error occurred during the testing process:', error);
        showToast('An error occurred. Please check the console for details.', 'error');
        // Final reload to ensure UI is up-to-date even on error.
        allProxies = await loadProxiesFromApi();
        applyFiltersAndRender();
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

function openGenerateConfigModal() {
    if (!selectedProxy) {
        showToast('Please select a proxy first by clicking on its card.', 'warning');
        return;
    }

    // Populate worker domains from the global 'tunnels' variable (from app.js)
    const workerSelect = document.getElementById('workerDomainSelect');
    workerSelect.innerHTML = '<option value="">Select a worker domain</option>';
    if (window.tunnels && window.tunnels.length > 0) {
        window.tunnels.forEach(tunnel => {
            const option = document.createElement('option');
            option.value = tunnel.domain;
            option.textContent = tunnel.name;
            workerSelect.appendChild(option);
        });
    } else {
        workerSelect.innerHTML = '<option value="">No tunnels configured</option>';
    }

    // Set default UUID
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

function handleGenerateConfig() {
    const getSelectedValue = (groupClass) => document.querySelector(`.${groupClass}.bg-blue-600`)?.dataset.type;
    const getSelectedPort = (groupClass) => document.querySelector(`.${groupClass}.bg-blue-600`)?.dataset.port;
    const getSelectedFormat = (groupClass) => document.querySelector(`.${groupClass}.bg-blue-600`)?.dataset.format;

    const vpnType = getSelectedValue('vpn-type-btn');
    const port = getSelectedPort('port-btn');
    const format = getSelectedFormat('format-btn');
    const workerDomain = document.getElementById('workerDomainSelect').value;
    const uuid = document.getElementById('uuidInput').value;

    if (!selectedProxy || !vpnType || !port || !format || !workerDomain || !uuid) {
        return showToast('Please fill out all fields in the form.', 'warning');
    }

    // Basic URI generation (more complex formats would need dedicated libraries)
    const remark = encodeURIComponent(`${selectedProxy.country} - ${selectedProxy.org}`);
    let resultString = ``;

    switch(vpnType) {
        case 'vless':
            resultString = `vless://${uuid}@${workerDomain}:${port}?path=%2F%3Fed%3D2048&security=tls&encryption=none&host=${workerDomain}&type=ws&sni=${workerDomain}#${remark}`;
            break;
        case 'trojan':
            resultString = `trojan://${uuid}@${workerDomain}:${port}?security=tls&sni=${workerDomain}&type=ws&host=${workerDomain}&path=/#${remark}`;
            break;
        case 'ss':
             // Example for Shadowsocks, might need adjustment
            const ssPass = `${uuid}@${workerDomain}:${port}`;
            const encoded = btoa(ssPass);
            resultString = `ss://${encoded}#${remark}`;
            break;
    }

    const resultContent = document.getElementById('resultContent');
    const resultModal = document.getElementById('resultModal');

    if (format === 'qrcode') {
        resultContent.innerHTML = `<p class="text-center text-red-500">QR Code generation is not yet implemented. Please select another format.</p>`;
    } else {
        resultContent.innerHTML = `<pre class="bg-gray-100 p-4 rounded-md text-sm break-all whitespace-pre-wrap">${resultString}</pre>`;
    }

    document.getElementById('generateConfigModal').classList.add('hidden');
    resultModal.classList.remove('hidden');
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