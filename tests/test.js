QUnit.module('Tunnel Status Logic', function(hooks) {
  let originalFetch;
  let fetchUrl;

  hooks.beforeEach(function() {
    originalFetch = window.fetch;
    fetchUrl = null;

    // Mock fetch to intercept the URL and simulate a successful response
    window.fetch = async (url, options) => {
      fetchUrl = url;
      // Return a resolved promise to simulate a successful fetch
      return Promise.resolve(new Response(null, { status: 200 }));
    };

    window.saveTunnelsToApi = async () => {};
    window.renderTunnelList = () => {};
  });

  hooks.afterEach(function() {
    window.fetch = originalFetch;
  });

  QUnit.test('Handles domain that already includes https://', async function(assert) {
    const tunnel = { id: '1', name: 'Test Tunnel', domain: 'https://example.com' };

    await checkSingleTunnelStatus(tunnel);

    // With the fix, the URL should be correct
    assert.strictEqual(fetchUrl, 'https://example.com', 'The URL should be correctly used as-is');
    // And the status should be online because fetch succeeds
    assert.strictEqual(tunnel.status, 'online', 'Tunnel should be marked as online');
  });

  QUnit.test('Handles domain without protocol', async function(assert) {
    const tunnel = { id: '2', name: 'Test Tunnel 2', domain: 'example.com' };

    await checkSingleTunnelStatus(tunnel);

    assert.strictEqual(fetchUrl, 'https://example.com', 'The URL should be correctly prepended with https://');
    assert.strictEqual(tunnel.status, 'online', 'Tunnel should be marked as online');
  });

  QUnit.test('Handles domain with http://', async function(assert) {
    const tunnel = { id: '3', name: 'Test Tunnel 3', domain: 'http://example.com' };

    await checkSingleTunnelStatus(tunnel);

    assert.strictEqual(fetchUrl, 'http://example.com', 'The URL should be correctly used as-is');
    assert.strictEqual(tunnel.status, 'online', 'Tunnel should be marked as online');
  });
});