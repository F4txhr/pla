import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// KV Namespace Keys
const KV_PROXIES_KEY = 'all_proxies_list';
const KV_TUNNELS_KEY = 'tunnels_data';
const KV_ACCOUNTS_KEY = 'accounts_data';
const KV_LAST_UPDATED_KEY = 'last_updated_timestamp'; // New Key

// Main event listener for fetch events.
addEventListener('fetch', event => {
  event.respondWith(handleEvent(event));
});

/**
 * Routes incoming requests to either the API handler or the static asset handler.
 * @param {FetchEvent} event The fetch event
 */
async function handleEvent(event) {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) {
    return handleApiRequest(event.request);
  }
  return handleStaticAssetRequest(event);
}

/**
 * Handles all requests to /api/ routes by routing them to the correct handler.
 * @param {Request} request The incoming request
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // Simple router for API endpoints
  if (url.pathname === '/api/proxies') {
    return handleProxiesApi(request);
  } else if (url.pathname === '/api/tunnels') {
    return handleTunnelsApi(request);
  } else if (url.pathname === '/api/accounts') {
    return handleAccountsApi(request);
  } else if (url.pathname === '/api/stats') {
    return handleStatsApi(request);
  }

  // Fallback for unknown API routes
  return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handles GET and POST requests for /api/proxies.
 * @param {Request} request The incoming request
 */
async function handleProxiesApi(request) {
  if (typeof PROXY_STATUS === 'undefined') {
    return new Response(JSON.stringify({ error: 'PROXY_STATUS KV Namespace is not bound.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  if (request.method === 'GET') {
    const proxiesJson = await PROXY_STATUS.get(KV_PROXIES_KEY, 'json') || [];
    return new Response(JSON.stringify(proxiesJson), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (request.method === 'POST') {
    if (typeof APP_DATA === 'undefined') {
      return new Response(JSON.stringify({ error: 'APP_DATA KV Namespace is not bound for timestamping.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    try {
      const updatedProxies = await request.json();
      await PROXY_STATUS.put(KV_PROXIES_KEY, JSON.stringify(updatedProxies));
      await APP_DATA.put(KV_LAST_UPDATED_KEY, new Date().toISOString()); // Update timestamp
      return new Response(JSON.stringify({ success: true, message: 'Proxies updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to parse or update proxies: ${e.message}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return new Response('Method Not Allowed', { status: 405 });
}

/**
 * Handles GET and POST requests for /api/accounts.
 * @param {Request} request The incoming request
 */
async function handleAccountsApi(request) {
  if (typeof ACCOUNTS_DATA === 'undefined') {
    return new Response(JSON.stringify({ error: 'ACCOUNTS_DATA KV Namespace is not bound.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  if (request.method === 'GET') {
    const accountsJson = await ACCOUNTS_DATA.get(KV_ACCOUNTS_KEY, 'json') || [];
    return new Response(JSON.stringify(accountsJson), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (request.method === 'POST') {
    if (typeof APP_DATA === 'undefined') {
      return new Response(JSON.stringify({ error: 'APP_DATA KV Namespace is not bound for timestamping.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    try {
      const updatedAccounts = await request.json();
      await ACCOUNTS_DATA.put(KV_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
      await APP_DATA.put(KV_LAST_UPDATED_KEY, new Date().toISOString()); // Update timestamp
      return new Response(JSON.stringify({ success: true, message: 'Accounts updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to parse or update accounts: ${e.message}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return new Response('Method Not Allowed', { status: 405 });
}

/**
 * Handles GET and POST requests for /api/tunnels.
 * @param {Request} request The incoming request
 */
async function handleTunnelsApi(request) {
  if (typeof APP_DATA === 'undefined') {
    return new Response(JSON.stringify({ error: 'APP_DATA KV Namespace is not bound.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  if (request.method === 'GET') {
    const tunnelsJson = await APP_DATA.get(KV_TUNNELS_KEY, 'json') || [];
    return new Response(JSON.stringify(tunnelsJson), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (request.method === 'POST') {
    try {
      const updatedTunnels = await request.json();
      await APP_DATA.put(KV_TUNNELS_KEY, JSON.stringify(updatedTunnels));
      await APP_DATA.put(KV_LAST_UPDATED_KEY, new Date().toISOString()); // Update timestamp
      return new Response(JSON.stringify({ success: true, message: 'Tunnels updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to parse or update tunnels: ${e.message}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }
  return new Response('Method Not Allowed', { status: 405 });
}

/**
 * Handles GET requests for /api/stats, providing aggregated dashboard data.
 * @param {Request} request The incoming request
 */
async function handleStatsApi(request) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Check for KV bindings
  const requiredBindings = [
    { name: 'PROXY_STATUS', binding: typeof PROXY_STATUS },
    { name: 'ACCOUNTS_DATA', binding: typeof ACCOUNTS_DATA },
    { name: 'APP_DATA', binding: typeof APP_DATA },
  ];

  for (const { name, binding } of requiredBindings) {
    if (binding === 'undefined') {
      return new Response(JSON.stringify({ error: `${name} KV Namespace is not bound.` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    // Fetch all data in parallel for efficiency
    const [proxies, accounts, tunnels, lastUpdated] = await Promise.all([
      PROXY_STATUS.get(KV_PROXIES_KEY, 'json') || [],
      ACCOUNTS_DATA.get(KV_ACCOUNTS_KEY, 'json') || [],
      APP_DATA.get(KV_TUNNELS_KEY, 'json') || [],
      APP_DATA.get(KV_LAST_UPDATED_KEY, 'text') || null,
    ]);

    // Note: The logic for 'online' proxies is an assumption based on typical health checks.
    // It assumes each proxy object has a 'status' property, e.g., { id: '...', status: 'online' }
    const onlineProxies = proxies.filter(p => p.status === 'online').length;

    const stats = {
      totalProxies: proxies.length,
      onlineProxies: onlineProxies,
      activeTunnels: tunnels.length,
      totalAccounts: accounts.length,
      lastUpdated: lastUpdated,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: `Failed to retrieve stats: ${e.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Serves static assets (HTML, CSS, JS) from the KV namespace.
 * This is the default handler for any request that is not an API call.
 * @param {FetchEvent} event The fetch event
 */
async function handleStaticAssetRequest(event) {
  try {
    return await getAssetFromKV(event, {});
  } catch (e) {
    try {
      let notFoundResponse = await getAssetFromKV(event, {
        mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/404.html`, req),
      });
      return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
    } catch (e) {}
    return new Response('Not Found', { status: 404 });
  }
}