export async function load({ fetch, url }) {
  const response = await fetch(`${url.origin}/api/stats`);
  const stats = await response.json();
  console.log("Stats passed to page:", stats);
  return { stats };
}
