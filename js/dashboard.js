// =================================================================================
// Dashboard Page Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Initial load of data
    loadDashboardData();
    updateStats();

    // Setup dashboard-specific event listeners
    document.getElementById('refreshDataBtn').addEventListener('click', () => {
        updateStats();
        loadDashboardData();
    });

    // Simulate real-time updates
    setInterval(updateStats, 30000); // Update every 30 seconds
});

/**
 * Loads and displays recent activity from localStorage.
 */
function loadDashboardData() {
    const recentActivity = localStorage.getItem('recentActivity');
    const activityContainer = document.getElementById('recentActivity');
    const noActivityDiv = document.getElementById('noActivity');

    if (recentActivity) {
        const activities = JSON.parse(recentActivity);
        if (activities.length > 0) {
            noActivityDiv.classList.add('hidden');
            activityContainer.innerHTML = activities.slice(0, 5).map(activity => `
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas ${activity.icon} text-blue-600 text-sm"></i>
                        </div>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm font-medium text-gray-900">${activity.title}</p>
                        <p class="text-sm text-gray-500">${activity.description}</p>
                        <p class="text-xs text-gray-400">${new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                </div>
            `).join('');
        } else {
            activityContainer.innerHTML = '';
            noActivityDiv.classList.remove('hidden');
        }
    } else {
        activityContainer.innerHTML = '';
        noActivityDiv.classList.remove('hidden');
    }
}

/**
 * Updates the statistics cards on the dashboard.
 */
function updateStats() {
    // Get data from localStorage
    const proxies = JSON.parse(localStorage.getItem('proxyBank') || '[]');
    const onlineProxies = proxies.filter(p => p.status === 'online').length;

    const tunnels = JSON.parse(localStorage.getItem('tunnelServices') || '[]');
    const activeTunnels = tunnels.filter(t => t.status === 'online').length;

    const accounts = JSON.parse(localStorage.getItem('vpnAccounts') || '[]');

    // Update UI with animation
    animateValue('totalProxies', proxies.length);
    animateValue('onlineProxies', onlineProxies);
    animateValue('activeTunnels', activeTunnels);
    animateValue('totalAccounts', accounts.length);
}

/**
 * Animates a numerical value change in an element.
 * @param {string} elementId - The ID of the element to update.
 * @param {number} endValue - The target value.
 */
function animateValue(elementId, endValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
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

/**
 * Adds an activity log entry to localStorage.
 * @param {string} type - The type of activity (e.g., 'proxy', 'account').
 * @param {string} title - The title of the activity.
 * @param {string} description - The description of the activity.
 */
function addActivity(type, title, description) {
    const activities = JSON.parse(localStorage.getItem('recentActivity') || '[]');

    const icons = {
        'proxy': 'fa-server',
        'tunnel': 'fa-network-wired',
        'account': 'fa-user',
        'config': 'fa-file-export'
    };

    const newActivity = {
        type,
        title,
        description,
        icon: icons[type] || 'fa-info-circle',
        timestamp: new Date().toISOString()
    };

    activities.unshift(newActivity);

    // Keep only the last 20 activities
    if (activities.length > 20) {
        activities.splice(20);
    }

    localStorage.setItem('recentActivity', JSON.stringify(activities));
}
