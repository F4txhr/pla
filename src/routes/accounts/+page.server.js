export async function load({ fetch }) {
  const response = await fetch('/api/accounts');
  const accounts = await response.json();
  return { accounts };
}
