import { getMetrics } from "@/lib/helpers/metrics";
import { ActiveFilters, dashboardData } from "../types";
import { TimePeriod } from "@/lib/types/api";

/**
 * Handles a change in the active dashboard filter.
 *
 * Updates the active filter state, toggles the Custom date picker if needed,
 * and updates the active metrics filter label.
 */
export async function handleFilterChange(
  filterKey: keyof ActiveFilters,
  setActiveFilters: (filters: ActiveFilters) => void,
  setShowDatePicker: (state: boolean) => void,
  setActiveMetricsFilter: (state: TimePeriod) => void
): Promise<void> {
  const newFilters: ActiveFilters = {
    Today: false,
    Yesterday: false,
    last7days: false,
    last30days: false,
    Custom: false,
  };

  newFilters[filterKey] = true;
  setActiveFilters(newFilters); // ✅ Now correctly updating state!

  const label = (
    filterKey === "last7days"
      ? "7d"
      : filterKey === "last30days"
      ? "30d"
      : filterKey.charAt(0).toUpperCase() + filterKey.slice(1)
  ) as TimePeriod;

  setActiveMetricsFilter(label);

  setShowDatePicker(filterKey === "Custom");
}

/**
 * Fetches new metrics data based on selected filter.
 */
export async function switchFilter(
  filter: TimePeriod,
  setTotals: (state: dashboardData | null) => void,
  setChartData: (state: dashboardData[]) => void,
  startDate?: Date,
  endDate?: Date,
  licencee?: string,
  setActiveFilters?: (filters: ActiveFilters) => void,
  setShowDatePicker?: (state: boolean) => void
): Promise<void> {
  try {
    // If setActiveFilters is provided, update the filter state
    if (setActiveFilters) {
      const newFilters: ActiveFilters = {
        Today: filter === "Today",
        Yesterday: filter === "Yesterday",
        last7days: filter === "7d",
        last30days: filter === "30d",
        Custom: filter === "Custom",
      };
      setActiveFilters(newFilters);
    }

    // If setShowDatePicker is provided, update date picker visibility
    if (setShowDatePicker) {
      setShowDatePicker(filter === "Custom");
    }

    const data: dashboardData[] = await getMetrics(
      filter,
      startDate,
      endDate,
      licencee
    );

    if (data.length > 0) {
      setChartData(data);
      setTotals({
        day: "",
        time: "",
        moneyIn: data.reduce((acc, cur) => acc + cur.moneyIn, 0),
        moneyOut: data.reduce((acc, cur) => acc + cur.moneyOut, 0),
        gross: data.reduce((acc, cur) => acc + cur.gross, 0),
      });
    } else {
      console.warn("🚨 No metrics data returned");
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
