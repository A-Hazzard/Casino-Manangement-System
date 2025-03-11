import { getMetrics } from "@/lib/helpers/metrics";
import {Dispatch, SetStateAction} from "react";
import { ActiveFilters, dashboardData } from "../types";

/**
 * Handles a change in the active dashboard filter.
 *
 * This function updates the active filter state, sets the active metrics filter label,
 * toggles the display of the date picker (for Custom date ranges), and fetches new metrics data
 * based on the selected filter. For non-Custom filters, it calls `getMetrics` with the appropriate
 * time period and then updates the totals and chart data states.
 *
 * @param {keyof ActiveFilters} filterKey - The key representing the selected filter
 *        (e.g., "Today", "Yesterday", "last7days", "last30days", or "Custom").
 * @param {Dispatch<React.SetStateAction<ActiveFilters>>} setActiveFilters - State setter to update the active filters.
 * @param {Dispatch<React.SetStateAction<dashboardData | null>>} setTotals - State setter to update the aggregated dashboard totals.
 * @param {Dispatch<React.SetStateAction<dashboardData[]>>} setChartData - State setter to update the chart data.
 * @param {Dispatch<React.SetStateAction<boolean>>} setShowDatePicker - State setter to control the visibility of the Custom date picker.
 * @param {Dispatch<React.SetStateAction<string>>} setActiveMetricsFilter - State setter to update the active metrics filter label.
 * @returns {Promise<void>} A promise that resolves when the filter change has been processed and the metrics data updated.
 */
/**
 * Handles a change in the active dashboard filter.
 *
 * This function updates the active filter state, sets the active metrics filter label,
 * toggles the display of the Custom date picker (for Custom date ranges), and fetches new metrics data
 * based on the selected filter. For non-Custom filters, it calls `getMetrics` with the appropriate
 * time period and then updates the totals and chart data states.
 *
 * @param {keyof ActiveFilters} filterKey - The key representing the selected filter
 *        (e.g., "Today", "Yesterday", "last7days", "last30days", or "Custom").
 * @param {Dispatch<SetStateAction<ActiveFilters>>} setActiveFilters - State setter to update the active filters.
 * @param {Dispatch<SetStateAction<dashboardData | null>>} setTotals - State setter to update the aggregated dashboard totals.
 * @param {Dispatch<SetStateAction<dashboardData[]>>} setChartData - State setter to update the chart data.
 * @param {Dispatch<SetStateAction<boolean>>} setShowDatePicker - State setter to control the visibility of the Custom date picker.
 * @param {Dispatch<SetStateAction<string>>} setActiveMetricsFilter - State setter to update the active metrics filter label.
 * @param {string} [licencee] - (Optional) The licencee ID to filter the metrics by.
 * @returns {Promise<void>} A promise that resolves when the filter change has been processed and the metrics data updated.
 */

export async function handleFilterChange(
    filterKey: keyof ActiveFilters,
    setActiveFilters: Dispatch<SetStateAction<ActiveFilters>>,
    setShowDatePicker: Dispatch<SetStateAction<boolean>>,
    setActiveMetricsFilter: Dispatch<SetStateAction<string>>
): Promise<void> {
  const newFilters: ActiveFilters = {
    Today: false,
    Yesterday: false,
    last7days: false,
    last30days: false,
    Custom: false,
  }

  newFilters[filterKey] = true
  setActiveFilters(newFilters)

  // e.g. "Today", "7d", "30d", or "Custom"
  const label =
      filterKey === "last7days"
          ? "7d"
          : filterKey === "last30days"
              ? "30d"
              : filterKey.charAt(0).toUpperCase() + filterKey.slice(1)

  setActiveMetricsFilter(label)

  if (filterKey === "Custom") {
    setShowDatePicker(true)
  } else {
    setShowDatePicker(false)
  }

  // No API calls here!
}
/**
 * Switches filter and fetches new metrics data.
 *
 * @param filter - The time period to fetch metrics for (e.g., "Today", "7d", "30d", or "Custom").
 * @param setTotals - State setter for updating the total dashboard data.
 * @param setChartData - State setter for updating the chart data.
 * @param startDate - (Optional) Custom start date for a Custom date range.
 * @param endDate - (Optional) Custom end date for a Custom date range.
 * @param licencee - (Optional) The licencee ID to filter the metrics by.
 * @returns A promise that resolves when the metrics data is fetched and state is updated.
 */
export async function switchFilter(
    filter: string,
    setTotals: Dispatch<SetStateAction<dashboardData | null>>,
    setChartData: Dispatch<SetStateAction<dashboardData[]>>,
    startDate?: Date,
    endDate?: Date,
    licencee?: string
): Promise<void> {
  try {
    const data: dashboardData[] = await getMetrics(filter, startDate, endDate, licencee);

    // Batch the state updates for chartData and totals.
    // React typically batches these updates in one render pass.
    if (data && data.length > 0) {
      setChartData(data);
      const totalWager = data.reduce((acc, cur) => acc + cur.moneyIn, 0);
      const totalGamesWon = data.reduce((acc, cur) => acc + cur.moneyOut, 0);
      const totalGross = data.reduce((acc, cur) => acc + cur.gross, 0);
      setTotals({
        day: "",
        time: "",
        moneyIn: totalWager,
        moneyOut: totalGamesWon,
        gross: totalGross,
      });
    } else {
      console.error("🚨 No metrics data returned");
      setTotals(null);
      setChartData([]);
    }
  } catch (error) {
    console.error("🚨 Error fetching metrics:", error);
  }
}

/**
 * Formats a given number as a localized USD currency string.
 *
 * @param {number} value - The number to format.
 * @returns {string} The formatted currency string in USD.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}
