import {
  KpiMetric,
  CasinoLocation,
  GamingMachine,
  TimePeriod,
  DateRange,
  ChartDataPoint,
  PerformanceStatus,
} from "@/lib/types/reports";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

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
    return (value / 1000000000).toFixed(1) + "B";
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(1) + "M";
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(1) + "K";
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
 * Generate mock analytics data for development
 * @returns Mock analytics data
 */
export const generateMockAnalyticsData = () => {
  const locations: CasinoLocation[] = [
    {
      id: "1",
      name: "Red Dragon Casino",
      region: "North",
      address: "123 Casino Blvd, Las Vegas, NV",
      isActive: true,
      totalHandle: 2500000,
      totalWin: 200000,
      actualHold: 8.0,
      gamesPlayed: 125000,
      averageWager: 20,
      totalJackpot: 50000,
      performance: "good",
      coordinates: { lat: 36.1699, lng: -115.1398 },
      trend: "up",
      trendPercentage: 5.2,
    },
    {
      id: "2",
      name: "Strikey's Funhouse",
      region: "South",
      address: "456 Gaming Ave, Las Vegas, NV",
      isActive: true,
      totalHandle: 1800000,
      totalWin: 108000,
      actualHold: 6.0,
      gamesPlayed: 90000,
      averageWager: 20,
      totalJackpot: 25000,
      performance: "average",
      coordinates: { lat: 36.1147, lng: -115.1728 },
      trend: "stable",
      trendPercentage: 0,
    },
    {
      id: "3",
      name: "Ocean's Edge Gaming",
      region: "West",
      address: "789 Slots St, Las Vegas, NV",
      isActive: true,
      totalHandle: 3200000,
      totalWin: 288000,
      actualHold: 9.0,
      gamesPlayed: 160000,
      averageWager: 20,
      totalJackpot: 75000,
      performance: "good",
      coordinates: { lat: 36.1215, lng: -115.1739 },
      trend: "up",
      trendPercentage: 3.5,
    },
  ];

  const machines: GamingMachine[] = [
    {
      id: "M001",
      locationId: "1",
      manufacturer: "Aristocrat",
      model: "Dragon Link",
      serialNumber: "DL12345",
      assetNumber: "A001",
      status: "active",
      lastActivity: "2023-10-27T10:00:00Z",
      coinIn: 50000,
      coinOut: 45000,
      jackpot: 1000,
      gamesPlayed: 2500,
      drop: 2500,
      totalCancelledCredits: 500,
      totalHandPaidCancelledCredits: 100,
      isOnline: true,
      hasSas: true,
    },
    {
      id: "M002",
      locationId: "1",
      manufacturer: "IGT",
      model: "Wheel of Fortune",
      serialNumber: "WF67890",
      assetNumber: "A002",
      status: "active",
      lastActivity: "2023-10-27T10:05:00Z",
      coinIn: 75000,
      coinOut: 68000,
      jackpot: 1500,
      gamesPlayed: 3000,
      drop: 3000,
      totalCancelledCredits: 700,
      totalHandPaidCancelledCredits: 200,
      isOnline: false,
      hasSas: true,
    },
    {
      id: "M003",
      locationId: "2",
      manufacturer: "Scientific Games",
      model: "88 Fortunes",
      serialNumber: "SG45678",
      assetNumber: "A003",
      status: "inactive",
      lastActivity: "2023-10-26T14:00:00Z",
      coinIn: 80000,
      coinOut: 75000,
      jackpot: 2000,
      gamesPlayed: 4000,
      drop: 4000,
      totalCancelledCredits: 800,
      totalHandPaidCancelledCredits: 300,
      isOnline: true,
      hasSas: false,
    },
    {
      id: "M004",
      locationId: "2",
      manufacturer: "Aristocrat",
      model: "Buffalo Gold",
      serialNumber: "BG90123",
      assetNumber: "A004",
      status: "active",
      lastActivity: "2023-10-27T11:00:00Z",
      coinIn: 110000,
      coinOut: 100000,
      jackpot: 3000,
      gamesPlayed: 5500,
      drop: 5500,
      totalCancelledCredits: 1000,
      totalHandPaidCancelledCredits: 400,
      isOnline: true,
      hasSas: true,
    },
    {
      id: "M005",
      locationId: "3",
      manufacturer: "IGT",
      model: "Cleopatra",
      serialNumber: "CL45678",
      assetNumber: "A005",
      status: "active",
      lastActivity: "2023-10-27T12:00:00Z",
      coinIn: 200000,
      coinOut: 180000,
      jackpot: 5000,
      gamesPlayed: 10000,
      drop: 10000,
      totalCancelledCredits: 2000,
      totalHandPaidCancelledCredits: 500,
      isOnline: false,
      hasSas: true,
    },
    {
      id: "M006",
      locationId: "3",
      manufacturer: "Konami",
      model: "China Shores",
      serialNumber: "KS56789",
      assetNumber: "A006",
      status: "active",
      lastActivity: "2023-10-27T13:00:00Z",
      coinIn: 180000,
      coinOut: 165000,
      jackpot: 4000,
      gamesPlayed: 9000,
      drop: 9000,
      totalCancelledCredits: 1500,
      totalHandPaidCancelledCredits: 600,
      isOnline: true,
      hasSas: false,
    },
  ];

  const kpiMetrics: KpiMetric[] = [
    {
      title: "Total Handle",
      value: 7500000,
      previousValue: 7200000,
      format: "currency",
      trend: "up",
      change: 4.2,
    },
    {
      title: "Total Win",
      value: 596000,
      previousValue: 580000,
      format: "currency",
      trend: "up",
      change: 2.8,
    },
    {
      title: "Actual Hold",
      value: 7.95,
      previousValue: 8.06,
      format: "percentage",
      trend: "down",
      change: 0.11,
    },
    {
      title: "Games Played",
      value: 375000,
      previousValue: 360000,
      format: "number",
      trend: "up",
      change: 4.2,
    },
  ];

  const performanceTrends: ChartDataPoint[] = Array.from(
    { length: 30 },
    (_, i) => ({
      date: format(subDays(new Date(), 29 - i), "yyyy-MM-dd"),
      value: Math.floor(Math.random() * 100000) + 200000,
      label: format(subDays(new Date(), 29 - i), "MMM dd"),
    })
  );

  return {
    locations,
    kpiMetrics,
    performanceTrends,
    machines,
  };
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
