QUnit.module('New Feature Tests', function(hooks) {
  hooks.beforeEach(function() {
    // Define a diverse set of proxies for testing
    allProxies = [
      { id: '1', proxyIP: '1.1.1.1', country: 'US', status: 'online', org: 'Google' },
      { id: '2', proxyIP: '2.2.2.2', country: 'US', status: 'offline', org: 'Cloudflare' },
      { id: '3', proxyIP: '3.3.3.3', country: 'SG', status: 'online', org: 'Amazon' },
      { id: '4', proxyIP: '4.4.4.4', country: 'SG', status: 'online', org: 'Amazon' },
      { id: '5', proxyIP: '5.5.5.5', country: 'JP', status: 'offline', org: 'Microsoft' },
    ];

    // Mock the render functions as they are not needed for logic tests
    window.renderProxies = () => {};
    window.renderPagination = () => {};
  });

  QUnit.module('Search Functionality', function() {
    QUnit.test('Search by IP address', function(assert) {
      document.getElementById('searchInput').value = '1.1.1.1';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 1, 'Should find one proxy by full IP.');
      assert.strictEqual(filteredProxies[0].id, '1', 'The correct proxy should be found.');
    });

    QUnit.test('Search by partial IP address', function(assert) {
      document.getElementById('searchInput').value = '.2.2';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 1, 'Should find one proxy by partial IP.');
      assert.strictEqual(filteredProxies[0].id, '2', 'The correct proxy should be found.');
    });

    QUnit.test('Search by country name (full and partial)', function(assert) {
      document.getElementById('searchInput').value = 'singapore';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 2, 'Should find two proxies for "singapore".');

      document.getElementById('searchInput').value = 'jap';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 1, 'Should find one proxy for "jap".');
    });

    QUnit.test('Search by organization', function(assert) {
      document.getElementById('searchInput').value = 'amazon';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 2, 'Should find two proxies for "amazon".');
    });

    QUnit.test('Search is case-insensitive', function(assert) {
      document.getElementById('searchInput').value = 'GOOGLE';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 1, 'Search should be case-insensitive.');
    });

    QUnit.test('Search and filters work together', function(assert) {
      document.getElementById('searchInput').value = 'amazon';
      document.getElementById('statusFilter').value = 'online';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 2, 'Should find two "amazon" proxies that are "online".');

      document.getElementById('countryFilter').value = 'US';
      document.getElementById('searchInput').value = '2.2';
      applyFilters();
      assert.strictEqual(filteredProxies.length, 1, 'Should find one proxy from US matching "2.2".');
    });
  });

  QUnit.module('Clear Filters Functionality', function() {
    QUnit.test('Clear Filters button resets all inputs', function(assert) {
      // Set initial values
      document.getElementById('countryFilter').value = 'US';
      document.getElementById('statusFilter').value = 'online';
      document.getElementById('searchInput').value = 'test';

      // Run the function
      clearFilters();

      // Assert that all inputs are cleared
      assert.strictEqual(document.getElementById('countryFilter').value, '', 'Country filter should be cleared.');
      assert.strictEqual(document.getElementById('statusFilter').value, '', 'Status filter should be cleared.');
      assert.strictEqual(document.getElementById('searchInput').value, '', 'Search input should be cleared.');
    });

    QUnit.test('Clear Filters button re-renders the full list', function(assert) {
      // Apply some filters first
      document.getElementById('countryFilter').value = 'US';
      applyFiltersAndRender();
      assert.notDeepEqual(filteredProxies.length, allProxies.length, 'List should be filtered initially.');

      // Run the function
      clearFilters();

      // Assert that the filtered list is now the full list
      assert.deepEqual(filteredProxies, allProxies, 'Filtered proxies should equal all proxies after clearing.');
    });
  });
});