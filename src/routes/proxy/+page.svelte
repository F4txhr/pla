<script>
  import { fly } from "svelte/transition";
  export let data;
  let searchTerm = "";

  $: filteredProxies = data.proxies.filter(
    (proxy) =>
      proxy.proxy_data.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proxy.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proxy.org.toLowerCase().includes(searchTerm.toLowerCase())
  );
</script>

<div class="space-y-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-4xl font-bold text-gray-800">Proxies</h1>
      <p class="text-gray-600">Manage your proxy servers.</p>
    </div>
    <button
      class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
    >
      Add Proxy
    </button>
  </div>

  <div class="rounded-lg bg-white p-6 shadow-md">
    <div class="mb-4">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search proxies..."
        class="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
      />
    </div>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {#each filteredProxies as proxy (proxy.id)}
        <div
          in:fly={{ y: 20, duration: 300 }}
          class="rounded-lg border border-gray-200 p-4"
        >
          <div class="flex items-center justify-between">
            <div class="text-lg font-bold">{proxy.proxy_data}</div>
            <div
              class="rounded-full px-2 py-1 text-xs font-semibold {proxy.status ===
              'online'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'}"
            >
              {proxy.status}
            </div>
          </div>
          <div class="mt-2 text-sm text-gray-600">
            <div><strong>Country:</strong> {proxy.country}</div>
            <div><strong>Organization:</strong> {proxy.org}</div>
            <div><strong>Latency:</strong> {proxy.latency}ms</div>
            <div><strong>Last Checked:</strong> {new Date(proxy.last_checked).toLocaleString()}</div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
