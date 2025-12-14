export async function loadDashboardModel(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load JSON: ${res.status} ${res.statusText}`);
  }
  return await res.json();
}