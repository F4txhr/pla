<script>
  let configLink = "https://example.com/sub/long-random-string";
  let selectedFormat = "Clash";

  async function generateLink() {
    const response = await fetch("/api/subscription", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ format: selectedFormat }),
    });
    const data = await response.json();
    configLink = data.configLink;
  }
</script>

<div class="space-y-8">
  <div>
    <h1 class="text-4xl font-bold text-gray-800">Subscription</h1>
    <p class="text-gray-600">
      Generate your VPN configuration subscription link.
    </p>
  </div>

  <div class="rounded-lg bg-white p-6 shadow-md">
    <div class="space-y-4">
      <div>
        <label for="format" class="block text-sm font-medium text-gray-700"
          >Configuration Format</label
        >
        <select
          id="format"
          name="format"
          bind:value={selectedFormat}
          class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        >
          <option>Clash</option>
          <option>Sing-box</option>
          <option>V2Ray</option>
        </select>
      </div>

      <button
        on:click={generateLink}
        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
      >
        Generate Link
      </button>
    </div>
  </div>

  <div class="rounded-lg bg-white p-6 shadow-md">
    <div class="flex items-center justify-between">
      <p class="truncate text-gray-700">{configLink}</p>
      <button
        class="ml-4 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-300"
        on:click={() => navigator.clipboard.writeText(configLink)}
      >
        Copy
      </button>
    </div>
  </div>
</div>
