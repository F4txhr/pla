import fs from 'fs/promises';
import path from 'path';
import Handlebars from 'handlebars';
import NodeCache from 'node-cache';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

// -----------------------------------------------------------------------------
// Template system (ported from your test-api converter.js, adapted to ESM)
// -----------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TemplateSystem {
    constructor() {
        this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
        this.metadata = null;
        this.templatesDir = path.join(__dirname, 'templates');
    }

    async init() {
        try {
            const metadataPath = path.join(this.templatesDir, 'metadata.json');
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            this.metadata = JSON.parse(metadataContent);
            this.registerHelpers();
            console.log('[convert] Template system initialized');
        } catch (error) {
            console.error('[convert] Failed to initialize template system:', error);
            throw error;
        }
    }

    registerHelpers() {
        Handlebars.registerHelper('eq', (a, b) => a === b);
        Handlebars.registerHelper('gt', (a, b) => a > b);
        Handlebars.registerHelper('json', (obj) => JSON.stringify(obj));
        Handlebars.registerHelper('unless', function (conditional, options) {
            if (!conditional) {
                return options.fn(this);
            }
            return '';
        });
    }

    async loadTemplate(format, level) {
        const cacheKey = `${format}:${level}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const extensionMap = {
            clash: 'yaml.hbs',
            singbox: 'json.hbs'
        };
        const extension = extensionMap[format] || 'hbs';
        const templateName = `${level}.${extension}`;

        try {
            const templatePath = path.join(this.templatesDir, format, templateName);
            const source = await fs.readFile(templatePath, 'utf8');
            const template = Handlebars.compile(source);

            this.cache.set(cacheKey, template);
            return template;
        } catch (error) {
            console.error(`[convert] Failed to load template ${format}:${level} (tried ${templateName}):`, error.message);

            if (level !== 'basic') {
                console.log(`[convert] Falling back to basic template for ${format}`);
                return this.loadTemplate(format, 'basic');
            }

            throw new Error(`Template for ${format} at level ${level} could not be loaded. Original error: ${error.message}`);
        }
    }

    async generateConfig(format, level, data) {
        const template = await this.loadTemplate(format, level);
        return template(data);
    }
}

const templateSystem = new TemplateSystem();
let templateInitPromise = templateSystem.init().catch((err) => {
    console.error('[convert] Template init failed:', err);
    // Do not rethrow here; handler will see the failure on await.
    return null;
});

// -----------------------------------------------------------------------------
// Parsing functions (ported from test-api/converter.js, trimmed to needed types)
// -----------------------------------------------------------------------------

function parseVLESS(link) {
    if (!link.startsWith('vless://')) {
        throw new Error('Bukan link VLESS');
    }

    const clean = link.replace('vless://', '');
    const [userinfo, rest] = clean.split('@');
    const [uuid] = userinfo.split(':');

    const [hostport, paramString] = rest.split('?');
    const [host, port] = hostport.split(':');

    const params = {};
    let fragmentName = '';

    if (paramString) {
        const paramParts = paramString.split('#');
        const queryParams = paramParts[0];
        fragmentName = paramParts[1] ? paramParts[1] : '';

        if (queryParams) {
            queryParams.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key) {
                    params[decodeURIComponent(key)] = decodeURIComponent(value || '');
                }
            });
        }
    }

    let name = 'VLESS Server';
    if (fragmentName) {
        try {
            name = decodeURIComponent(fragmentName);
        } catch (e) {
            console.warn('[convert] Gagal decode fragment untuk VLESS link:', e.message);
            name = fragmentName;
        }
    }

    return {
        type: 'vless',
        uuid,
        host,
        port: parseInt(port, 10),
        security: params.security || 'none',
        flow: params.flow || '',
        network: params.type || 'tcp',
        path: params.path || (params.type === 'ws' ? '/' : ''),
        host_header: params.host || '',
        sni: params.sni || params.host || host,
        fp: params.fp || '',
        pbk: params.pbk || '',
        sid: params.sid || '',
        spx: params.spx || '',
        alpn: params.alpn || '',
        allowInsecure: params.allowInsecure === '1' || params.allowInsecure === 'true' || false,
        name
    };
}

function parseVMess(link) {
    if (!link.startsWith('vmess://')) {
        throw new Error('Bukan link VMess');
    }

    const base64 = link.replace('vmess://', '');
    let jsonStr;
    try {
        jsonStr = Buffer.from(base64, 'base64').toString('utf8');
        const obj = JSON.parse(jsonStr);

        let name = 'VMess Server';
        if (obj.ps) {
            try {
                name = decodeURIComponent(obj.ps);
            } catch (e) {
                console.warn('[convert] Gagal decode ps untuk VMess link:', e.message);
                name = obj.ps;
            }
        }

        return {
            type: 'vmess',
            uuid: obj.id,
            host: obj.add,
            port: parseInt(obj.port, 10),
            alterId: parseInt(obj.aid, 10) || 0,
            security: obj.sc || obj.cipher || 'auto',
            network: obj.net || 'tcp',
            type: obj.type || 'none',
            path: obj.path || (obj.net === 'ws' ? '/' : ''),
            host_header: obj.host || obj.add,
            sni: obj.sni || obj.host || obj.add,
            tls: obj.tls === 'tls',
            alpn: obj.alpn || '',
            fp: obj.fp || '',
            name
        };
    } catch {
        throw new Error('Invalid VMess base64 JSON');
    }
}

function parseTrojan(link) {
    if (!link.startsWith('trojan://')) {
        throw new Error('Bukan link Trojan');
    }

    const cleanLink = link.substring('trojan://'.length);
    const paramStartIndex = cleanLink.indexOf('?');
    const fragmentStartIndex = cleanLink.indexOf('#');

    let userinfo_and_serverinfo = '';
    let paramString = '';
    let fragment = '';

    if (paramStartIndex === -1 && fragmentStartIndex === -1) {
        userinfo_and_serverinfo = cleanLink;
    } else if (paramStartIndex !== -1 && fragmentStartIndex === -1) {
        userinfo_and_serverinfo = cleanLink.substring(0, paramStartIndex);
        paramString = cleanLink.substring(paramStartIndex + 1);
    } else if (paramStartIndex === -1 && fragmentStartIndex !== -1) {
        userinfo_and_serverinfo = cleanLink.substring(0, fragmentStartIndex);
        fragment = cleanLink.substring(fragmentStartIndex + 1);
    } else {
        userinfo_and_serverinfo = cleanLink.substring(0, paramStartIndex);
        if (fragmentStartIndex > paramStartIndex) {
            paramString = cleanLink.substring(paramStartIndex + 1, fragmentStartIndex);
            fragment = cleanLink.substring(fragmentStartIndex + 1);
        } else {
            paramString = cleanLink.substring(paramStartIndex + 1);
        }
    }

    const [userinfo, serverinfo] = userinfo_and_serverinfo.split('@');
    if (!userinfo || !serverinfo) {
        throw new Error('Invalid Trojan link format: Missing userinfo or serverinfo');
    }

    const [host, portStr] = serverinfo.split(':');
    const port = parseInt(portStr, 10);
    if (isNaN(port)) {
        throw new Error('Invalid Trojan link format: Invalid port');
    }

    const params = {};
    if (paramString) {
        paramString.split('&').forEach(pair => {
            if (pair) {
                const [key, value = ''] = pair.split('=');
                if (key) {
                    params[decodeURIComponent(key)] = decodeURIComponent(value);
                }
            }
        });
    }

    let name = 'Trojan Server';
    if (fragment) {
        try {
            name = decodeURIComponent(fragment);
        } catch (e) {
            console.warn('[convert] Gagal mendecode fragment/tag untuk Trojan link:', e.message);
            name = fragment || name;
        }
    }

    return {
        type: 'trojan',
        password: decodeURIComponent(userinfo),
        host,
        port,
        security: 'tls',
        network: params.type || 'tcp',
        path: params.path || (params.type === 'ws' ? '/' : ''),
        host_header: params.host || host,
        sni: params.sni || params.host || host,
        alpn: params.alpn || '',
        fp: params.fp || '',
        allowInsecure: params.allowInsecure === '1' || params.allowInsecure === 'true' || false,
        name
    };
}

function parseSS(link) {
    if (!link.startsWith('ss://')) {
        throw new Error('Not a Shadowsocks link');
    }

    const fragmentIndex = link.indexOf('#');
    const fragment = fragmentIndex !== -1 ? link.substring(fragmentIndex + 1) : '';
    const clean = link.substring(0, fragmentIndex !== -1 ? fragmentIndex : link.length).replace('ss://', '');

    const [userinfo, hostport] = clean.split('@');
    const [host, portWithParams] = hostport.split(':');
    const [portPart, ...paramParts] = portWithParams.split('?');
    const port = parseInt(portPart, 10);

    let method = 'chacha20-ietf-poly1305';
    let password = '';
    try {
        const decoded = Buffer.from(userinfo, 'base64').toString('utf8');
        const [m, p] = decoded.split(':', 2);
        method = m;
        password = p;
    } catch {
        throw new Error('Invalid Shadowsocks base64 encoding');
    }

    let plugin = '';
    let plugin_opts = '';
    let obfs = '';
    let obfsHost = '';

    if (paramParts.length > 0) {
        const params = new URLSearchParams(paramParts.join('?'));
        const rawPlugin = params.get('plugin') || '';
        if (rawPlugin) {
            const parts = rawPlugin.split(';');
            plugin = parts[0];
            plugin_opts = parts.slice(1).join(';');
        }
        obfs = params.get('obfs') || '';
        obfsHost = params.get('obfs-host') || '';
    }

    let name = 'SS Server';
    if (fragment) {
        try {
            name = decodeURIComponent(fragment);
        } catch (e) {
            console.warn('[convert] Gagal decode fragment untuk SS link:', e.message);
            name = fragment;
        }
    }

    return {
        type: 'ss',
        method,
        password,
        host,
        port,
        plugin,
        plugin_opts,
        obfs,
        obfsHost,
        name
    };
}

function parseAnyLink(link) {
    if (!link || typeof link !== 'string') {
        throw new Error('Link must be a non-empty string');
    }

    if (link.length > 2000) {
        throw new Error('Link is too long');
    }

    if (link.startsWith('vless://')) return parseVLESS(link);
    if (link.startsWith('vmess://')) return parseVMess(link);
    if (link.startsWith('trojan://')) return parseTrojan(link);
    if (link.startsWith('ss://')) return parseSS(link);

    throw new Error('Unsupported protocol. Supported: vless, vmess, trojan, ss');
}

// -----------------------------------------------------------------------------
// Conversion functions (subset: Clash + SingBox, like in test-api)
// -----------------------------------------------------------------------------

function toClash(config) {
    const clashConfig = {
        name: config.name,
        type: config.type,
        server: config.host,
        port: config.port,
        udp: true,
        'skip-cert-verify': !!config.allowInsecure
    };

    switch (config.type) {
        case 'vless':
            clashConfig.uuid = config.uuid;
            clashConfig.tls = config.security === 'tls' || config.security === 'reality';
            if (clashConfig.tls) {
                if (config.sni) clashConfig.servername = config.sni;
                if (config.alpn) clashConfig.alpn = config.alpn.split(',').map(a => a.trim());
                if (config.fp) clashConfig.fingerprint = config.fp;

                if (config.security === 'reality') {
                    clashConfig['client-fingerprint'] = config.fp;
                    if (config.pbk) clashConfig['public-key'] = config.pbk;
                    if (config.sid) clashConfig['short-id'] = config.sid;
                    if (config.spx) clashConfig['spider-x'] = config.spx;
                } else if (config.security === 'tls') {
                    if (config.flow) clashConfig.flow = config.flow;
                }
            }
            if (config.network === 'ws') {
                clashConfig.network = 'ws';
                clashConfig['ws-path'] = config.path || '/';
                if (config.host_header) {
                    clashConfig['ws-headers'] = { host: config.host_header };
                }
            }
            break;

        case 'vmess':
            clashConfig.uuid = config.uuid;
            clashConfig.alterId = config.alterId;
            clashConfig.cipher = config.security;
            clashConfig.tls = !!config.tls;
            if (clashConfig.tls) {
                if (config.sni) clashConfig.servername = config.sni;
                if (config.alpn) clashConfig.alpn = config.alpn.split(',').map(a => a.trim());
                if (config.fp) clashConfig.fingerprint = config.fp;
            }
            if (config.network === 'ws') {
                clashConfig.network = 'ws';
                clashConfig['ws-path'] = config.path || '/';
                if (config.host_header) {
                    clashConfig['ws-headers'] = { host: config.host_header };
                }
            }
            break;

        case 'trojan':
            clashConfig.password = config.password;
            clashConfig.tls = true;
            if (config.sni) clashConfig.sni = config.sni;
            if (config.alpn) clashConfig.alpn = config.alpn.split(',').map(a => a.trim());
            if (config.fp) clashConfig.fingerprint = config.fp;
            if (config.network === 'ws') {
                clashConfig.network = 'ws';
                clashConfig['ws-path'] = config.path || '/';
                if (config.host_header) {
                    clashConfig['ws-headers'] = { host: config.host_header };
                }
            }
            break;

        case 'ss':
            clashConfig.cipher = config.method;
            clashConfig.password = config.password;
            if (config.plugin) {
                clashConfig.plugin = config.plugin;

                const opts = {};
                if (config.plugin_opts) {
                    config.plugin_opts.split(';').forEach(part => {
                        if (part) {
                            const [key, ...valParts] = part.split('=');
                            const value = valParts.join('=');
                            if (key === 'tls') {
                                opts[key] = true;
                            } else if (value) {
                                opts[key] = value;
                            }
                        }
                    });
                }

                if (Object.keys(opts).length > 0) {
                    clashConfig['plugin-opts'] = opts;
                } else if (config.obfs) {
                    clashConfig['plugin-opts'] = {
                        mode: config.obfs,
                        host: config.obfsHost
                    };
                }
            }
            break;

        default:
            throw new Error(`Tidak dapat mengkonversi protokol '${config.type}' ke format Clash.`);
    }

    // Single-proxy YAML (starts with "- ").
    return yaml.dump([clashConfig], { indent: 2 }).trim();
}

function toSingBox(config) {
    const base = {
        tag: config.name,
        type: config.type === 'ss' ? 'shadowsocks' : config.type,
        server: config.host,
        server_port: config.port
    };

    if (config.type === 'vless' || config.type === 'vmess') {
        base.uuid = config.uuid;
        if (config.type === 'vmess') base.alter_id = config.alterId;

        if (config.network === 'ws') {
            base.transport = {
                type: 'ws',
                path: config.path || '/',
                headers: config.host_header ? { host: config.host_header } : {}
            };
        }

        if (config.network === 'grpc') {
            base.transport = {
                type: 'grpc',
                service_name: config.serviceName || ''
            };
        }

        if (config.security === 'tls' || config.security === 'reality' || config.tls) {
            base.tls = {
                enabled: true,
                server_name: config.sni || config.host,
                insecure: !!config.allowInsecure
            };
            if (config.alpn) {
                base.tls.alpn = config.alpn.split(',').map(a => a.trim()).filter(a => a);
            }
            if (config.security === 'reality') {
                base.tls.utls = { enabled: true, fingerprint: config.fp || 'chrome' };
                base.tls.reality = { enabled: true, public_key: config.pbk, short_id: config.sid };
                base.tls.flow = config.flow || '';
            } else if (config.security === 'tls') {
                base.tls.utls = { enabled: true, fingerprint: config.fp || 'chrome' };
                if (config.flow) base.tls.flow = config.flow;
            }
        } else {
            base.tls = { enabled: false };
        }
        if (config.security === 'none' && !config.tls) {
            base.tls = { enabled: false };
        }
    } else if (config.type === 'trojan') {
        base.password = config.password;

        if (config.network === 'ws') {
            base.transport = {
                type: 'ws',
                path: config.path || '/',
                headers: config.host_header ? { host: config.host_header } : {}
            };
        }

        base.tls = {
            enabled: true,
            server_name: config.sni || config.host,
            insecure: !!config.allowInsecure,
            utls: { enabled: true, fingerprint: config.fp || 'chrome' }
        };
        if (config.alpn) {
            base.tls.alpn = config.alpn.split(',').map(a => a.trim()).filter(a => a);
        }
    } else if (config.type === 'ss') {
        base.method = config.method;
        base.password = config.password;

        if (config.plugin) {
            base.plugin = config.plugin;
            if (config.plugin_opts) {
                base.plugin_opts = config.plugin_opts;
            }
        }
    }

    return JSON.stringify(base, null, 2);
}

// -----------------------------------------------------------------------------
// Core processing and config generation (Clash & SingBox)
// -----------------------------------------------------------------------------

async function processLinks(links) {
    const results = [];

    for (let i = 0; i < links.length; i++) {
        const singleLink = links[i];

        try {
            const parsed = parseAnyLink(singleLink);
            // Gunakan nama yang sudah dikirim dari link (fragment) jika ada.
            // Tambahkan brand suffix [Vortex-x] dan biarkan nomor urut global datang dari generator.
            const baseName = (parsed.name && parsed.name.trim().length)
                ? parsed.name.trim()
                : `Proxy Server ${i + 1}`;
            const configName = `${baseName} [Vortex-x]`;

            const config = {
                ...parsed,
                name: configName,
                network: parsed.network || 'tcp'
            };

            const formats = {
                clash: toClash(config),
                singbox: toSingBox(config)
            };

            results.push({
                original: config,
                formats,
                link: singleLink,
                tag: configName
            });
        } catch (convertError) {
            console.error(`[convert] Gagal konversi link (${singleLink.substring(0, 50)}...):`, convertError.message);
            results.push({ error: convertError.message, link: singleLink });
        }
    }

    return results;
}

async function generateConfigByFormat(format, level, results) {
    const validProxies = results.filter(r => !r.error);

    switch (format) {
        case 'clash':
            return generateClashConfig(validProxies, level);
        case 'singbox':
            return generateSingBoxConfig(validProxies, level);
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

async function generateClashConfig(results, level) {
    const data = {
        proxies: results.map(r => r.formats.clash),
        proxyNames: results.map(r => r.original.name),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };

    return templateSystem.generateConfig('clash', level, data);
}

async function generateSingBoxConfig(results, level) {
    const outbounds = results.map(r => JSON.parse(r.formats.singbox));
    const proxyTags = results.map(r => r.tag);

    const data = {
        outbounds,
        proxyNames: proxyTags,
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };

    return templateSystem.generateConfig('singbox', level, data);
}

// -----------------------------------------------------------------------------
// API handler: /api/convert  (POST)
// Body: { links: string[], format: 'clash' | 'singbox', level: 'basic'|'standard'|'advanced' }
// -----------------------------------------------------------------------------

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', ['POST']);
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    try {
        await templateInitPromise;

        const body = request.body || {};
        const links = Array.isArray(body.links) ? body.links : [];
        const format = (body.format || 'clash').toLowerCase();
        const level = (body.level || 'standard').toLowerCase();

        if (!links.length) {
            return response.status(400).json({ error: 'Body.links must be a non-empty array of VPN links.' });
        }

        if (!['clash', 'singbox'].includes(format)) {
            return response.status(400).json({ error: 'Unsupported format. Use: clash or singbox.' });
        }

        const results = await processLinks(links);
        const successful = results.filter(r => !r.error);

        if (!successful.length) {
            const errorMessages = results
                .filter(r => r.error)
                .map(r => `Link: ${r.link}\nError: ${r.error}`)
                .join('\n\n');

            return response.status(400).json({
                error: 'Semua link gagal dikonversi.',
                details: errorMessages
            });
        }

        const content = await generateConfigByFormat(format, level, successful);

        return response.status(200).json({
            format,
            level,
            count: successful.length,
            content
        });
    } catch (error) {
        console.error('[convert] Error in /api/convert:', error);
        return response.status(500).json({ error: 'Failed to convert links.', details: error.message });
    }
}