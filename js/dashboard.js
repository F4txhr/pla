// =================================================================================
// Dashboard Page Logic (Refactored to use APIs)
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
});

/**
 * Sets up the dashboard, loads initial data, and sets up listeners.
 */
function initializeDashboard() {
    // Initial load of all stats
    updateAllStats();

    // Listen for updates from the proxy page to refresh proxy-related stats
    window.addEventListener('proxyDataUpdated', () => {
        console.log('Dashboard received proxyDataUpdated event. Refreshing stats.');
        updateProxyStats();
    });

    // Periodically refresh all stats to catch any other changes
    setInterval(updateAllStats, 60000); // Refresh every 60 seconds
}

/**
 * Fetches data from all APIs and updates the entire dashboard.
 */
async function updateAllStats() {
    console.log('Updating all dashboard stats...');
    try {
        const [proxies, tunnels, accounts] = await Promise.all([
            fetch('/api/proxies').then(res => res.json()),
            fetch('/api/tunnels').then(res => res.json()),
            fetch('/api/accounts').then(res => res.json())
        ]);

        const onlineProxiesCount = proxies.filter(p => p.status === 'online').length;
        const activeTunnelsCount = tunnels.filter(t => t.status === 'online').length;

        animateValue('totalProxies', proxies.length);
        animateValue('onlineProxies', onlineProxiesCount);
        animateValue('activeTunnels', activeTunnelsCount);
        animateValue('totalAccounts', accounts.length);

    } catch (error) {
        console.error('Failed to update all dashboard stats:', error);
    }
}

/**
 * Fetches only the proxy data to update proxy-related cards.
 * This is called by the event listener for a more responsive UI.
 */
async function updateProxyStats() {
    console.log('Updating only proxy stats...');
    try {
        const proxies = await fetch('/api/proxies').then(res => res.json());
        const onlineProxiesCount = proxies.filter(p => p.status === 'online').length;

        animateValue('totalProxies', proxies.length);
        animateValue('onlineProxies', onlineProxiesCount);
    } catch (error) {
        console.error('Failed to update proxy stats:', error);
    }
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
    const duration = 1000; // Animation duration in milliseconds
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentValue = Math.floor(startValue + (endValue - startValue) * progress);

        element.textContent = currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}
