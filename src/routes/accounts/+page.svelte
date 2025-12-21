<script>
  import { fly } from "svelte/transition";
  export let data;
</script>

<div class="space-y-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-4xl font-bold text-gray-800">Accounts</h1>
      <p class="text-gray-600">Manage user accounts.</p>
    </div>
    <button
      class="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
    >
      Add Account
    </button>
  </div>

  <div class="overflow-x-auto rounded-lg bg-white p-6 shadow-md">
    <table class="min-w-full">
      <thead>
        <tr>
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >Username</th
          >
          <th
            class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >Status</th
          >
          <th class="px-6 py-3"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200 bg-white">
        {#each data.accounts as account (account.id)}
          <tr in:fly={{ y: 20, duration: 300 }}>
            <td class="whitespace-nowrap px-6 py-4">{account.username}</td>
            <td class="whitespace-nowrap px-6 py-4">
              <span
                class="rounded-full px-2 py-1 text-xs font-semibold {account.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'}"
              >
                {account.is_active ? "Active" : "Inactive"}
              </span>
            </td>
            <td class="whitespace-nowrap px-6 py-4 text-right">
              <button class="text-blue-600 hover:text-blue-900">Edit</button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
