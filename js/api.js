// =================================================================================
// API and Health Check Functions
// =================================================================================

async function loadProxiesFromApi() {
    try {
        const response = await fetch('/api/proxies');
        if (!response.ok) throw new Error('Failed to fetch proxy data from API.');
        return await response.json();
    } catch (error) {
        console.error(error);
        showToast('Could not load proxy data. Please try again later.', 'error');
        return [];
    }
}

async function saveProxiesToApi(proxies) {
    try {
        await fetch('/api/proxies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(proxies)
        });
    } catch (error) {
        console.error('Failed to save proxy data to API:', error);
    }
}

async function checkProxies(proxiesToCheck, isManualTrigger) {
    if (isManualTrigger) {
        proxiesToCheck.forEach(p => p.status = 'testing');
    } else {
        proxiesToCheck.forEach(p => {
            const proxy = allProxies.find(ap => ap.id === p.id);
            if (proxy) proxy.status = 'testing';
        });
    }
    renderProxies(); // Show 'testing' status immediately

    const batchSize = 1000; // User-defined batch size
    for (let i = 0; i < proxiesToCheck.length; i += batchSize) {
        const batch = proxiesToCheck.slice(i, i + batchSize);
        await processHealthCheckBatch(batch);
        renderProxies(); // Re-render after each batch completes
        await saveProxiesToApi(allProxies);
        // Notify other parts of the application (like the dashboard) that data has changed.
        window.dispatchEvent(new CustomEvent('proxyDataUpdated'));
    }
    console.log('Health check cycle complete.');
}

async function processHealthCheckBatch(batch) {
    const healthChecks = batch.map(proxy => {
        const url = `${API_BASE_URL}/health?proxy=${proxy.proxyIP}:${proxy.proxyPort}`;
        return fetch(url).then(res => res.ok ? res.json() : Promise.reject(`HTTP error ${res.status}`)).catch(() => ({ success: false, proxy: `${proxy.proxyIP}:${proxy.proxyPort}`, latency_ms: 0 }));
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

async function importProxies() {
    const proxyUrl = document.getElementById('proxyUrlInput').value.trim();
    if (!proxyUrl) {
        showToast('Please enter a URL.', 'warning');
        return;
    }

    showToast('Importing proxies...', 'info');
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const text = await response.text();
        const lines = text.split('\n').filter(Boolean);
        const newProxies = lines.map(line => {
            const [proxyIP, proxyPort, country, org] = line.split(',');
            if (!proxyIP || !proxyPort) return null;
            return { id: generateUUID(), proxyIP, proxyPort, country: country || 'XX', org, status: 'unknown', latency: 0, lastChecked: null };
        }).filter(Boolean);

        if (newProxies.length === 0) {
            return showToast('No valid proxies found in the provided list.', 'warning');
        }

        const existingProxyKeys = new Set(allProxies.map(p => `${p.proxyIP}:${p.proxyPort}`));
        const uniqueNewProxies = newProxies.filter(p => !existingProxyKeys.has(`${p.proxyIP}:${p.proxyPort}`));

        if (uniqueNewProxies.length === 0) {
            return showToast('All proxies from the list are already in your collection.', 'info');
        }

        allProxies.push(...uniqueNewProxies);

        showToast(`Successfully imported ${uniqueNewProxies.length} new proxies. Starting health checks...`, 'success');
        document.getElementById('importModal').classList.add('hidden');
        populateCountryFilter();
        // Check only the newly added proxies to be more efficient
        checkProxies(uniqueNewProxies, true);
    } catch (error) {
        console.error('Import Error:', error);
        showToast('Failed to import proxies. Check the URL and format.', 'error');
    }
}