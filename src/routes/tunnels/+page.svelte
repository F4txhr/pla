<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { toast, Toaster } from 'svelte-sonner';

  let tunnels = writable([]);

  async function fetchTunnels() {
    const response = await fetch('/api/tunnels');
    if (response.ok) {
      const data = await response.json();
      tunnels.set(data);
    } else {
      toast.error('Failed to load tunnels.');
    }
  }

  async function deleteTunnel(id) {
    const response = await fetch(`/api/tunnels?id=${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      tunnels.update(currentTunnels => currentTunnels.filter(t => t.id !== id));
      toast.success('Tunnel deleted successfully!');
    } else {
      const { error, details } = await response.json();
      toast.error(`Failed to delete tunnel: ${error} - ${details}`);
    }
  }

  onMount(fetchTunnels);
</script>

<Toaster position="top-right" />

<div class="space-y-8">
  <h1 class="text-4xl font-bold text-gray-800">Tunnels</h1>

  <div class="overflow-x-auto rounded-lg bg-white p-6 shadow-md">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">ID</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
          <th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Created At</th>
          <th scope="col" class="relative px-6 py-3">
            <span class="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        {#if $tunnels.length === 0}
          <tr>
            <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">No tunnels found.</td>
          </tr>
        {/if}
        {#each $tunnels as tunnel (tunnel.id)}
          <tr>
            <td class="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{tunnel.id}</td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{tunnel.name}</td>
            <td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">{new Date(tunnel.created_at).toLocaleString()}</td>
            <td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
              <button on:click={() => deleteTunnel(tunnel.id)} class="text-red-600 hover:text-red-900">Delete</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
