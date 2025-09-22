// =================================================================================
// Subscription Page Logic
// =================================================================================

// Global variables for the subscription page
let subProxies = [];
let selectedProtocol = 'trojan';
let selectedPort = '443';
let selectedFormat = 'uri';
let selectedTemplateLevel = 'standard';

document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptionData();
    setupSubscriptionEventListeners();
    setDefaultSelections();
});

/**
 * Loads necessary data from localStorage.
 */
function loadSubscriptionData() {
    // Tunnels are loaded by app.js
    const savedProxies = localStorage.getItem('proxyBank');
    subProxies = savedProxies ? JSON.parse(savedProxies) : [];
    populateSelects();
}

/**
 * Sets up event listeners specific to the subscription page.
 */
function setupSubscriptionEventListeners() {
    // Form controls
    document.querySelectorAll('.protocol-btn').forEach(btn => btn.addEventListener('click', selectProtocol));
    document.querySelectorAll('.port-btn').forEach(btn => btn.addEventListener('click', selectPort));
    document.querySelectorAll('.format-btn').forEach(btn => btn.addEventListener('click', selectFormat));
    document.getElementById('templateLevelSelect').addEventListener('change', (e) => {
        selectedTemplateLevel = e.target.value;
    });

    // Form submission
    document.getElementById('configForm').addEventListener('submit', (e) => {
        e.preventDefault();
        generateConfiguration();
    });

    // Result controls
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('downloadBtn').addEventListener('click', downloadConfiguration);
}

/**
 * Sets the default selections for the form.
 */
function setDefaultSelections() {
    document.querySelector('.protocol-btn[data-protocol="trojan"]').click();
    document.querySelector('.port-btn[data-port="443"]').click();
    document.querySelector('.format-btn[data-format="uri"]').click();
}

function selectProtocol(e) {
    document.querySelectorAll('.protocol-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600'));
    e.target.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    selectedProtocol = e.target.dataset.protocol;
}

function selectPort(e) {
    document.querySelectorAll('.port-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600'));
    e.target.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    selectedPort = e.target.dataset.port;
}

function selectFormat(e) {
    document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    selectedFormat = e.target.dataset.format;

    const templateLevelContainer = document.getElementById('templateLevelContainer');
    if (selectedFormat === 'clash' || selectedFormat === 'singbox') {
        templateLevelContainer.classList.remove('hidden');
    } else {
        templateLevelContainer.classList.add('hidden');
    }
}

/**
 * Populates select dropdowns with data.
 */
function populateSelects() {
    // Populate host select (uses 'tunnels' global from app.js)
    const hostSelect = document.getElementById('hostSelect');
    hostSelect.innerHTML = '<option value="">Select a host</option>';
    tunnels
        .filter(tunnel => tunnel.status === 'online')
        .forEach(tunnel => {
            const option = document.createElement('option');
            option.value = `https://${tunnel.domain}`;
            option.textContent = `${tunnel.name} (${tunnel.domain})`;
            hostSelect.appendChild(option);
        });

    // Populate country select
    const countrySelect = document.getElementById('countrySelect');
    countrySelect.innerHTML = '<option value="any">Any Country</option>';
    const countries = [...new Set(subProxies.map(p => p.country))];
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = getCountryName(country);
        countrySelect.appendChild(option);
    });
}

/**
 * Generates the VPN configuration based on form inputs.
 */
async function generateConfiguration() {
    const host = document.getElementById('hostSelect').value;
    const country = document.getElementById('countrySelect').value;
    const count = parseInt(document.getElementById('countInput').value);

    if (!host) return alert('Please select a host.');

    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
    generateBtn.disabled = true;

    try {
        let filtered = [...subProxies].filter(p => p.status === 'online');
        if (country !== 'any') {
            filtered = filtered.filter(p => p.country === country);
        }
        if (filtered.length === 0) {
            throw new Error(`No online proxies available for the selected country.`);
        }

        const configs = [];
        const selectedProxies = filtered.slice(0, count);

        for (let i = 0; i < selectedProxies.length; i++) {
            const proxy = selectedProxies[i];
            const uuid = crypto.randomUUID();
            const hostUrl = new URL(host);
            let config = '';

            if (selectedProtocol === 'trojan') {
                config = `trojan://${uuid}@${hostUrl.hostname}:${selectedPort}?path=/${proxy.proxyIP}:${proxy.proxyPort}&type=ws&host=${hostUrl.hostname}&security=${selectedPort === '443' ? 'tls' : 'none'}#Trojan-${proxy.country}-${i + 1}`;
            } else if (selectedProtocol === 'vless') {
                config = `vless://${uuid}@${hostUrl.hostname}:${selectedPort}?path=/${proxy.proxyIP}:${proxy.proxyPort}&type=ws&host=${hostUrl.hostname}&encryption=none&security=${selectedPort === '443' ? 'tls' : 'none'}#VLESS-${proxy.country}-${i + 1}`;
            } else if (selectedProtocol === 'ss') {
                const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
                config = `ss://${encodedPassword}@${hostUrl.hostname}:${selectedPort}?plugin=v2ray-plugin;mode=websocket;path=/${proxy.proxyIP}:${proxy.proxyPort};host=${hostUrl.hostname}${selectedPort === '443' ? ';tls' : ''}#SS-${proxy.country}-${i + 1}`;
            }
            configs.push(config);
        }

        let result = configs.join('\n');

        if (selectedFormat === 'clash' || selectedFormat === 'singbox') {
            const response = await fetch(`${API_BASE_URL}/convert/${selectedFormat}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: configs, level: selectedTemplateLevel }),
            });
            if (!response.ok) throw new Error(`API conversion failed: ${response.statusText}`);
            result = await response.text();
        } else if (selectedFormat === 'qrcode') {
            result = configs[0]; // QR code for the first config only
        }

        showResult(result, selectedFormat);

    } catch (error) {
        console.error('Generation Error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}

/**
 * Displays the generated configuration result.
 * @param {string} result - The configuration string or QR code data.
 * @param {string} format - The output format ('uri', 'qrcode', etc.).
 */
function showResult(result, format) {
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    resultContent.innerHTML = '';

    if (format === 'qrcode') {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(result)}`;
        resultContent.innerHTML = `<div class="text-center"><img src="${qrCodeUrl}" alt="QR Code" class="mx-auto mb-4"></div>`;
    } else {
        resultContent.innerHTML = `<div class="bg-gray-100 p-4 rounded-md"><pre class="whitespace-pre-wrap break-words text-sm">${result}</pre></div>`;
    }

    resultSection.classList.remove('hidden');
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function copyToClipboard() {
    const pre = document.querySelector('#resultContent pre');
    const text = pre ? pre.textContent : document.querySelector('#resultContent img')?.src;
    if (!text) return alert('No content to copy.');

    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy mr-2"></i> Copy'; }, 2000);
    }).catch(err => alert('Failed to copy.'));
}

function downloadConfiguration() {
    const text = document.querySelector('#resultContent pre')?.textContent;
    if (!text) return alert('No content to download.');

    let filename = `vpn-config.txt`;
    if (selectedFormat === 'clash') filename = 'clash-config.yaml';
    if (selectedFormat === 'singbox') filename = 'singbox-config.json';

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getCountryName(code) {
    const names = { 'US': 'United States', 'SG': 'Singapore', 'JP': 'Japan', 'DE': 'Germany', 'FR': 'France' };
    return names[code] || code;
}
