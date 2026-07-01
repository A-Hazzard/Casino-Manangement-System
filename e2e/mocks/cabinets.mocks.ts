/**
 * Mock payloads for Cabinets / Machines API routes.
 *
 * Endpoints covered:
 *   GET    /api/reports/machines          (cabinet list with stats)
 *   GET    /api/cabinets/[cabinetId]      (single cabinet detail)
 *   POST   /api/locations/[id]/cabinets   (create)
 *   PUT    /api/cabinets/[cabinetId]      (update)
 *   DELETE /api/cabinets/[cabinetId]      (delete)
 */

// ─── Shared cabinet/machine shapes ───────────────────────────────────────────

export const MOCK_CABINET_1 = {
  _id: 'mach_001',
  serialNumber: 'SN-10001',
  assetNumber: 'ASSET-001',
  machineId: 'M001',
  relayId: '1',
  smbId: '1',
  smibBoard: 'aabbccdd0000',
  custom: { name: 'Lucky Dragon' },
  game: 'Dragon Fortune',
  installedGame: 'Dragon Fortune',
  gameType: 'slot',
  cabinetType: 'Standing',
  assetStatus: 'functional',
  manufacturer: 'IGT',
  gamingLocation: 'loc_001',
  locationId: 'loc_001',
  locationName: 'Grand Casino North',
  accountingDenomination: 0.01,
  lastActivity: new Date().toISOString(),
  lastOnline: new Date().toISOString(),
  online: true,
  includeJackpot: false,
  moneyIn: 96_460.0,
  moneyOut: 48_230.0,
  jackpot: 1_200.0,
  cancelledCredits: 9_646.0,
  gross: 43_407.0,
  netGross: 39_066.3,
  sasMeters: {
    coinIn: 9_646_000,
    coinOut: 4_823_000,
    drop: 4_822_400,
    totalCancelledCredits: 964_600,
    jackpot: 120_000,
    gamesPlayed: 9_800,
    gamesWon: 4_900,
    currentCredits: 0,
    totalWonCredits: 4_823_000,
  },
};

export const MOCK_CABINET_2 = {
  _id: 'mach_002',
  serialNumber: 'SN-10002',
  assetNumber: 'ASSET-002',
  machineId: 'M002',
  relayId: '2',
  smbId: '2',
  smibBoard: null,
  custom: { name: 'Golden Pharaoh' },
  game: 'Pharaoh Riches',
  installedGame: 'Pharaoh Riches',
  gameType: 'slot',
  cabinetType: 'Standing',
  assetStatus: 'functional',
  manufacturer: 'Aristocrat',
  gamingLocation: 'loc_001',
  locationId: 'loc_001',
  locationName: 'Grand Casino North',
  accountingDenomination: 0.25,
  lastActivity: new Date(Date.now() - 3_600_000).toISOString(),
  lastOnline: new Date(Date.now() - 3_600_000).toISOString(),
  online: false,
  includeJackpot: false,
  moneyIn: 73_600.0,
  moneyOut: 36_800.0,
  jackpot: 800.0,
  cancelledCredits: 7_360.0,
  gross: 33_120.0,
  netGross: 29_808.0,
};

// ─── Cabinet list (aggregation endpoint) ──────────────────────────────────────

// The real /api/cabinets/aggregation route returns:
//   { success: true, data: [...machine objects], pagination?: {...} }
// where `data` is a plain array, NOT wrapped in { machines: [...], pagination }.

export const MOCK_CABINETS_LIST = {
  success: true,
  data: [MOCK_CABINET_1, MOCK_CABINET_2],
  pagination: {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_CABINETS_LIST_AFTER_DELETE = {
  success: true,
  data: [MOCK_CABINET_2],
  pagination: {
    page: 1,
    limit: 10,
    total: 1,
    totalPages: 1,
  },
  timestamp: new Date().toISOString(),
};

// ─── Cabinet detail ───────────────────────────────────────────────────────────

export const MOCK_CABINET_DETAIL = {
  success: true,
  data: {
    ...MOCK_CABINET_1,
    meterData: {
      _id: 'meter_001',
      machine: 'mach_001',
      location: 'loc_001',
      movement: {
        coinIn: 9_646_000,
        coinOut: 4_823_000,
        totalCancelledCredits: 964_600,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 4_823_000,
        drop: 4_822_400,
        jackpot: 120_000,
        currentCredits: 0,
        gamesPlayed: 9_800,
        gamesWon: 4_900,
      },
      readAt: new Date().toISOString(),
    },
    billValidator: {
      denom1: { count: 120, total: 120 },
      denom5: { count: 64, total: 320 },
      denom10: { count: 42, total: 420 },
      denom20: { count: 31, total: 620 },
      denom100: { count: 12, total: 1200 },
    },
    collectionMetersHistory: [
      {
        _id: 'coll_001',
        timestamp: new Date().toISOString(),
        metersIn: 10000,
        metersOut: 5000,
        prevMetersIn: 9000,
        prevMetersOut: 4500,
        locationReportId: 'report_001',
      },
      {
        _id: 'coll_002',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        metersIn: 9000,
        metersOut: 4500,
        prevMetersIn: 8000,
        prevMetersOut: 4000,
        locationReportId: 'report_002',
      },
    ],
  },
  timestamp: new Date().toISOString(),
};

// ─── Create / Update / Delete ─────────────────────────────────────────────────

export const MOCK_CABINET_CREATE_SUCCESS = {
  success: true,
  data: {
    _id: 'mach_003',
    serialNumber: 'SN-NEWCAB',
    custom: { name: 'New Test Cabinet' },
    game: 'Star Burst',
    installedGame: 'Star Burst',
    gameType: 'slot',
    relayId: '5',
    gamingLocation: 'loc_001',
    locationId: 'loc_001',
    locationName: 'Grand Casino North',
    assetStatus: 'functional',
    cabinetType: 'Standing',
    manufacturer: 'NetEnt',
    online: false,
    moneyIn: 0,
    moneyOut: 0,
    jackpot: 0,
    gross: 0,
  },
  message: 'Cabinet created successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_CABINET_UPDATE_SUCCESS = {
  success: true,
  data: { ...MOCK_CABINET_1, custom: { name: 'Lucky Dragon (Renamed)' } },
  message: 'Cabinet updated successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_CABINET_DELETE_SUCCESS = {
  success: true,
  message: 'Cabinet deleted successfully',
  timestamp: new Date().toISOString(),
};

// ─── Meter history ────────────────────────────────────────────────────────────

export const MOCK_METER_HISTORY = {
  success: true,
  data: {
    entries: [
      {
        _id: 'meter_hist_001',
        machine: 'mach_001',
        coinIn: 9_646_000,
        coinOut: 4_823_000,
        drop: 4_822_400,
        jackpot: 120_000,
        gamesPlayed: 9_800,
        readAt: new Date().toISOString(),
      },
      {
        _id: 'meter_hist_002',
        machine: 'mach_001',
        coinIn: 9_200_000,
        coinOut: 4_600_000,
        drop: 4_599_400,
        jackpot: 100_000,
        gamesPlayed: 9_200,
        readAt: new Date(Date.now() - 86_400_000).toISOString(),
      },
    ],
    pagination: { page: 1, limit: 20, totalCount: 2, totalPages: 1 },
  },
  timestamp: new Date().toISOString(),
};

// ─── Manufacturers list (needed for cabinet form dropdowns) ───────────────────

export const MOCK_MANUFACTURERS = [
  'Aristocrat',
  'IGT',
  'Konami',
  'NetEnt',
  'Novomatic',
];

// ─── Cabinets LIST page tab data ───────────────────────────────────────────────
// The /cabinets page has 4 tabs: Cabinets · Movement Requests · SMIB Management · Firmware

// GET /api/movement-requests → raw MovementRequest[] array
export const MOCK_MOVEMENT_REQUESTS: unknown[] = [];

// GET /api/mqtt/discover-smibs → { success, smibs: [...] }
export const MOCK_SMIB_DISCOVERY = {
  success: true,
  smibs: [
    {
      relayId: '1',
      serialNumber: 'SN-10001',
      machineId: 'mach_001',
      locationName: 'Grand Casino North',
      online: true,
    },
  ],
};

// GET /api/firmwares → raw Firmware[] array
export const MOCK_FIRMWARES = [
  {
    _id: 'fw_001',
    version: '2.4.1',
    fileName: 'smib-fw-2.4.1.bin',
    description: 'Stable release',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    fileSize: 524_288,
  },
];

// GET /api/cabinets/[id] detail with relayId so SMIB Management section is enabled
export const MOCK_CABINET_DETAIL_WITH_SMIB = {
  success: true,
  data: {
    ...MOCK_CABINET_1,
    relayId: '1',
    smibBoard: 'aabbccdd0000',
  },
  timestamp: new Date().toISOString(),
};
