// =================================================================================
// Subscription Page Logic
// =================================================================================

// --- Page State ---
let subProxies = [];
// Note: 'tunnels' is a global from app.js

// --- DOMContentLoaded Listener ---
document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptionData();
    setupSubscriptionEventListeners();
});


// --- Initialization & Setup ---

function loadSubscriptionData() {
    const savedProxies = localStorage.getItem('proxyBank');
    subProxies = savedProxies ? JSON.parse(savedProxies) : [];
    populateSelects();
}

function setupSubscriptionEventListeners() {
    document.getElementById('configForm').addEventListener('submit', (e) => {
        e.preventDefault();
        generateConfiguration();
    });

    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('downloadBtn').addEventListener('click', downloadConfiguration);

    // Listener for format buttons to show/hide the template level selector
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const selectedFormat = e.target.dataset.format;
            const templateLevelContainer = document.getElementById('templateLevelContainer');
            if (selectedFormat === 'clash' || selectedFormat === 'singbox') {
                templateLevelContainer.classList.remove('hidden');
            } else {
                templateLevelContainer.classList.add('hidden');
            }
        });
    });
    // Set default format button
    document.querySelector('.format-btn[data-format="uri"]').classList.add('active');
}

function populateSelects() {
    // Populate host select
    const hostSelect = document.getElementById('hostSelect');
    hostSelect.innerHTML = '<option value="any">Any Host (Mix)</option>';
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
    const countries = [...new Set(subProxies.map(p => p.country).filter(Boolean))].sort();
    countries.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${getFlagEmoji(code)} ${getCountryName(code)}`;
        countrySelect.appendChild(option);
    });

    // Populate protocol select
    const protocolSelect = document.getElementById('protocolSelect');
    protocolSelect.innerHTML = `
        <option value="any">Any Protocol (Mix)</option>
        <option value="trojan">Trojan</option>
        <option value="vless">VLESS</option>
        <option value="ss">Shadowsocks</option>
    `;
}


// --- Configuration Generation ---

async function generateConfiguration() {
    const selectedHostValue = document.getElementById('hostSelect').value;
    const selectedCountry = document.getElementById('countrySelect').value;
    const selectedProtocolValue = document.getElementById('protocolSelect').value;
    const count = parseInt(document.getElementById('countInput').value);

    const generateBtn = document.getElementById('generateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
    generateBtn.disabled = true;

    try {
        // --- Filter available resources ---
        let availableProxies = subProxies.filter(p => p.status === 'online');
        if (selectedCountry !== 'any') {
            availableProxies = availableProxies.filter(p => p.country === selectedCountry);
        }
        if (availableProxies.length === 0) throw new Error(`No online proxies for selected criteria.`);

        let availableHosts = tunnels.filter(t => t.status === 'online');
        if (selectedHostValue !== 'any') {
            availableHosts = availableHosts.filter(t => `https://${t.domain}` === selectedHostValue);
        }
        if (availableHosts.length === 0) throw new Error('No online hosts available.');

        const availableProtocols = selectedProtocolValue === 'any' ? ['trojan', 'vless', 'ss'] : [selectedProtocolValue];

        // --- Generation Loop ---
        const configurations = [];
        for (let i = 0; i < count; i++) {
            const proxy = availableProxies[i % availableProxies.length];
            const hostInfo = availableHosts[Math.floor(Math.random() * availableHosts.length)];
            const protocol = availableProtocols[Math.floor(Math.random() * availableProtocols.length)];

            const uuid = crypto.randomUUID();
            const host = hostInfo.domain;
            const port = '443';
            const security = 'tls';
            const path = encodeURIComponent(`/${proxy.proxyIP}-${proxy.proxyPort}`);
            const remark = encodeURIComponent(`${protocol.toUpperCase()}-${proxy.country}-${i + 1}`);

            let config = '';
            if (protocol === 'trojan') {
                config = `trojan://${uuid}@${host}:${port}?path=${path}&security=${security}&host=${host}&type=ws&sni=${host}#${remark}`;
            } else if (protocol === 'vless') {
                config = `vless://${uuid}@${host}:${port}?path=${path}&security=${security}&encryption=none&host=${host}&type=ws&sni=${host}#${remark}`;
            } else if (protocol === 'ss') {
                const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
                config = `ss://${encodedPassword}@${host}:${port}?plugin=v2ray-plugin;mode=websocket;path=${path};host=${host};tls;sni=${host}#${remark}`;
            }
            configurations.push(config);
        }

        // --- Output Generation ---
        const outputFormat = document.querySelector('.format-btn.active')?.dataset.format || 'uri';
        let result = configurations.join('\n');

        if (outputFormat === 'clash' || outputFormat === 'singbox') {
            const selectedTemplateLevel = document.getElementById('templateLevelSelect').value;
            const response = await fetch(`${API_BASE_URL}/convert/${outputFormat}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ links: configurations, level: selectedTemplateLevel }),
            });
            if (!response.ok) throw new Error(`API conversion failed: ${response.statusText}`);
            result = await response.text();
        } else if (outputFormat === 'qrcode') {
            result = configurations[0]; // QR code for the first config only
        }

        showResult(result, outputFormat);

    } catch (error) {
        console.error('Generation Error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
    }
}


// --- UI & Utility Functions ---

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

    const outputFormat = document.querySelector('.format-btn.active')?.dataset.format || 'uri';
    let filename = `vpn-config.txt`;
    if (outputFormat === 'clash') filename = 'clash-config.yaml';
    if (outputFormat === 'singbox') filename = 'singbox-config.json';

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

function getFlagEmoji(countryCode) {
    if (!countryCode) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
