// API Base URL for the external converter service
// Used to convert raw VPN links into Clash / Singbox / other formats.
const API_BASE_URL = 'https://api.foolvpn.me';

// Base URL for the external proxy health check service
// Used to determine whether a given IP:Port proxy is online.
const PROXY_HEALTH_API_BASE = 'https://id1.foolvpn.me/api/v1';

// Cache duration for proxy statuses in milliseconds (10 minutes)
const CACHE_DURATION_MS = 10 * 60 * 1000;
