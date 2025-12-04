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

import { colorPalette } from '@/lib/constants/uiConstants';
import { TopPerformingData, TopPerformingItem } from '@/lib/types';
import axios from 'axios';

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
  licensee?: string,
  currency?: string,
  signal?: AbortSignal
): Promise<TopPerformingData> {
  try {
    const params: Record<string, string> = { activeTab, timePeriod };
    if (licensee) {
      params.licensee = licensee;
    }
    if (currency) {
      params.currency = currency;
    }
    const headers = { 'Content-Type': 'application/json' };
    const response = await axios.get(`/api/metrics/top-performing`, {
      params,
      headers,
      signal,
    });

    // The API returns { activeTab, timePeriod, data }
    const rawData: TopPerformingItem[] = response.data.data || [];

    // Assign colors from the palette and format machine names with game
    return rawData.map((item, index) => {
      // Format machine name with game in brackets if it's a machine (Cabinets tab)
      let formattedName = item.name;
      if (activeTab === 'Cabinets' && item.game) {
        // Format: SerialNumber (Game) or SerialNumber (CustomName, Game)
        const bracketParts: string[] = [];
        if (item.customName && item.customName !== item.name) {
          bracketParts.push(item.customName);
        }
        if (item.game) {
          bracketParts.push(item.game);
        }
        if (bracketParts.length > 0) {
          formattedName = `${item.name} (${bracketParts.join(', ')})`;
        }
      }

      return {
        ...item,
        name: formattedName,
        color: colorPalette[index % colorPalette.length],
      };
    });
  } catch (error) {
    // Error handling for top-performing data fetch
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed to fetch top-performing ${activeTab}:`, error);
    }
    return [];
  }
}
