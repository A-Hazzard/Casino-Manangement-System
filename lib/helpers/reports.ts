import {
  // KpiMetric,
  CasinoLocation,
  GamingMachine,
  TimePeriod,
  DateRange,
  // ChartDataPoint,
  PerformanceStatus,
} from "@/lib/types/reports";
import { startOfDay, endOfDay, subDays } from "date-fns";
import axios from "axios";

/**
 * Get date range based on time period selection
 * @param timePeriod - The selected time period
 * @param customRange - Custom date range if period is 'custom'
 * @returns DateRange object with start and end dates
 */
export const getDateRangeFromPeriod = (
  timePeriod: TimePeriod,
  customRange?: DateRange | null
): DateRange => {
  const now = new Date();

  switch (timePeriod) {
    case "Today":
      return {
        start: startOfDay(now),
        end: endOfDay(now),
      };
    case "last7days":
      return {
        start: subDays(now, 7),
        end: now,
      };
    case "last30days":
      return {
        start: subDays(now, 30),
        end: now,
      };
    case "Custom":
      return (
        customRange || {
          start: subDays(now, 7),
          end: now,
        }
      );
    default:
      return {
        start: subDays(now, 7),
        end: now,
      };
  }
};

/**
 * Calculate KPI trend direction and percentage change
 * @param current - Current value
 * @param previous - Previous value
 * @returns Trend direction and change percentage
 */
export const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return { trend: "neutral" as const, change: 0 };
  }

  const change = ((current - previous) / previous) * 100;
  const trend = change > 0 ? "up" : change < 0 ? "down" : "neutral";

  return { trend, change: Math.abs(change) };
};

/**
 * Format currency values for display
 * @param value - The numeric value to format
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format percentage values for display
 * @param value - The numeric value to format as percentage
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

/**
 * Format large numbers with appropriate suffixes (K, M, B)
 * @param value - The numeric value to format
 * @returns Formatted number string
 */
export const formatLargeNumber = (value: number): string => {
  if (value >= 1000000000) {
    const billions = value / 1000000000;
    const hasDecimals = billions % 1 !== 0;
    const decimalPart = billions % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return billions.toFixed(hasSignificantDecimals ? 1 : 0) + "B";
  }
  if (value >= 1000000) {
    const millions = value / 1000000;
    const hasDecimals = millions % 1 !== 0;
    const decimalPart = millions % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return millions.toFixed(hasSignificantDecimals ? 1 : 0) + "M";
  }
  if (value >= 1000) {
    const thousands = value / 1000;
    const hasDecimals = thousands % 1 !== 0;
    const decimalPart = thousands % 1;
    const hasSignificantDecimals = hasDecimals && decimalPart >= 0.1;
    return thousands.toFixed(hasSignificantDecimals ? 1 : 0) + "K";
  }
  return value.toString();
};

/**
 * Calculate machine performance metrics
 * @param machine - Gaming machine data
 * @returns Calculated metrics including hold percentage and average wager
 */
export const calculateMachineMetrics = (machine: GamingMachine) => {
  const handle = machine.coinIn;
  const win = handle - machine.coinOut;
  const actualHold = handle > 0 ? (win / handle) * 100 : 0;
  const averageWager =
    machine.gamesPlayed > 0 ? handle / machine.gamesPlayed : 0;
  const voucherOut =
    machine.totalCancelledCredits - machine.totalHandPaidCancelledCredits;
  const moneyWon = machine.coinOut + machine.jackpot;

  return {
    handle,
    win,
    actualHold,
    averageWager,
    voucherOut,
    moneyWon,
  };
};

/**
 * Calculate location performance metrics
 * @param machines - Array of machines at the location
 * @returns Aggregated location metrics
 */
export const calculateLocationMetrics = (machines: GamingMachine[]) => {
  const totals = machines.reduce(
    (acc, machine) => {
      const metrics = calculateMachineMetrics(machine);
      return {
        totalHandle: acc.totalHandle + metrics.handle,
        totalWin: acc.totalWin + metrics.win,
        totalJackpot: acc.totalJackpot + machine.jackpot,
        totalGamesPlayed: acc.totalGamesPlayed + machine.gamesPlayed,
        totalDrop: acc.totalDrop + machine.drop,
      };
    },
    {
      totalHandle: 0,
      totalWin: 0,
      totalJackpot: 0,
      totalGamesPlayed: 0,
      totalDrop: 0,
    }
  );

  const actualHold =
    totals.totalHandle > 0 ? (totals.totalWin / totals.totalHandle) * 100 : 0;
  const averageWager =
    totals.totalGamesPlayed > 0
      ? totals.totalHandle / totals.totalGamesPlayed
      : 0;

  return {
    ...totals,
    actualHold,
    averageWager,
  };
};

/**
 * Determine performance status based on hold percentage
 * @param actualHold - The actual hold percentage
 * @returns Performance status
 */
export const getPerformanceStatus = (actualHold: number): PerformanceStatus => {
  if (actualHold >= 8) return "good";
  if (actualHold >= 5) return "average";
  return "poor";
};


/**
 * Filter locations based on search criteria
 * @param locations - Array of casino locations
 * @param searchTerm - Search term to filter by
 * @returns Filtered locations array
 */
export const filterLocations = (
  locations: CasinoLocation[],
  searchTerm: string
): CasinoLocation[] => {
  if (!searchTerm.trim()) return locations;

  const term = searchTerm.toLowerCase();
  return locations.filter(
    (location) =>
      location.name.toLowerCase().includes(term) ||
      location.region.toLowerCase().includes(term) ||
      location.address?.toLowerCase().includes(term)
  );
};

/**
 * Sort locations by specified criteria
 * @param locations - Array of casino locations
 * @param sortBy - Field to sort by
 * @param sortDirection - Sort direction
 * @returns Sorted locations array
 */
export const sortLocations = (
  locations: CasinoLocation[],
  sortBy: keyof CasinoLocation,
  sortDirection: "asc" | "desc"
): CasinoLocation[] => {
  return [...locations].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
};

import type {
  ReportsLocationData,
  PaginationInfo,
  ReportsLocationsResponse,
} from "@shared/types/reports";

// Re-export shared types for convenience
export type { ReportsLocationData, PaginationInfo, ReportsLocationsResponse };

/**
 * Fetches locations data for reports with pagination and licencee filtering
 */
export const fetchReportsLocations = async (
  timePeriod: TimePeriod = "Today",
  selectedLicencee?: string,
  page: number = 1,
  limit: number = 50,
  customDateRange?: DateRange
): Promise<ReportsLocationsResponse> => {
  try {
    const params: Record<string, string> = {
      timePeriod,
      page: page.toString(),
      limit: limit.toString(),
    };

    if (selectedLicencee && selectedLicencee !== "all") {
      params.licencee = selectedLicencee;
    }

    if (timePeriod === "Custom" && customDateRange?.start && customDateRange?.end) {
      params.startDate = customDateRange.start.toISOString();
      params.endDate = customDateRange.end.toISOString();
      params.timePeriod = "Custom"; // Set timePeriod to "Custom" when using custom dates
    }

    const response = await axios.get("/api/reports/locations", { params });
    return response.data;
  } catch (error) {
    console.error("Failed to fetch reports locations data:", error);
    throw error;
  }
};

/**
 * Fetches all locations for a licencee (without pagination for overview)
 */
export const fetchAllReportsLocations = async (
  timePeriod: TimePeriod = "Today",
  selectedLicencee?: string,
  customDateRange?: DateRange
): Promise<ReportsLocationData[]> => {
  try {
    const params: Record<string, string> = {
      timePeriod,
      limit: "50", // Reduced limit to prevent timeouts
    };

    if (selectedLicencee && selectedLicencee !== "all") {
      params.licencee = selectedLicencee;
    }

    if (timePeriod === "Custom" && customDateRange?.start && customDateRange?.end) {
      params.startDate = customDateRange.start.toISOString();
      params.endDate = customDateRange.end.toISOString();
      params.timePeriod = "Custom"; // Set timePeriod to "Custom" when using custom dates
    }

    const response = await axios.get("/api/reports/locations", { params });

    // Handle both paginated and non-paginated responses
    if (response.data.data) {
      return response.data.data;
    } else if (Array.isArray(response.data)) {
      return response.data;
    } else {
      console.error("🔍 Unexpected response format:", response.data);
      return [];
    }
  } catch (error) {
    console.error("Failed to fetch all reports locations data:", error);
    return [];
  }
};
