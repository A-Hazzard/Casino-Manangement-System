/**
 * Mock payloads for Dashboard / Analytics API routes.
 *
 * Endpoints covered:
 *   GET /api/analytics/dashboard
 *   GET /api/analytics/locations
 *   GET /api/analytics/charts
 *   GET /api/analytics/top-machines
 */

// ─── Dashboard global stats ──────────────────────────────────────────────────

export const MOCK_DASHBOARD_STATS = {
  success: true,
  data: {
    globalStats: {
      totalDrop: 512_450.75,
      totalCancelledCredits: 48_230.0,
      totalGross: 464_220.75,
      totalJackpot: 9_800.0,
      totalCoinIn: 1_024_900.5,
      totalCoinOut: 512_679.75,
      totalGamesPlayed: 87_432,
      onlineMachines: 42,
      totalMachines: 50,
    },
    currency: 'TTD',
    converted: false,
  },
  timestamp: new Date().toISOString(),
};

/** Stats for "Yesterday" period — slightly lower numbers */
export const MOCK_DASHBOARD_STATS_YESTERDAY = {
  ...MOCK_DASHBOARD_STATS,
  data: {
    ...MOCK_DASHBOARD_STATS.data,
    globalStats: {
      ...MOCK_DASHBOARD_STATS.data.globalStats,
      totalDrop: 483_200.0,
      totalGross: 438_970.0,
    },
  },
};

/** Stats for "Last 7 Days" */
export const MOCK_DASHBOARD_STATS_LAST7 = {
  ...MOCK_DASHBOARD_STATS,
  data: {
    ...MOCK_DASHBOARD_STATS.data,
    globalStats: {
      ...MOCK_DASHBOARD_STATS.data.globalStats,
      totalDrop: 3_450_880.5,
      totalGross: 3_121_800.0,
    },
  },
};

/** Stats for "Last 30 Days" */
export const MOCK_DASHBOARD_STATS_LAST30 = {
  ...MOCK_DASHBOARD_STATS,
  data: {
    ...MOCK_DASHBOARD_STATS.data,
    globalStats: {
      ...MOCK_DASHBOARD_STATS.data.globalStats,
      totalDrop: 14_203_440.0,
      totalGross: 12_783_096.0,
    },
  },
};

/** Stats for a custom date range */
export const MOCK_DASHBOARD_STATS_CUSTOM = {
  ...MOCK_DASHBOARD_STATS,
  data: {
    ...MOCK_DASHBOARD_STATS.data,
    globalStats: {
      ...MOCK_DASHBOARD_STATS.data.globalStats,
      totalDrop: 1_200_000.0,
      totalGross: 1_080_000.0,
    },
  },
};

// ─── Location analytics ──────────────────────────────────────────────────────

export const MOCK_LOCATIONS_ANALYTICS = {
  success: true,
  data: [
    {
      locationId: 'loc_001',
      locationName: 'Grand Casino North',
      gross: 280_500.0,
      drop: 312_000.0,
      cancelledCredits: 31_500.0,
      onlineMachines: 25,
      totalMachines: 28,
      performance: 'excellent',
      sasEnabled: true,
      holdPercentage: 89.9,
      coordinates: { lat: 10.6918, lng: -61.2225 },
    },
    {
      locationId: 'loc_002',
      locationName: 'South Bay Gaming',
      gross: 183_720.75,
      drop: 200_450.75,
      cancelledCredits: 16_730.0,
      onlineMachines: 17,
      totalMachines: 22,
      performance: 'good',
      sasEnabled: true,
      holdPercentage: 91.6,
      coordinates: { lat: 10.2745, lng: -61.4589 },
    },
  ],
  timestamp: new Date().toISOString(),
};

// ─── Top machines ────────────────────────────────────────────────────────────

export const MOCK_TOP_MACHINES = {
  success: true,
  data: {
    machines: [
      {
        machineId: 'mach_001',
        serialNumber: 'SN-10001',
        customName: 'Lucky Dragon',
        machineName: 'Lucky Dragon',
        locationName: 'Grand Casino North',
        locationId: 'loc_001',
        gameTitle: 'Dragon Fortune',
        manufacturer: 'IGT',
        isOnline: true,
        isSasEnabled: true,
        drop: 48_230.0,
        totalCancelledCredits: 4_823.0,
        jackpot: 1_200.0,
        coinIn: 96_460.0,
        coinOut: 48_230.0,
        gamesPlayed: 9_800,
        gross: 43_407.0,
        netWin: 43_407.0,
        lastActivity: new Date().toISOString(),
      },
      {
        machineId: 'mach_002',
        serialNumber: 'SN-10002',
        customName: 'Golden Pharaoh',
        machineName: 'Golden Pharaoh',
        locationName: 'Grand Casino North',
        locationId: 'loc_001',
        gameTitle: 'Pharaoh Riches',
        manufacturer: 'Aristocrat',
        isOnline: true,
        isSasEnabled: true,
        drop: 36_800.0,
        totalCancelledCredits: 3_680.0,
        jackpot: 800.0,
        coinIn: 73_600.0,
        coinOut: 36_800.0,
        gamesPlayed: 7_200,
        gross: 33_120.0,
        netWin: 33_120.0,
        lastActivity: new Date().toISOString(),
      },
    ],
  },
  timestamp: new Date().toISOString(),
};

// ─── Charts data ─────────────────────────────────────────────────────────────

export const MOCK_CHARTS_DATA = {
  success: true,
  data: {
    labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'],
    datasets: [
      {
        label: 'Drop',
        data: [4200, 6800, 9300, 11200, 13500, 10800, 8700],
        backgroundColor: '#3b82f6',
      },
      {
        label: 'Gross',
        data: [3780, 6120, 8370, 10080, 12150, 9720, 7830],
        backgroundColor: '#22c55e',
      },
    ],
  },
  timestamp: new Date().toISOString(),
};

// ─── Top performing locations (for /api/metrics/top-performing?activeTab=locations) ──

export const MOCK_TOP_PERFORMING_LOCATIONS = {
  success: true,
  data: [
    { name: 'Grand Casino North', totalDrop: 312_000, locationId: 'loc_001' },
    { name: 'South Bay Gaming', totalDrop: 200_450, locationId: 'loc_002' },
  ],
  timestamp: new Date().toISOString(),
};

// ─── Error response ───────────────────────────────────────────────────────────

export const MOCK_DASHBOARD_SERVER_ERROR = {
  success: false,
  error: 'Internal Server Error',
  message: 'Failed to retrieve dashboard analytics.',
  timestamp: new Date().toISOString(),
};
