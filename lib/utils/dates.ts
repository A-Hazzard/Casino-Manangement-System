/**
 * Date Utilities
 *
 * Utility functions for calculating date ranges based on time periods.
 *
 * Features:
 * - Time period to date range conversion
 * - UTC date calculations
 * - Support for Today, Yesterday, 7d, 30d, All Time periods
 * - Timezone-aware date handling
 */

import type { CustomDate } from '@/shared/types/common';
import type { TimePeriod } from '@/shared/types/common';

// ============================================================================
// Date Range Calculation
// ============================================================================
/**
 * Calculates the start and end dates for a specified time period based on a given timezone.
 * Uses timezone-aware date calculations for Trinidad time (UTC-4).
 *
 * @param timePeriod - Specifies the period for date calculation. Acceptable values: 'Today', 'Yesterday', '7d', '30d', 'All Time'.
 * @returns An object containing the calculated start and end dates, or undefined dates for 'All Time'.
 */
export const getDatesForTimePeriod = (timePeriod: TimePeriod): CustomDate => {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  // Use UTC dates directly (matching the working MongoDB shell queries)

  switch (timePeriod) {
    case 'Today':
      // Define today's range in UTC (midnight to 23:59:59)
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    case 'Yesterday':
      // Define yesterday's range in UTC (midnight to 23:59:59)
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 1);
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setUTCDate(endDate.getUTCDate() - 1);
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    case '7d':
    case 'last7days':
      // Define 7-day range in UTC (including today, so go back 6 days)
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    case '30d':
    case 'last30days':
      // Define 30-day range in UTC (including today, so go back 29 days)
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 29);
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    case 'Quarterly':
      // Define quarterly range (last 3 months / 90 days)
      // Including today, so go back 89 days
      startDate = new Date();
      startDate.setUTCDate(startDate.getUTCDate() - 89);
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
      break;

    case 'All Time':
      // For All Time, return undefined dates to fetch all records
      startDate = undefined;
      endDate = undefined;
      break;

    default:
      // Default to Today
      startDate = new Date();
      startDate.setUTCHours(0, 0, 0, 0);

      endDate = new Date();
      endDate.setUTCHours(23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
};
