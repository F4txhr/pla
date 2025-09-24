QUnit.module('Proxy Filtering Logic', function(hooks) {
  hooks.beforeEach(function() {
    // Define a diverse set of proxies for testing filters
    allProxies = [
      { id: '1', country: 'US', status: 'online' },
      { id: '2', country: 'US', status: 'offline' },
      { id: '3', country: 'SG', status: 'online' },
      { id: '4', country: 'SG', status: 'online' },
      { id: '5', country: 'JP', status: 'offline' },
    ];

    // Set up mock DOM elements
    const fixture = document.getElementById('qunit-fixture');
    fixture.innerHTML = `
      <select id="countryFilter"><option value=""></option></select>
      <select id="statusFilter"><option value=""></option></select>
      <span id="totalProxies"></span>
    `;
  });

  QUnit.test('Filters by country and status correctly (chained)', function(assert) {
    // Set filter values
    document.getElementById('countryFilter').value = 'SG';
    document.getElementById('statusFilter').value = 'online';

    // Run the filter function
    applyFilters();

    // Assert the results
    assert.strictEqual(filteredProxies.length, 2, 'Should find 2 proxies that are from SG and online.');
    const allMatch = filteredProxies.every(p => p.country === 'SG' && p.status === 'online');
    assert.ok(allMatch, 'All resulting proxies must be from SG and online.');
  });

  QUnit.test('Filters by country only', function(assert) {
    document.getElementById('countryFilter').value = 'US';
    document.getElementById('statusFilter').value = ''; // No status filter

    applyFilters();

    assert.strictEqual(filteredProxies.length, 2, 'Should find 2 proxies that are from US.');
    assert.ok(filteredProxies.every(p => p.country === 'US'), 'All resulting proxies must be from US.');
  });

  QUnit.test('Filters by status only', function(assert) {
    document.getElementById('countryFilter').value = ''; // No country filter
    document.getElementById('statusFilter').value = 'offline';

    applyFilters();

    assert.strictEqual(filteredProxies.length, 2, 'Should find 2 proxies that are offline.');
    assert.ok(filteredProxies.every(p => p.status === 'offline'), 'All resulting proxies must be offline.');
  });

  QUnit.test('Returns all proxies when no filters are applied', function(assert) {
    document.getElementById('countryFilter').value = '';
    document.getElementById('statusFilter').value = '';

    applyFilters();

    assert.strictEqual(filteredProxies.length, 5, 'Should return all 5 proxies when no filters are active.');
  });
});