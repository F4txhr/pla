<script>
  import { fade, fly } from "svelte/transition";
  export let data;
</script>

<div class="space-y-8">
  <!-- Header -->
  <div>
    <h1 class="text-4xl font-bold text-gray-800">Dashboard</h1>
    <p class="text-gray-600">
      Welcome back! Here's a real-time overview of your services.
    </p>
  </div>

  <!-- Stats Cards -->
  <div
    class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
    in:fly={{ y: 20, duration: 500 }}
  >
    <!-- Total Proxies -->
    <div
      class="transform rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
    >
      <div class="flex items-center">
        <div class="mr-4 rounded-lg bg-blue-100 p-3">
          <svg
            class="h-6 w-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 009-9m-9 9a9 9 0 00-9-9"
            ></path></svg
          >
        </div>
        <div>
          <p class="text-sm text-gray-600">Total Proxies</p>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.totalProxies}
          </p>
        </div>
      </div>
    </div>
    <!-- Online Proxies -->
    <div
      class="transform rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
    >
      <div class="flex items-center">
        <div class="mr-4 rounded-lg bg-green-100 p-3">
          <svg
            class="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path></svg
          >
        </div>
        <div>
          <p class="text-sm text-gray-600">Online</p>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.onlineProxies}
          </p>
        </div>
      </div>
    </div>
    <!-- Total Tunnels -->
    <div
      class="transform rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
    >
      <div class="flex items-center">
        <div class="mr-4 rounded-lg bg-purple-100 p-3">
          <svg
            class="h-6 w-6 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            ></path></svg
          >
        </div>
        <div>
          <p class="text-sm text-gray-600">Tunnels</p>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.totalTunnels}
          </p>
        </div>
      </div>
    </div>
    <!-- Total Accounts -->
    <div
      class="transform rounded-lg bg-white p-6 shadow-md transition-transform hover:scale-105"
    >
      <div class="flex items-center">
        <div class="mr-4 rounded-lg bg-yellow-100 p-3">
          <svg
            class="h-6 w-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.975 5.975 0 0112 13a5.975 5.975 0 01-3 5.197M15 21a9 9 0 00-9-5.197"
            ></path></svg
          >
        </div>
        <div>
          <p class="text-sm text-gray-600">Accounts</p>
          <p class="text-2xl font-bold text-gray-900">
            {data.stats.totalAccounts}
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="rounded-lg bg-white p-6 shadow-md" in:fade={{ duration: 600 }}>
    <h2 class="mb-4 text-xl font-semibold text-gray-800">Quick Actions</h2>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <a
        href="/proxy"
        class="flex items-center rounded-lg bg-blue-50 p-4 transition-colors hover:bg-blue-100"
      >
        <svg
          class="mr-3 h-6 w-6 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          ></path></svg
        >
        <div>
          <h3 class="font-medium text-gray-900">Add Proxies</h3>
          <p class="text-sm text-gray-600">Import a new proxy list</p>
        </div>
      </a>
      <a
        href="/subscription"
        class="flex items-center rounded-lg bg-green-50 p-4 transition-colors hover:bg-green-100"
      >
        <svg
          class="mr-3 h-6 w-6 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          ></path></svg
        >
        <div>
          <h3 class="font-medium text-gray-900">Generate Config</h3>
          <p class="text-sm text-gray-600">Create VPN configurations</p>
        </div>
      </a>
      <button
        class="flex items-center rounded-lg bg-purple-50 p-4 transition-colors hover:bg-purple-100"
      >
        <svg
          class="mr-3 h-6 w-6 text-purple-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          ></path><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          ></path></svg
        >
        <div>
          <h3 class="font-medium text-gray-900">System Settings</h3>
          <p class="text-sm text-gray-600">Configure global parameters</p>
        </div>
      </button>
    </div>
  </div>

  <!-- Recent Activity -->
  <div class="rounded-lg bg-white p-6 shadow-md" in:fade={{ duration: 700 }}>
    <h2 class="mb-4 text-xl font-semibold text-gray-800">Recent Activity</h2>
    <div class="text-center text-gray-500">
      <svg
        class="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        ><path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        ></path></svg
      >
      <p class="mt-2">No recent activity to display.</p>
    </div>
  </div>
</div>
