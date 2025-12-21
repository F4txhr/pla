export async function load({ fetch }) {
  const response = await fetch('/api/proxies');
  const proxies = await response.json();
  return { proxies };
}
