// =================================================================================
// Dashboard Page Logic (Refactored to use a single /api/stats endpoint)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
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
        const response = await fetch('/api/stats');
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
        document.getElementById('lastUpdated').textContent = 'Error';
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