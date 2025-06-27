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
    },
  ];

  const machines: GamingMachine[] = [
    {
      id: "M001",
      locationId: "1",
      manufacturer: "Aristocrat",
      gameTitle: "Dragon Link",
      isActive: true,
      installDate: "2023-01-15",
      totalHandle: 120000,
      totalWin: 9600,
      actualHold: 8,
      gamesPlayed: 6000,
      coinIn: 120000,
      coinOut: 110400,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 110400,
      drop: 30000,
      jackpot: 5000,
      currentCredits: 0,
      gamesWon: 1200,
      averageWager: 20,
    },
    {
      id: "M002",
      locationId: "1",
      manufacturer: "IGT",
      gameTitle: "Wheel of Fortune",
      isActive: true,
      installDate: "2023-02-20",
      totalHandle: 150000,
      totalWin: 12000,
      actualHold: 8,
      gamesPlayed: 7500,
      coinIn: 150000,
      coinOut: 138000,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 138000,
      drop: 40000,
      jackpot: 7000,
      currentCredits: 0,
      gamesWon: 1500,
      averageWager: 20,
    },
    {
      id: "M003",
      locationId: "2",
      manufacturer: "Scientific Games",
      gameTitle: "88 Fortunes",
      isActive: false,
      installDate: "2022-11-01",
      totalHandle: 80000,
      totalWin: 4800,
      actualHold: 6,
      gamesPlayed: 4000,
      coinIn: 80000,
      coinOut: 75200,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 75200,
      drop: 20000,
      jackpot: 2000,
      currentCredits: 0,
      gamesWon: 800,
      averageWager: 20,
    },
    {
      id: "M004",
      locationId: "2",
      manufacturer: "Aristocrat",
      gameTitle: "Buffalo Gold",
      isActive: true,
      installDate: "2023-05-10",
      totalHandle: 110000,
      totalWin: 6600,
      actualHold: 6,
      gamesPlayed: 5500,
      coinIn: 110000,
      coinOut: 103400,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 103400,
      drop: 25000,
      jackpot: 3000,
      currentCredits: 0,
      gamesWon: 1100,
      averageWager: 20,
    },
    {
      id: "M005",
      locationId: "3",
      manufacturer: "IGT",
      gameTitle: "Cleopatra",
      isActive: true,
      installDate: "2023-03-12",
      totalHandle: 200000,
      totalWin: 18000,
      actualHold: 9,
      gamesPlayed: 10000,
      coinIn: 200000,
      coinOut: 182000,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 182000,
      drop: 50000,
      jackpot: 10000,
      currentCredits: 0,
      gamesWon: 2000,
      averageWager: 20,
    },
    {
      id: "M006",
      locationId: "3",
      manufacturer: "Konami",
      gameTitle: "China Shores",
      isActive: true,
      installDate: "2023-04-05",
      totalHandle: 180000,
      totalWin: 16200,
      actualHold: 9,
      gamesPlayed: 9000,
      coinIn: 180000,
      coinOut: 163800,
      totalCancelledCredits: 0,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 163800,
      drop: 45000,
      jackpot: 8000,
      currentCredits: 0,
      gamesWon: 1800,
      averageWager: 20,
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
