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
      geoCoords: { latitude: 10.6918, longitude: -61.2225 },
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
      geoCoords: { latitude: 10.2745, longitude: -61.4589 },
    },
  ],
  timestamp: new Date().toISOString(),
};

// ─── Top machines ────────────────────────────────────────────────────────────



// ─── Metrics Meters data (used for charts) ───────────────────────────────────

export const MOCK_METRICS_METERS = [
  { day: '2026-03-18', time: '08:00', drop: 4200, totalCancelledCredits: 420, gross: 3780, moneyIn: 4200, moneyOut: 420, jackpot: 0 },
  { day: '2026-03-18', time: '09:00', drop: 6800, totalCancelledCredits: 680, gross: 6120, moneyIn: 6800, moneyOut: 680, jackpot: 0 },
  { day: '2026-03-18', time: '10:00', drop: 9300, totalCancelledCredits: 930, gross: 8370, moneyIn: 9300, moneyOut: 930, jackpot: 0 },
  { day: '2026-03-18', time: '11:00', drop: 11200, totalCancelledCredits: 1120, gross: 10080, moneyIn: 11200, moneyOut: 1120, jackpot: 0 },
  { day: '2026-03-18', time: '12:00', drop: 13500, totalCancelledCredits: 1350, gross: 12150, moneyIn: 13500, moneyOut: 1350, jackpot: 0 },
  { day: '2026-03-18', time: '13:00', drop: 10800, totalCancelledCredits: 1080, gross: 9720, moneyIn: 10800, moneyOut: 1080, jackpot: 0 },
  { day: '2026-03-18', time: '14:00', drop: 8700, totalCancelledCredits: 870, gross: 7830, moneyIn: 8700, moneyOut: 870, jackpot: 0 },
];

export const MOCK_METRICS_METERS_YESTERDAY = MOCK_METRICS_METERS.map(m => ({
  ...m,
  day: '2026-03-17',
  drop: m.drop * 0.9,
  gross: m.gross * 0.9,
  moneyIn: m.moneyIn * 0.9,
  moneyOut: m.moneyOut * 0.9,
}));



// ─── Top performing locations (for /api/metrics/top-performing?activeTab=locations) ──

export const MOCK_TOP_PERFORMING_LOCATIONS = {
  success: true,
  data: [
    { name: 'Grand Casino North', totalDrop: 312_000, locationId: 'loc_001' },
    { name: 'South Bay Gaming', totalDrop: 200_450, locationId: 'loc_002' },
  ],
  timestamp: new Date().toISOString(),
};

// ─── Location aggregation (provides moneyIn / moneyOut / gross for metric cards) ─

export const MOCK_LOCATION_AGGREGATION = {
  data: [
    {
      _id: 'loc_001',
      location: 'loc_001',
      locationName: 'Grand Casino North',
      moneyIn: 512_450.75,
      moneyOut: 48_230.0,
      gross: 464_220.75,
      jackpot: 9_800.0,
      coinIn: 1_024_900.5,
      coinOut: 512_679.75,
      gamesPlayed: 87_432,
      totalMachines: 50,
      onlineMachines: 42,
      sasMachines: 38,
      nonSasMachines: 12,
      hasSasMachines: true,
      hasNonSasMachines: true,
      isLocalServer: false,
      noSMIBLocation: false,
      hasSmib: true,
      totalDrop: 512_450.75,
    },
    {
      _id: 'loc_002',
      location: 'loc_002',
      locationName: 'South Bay Gaming',
      moneyIn: 200_450.75,
      moneyOut: 16_730.0,
      gross: 183_720.75,
      jackpot: 2_500.0,
      coinIn: 400_901.5,
      coinOut: 200_450.75,
      gamesPlayed: 42_100,
      totalMachines: 22,
      onlineMachines: 17,
      sasMachines: 17,
      nonSasMachines: 5,
      hasSasMachines: true,
      hasNonSasMachines: true,
      isLocalServer: false,
      noSMIBLocation: false,
      hasSmib: true,
      totalDrop: 200_450.75,
    },
  ],
  totalCount: 2,
  page: 1,
  limit: 1_000_000,
  hasMore: false,
  currency: 'TTD',
  converted: false,
};

// ─── Error response ───────────────────────────────────────────────────────────

export const MOCK_DASHBOARD_SERVER_ERROR = {
  success: false,
  error: 'Internal Server Error',
  message: 'Failed to retrieve dashboard analytics.',
  timestamp: new Date().toISOString(),
};
