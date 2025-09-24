// =================================================================================
// Main Proxies Page Orchestration
// =================================================================================

// --- Page State & Config ---
let allProxies = []; // The single source of truth from the API
let filteredProxies = [];
let currentPage = 1;
let pageSize = 12;
let selectedProxy = null; // For the 'Generate Config' modal
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache for proxy status

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    initializeProxyPage();
});

// --- Initialization & Setup ---
async function initializeProxyPage() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    document.getElementById('proxyContainer').classList.add('hidden');

    allProxies = await loadProxiesFromApi();

    populateCountryFilter();
    setupProxyEventListeners(); // Setup interactivity as soon as data is available
    applyFiltersAndRender();

    document.getElementById('loadingIndicator').classList.add('hidden');
    document.getElementById('proxyContainer').classList.remove('hidden');

    // Automatically check all stale proxies on page load. This now runs in the background.
    const now = Date.now();
    const staleProxies = allProxies.filter(p => !p.lastChecked || (now - new Date(p.lastChecked).getTime()) > CACHE_DURATION_MS);
    if (staleProxies.length > 0) {
        console.log(`Found ${staleProxies.length} stale proxies. Starting automatic health check...`);
        // Do not await this. Let it run in the background so the UI is not blocked.
        checkProxies(staleProxies, false);
    }
}

function setupProxyEventListeners() {
    document.getElementById('refreshBtn').addEventListener('click', () => checkProxies(allProxies, true));
    document.getElementById('countryFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('statusFilter').addEventListener('change', applyFiltersAndRender);
    document.getElementById('searchInput').addEventListener('input', applyFiltersAndRender);
    document.getElementById('pageSize').addEventListener('change', (e) => {
        pageSize = parseInt(e.target.value);
        applyFiltersAndRender();
    });
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    document.getElementById('emptyStateImportBtn').addEventListener('click', () => document.getElementById('importModal').classList.remove('hidden'));
    document.getElementById('cancelImportBtn').addEventListener('click', () => document.getElementById('importModal').classList.add('hidden'));
    document.getElementById('confirmImportBtn').addEventListener('click', importProxies);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);
    setupGenerateConfigModalListeners();
}

// --- Filtering & Rendering Orchestration ---
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

    // Apply search filter first
    if (searchTerm) {
        tempProxies = tempProxies.filter(p => {
            const countryName = getCountryName(p.country).toLowerCase();
            const orgName = p.org ? p.org.toLowerCase() : '';
            return p.proxyIP.includes(searchTerm) ||
                   countryName.includes(searchTerm) ||
                   orgName.includes(searchTerm);
        });
    }

    // Apply country filter
    if (countryFilter) {
        tempProxies = tempProxies.filter(p => p.country === countryFilter);
    }

    // Apply status filter to the already-filtered list
    if (statusFilter) {
        tempProxies = tempProxies.filter(p => p.status === statusFilter);
    }

    filteredProxies = tempProxies;

    // Show or hide the "Clear Filters" button
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (countryFilter || statusFilter || searchTerm) {
        clearFiltersBtn.classList.remove('hidden');
    } else {
        clearFiltersBtn.classList.add('hidden');
    }

    // This DOM element might not exist on all pages, so check for it.
    const totalProxiesSpan = document.getElementById('totalProxies');
    if (totalProxiesSpan) {
        totalProxiesSpan.textContent = filteredProxies.length;
    }
}

function changePage(page) {
    const totalPages = Math.ceil(filteredProxies.length / pageSize);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProxies();
    renderPagination();
    document.getElementById('proxyContainer').scrollIntoView({ behavior: 'smooth' });
}

// Make changePage globally accessible for the onclick attributes in the pagination HTML
window.changePage = changePage;