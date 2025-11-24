// =================================================================================
// Dashboard Page Logic (Refactored to use a single /api/stats endpoint)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    const refreshCfBtn = document.getElementById('refreshCfUsageBtn');
    if (refreshCfBtn) {
        refreshCfBtn.addEventListener('click', fetchCfUsage);
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
 * Fetches simple CF/Worker usage per user based on tunnels table.
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

        if (!onlineEl || !offlineEl || !unknownEl || !listEl) return;

        onlineEl.textContent = data.totals.online;
        offlineEl.textContent = data.totals.offline;
        unknownEl.textContent = data.totals.unknown;

        if (!data.tunnels.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-500">No tunnels configured for this user.</p>';
            return;
        }

        listEl.innerHTML = data.tunnels.map((tunnel) => {
            let statusColor = 'text-yellow-600 bg-yellow-50';
            if (tunnel.status === 'online') statusColor = 'text-green-600 bg-green-50';
            if (tunnel.status === 'offline') statusColor = 'text-red-600 bg-red-50';

            let usageLine = '';
            if (tunnel.usage) {
                if (tunnel.usage.type === 'zone') {
                    const req = tunnel.usage.total_requests_today ?? 0;
                    const bytes = tunnel.usage.total_bandwidth_today_bytes ?? 0;
                    const mb = (bytes / (1024 * 1024)).toFixed(2);
                    usageLine = `<p class="text-xs text-gray-500">Today: ${req} req, ${mb} MB</p>`;
                } else if (tunnel.usage.type === 'worker') {
                    const req = tunnel.usage.total_requests_today ?? 0;
                    const errCount = tunnel.usage.total_errors_today ?? 0;
                    // CPU time is in microseconds; convert p90 to ms if present
                    const cpuP90us = tunnel.usage.cpu_time_p90;
                    const cpuP90ms = cpuP90us != null ? (cpuP90us / 1000).toFixed(2) : null;
                    const cpuPart = cpuP90ms != null ? `, CPU p90: ${cpuP90ms} ms` : '';
                    usageLine = `<p class="text-xs text-gray-500">Today: ${req} req, ${errCount} errors${cpuPart}</p>`;
                }
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
    } catch (err) {
        console.error('[Dashboard] Failed to fetch CF usage:', err);
    }
}