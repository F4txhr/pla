export async function load({ fetch }) {
  const response = await fetch('/api/stats');
  const stats = await response.json();
  console.log("Stats passed to page:", stats);
  return { stats };
}
