QUnit.module('Proxy Import Logic', function(hooks) {
  // Store original functions to restore them after tests
  let originalFetch;
  let originalAlert;
  let originalCheckProxies;
  let originalPopulateCountryFilter;

  hooks.beforeEach(function() {
    // Reset the global state before each test
    allProxies = [];

    // Mock global functions that are called by importProxies
    originalFetch = window.fetch;
    originalAlert = window.alert;
    originalCheckProxies = window.checkProxies;
    originalPopulateCountryFilter = window.populateCountryFilter;

    window.alert = () => {}; // Suppress alerts during tests
    window.checkProxies = async () => {}; // Mock health check
    window.populateCountryFilter = () => {}; // Mock UI update

    // Mock DOM elements behavior
    const importModal = document.getElementById('importModal');
    importModal.classList.remove('hidden');
    document.getElementById('proxyUrlInput').value = 'http://fakeurl.com/proxies.txt';
  });

  hooks.afterEach(function() {
    // Restore original functions
    window.fetch = originalFetch;
    window.alert = originalAlert;
    window.checkProxies = originalCheckProxies;
    window.populateCountryFilter = originalPopulateCountryFilter;
  });

  QUnit.test('Merges new proxies and avoids duplicates', async function(assert) {
    // 1. Set up initial state
    allProxies = [
      { id: '1', proxyIP: '1.1.1.1', proxyPort: '8080', country: 'US' },
      { id: '2', proxyIP: '2.2.2.2', proxyPort: '8080', country: 'SG' }
    ];

    // 2. Define the new data to be "fetched"
    const newProxyText = [
      '2.2.2.2,8080,SG,Test Org', // This one is a duplicate
      '3.3.3.3,80,JP,New Org',    // This one is new
      '4.4.4.4,443,DE,Another Org' // This one is also new
    ].join('\n');

    // 3. Mock the fetch call to return our new data
    window.fetch = async (url) => {
      return new Response(newProxyText, { status: 200 });
    };

    // 4. Run the function we are testing
    await importProxies();

    // 5. Assert the results
    assert.strictEqual(allProxies.length, 4, 'The final list should have 4 proxies (2 original + 2 new).');

    const finalKeys = allProxies.map(p => `${p.proxyIP}:${p.proxyPort}`);
    assert.ok(finalKeys.includes('1.1.1.1:8080'), 'Original proxy 1 should still exist.');
    assert.ok(finalKeys.includes('2.2.2.2:8080'), 'Original proxy 2 should still exist.');
    assert.ok(finalKeys.includes('3.3.3.3:80'), 'New proxy 3 should be added.');
    assert.ok(finalKeys.includes('4.4.4.4:443'), 'New proxy 4 should be added.');

    // Count occurrences of the duplicate to be sure
    const duplicateCount = allProxies.filter(p => p.proxyIP === '2.2.2.2').length;
    assert.strictEqual(duplicateCount, 1, 'The duplicate proxy should only appear once.');
  });
});