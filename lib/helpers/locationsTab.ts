/**
 * Fetch analytics for top locations.
 */
export async function fetchLocationsAnalytics(licensee: string, dateParam: string) {
  const res = await fetch(`/api/analytics/locations?licensee=${licensee}&${dateParam}`);
  return res.json();
}

/**
 * Fetch analytics for top machines.
 */
export async function fetchMachinesAnalytics(licensee: string, dateParam: string, limit = 5) {
  const res = await fetch(`/api/analytics/machines?licensee=${licensee}&${dateParam}&limit=${limit}`);
  return res.json();
}

/**
 * Fetch chart analytics data.
 */
export async function fetchChartsAnalytics(licensee: string, dateParam: string) {
  const res = await fetch(`/api/analytics/charts?licensee=${licensee}&${dateParam}`);
  return res.json();
}

/**
 * Fetch global dashboard stats.
 */
export async function fetchDashboardStats(licensee: string, dateParam: string) {
  const res = await fetch(`/api/analytics/dashboard?licensee=${licensee}&${dateParam}`);
  return res.json();
}

/**
 * Fetch available locations for dropdowns, etc.
 */
export async function fetchAvailableLocations(licensee: string) {
  const res = await fetch(`/api/gaming-locations?licensee=${licensee}`);
  return res.json();
} 