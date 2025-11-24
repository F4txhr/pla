// =================================================================================
// Subscription Page Logic
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    setupSubscriptionEventListeners();
});

async function loadInitialData() {
    try {
        // Tunnels are now loaded globally by app.js. We only need to fetch proxies here.
        const proxyResponse = await fetch('/api/proxies');

        if (!proxyResponse.ok) throw new Error('Failed to fetch proxy data from API.');

        const allProxies = await proxyResponse.json();

        // Use the globally loaded tunnels from window.tunnels, fall back to an empty array.
        populateSelects(allProxies, window.tunnels || []);
    } catch (error) {
        console.error(error);
        alert('Could not load initial data. Please ensure proxies have been imported and tunnels are configured.');
    }
}

function setupSubscriptionEventListeners() {
    document.getElementById('configForm').addEventListener('submit', (e) => {
        e.preventDefault();
        generateConfiguration();
    });
    document.getElementById('copyBtn').addEventListener('click', copyToClipboard);
    document.getElementById('downloadBtn').addEventListener('click', downloadConfiguration);
    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const selectedFormat = e.target.dataset.format;
            document.getElementById('templateLevelContainer').classList.toggle('hidden', selectedFormat !== 'clash' && selectedFormat !== 'singbox');
        });
    });
    document.querySelector('.format-btn[data-format="uri"]').classList.add('active');
}

function populateSelects(allProxies, tunnels) {
    const hostSelect = document.getElementById('hostSelect');
    hostSelect.innerHTML = '<option value="any">Any Host (Mix)</option>';
    tunnels.forEach(tunnel => {
        const option = document.createElement('option');
        option.value = `https://${tunnel.domain}`;
        option.textContent = `${tunnel.name} (${tunnel.domain})`;
        hostSelect.appendChild(option);
    });
    const countrySelect = document.getElementById('countrySelect');
    countrySelect.innerHTML = '<option value="any">Any Country</option>';
    const countries = [...new Set(allProxies.map(p => p.country).filter(Boolean))].sort();
    countries.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${getFlagEmoji(code)} ${getCountryName(code)}`;
        countrySelect.appendChild(option);
    });
    const protocolSelect = document.getElementById('protocolSelect');
    protocolSelect.innerHTML = `<option value="any">Any Protocol (Mix)</option><option value="trojan">Trojan</option><option value="vless">VLESS</option><option value="ss">Shadowsocks</option>`;
}

async function generateConfiguration() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Generating...';
    generateBtn.disabled = true;

    try {
        // Tunnels are global now, so we only need to fetch proxies.
        const allProxies = await (await fetch('/api/proxies')).json();
        const tunnels = window.tunnels || [];

        const selectedHostValue = document.getElementById('hostSelect').value;
        const selectedCountry = document.getElementById('countrySelect').value;
        const selectedProtocolValue = document.getElementById('protocolSelect').value;
        const count = parseInt(document.getElementById('countInput').value);

        // Custom bugs: satu per baris
        const bugInput = document.getElementById('bugListInput');
        const bugList = bugInput
            ? bugInput.value.split('\n').map(l => l.trim()).filter(Boolean)
            : [];

        // Filter proxies to only include those marked as 'online' in the database.
        // The time-based cache is removed as per the user's request for more accurate, real-time data.
        let availableProxies = allProxies.filter(p => p.status === 'online');
        if (selectedCountry !== 'any') {
            availableProxies = availableProxies.filter(p => p.country === selectedCountry);
        }
        if (availableProxies.length === 0) throw new Error(`No recently online proxies for selected criteria.`);

        let availableHosts = tunnels.filter(t => t.status === 'online');
        if (selectedHostValue !== 'any') {
            availableHosts = availableHosts.filter(t => `https://${t.domain}` === selectedHostValue);
        }
        if (availableHosts.length === 0) throw new Error('No online tunnels available.');

        const availableProtocols = selectedProtocolValue === 'any' ? ['trojan', 'vless', 'ss'] : [selectedProtocolValue];

        const configurations = [];
        for (let i = 0; i < count; i++) {
            const proxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
            const hostInfo = availableHosts[Math.floor(Math.random() * availableHosts.length)];
            const protocol = availableProtocols[Math.floor(Math.random() * availableProtocols.length)];

            const uuid = crypto.randomUUID();
            const workerHost = hostInfo.domain;
            const port = '443';
            const security = 'tls';

            // Ambil IP dan port dari proxy_data (format: IP:Port)
            let ipPart = '';
            let portPart = '';
            if (proxy.proxyIP && proxy.proxyPort) {
                ipPart = proxy.proxyIP;
                portPart = proxy.proxyPort;
            } else if (proxy.proxy_data) {
                const [ip, prt] = proxy.proxy_data.split(':');
                ipPart = ip || '';
                portPart = prt || '443';
            }
            const path = encodeURIComponent(`/${ipPart}-${portPart}`);

            // Pilih bug secara acak jika ada list bug; jika tidak, gunakan workerHost sebagai server
            const bugHost = bugList.length > 0
                ? bugList[Math.floor(Math.random() * bugList.length)]
                : workerHost;

            const remark = encodeURIComponent(`${protocol.toUpperCase()}-${proxy.country}-${i + 1}`);

            let config = '';
            if (protocol === 'trojan') {
                config = `trojan://${uuid}@${bugHost}:${port}?path=${path}&security=${security}&host=${workerHost}&type=ws&sni=${workerHost}#${remark}`;
            } else if (protocol === 'vless') {
                config = `vless://${uuid}@${bugHost}:${port}?path=${path}&security=${security}&encryption=none&host=${workerHost}&type=ws&sni=${workerHost}#${remark}`;
            } else if (protocol === 'ss') {
                const encodedPassword = btoa(`chacha20-ietf-poly1305:${uuid}`);
                config = `ss://${encodedPassword}@${bugHost}:${port}?plugin=v2ray-plugin;mode=websocket;path=${path};host=${workerHost};tls;sni=${workerHost}#${remark}`;
            }
            configurations.push(config);
        }

        const outputFormat = document.querySelector('.format-btn.active')?.dataset.format || 'uri';
        let result = configurations.join('\n');

        if (outputFormat === 'clash' || outputFormat === 'singbox') {
            // Gunakan converter built-in di backend dashboard: /api/convert
            const templateLevel = document.getElementById('templateLevelSelect')?.value || 'standard';

            console.log('[Subscriptions] Calling local converter: /api/convert', 'format:', outputFormat, 'template:', templateLevel);

            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    links: configurations,
                    format: outputFormat,
                    level: templateLevel
                })
            });

            if (!response.ok) {
                let errorData = null;
                try {
                    errorData = await response.json();
                } catch (_) {
                    // ignore
                }
                console.error('[Subscriptions] Converter error:', errorData || response.statusText);
                throw new Error(errorData?.error || errorData?.details || `API conversion failed (${response.status}): ${response.statusText}`);
            }

            const payload = await response.json();
            result = payload.content || '';
        } else if (outputFormat === 'qrcode') {
            result = configurations[0];
        }

        showResult(result, outputFormat);

    } catch (error) {
        console.error('Generation Error:', error);
        alert(`Error: ${error.message}`);
    } finally {
        generateBtn.innerHTML = '<i class="fas fa-cogs mr-2"></i> Generate Configuration';
        generateBtn.disabled = false;
    }
}

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
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        const copyBtn = document.getElementById('copyBtn');
        copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
        setTimeout(() => { copyBtn.innerHTML = '<i class="fas fa-copy mr-2"></i> Copy'; }, 2000);
    });
}

function downloadConfiguration() {
    const text = document.querySelector('#resultContent pre')?.textContent;
    if (!text) return;
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
    const names = { 'US': 'United States', 'SG': 'Singapore', 'JP': 'Japan', 'DE': 'Germany', 'FR': 'France', 'XX': 'Unknown' };
    return names[code] || code;
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode === 'XX') return '🏳️';
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}
