<script>
  import "../app.css";
  import { writable } from "svelte/store";

  const isMenuOpen = writable(false);

  function toggleMenu() {
    isMenuOpen.update((value) => !value);
  }
</script>

<div class="flex h-screen bg-gray-100">
  <!-- Sidebar -->
  <aside
    class="fixed inset-y-0 left-0 z-30 w-64 transform bg-gray-900 text-white transition-transform duration-300 ease-in-out {$isMenuOpen
      ? 'translate-x-0'
      : '-translate-x-full'} md:relative md:translate-x-0"
  >
    <div class="p-4 text-center text-2xl font-bold">VPN Manager</div>
    <nav class="mt-8">
      <a href="/" class="block px-4 py-2 hover:bg-gray-800">Dashboard</a>
      <a href="/proxy" class="block px-4 py-2 hover:bg-gray-800">Proxies</a>
      <a href="/subscription" class="block px-4 py-2 hover:bg-gray-800"
        >Subscription</a
      >
    </nav>
  </aside>

  <!-- Main Content -->
  <div class="flex flex-1 flex-col">
    <header class="bg-white p-4 shadow-md md:hidden">
      <button on:click={toggleMenu}>
        <svg
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16m-7 6h7"
          ></path>
        </svg>
      </button>
    </header>

    <main class="flex-1 p-8">
      <slot />
    </main>
  </div>
</div>
