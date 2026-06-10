/**
 * Mock payloads for Collection Report API routes.
 *
 * Endpoints covered:
 *   GET    /api/collection-reports            (report list with pagination)
 *   GET    /api/collection-reports?locationsWithMachines=true
 *   DELETE /api/collection-reports/[reportId]
 *   GET    /api/schedulers                    (collector + manager schedules)
 *   PATCH  /api/schedulers/[id]               (edit schedule)
 *   DELETE /api/schedulers/[id]               (delete schedule)
 */

// ─── Collection report row shape ──────────────────────────────────────────────

export const MOCK_REPORT_1 = {
  _id: 'report_001',
  locationReportId: 'report_001',
  collector: 'E2E Collector',
  collectorFullName: 'E2E Collector',
  location: 'Grand Casino North',
  locationSlug: 'grand-casino-north',
  locationId: 'loc_001',
  machines: '8/10',
  gross: 43_407.0,
  collected: 38_066.3,
  uncollected: 5_340.7,
  variation: 0,
  balance: 43_407.0,
  locationRevenue: 26_044.2,
  time: '01 Jan 2026, 09:00:00 AM',
  isEditing: false,
  currency: 'TTD',
};

export const MOCK_REPORT_2 = {
  _id: 'report_002',
  locationReportId: 'report_002',
  collector: 'E2E Manager',
  collectorFullName: 'E2E Manager',
  location: 'South Bay Gaming',
  locationSlug: 'south-bay-gaming',
  locationId: 'loc_002',
  machines: '5/6',
  gross: 18_200.0,
  collected: 16_380.0,
  uncollected: 1_820.0,
  variation: 0,
  balance: 18_200.0,
  locationRevenue: 9_100.0,
  time: '01 Jan 2026, 10:00:00 AM',
  isEditing: false,
  currency: 'TTD',
};

// ─── List response ─────────────────────────────────────────────────────────────

export const MOCK_COLLECTION_REPORTS_LIST = {
  success: true,
  data: [MOCK_REPORT_1, MOCK_REPORT_2],
  pagination: {
    page: 1,
    limit: 40,
    total: 2,
    totalPages: 1,
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_COLLECTION_REPORTS_LIST_AFTER_DELETE = {
  success: true,
  data: [MOCK_REPORT_2],
  pagination: {
    page: 1,
    limit: 40,
    total: 1,
    totalPages: 1,
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_COLLECTION_REPORTS_EMPTY = {
  success: true,
  data: [],
  pagination: {
    page: 1,
    limit: 40,
    total: 0,
    totalPages: 0,
  },
  timestamp: new Date().toISOString(),
};

// ─── Locations with machines (for new-report modal) ──────────────────────────

export const MOCK_LOCATIONS_WITH_MACHINES = {
  success: true,
  locations: [
    {
      _id: 'loc_001',
      id: 'loc_001',
      name: 'Grand Casino North',
      slug: 'grand-casino-north',
      licenceeId: 'lic_001',
      machines: [
        { _id: 'mach_001', serialNumber: 'SN-10001', custom: { name: 'Lucky Dragon' }, online: true },
        { _id: 'mach_002', serialNumber: 'SN-10002', custom: { name: 'Golden Pharaoh' }, online: false },
      ],
    },
    {
      _id: 'loc_002',
      id: 'loc_002',
      name: 'South Bay Gaming',
      slug: 'south-bay-gaming',
      licenceeId: 'lic_001',
      machines: [
        { _id: 'mach_003', serialNumber: 'SN-10003', custom: { name: 'Lucky Stars' }, online: true },
      ],
    },
  ],
  timestamp: new Date().toISOString(),
};

// ─── Delete response ──────────────────────────────────────────────────────────

export const MOCK_COLLECTION_REPORT_DELETE_SUCCESS = {
  success: true,
  message: 'Collection report deleted successfully',
  timestamp: new Date().toISOString(),
};

// ─── Monthly report response ───────────────────────────────────────────────────

export const MOCK_MONTHLY_REPORT = {
  success: true,
  summary: {
    drop: '124,500.00',
    cancelledCredits: '12,450.00',
    gross: '112,050.00',
    sasGross: '109,800.00',
  },
  details: [
    {
      location: 'Grand Casino North',
      locationId: 'loc_001',
      drop: '73,600.00',
      cancelledCredits: '7,360.00',
      gross: '66,240.00',
      sasGross: '65,000.00',
      variation: '1,240.00',
      reportCount: 3,
    },
    {
      location: 'South Bay Gaming',
      locationId: 'loc_002',
      drop: '50,900.00',
      cancelledCredits: '5,090.00',
      gross: '45,810.00',
      sasGross: '44,800.00',
      variation: '1,010.00',
      reportCount: 2,
    },
  ],
  totalCount: 2,
  timestamp: new Date().toISOString(),
};

// ─── Collector schedule rows ───────────────────────────────────────────────────

export const MOCK_COLLECTOR_SCHEDULE_1 = {
  _id: 'sched_001',
  collector: 'E2E Collector',
  collectorName: 'E2E Collector',
  location: 'loc_001',
  locationName: 'Grand Casino North',
  startTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  endTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  rawStartTime: '08:00',
  rawEndTime: '16:00',
  status: 'active',
  licencee: 'lic_001',
};

export const MOCK_COLLECTOR_SCHEDULE_2 = {
  _id: 'sched_002',
  collector: 'E2E Manager',
  collectorName: 'E2E Manager',
  location: 'loc_002',
  locationName: 'South Bay Gaming',
  startTime: new Date('2026-01-01T12:00:00.000Z').toISOString(),
  endTime: new Date('2026-01-01T20:00:00.000Z').toISOString(),
  rawStartTime: '12:00',
  rawEndTime: '20:00',
  status: 'active',
  licencee: 'lic_001',
};

export const MOCK_COLLECTOR_SCHEDULES = [
  MOCK_COLLECTOR_SCHEDULE_1,
  MOCK_COLLECTOR_SCHEDULE_2,
];

// ─── Manager schedule rows ────────────────────────────────────────────────────

export const MOCK_MANAGER_SCHEDULE_1 = {
  _id: 'msched_001',
  collectorName: 'E2E Collector',
  collector: 'E2E Collector',
  locationName: 'Grand Casino North',
  location: 'loc_001',
  startTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  endTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  rawStartTime: '08:00',
  rawEndTime: '16:00',
  status: 'active',
  licencee: 'lic_001',
};

export const MOCK_MANAGER_SCHEDULES = [MOCK_MANAGER_SCHEDULE_1];

// ─── Collection Report DETAIL page (/collection-report/report/[reportId]) ─────
//
// fetchCollectionReportById returns `response.data` directly (a CollectionReportData
// object — NOT wrapped). validateCollectionReportData requires: reportId,
// locationName, collectionDate, machineMetrics[], locationMetrics{}.

export const MOCK_MACHINE_METRIC_1 = {
  id: 'metric_001',
  machineId: 'Lucky Dragon',
  actualMachineId: 'mach_001',
  dropCancelled: '9,646.00 / 4,823.00',
  metersGross: 43_407.0,
  jackpot: 1_200.0,
  netGross: 39_066.3,
  sasGross: 43_407.0,
  variation: 0,
  sasStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  sasEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  hasIssue: false,
  ramClear: false,
  notes: '',
};

export const MOCK_MACHINE_METRIC_2 = {
  id: 'metric_002',
  machineId: 'Golden Pharaoh',
  actualMachineId: 'mach_002',
  dropCancelled: '7,360.00 / 3,680.00',
  metersGross: 33_120.0,
  jackpot: 800.0,
  netGross: 29_808.0,
  sasGross: 33_120.0,
  variation: 0,
  sasStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  sasEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  hasIssue: false,
  ramClear: false,
  notes: '',
};

export const MOCK_LOCATION_METRIC = {
  droppedCancelled: '17,006.00 / 8,503.00',
  metersGross: 76_527.0,
  jackpot: 2_000.0,
  netGross: 68_874.3,
  variation: 0,
  sasGross: 76_527.0,
  locationRevenue: 35_071.2,
  amountUncollected: 5_340.7,
  amountToCollect: 54_446.3,
  machinesNumber: '8/10',
  collectedAmount: 54_446.3,
  reasonForShortage: '',
  taxes: 0,
  advance: 0,
  previousBalanceOwed: 0,
  balanceCorrection: 0,
  currentBalanceOwed: 0,
  correctionReason: '',
  variance: 0,
  varianceReason: '',
};

export const MOCK_REPORT_DETAIL = {
  reportId: 'report_001',
  locationName: 'Grand Casino North',
  collectionDate: new Date('2026-01-01T09:00:00.000Z').toISOString(),
  collector: 'E2E Collector',
  collectorName: 'E2E Collector',
  machineMetrics: [MOCK_MACHINE_METRIC_1, MOCK_MACHINE_METRIC_2],
  locationMetrics: MOCK_LOCATION_METRIC,
  sasMetrics: {
    dropped: 17_006.0,
    cancelled: 8_503.0,
    gross: 76_527.0,
  },
  isEditing: false,
  includeJackpot: false,
  useNetGross: false,
};

// ─── Collection Report V2 sessions (developer-only tab) ───────────────────────
// GET /api/collection-reports-v2/sessions → { success, data: V2Session[], pagination }

export const MOCK_V2_SESSION_1 = {
  sessionId: 'sess_001',
  sessionStatus: 'in-progress' as const,
  locationId: 'loc_001',
  locationName: 'Grand Casino North',
  noSMIBLocation: false,
  licencee: 'lic_001',
  collector: 'collector_001',
  collectorName: 'E2E Collector',
  collectorEmail: 'collector@example.com',
  collectorFirstName: 'E2E',
  collectorLastName: 'Collector',
  sessionStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  sessionEndTime: undefined,
  machinesTotal: 10,
  machinesCaptured: 6,
  machinesConfirmed: 4,
  machinesSkipped: 0,
  totalMachineGross: 43_407.0,
  totalSasGross: 43_400.0,
  totalGrossDifference: 7.0,
  createdAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_SESSIONS_LIST = {
  success: true,
  data: [MOCK_V2_SESSION_1],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SESSIONS_EMPTY = {
  success: true,
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  timestamp: new Date().toISOString(),
};

// POST /api/collection-reports-v2/sessions → created session
export const MOCK_V2_SESSION_CREATE = {
  success: true,
  data: { sessionId: 'sess_new', locationId: 'loc_001', locationName: 'Grand Casino North' },
  timestamp: new Date().toISOString(),
};

// Collection documents returned by GET /api/collection-reports/collections?locationReportId=
export const MOCK_REPORT_DETAIL_COLLECTIONS = [
  {
    _id: 'coll_001',
    locationReportId: 'report_001',
    machine: 'mach_001',
    machineCustomName: 'Lucky Dragon',
    metersIn: 9_646_000,
    metersOut: 4_823_000,
    movement: { gross: 43_407.0 },
    isCompleted: true,
  },
  {
    _id: 'coll_002',
    locationReportId: 'report_001',
    machine: 'mach_002',
    machineCustomName: 'Golden Pharaoh',
    metersIn: 7_360_000,
    metersOut: 3_680_000,
    movement: { gross: 33_120.0 },
    isCompleted: true,
  },
];

// ─── SMIB / non-SMIB machine shapes ──────────────────────────────────────────

export const MOCK_SMIB_MACHINE = {
  _id: 'mach_001',
  serialNumber: 'SN-10001',
  relayId: 'relay_001',
  custom: { name: 'Lucky Dragon' },
  online: true,
  collectionMeters: { metersIn: 9_000_000, metersOut: 4_500_000 },
  sasMeters: { drop: 9_646_000, totalCancelledCredits: 4_823_000 },
};

export const MOCK_NON_SMIB_MACHINE = {
  _id: 'mach_003',
  serialNumber: 'SN-10003',
  relayId: null,
  custom: { name: 'Silver Moon' },
  online: true,
  collectionMeters: { metersIn: 5_000_000, metersOut: 2_500_000 },
  sasMeters: null,
};

// ─── Variation check responses ────────────────────────────────────────────────

export const MOCK_VARIATION_CHECK_SMIB = {
  hasVariations: true,
  totalVariation: 500.0,
  machines: [
    {
      machineId: 'mach_001',
      machineName: 'Lucky Dragon',
      variation: 500.0,
      sasGross: 43_907.0,
      meterGross: 43_407.0,
      sasStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
      sasEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
    },
  ],
};

export const MOCK_VARIATION_CHECK_NO_SMIB = {
  hasVariations: false,
  totalVariation: 0,
  machines: [
    {
      machineId: 'mach_003',
      machineName: 'Silver Moon',
      variation: 'No SMIB',
      sasGross: 'No SMIB',
      meterGross: 20_000.0,
      sasStartTime: null,
      sasEndTime: null,
    },
  ],
};

export const MOCK_VARIATION_CHECK_MIXED = {
  hasVariations: true,
  totalVariation: 500.0,
  machines: [
    {
      machineId: 'mach_001',
      machineName: 'Lucky Dragon',
      variation: 500.0,
      sasGross: 43_907.0,
      meterGross: 43_407.0,
      sasStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
      sasEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
    },
    {
      machineId: 'mach_003',
      machineName: 'Silver Moon',
      variation: 'No SMIB',
      sasGross: 'No SMIB',
      meterGross: 20_000.0,
      sasStartTime: null,
      sasEndTime: null,
    },
  ],
};

// ─── Collection entry mock shapes ─────────────────────────────────────────────

export const MOCK_COLLECTION_ENTRY_FIRST = {
  _id: 'coll_first_001',
  machineId: 'mach_001',
  location: 'Grand Casino North',
  locationReportId: 'report_001',
  metersIn: 9_646_000,
  metersOut: 4_823_000,
  prevIn: 0,
  prevOut: 0,
  ramClear: false,
  isCompleted: true,
  movement: { metersIn: 9_646_000, metersOut: 4_823_000, gross: 4_823_000 },
  sasMeters: {
    drop: 9_646_000,
    totalCancelledCredits: 4_823_000,
    gross: 4_823_000,
    sasStartTime: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    sasEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  },
};

export const MOCK_COLLECTION_ENTRY_SUBSEQUENT = {
  _id: 'coll_seq_001',
  machineId: 'mach_001',
  location: 'Grand Casino North',
  locationReportId: 'report_002',
  metersIn: 11_000_000,
  metersOut: 5_500_000,
  prevIn: 9_646_000,
  prevOut: 4_823_000,
  ramClear: false,
  isCompleted: true,
  movement: { metersIn: 1_354_000, metersOut: 677_000, gross: 677_000 },
  sasMeters: {
    drop: 11_000_000,
    totalCancelledCredits: 5_500_000,
    gross: 677_000,
    sasStartTime: new Date('2026-01-02T08:00:00.000Z').toISOString(),
    sasEndTime: new Date('2026-01-02T16:00:00.000Z').toISOString(),
  },
};

export const MOCK_COLLECTION_ENTRY_RAM_CLEAR = {
  _id: 'coll_ram_001',
  machineId: 'mach_001',
  location: 'Grand Casino North',
  locationReportId: 'report_003',
  metersIn: 2_000_000,
  metersOut: 1_000_000,
  prevIn: 9_646_000,
  prevOut: 4_823_000,
  ramClear: true,
  ramClearMetersIn: 10_000_000,
  ramClearMetersOut: 5_100_000,
  meterId: 'meter_current_001',
  ramClearMeterId: 'meter_ramclear_001',
  isCompleted: true,
  movement: {
    metersIn: 2_354_000,
    metersOut: 1_277_000,
    gross: 1_077_000,
  },
};

export const MOCK_COLLECTION_ENTRY_NORMAL_MOVEMENT = {
  _id: 'coll_norm_001',
  machineId: 'mach_001',
  location: 'Grand Casino North',
  locationReportId: 'report_001',
  metersIn: 9_646_000,
  metersOut: 4_823_000,
  prevIn: 5_000_000,
  prevOut: 2_500_000,
  ramClear: false,
  isCompleted: true,
  movement: { metersIn: 4_646_000, metersOut: 2_323_000, gross: 2_323_000 },
};

export const MOCK_COLLECTION_ENTRY_NEGATIVE_GROSS = {
  _id: 'coll_neg_001',
  machineId: 'mach_001',
  location: 'Grand Casino North',
  locationReportId: 'report_001',
  metersIn: 5_000_000,
  metersOut: 5_200_000,
  prevIn: 5_000_000,
  prevOut: 5_000_000,
  ramClear: false,
  isCompleted: true,
  movement: { metersIn: 0, metersOut: 200_000, gross: -200_000 },
};

// ─── Create/delete collection response ───────────────────────────────────────

export const MOCK_COLLECTION_CREATE_SUCCESS = {
  success: true,
  data: MOCK_COLLECTION_ENTRY_FIRST,
  calculations: {
    sasMeters: { drop: 9_646_000, totalCancelledCredits: 4_823_000, gross: 4_823_000 },
    movement: { metersIn: 9_646_000, metersOut: 4_823_000, gross: 4_823_000 },
    previousMeters: { metersIn: 0, metersOut: 0, collectionTime: null },
  },
};

export const MOCK_COLLECTION_DELETE_SUCCESS = {
  success: true,
  message: 'Collection deleted successfully',
};

// ─── Report create/edit response ──────────────────────────────────────────────

export const MOCK_REPORT_CREATE_SUCCESS = {
  success: true,
  report: {
    ...MOCK_REPORT_1,
    _id: 'report_new_001',
    locationReportId: 'report_new_001',
  },
};

export const MOCK_REPORT_EDITING = {
  ...MOCK_REPORT_1,
  isEditing: true,
};

// ─── Pagination mock ──────────────────────────────────────────────────────────

export const MOCK_COLLECTION_REPORTS_PAGE_2 = {
  success: true,
  data: [
    {
      _id: 'report_003',
      locationReportId: 'report_003',
      collector: 'E2E Collector',
      collectorFullName: 'E2E Collector',
      location: 'Northern Lights Casino',
      locationSlug: 'northern-lights-casino',
      locationId: 'loc_003',
      machines: '4/4',
      gross: 9_800.0,
      collected: 8_820.0,
      uncollected: 980.0,
      variation: 0,
      balance: 9_800.0,
      locationRevenue: 4_900.0,
      time: '02 Jan 2026, 09:00:00 AM',
      isEditing: false,
      currency: 'TTD',
    },
  ],
  pagination: { page: 2, limit: 40, total: 3, totalPages: 2 },
  timestamp: new Date().toISOString(),
};

export const MOCK_COLLECTION_REPORTS_LARGE_LIST = {
  success: true,
  data: Array.from({ length: 40 }, (_, index) => ({
    _id: `report_p1_${String(index).padStart(3, '0')}`,
    locationReportId: `report_p1_${String(index).padStart(3, '0')}`,
    collector: 'E2E Collector',
    collectorFullName: 'E2E Collector',
    location: `Casino ${index + 1}`,
    locationSlug: `casino-${index + 1}`,
    locationId: `loc_${index + 1}`,
    machines: '4/4',
    gross: 10_000.0,
    collected: 9_000.0,
    uncollected: 1_000.0,
    variation: 0,
    balance: 10_000.0,
    locationRevenue: 5_000.0,
    time: '01 Jan 2026, 09:00:00 AM',
    isEditing: false,
    currency: 'TTD',
  })),
  pagination: { page: 1, limit: 40, total: 43, totalPages: 2 },
  timestamp: new Date().toISOString(),
};
