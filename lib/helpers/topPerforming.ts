/**
 * Top Performing Data Helper Functions
 *
 * Provides helper functions for fetching top-performing locations or machines (Cabinets)
 * from the API and assigning colors dynamically for visualization. It handles data
 * retrieval and color assignment for charts and visualizations.
 *
 * Features:
 * - Fetches top-performing locations or machines from the API.
 * - Supports time period and licensee filtering.
 * - Assigns colors dynamically from a color palette for visualization.
 * - Handles errors gracefully with empty array fallback.
 */

import axios from 'axios';
import { TopPerformingData } from '@/lib/types';
import { colorPalette } from '@/lib/constants/uiConstants';

// ============================================================================
// Type Definitions
// ============================================================================

type ActiveTab = 'locations' | 'Cabinets';

// ============================================================================
// Top Performing Data Fetching
// ============================================================================

/**
 * Fetches top-performing locations or Cabinets and assigns colors dynamically.
 *
 * @param activeTab - Either "locations" or "Cabinets".
 * @param timePeriod - The time period (7d, 30d, etc.).
 * @param licensee - (Optional) Licensee filter for restricting results.
 * @returns Promise resolving to an array of top-performing entities with color assignment.
 */
export async function fetchTopPerformingData(
  activeTab: ActiveTab,
  timePeriod: string,
  licensee?: string
): Promise<TopPerformingData[]> {
  try {
    const params: Record<string, string> = { activeTab, timePeriod };
    if (licensee) {
      params.licensee = licensee;
    }
    const headers = { 'Content-Type': 'application/json' };
    const response = await axios.get(`/api/metrics/top-performing`, {
      params,
      headers,
    });

    // The API returns { activeTab, timePeriod, data }
    const rawData: TopPerformingData[] = response.data.data || [];

    // Assign colors from the palette
    return rawData.map((item, index) => ({
      ...item,
      color: colorPalette[index % colorPalette.length],
    }));
  } catch (error) {
    // Error handling for top-performing data fetch
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed to fetch top-performing ${activeTab}:`, error);
    }
    return [];
  }
}
