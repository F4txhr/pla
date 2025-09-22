// =================================================================================
// Accounts Page Logic
// =================================================================================

// Global variables for the accounts page
let accounts = [];
let editingAccountId = null;

document.addEventListener('DOMContentLoaded', () => {
    setupAccountEventListeners();
    loadAccounts();
    renderAccounts();
});

/**
 * Sets up event listeners specific to the accounts page.
 */
function setupAccountEventListeners() {
    // Modal triggers
    document.getElementById('addAccountBtn').addEventListener('click', openAddModal);
    document.getElementById('emptyStateAddBtn').addEventListener('click', openAddModal);

    // Modal controls
    document.getElementById('cancelBtn').addEventListener('click', closeAccountModal);
    document.getElementById('accountForm').addEventListener('submit', saveAccount);
    document.getElementById('generateUuidBtn').addEventListener('click', () => {
        document.getElementById('uuid').value = crypto.randomUUID();
    });
}

/**
 * Loads accounts from localStorage.
 */
function loadAccounts() {
    const savedAccounts = localStorage.getItem('vpnAccounts');
    accounts = savedAccounts ? JSON.parse(savedAccounts) : [];
}

/**
 * Saves the current accounts array to localStorage.
 */
function saveAccounts() {
    localStorage.setItem('vpnAccounts', JSON.stringify(accounts));
}

/**
 * Renders the accounts data into the table.
 */
function renderAccounts() {
    const tableBody = document.getElementById('accountsTableBody');
    const emptyState = document.getElementById('emptyState');

    if (accounts.length === 0) {
        tableBody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    tableBody.innerHTML = accounts.map(account => `
        <tr class="bg-white border-b hover:bg-gray-50">
            <td class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">${account.username}</td>
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <span class="truncate w-48">${account.uuid}</span>
                    <button onclick="copyToClipboard('${account.uuid}', this)" class="ml-2 text-gray-500 hover:text-blue-600">
                        <i class="fas fa-copy"></i>
                    </button>
                </div>
            </td>
            <td class="px-6 py-4">${new Date(account.createdAt).toLocaleDateString()}</td>
            <td class="px-6 py-4">
                <button onclick="openEditModal('${account.id}')" class="font-medium text-blue-600 hover:underline mr-4">Edit</button>
                <button onclick="confirmDeleteAccount('${account.id}')" class="font-medium text-red-600 hover:underline">Delete</button>
            </td>
        </tr>
    `).join('');
}

function openAddModal() {
    editingAccountId = null;
    document.getElementById('accountModalTitle').textContent = 'Add New Account';
    document.getElementById('accountForm').reset();
    document.getElementById('uuid').value = crypto.randomUUID();
    document.getElementById('accountModal').classList.remove('hidden');
}

function openEditModal(id) {
    const account = accounts.find(acc => acc.id === id);
    if (!account) return;

    editingAccountId = id;
    document.getElementById('accountModalTitle').textContent = 'Edit Account';
    document.getElementById('accountId').value = account.id;
    document.getElementById('username').value = account.username;
    document.getElementById('uuid').value = account.uuid;
    document.getElementById('accountModal').classList.remove('hidden');
}

function closeAccountModal() {
    document.getElementById('accountModal').classList.add('hidden');
}

/**
 * Saves a new or edited account.
 */
function saveAccount(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const uuid = document.getElementById('uuid').value;

    if (editingAccountId) {
        const index = accounts.findIndex(acc => acc.id === editingAccountId);
        if (index !== -1) {
            accounts[index].username = username;
            accounts[index].uuid = uuid;
        }
    } else {
        accounts.push({
            id: crypto.randomUUID(),
            username,
            uuid,
            createdAt: new Date().toISOString()
        });
    }

    saveAccounts();
    renderAccounts();
    closeAccountModal();
}

function confirmDeleteAccount(id) {
    if (confirm('Are you sure you want to delete this account?')) {
        deleteAccount(id);
    }
}

function deleteAccount(id) {
    accounts = accounts.filter(acc => acc.id !== id);
    saveAccounts();
    renderAccounts();
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const icon = button.querySelector('i');
        icon.classList.replace('fa-copy', 'fa-check');
        setTimeout(() => {
            icon.classList.replace('fa-check', 'fa-copy');
        }, 1500);
    }).catch(err => {
        console.error('Could not copy text: ', err);
        alert('Failed to copy text.');
    });
}

// Make functions globally accessible for onclick handlers
window.openEditModal = openEditModal;
window.confirmDeleteAccount = confirmDeleteAccount;
window.copyToClipboard = copyToClipboard;
