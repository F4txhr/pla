// =================================================================================
// UI Rendering and DOM Manipulation Functions
// =================================================================================

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
    const endIndex = Math.min(startIndex + pageSize, filteredProxies.length);
    const paginatedProxies = filteredProxies.slice(startIndex, endIndex);

    document.getElementById('showingFrom').textContent = filteredProxies.length > 0 ? startIndex + 1 : 0;
    document.getElementById('showingTo').textContent = endIndex;

    proxyContainer.innerHTML = paginatedProxies.map(proxy => {
        const now = Date.now();
        const isStale = !proxy.lastChecked || (now - new Date(proxy.lastChecked).getTime()) >= CACHE_DURATION_MS;
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
    }).join('');

    document.querySelectorAll('.generate-config-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            selectedProxy = allProxies.find(p => p.id === e.currentTarget.dataset.proxyId);
            await updateWorkerDomainOptions();
            document.getElementById('generateConfigModal').classList.remove('hidden');
            document.getElementById('uuidInput').value = generateUUID();
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
        if (currentPage < 4) {
            startPage = 2;
            endPage = Math.min(totalPages - 1, 1 + maxVisiblePages - 1);
        } else if (currentPage > totalPages - 3) {
            endPage = totalPages - 1;
            startPage = Math.max(2, endPage - maxVisiblePages + 1);
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
    document.querySelector('.vpn-type-btn[data-type="trojan"]').classList.add('bg-blue-600', 'text-white');
    document.querySelector('.port-btn[data-port="443"]').classList.add('bg-blue-600', 'text-white');
    document.querySelector('.format-btn[data-format="uri"]').classList.add('bg-blue-600', 'text-white');
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