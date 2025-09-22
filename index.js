import { getAssetFromKV } from '@cloudflare/kv-asset-handler';

// The key used to store the full proxy list in the KV namespace.
const KV_PROXIES_KEY = 'all_proxies_list';

// Main event listener for all incoming requests.
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

// Key for storing tunnel data in the APP_DATA namespace.
const KV_TUNNELS_KEY = 'tunnels_data';
// Key for storing accounts data in the ACCOUNTS_DATA namespace.
const KV_ACCOUNTS_KEY = 'accounts_data';

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
    try {
      const updatedProxies = await request.json();
      await PROXY_STATUS.put(KV_PROXIES_KEY, JSON.stringify(updatedProxies));
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
    try {
      const updatedAccounts = await request.json();
      await ACCOUNTS_DATA.put(KV_ACCOUNTS_KEY, JSON.stringify(updatedAccounts));
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
      return new Response(JSON.stringify({ success: true, message: 'Tunnels updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Failed to parse or update tunnels: ${e.message}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
}

/**
 * Serves static assets (HTML, CSS, JS) from the KV namespace.
 * This is the default handler for any request that is not an API call.
 * @param {FetchEvent} event The fetch event
 */
async function handleStaticAssetRequest(event) {
  try {
    return await getAssetFromKV(event, {
      // Caching options can be configured here if needed.
    });
  } catch (e) {
    // If an asset is not found, attempt to serve the 404.html page.
    try {
      let notFoundResponse = await getAssetFromKV(event, {
        mapRequestToAsset: req => new Request(`${new URL(req.url).origin}/404.html`, req),
      });
      return new Response(notFoundResponse.body, { ...notFoundResponse, status: 404 });
    } catch (e) {}

    return new Response('Not Found', { status: 404 });
  }
}
