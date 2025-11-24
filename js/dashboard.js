// =================================================================================
// Dashboard Page Logic (Refactored to use a single /api/stats endpoint)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();

    const refreshCfBtn = document.getElementById('refreshCfUsageBtn');
    if (refreshCfBtn) {
        refreshCfBtn.addEventListener('click', fetchCfUsage);
    }

    const cfForm = document.getElementById('cfConfigForm');
    if (cfForm) {
        cfForm.addEventListener('submit', saveCfConfig);
        loadCfConfig();
    }

    // Initial CF usage load
    fetchCfUsage();
});

/**
 * Sets up the dashboard, loads initial data, and sets up periodic refreshes.
 */
function initializeDashboard() {
    // Initial load of all stats
    updateDashboardStats();

    // Periodically refresh all stats
    setInterval(updateDashboardStats, 60000); // Refresh every 60 seconds
}

/**
 * Fetches aggregated data from the /api/stats endpoint and updates the dashboard.
 */
async function updateDashboardStats() {
    console.log('Fetching all dashboard stats from /api/stats...');
    try {
        const headers = {};
        if (window.userKey) {
            headers['x-user-key'] = window.userKey;
        }

        const response = await fetch('/api/stats', { headers });
        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }
        const stats = await response.json();

        // Animate the numerical values
        animateValue('totalProxies', stats.totalProxies);
        animateValue('onlineProxies', stats.onlineProxies);
        animateValue('totalTunnels', stats.totalTunnels);
        animateValue('totalAccounts', stats.totalAccounts);

        // Update the last updated timestamp
        updateLastUpdated(stats.lastUpdated);

    } catch (error) {
        console.error('Failed to update dashboard stats:', error);
        const lastUpdatedEl = document.getElementById('lastUpdated');
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = 'Error';
        }
    }
}

/**
 * Updates the 'Last Updated' card with a human-readable time.
 * @param {string | null} isoTimestamp - The ISO 8601 timestamp string from the API.
 */
function updateLastUpdated(isoTimestamp) {
    const element = document.getElementById('lastUpdated');
    if (!element) return;

    if (!isoTimestamp) {
        element.textContent = 'Never';
        return;
    }

    element.textContent = formatTimeAgo(isoTimestamp);
    element.dataset.fullTimestamp = isoTimestamp;
}

/**
 * Converts an ISO 8601 timestamp into a relative "time ago" string.
 * @param {string} isoTimestamp - The ISO 8601 timestamp.
 * @returns {string} A human-readable relative time string (e.g., "5 minutes ago").
 */
function formatTimeAgo(isoTimestamp) {
    const now = new Date();
    const past = new Date(isoTimestamp);
    const seconds = Math.floor((now - past) / 1000);

    let interval = seconds / 31536000; // years
    if (interval > 1) return Math.floor(interval) + " years ago";

    interval = seconds / 2592000; // months
    if (interval > 1) return Math.floor(interval) + " months ago";

    interval = seconds / 86400; // days
    if (interval > 1) return Math.floor(interval) + " days ago";

    interval = seconds / 3600; // hours
    if (interval > 1) return Math.floor(interval) + " hours ago";

    interval = seconds / 60; // minutes
    if (interval > 1) return Math.floor(interval) + " minutes ago";

    if (seconds < 10) return "Just now";

    return Math.floor(seconds) + " seconds ago";
}

/**
 * Animates a numerical value change in an HTML element.
 * @param {string} elementId - The ID of the element whose text content will be animated.
 * @param {number} endValue - The final numerical value.
 */
function animateValue(elementId, endValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    if (startValue === endValue) {
        element.textContent = endValue;
        return;
    }

    const duration = 1000; // Animation duration in milliseconds
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(startValue + (endValue - startValue) * progress);
        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = endValue; // Ensure the final value is exact
        }
    }

    requestAnimationFrame(update);
}

/**
 * Loads per-user Cloudflare config metadata (without exposing token).
 */
async function loadCfConfig() {
    try {
        const statusEl = document.getElementById('cfConfigStatus');
        const accountInput = document.getElementById('cfAccountIdInput');
        const labelInput = document.getElementById('cfLabelInput');
        if (!statusEl) return;

        const headers = {};
        if (window.userKey) {
            headers['x-user-key'] = window.userKey;
        }
        const res = await fetch('/api/cf-config', { headers });
        if (!res.ok) {
            throw new Error(`CF config API responded with ${res.status}`);
        }
        const data = await res.json();

        const configs = Array.isArray(data.configs) ? data.configs : [];
        if (configs.length === 0) {
            statusEl.textContent = 'No CF config saved yet for this user.';
            if (accountInput) accountInput.value = '';
            if (labelInput) labelInput.value = '';
        } else {
            statusEl.textContent = `You have ${configs.length} Cloudflare config(s) registered.`;
            // As a hint, show the first account ID in the input
            if (accountInput) accountInput.value = configs[0].cf_account_id || '';
            if (labelInput) labelInput.value = '';
        }
    } catch (err) {
        console.error('[Dashboard] Failed to load CF config:', err);
    }
}

/**
 * Saves per-user Cloudflare config (token + account id).
 */
async function saveCfConfig(e) {
    e.preventDefault();
    try {
        const labelInput = document.getElementById('cfLabelInput');
        const accountInput = document.getElementById('cfAccountIdInput');
        const tokenInput = document.getElementById('cfApiTokenInput');
        const statusEl = document.getElementById('cfConfigStatus');

        const label = labelInput ? labelInput.value.trim() : '';
        const cf_account_id = accountInput ? accountInput.value.trim() : '';
        const cf_api_token = tokenInput ? tokenInput.value.trim() : '';

        if (!cf_api_token) {
            alert('Please enter a Cloudflare API token.');
            return;
        }

        const headers = { 'Content-Type': 'application/json' };
        if (window.userKey) {
            headers['x-user-key'] = window.userKey;
        }

        const res = await fetch('/api/cf-config', {
            method: 'POST',
            headers,
            body: JSON.stringify({ label, cf_api_token, cf_account_id })
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || data.details || 'Failed to save CF config.');
        }

        if (statusEl) {
            statusEl.textContent = `CF config "${data.label}" saved for user "${data.user_key}".`;
        }
        // Clear fields after save for safety
        if (tokenInput) tokenInput.value = '';
        if (labelInput) labelInput.value = '';

        // Refresh usage with new config
        fetchCfUsage();
    } catch (err) {
        console.error('[Dashboard] Failed to save CF config:', err);
        alert(`Failed to save CF config: ${err.message}`);
    }
}

/**
 * Fetches CF/Worker usage per user based on tunnels table and per-user CF config.
 */
async function fetchCfUsage() {
    try {
        const headers = {};
        if (window.userKey) {
            headers['x-user-key'] = window.userKey;
        }
        const res = await fetch('/api/cf-usage', { headers });
        if (!res.ok) {
            throw new Error(`CF usage API responded with ${res.status}`);
        }
        const data = await res.json();

        const onlineEl = document.getElementById('cfOnlineCount');
        const offlineEl = document.getElementById('cfOfflineCount');
        const unknownEl = document.getElementById('cfUnknownCount');
        const listEl = document.getElementById('cfTunnelList');
        const totalReqAllEl = document.getElementById('cfTotalRequestsAll');
        const totalWorkerReqEl = document.getElementById('cfTotalWorkerReq');
        const totalZoneMbEl = document.getElementById('cfTotalZoneMb');

        if (!onlineEl || !offlineEl || !unknownEl || !listEl) return;

        onlineEl.textContent = data.totals.online;
        offlineEl.textContent = data.totals.offline;
        unknownEl.textContent = data.totals.unknown;

        if (!data.tunnels.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">No tunnels configured for this user.</p>';
            if (totalReqAllEl) totalReqAllEl.textContent = '0';
            if (totalWorkerReqEl) totalWorkerReqEl.textContent = '0';
            if (totalZoneMbEl) totalZoneMbEl.textContent = '0.00';
            return;
        }

        const zones = data.tunnels.filter(t => t.usage && t.usage.type === 'zone');
        const workers = data.tunnels.filter(t => t.usage && t.usage.type === 'worker');

        // Global totals across all tunnels
        const totalZoneRequests = zones.reduce((sum, z) => sum + (z.usage.total_requests_today ?? 0), 0);
        const totalZoneBytes = zones.reduce((sum, z) => sum + (z.usage.total_bandwidth_today_bytes ?? 0), 0);
        const totalWorkerRequests = workers.reduce((sum, w) => sum + (w.usage.total_requests_today ?? 0), 0);
        const totalRequestsAll = totalZoneRequests + totalWorkerRequests;

        if (totalReqAllEl) totalReqAllEl.textContent = String(totalRequestsAll);
        if (totalWorkerReqEl) totalWorkerReqEl.textContent = String(totalWorkerRequests);
        if (totalZoneMbEl) totalZoneMbEl.textContent = (totalZoneBytes / (1024 * 1024)).toFixed(2);

        const configs = Array.isArray(data.cfConfigs) ? data.cfConfigs : [];
        if (!configs.length) {
            // No configs: show flat list of tunnels (basic status + worker usage if any)
            listEl.innerHTML = data.tunnels.map((tunnel) => {
                let statusColor = 'text-yellow-600 bg-yellow-50';
                if (tunnel.status === 'online') statusColor = 'text-green-600 bg-green-50';
                if (tunnel.status === 'offline') statusColor = 'text-red-600 bg-red-50';

                let usageLine = '';
                if (tunnel.usage && tunnel.usage.type === 'worker') {
                    const req = tunnel.usage.total_requests_today ?? 0;
                    const errCount = tunnel.usage.total_errors_today ?? 0;
                    const cpuP90us = tunnel.usage.cpu_time_p90;
                    const cpuP90ms = cpuP90us != null ? (cpuP90us / 1000).toFixed(2) : null;
                    const cpuPart = cpuP90ms != null ? `, CPU p90: ${cpuP90ms} ms` : '';
                    usageLine = `<p class="text-xs text-gray-500">Today: ${req} req, ${errCount} errors${cpuPart}</p>`;
                }

                return `
                    <div class="py-2 flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-800">${tunnel.name}</p>
                            <p class="text-xs text-gray-500">${tunnel.domain}</p>
                            ${usageLine}
                        </div>
                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                            ${tunnel.status || 'unknown'}
                        </span>
                    </div>
                `;
            }).join('');
            return;
        }

        // Multi-account: one card per CF config
        const cards = [];

        configs.forEach(cfg => {
            const cfgTunnels = data.tunnels.filter(t => t.cf_config_id === cfg.id);
            if (!cfgTunnels.length) return;

            const cfgZones = cfgTunnels.filter(t => t.usage && t.usage.type === 'zone');
            const cfgWorkers = cfgTunnels.filter(t => t.usage && t.usage.type === 'worker');
            const cfgOthers = cfgTunnels.filter(t => !t.usage);

            const cfgZoneReq = cfgZones.reduce((sum, z) => sum + (z.usage.total_requests_today ?? 0), 0);
            const cfgZoneBytes = cfgZones.reduce((sum, z) => sum + (z.usage.total_bandwidth_today_bytes ?? 0), 0);
            const cfgZoneMb = (cfgZoneBytes / (1024 * 1024)).toFixed(2);

            const title = cfg.label || `Config ${cfg.id}`;
            const accountLine = cfg.cf_account_id ? `Account: ${cfg.cf_account_id}` : 'Account: (none)';

            const zoneSample = cfgZones[0];
            const zoneSampleLine = zoneSample && zoneSample.usage?.zone_id
                ? `Zone sample: ${zoneSample.usage.zone_id}`
                : '';

            const workerLines = cfgWorkers.map((tunnel) => {
                let statusColor = 'text-yellow-600 bg-yellow-50';
                if (tunnel.status === 'online') statusColor = 'text-green-600 bg-green-50';
                if (tunnel.status === 'offline') statusColor = 'text-red-600 bg-red-50';

                const req = tunnel.usage.total_requests_today ?? 0;
                const errCount = tunnel.usage.total_errors_today ?? 0;
                const cpuP90us = tunnel.usage.cpu_time_p90;
                const cpuP90ms = cpuP90us != null ? (cpuP90us / 1000).toFixed(2) : null;
                const cpuPart = cpuP90ms != null ? `, CPU p90: ${cpuP90ms} ms` : '';

                return `
                    <div class="py-1 flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-800">${tunnel.name}</p>
                            <p class="text-xs text-gray-500">${tunnel.domain}</p>
                            <p class="text-xs text-gray-500">Today: ${req} req, ${errCount} errors${cpuPart}</p>
                        </div>
                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                            ${tunnel.status || 'unknown'}
                        </span>
                    </div>
                `;
            }).join('') || '<p class="text-xs text-gray-500">No worker metrics yet.</p>';

            const otherLines = cfgOthers.map((tunnel) => {
                let statusColor = 'text-yellow-600 bg-yellow-50';
                if (tunnel.status === 'online') statusColor = 'text-green-600 bg-green-50';
                if (tunnel.status === 'offline') statusColor = 'text-red-600 bg-red-50';

                return `
                    <div class="py-1 flex items-center justify-between">
                        <div>
                            <p class="text-sm font-medium text-gray-800">${tunnel.name}</p>
                            <p class="text-xs text-gray-500">${tunnel.domain}</p>
                        </div>
                        <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}">
                            ${tunnel.status || 'unknown'}
                        </span>
                    </div>
                `;
            }).join('');

            cards.push(`
                <div class="rounded-lg border border-gray-200 p-3 mb-2">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <p class="text-sm font-semibold text-gray-900">${title}</p>
                            <p class="text-xs text-gray-500">${accountLine}</p>
                            ${zoneSampleLine ? `<p class="text-xs text-gray-500">${zoneSampleLine}</p>` : ''}
                        </div>
                        <div class="text-right text-xs text-gray-700">
                            <p>Zone today: ${cfgZoneReq} req</p>
                            <p>${cfgZoneMb} MB</p>
                        </div>
                    </div>
                    <div class="mt-2 pt-2 border-t border-gray-200">
                        <p class="text-xs font-semibold text-gray-700 mb-1">Workers</p>
                        ${workerLines}
                    </div>
                    ${otherLines ? `
                    <div class="mt-2 pt-2 border-t border-dashed border-gray-200">
                        <p class="text-xs font-semibold text-gray-700 mb-1">Other tunnels</p>
                        ${otherLines}
                    </div>` : ''}
                </div>
            `);
        });

        if (!cards.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">No tunnels associated with any CF config yet.</p>';
        } else {
            listEl.innerHTML = cards.join('');
        }
    } catch (err) {
        console.error('[Dashboard] Failed to fetch CF usage:', err);
    }
}