/**
 * Mock payloads for Collection Report V2 API routes.
 *
 * Endpoints covered:
 *   GET    /api/collection-reports-v2/sessions
 *   POST   /api/collection-reports-v2/sessions
 *   GET    /api/collection-reports-v2/sessions/[sessionId]
 *   DELETE /api/collection-reports-v2/sessions/[sessionId]
 *   PATCH  /api/collection-reports-v2/sessions/[sessionId]
 *   PATCH  /api/collection-reports-v2/sessions/[sessionId]/submit
 *   POST   /api/collection-reports-v2/machines
 *   PATCH  /api/collection-reports-v2/machines?id=
 */

// ─── Session list rows ────────────────────────────────────────────────────────

export const MOCK_V2_SESSION_SMIB = {
  sessionId: 'sess_smib_001',
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
  machinesTotal: 2,
  machinesCaptured: 0,
  machinesConfirmed: 0,
  machinesSkipped: 0,
  totalMachineGross: 0,
  totalSasGross: 0,
  totalGrossDifference: 0,
  createdAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_SESSION_NO_SMIB = {
  sessionId: 'sess_nosmib_001',
  sessionStatus: 'in-progress' as const,
  locationId: 'loc_003',
  locationName: 'Silver Coast Gaming',
  noSMIBLocation: true,
  licencee: 'lic_001',
  collector: 'collector_001',
  collectorName: 'E2E Collector',
  collectorEmail: 'collector@example.com',
  collectorFirstName: 'E2E',
  collectorLastName: 'Collector',
  sessionStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
  sessionEndTime: undefined,
  machinesTotal: 3,
  machinesCaptured: 0,
  machinesConfirmed: 0,
  machinesSkipped: 0,
  totalMachineGross: 0,
  totalSasGross: 0,
  totalGrossDifference: 0,
  createdAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_SESSION_SUBMITTED = {
  sessionId: 'sess_sub_001',
  sessionStatus: 'submitted' as const,
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
  sessionEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  machinesTotal: 2,
  machinesCaptured: 2,
  machinesConfirmed: 2,
  machinesSkipped: 0,
  totalMachineGross: 4_823_000,
  totalSasGross: 4_823_000,
  totalGrossDifference: 0,
  createdAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_SESSION_ARCHIVED = {
  sessionId: 'sess_arch_001',
  sessionStatus: 'submitted' as const,
  locationId: 'loc_001',
  locationName: 'Grand Casino North',
  noSMIBLocation: false,
  licencee: 'lic_001',
  collector: 'collector_001',
  collectorName: 'E2E Collector',
  collectorEmail: 'collector@example.com',
  collectorFirstName: 'E2E',
  collectorLastName: 'Collector',
  sessionStartTime: new Date('2025-12-01T08:00:00.000Z').toISOString(),
  sessionEndTime: new Date('2025-12-01T16:00:00.000Z').toISOString(),
  machinesTotal: 2,
  machinesCaptured: 2,
  machinesConfirmed: 2,
  machinesSkipped: 0,
  totalMachineGross: 4_000_000,
  totalSasGross: 4_000_000,
  totalGrossDifference: 0,
  deletedAt: new Date('2026-01-05T10:00:00.000Z').toISOString(),
  createdAt: new Date('2025-12-01T08:00:00.000Z').toISOString(),
};

// ─── Session list responses ───────────────────────────────────────────────────

export const MOCK_V2_SESSIONS_LIST_SMIB = {
  success: true,
  data: [MOCK_V2_SESSION_SMIB],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SESSIONS_LIST_NO_SMIB = {
  success: true,
  data: [MOCK_V2_SESSION_NO_SMIB],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SESSIONS_LIST_SUBMITTED = {
  success: true,
  data: [MOCK_V2_SESSION_SUBMITTED],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SESSIONS_LIST_ARCHIVED = {
  success: true,
  data: [MOCK_V2_SESSION_ARCHIVED],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SESSIONS_EMPTY = {
  success: true,
  data: [] as typeof MOCK_V2_SESSION_SMIB[],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  timestamp: new Date().toISOString(),
};

// ─── ReportedMachine shapes ───────────────────────────────────────────────────

export const MOCK_V2_MACHINE_SMIB_PENDING = {
  reportedMachineId: 'rm_smib_001',
  machineId: 'mach_001',
  machineName: 'Lucky Dragon',
  machineCustomName: 'Lucky Dragon',
  serialNumber: 'SN-10001',
  manufacturer: 'IGT',
  game: 'Dragon Fortune',
  status: 'pending' as const,
  sequenceOrder: 0,
  sasMetersIn: 9_646_000,
  sasMetersOut: 4_823_000,
  manualMetersIn: null,
  manualMetersOut: null,
  prevSasMetersIn: 5_000_000,
  prevSasMetersOut: 2_500_000,
  metersMatch: null,
  hasRelay: true,
  ramClear: false,
  isSupplemental: false,
  lastCollectionTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasStartTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasEndTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_MACHINE_SMIB_CAPTURED = {
  reportedMachineId: 'rm_smib_002',
  machineId: 'mach_001',
  machineName: 'Lucky Dragon',
  machineCustomName: 'Lucky Dragon',
  serialNumber: 'SN-10001',
  manufacturer: 'IGT',
  game: 'Dragon Fortune',
  status: 'confirmed' as const,
  sequenceOrder: 0,
  sasMetersIn: 9_646_000,
  sasMetersOut: 4_823_000,
  manualMetersIn: 9_646_000,
  manualMetersOut: 4_823_000,
  prevSasMetersIn: 5_000_000,
  prevSasMetersOut: 2_500_000,
  metersMatch: true,
  hasRelay: true,
  ramClear: false,
  isSupplemental: false,
  machineGross: 2_323_000,
  sasGross: 2_323_000,
  grossDifference: 0,
  movement: { manualMetersIn: 4_646_000, manualMetersOut: 2_323_000, machineGross: 2_323_000 },
  lastCollectionTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasStartTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasEndTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_MACHINE_NO_SMIB_CAPTURED = {
  reportedMachineId: 'rm_nosmib_001',
  machineId: 'mach_003',
  machineName: 'Silver Moon',
  machineCustomName: 'Silver Moon',
  serialNumber: 'SN-10003',
  manufacturer: 'Aristocrat',
  game: 'Silver Stars',
  status: 'captured' as const,
  sequenceOrder: 0,
  sasMetersIn: null,
  sasMetersOut: null,
  manualMetersIn: 5_000_000,
  manualMetersOut: 2_500_000,
  prevSasMetersIn: 2_000_000,
  prevSasMetersOut: 1_000_000,
  metersMatch: true,
  hasRelay: false,
  ramClear: false,
  isSupplemental: false,
  machineGross: 1_500_000,
  sasGross: null,
  grossDifference: null,
  movement: { manualMetersIn: 3_000_000, manualMetersOut: 1_500_000, machineGross: 1_500_000 },
  lastCollectionTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasStartTime: null,
  sasEndTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_MACHINE_RAM_CLEAR = {
  reportedMachineId: 'rm_ram_001',
  machineId: 'mach_002',
  machineName: 'Golden Pharaoh',
  machineCustomName: 'Golden Pharaoh',
  serialNumber: 'SN-10002',
  manufacturer: 'Aristocrat',
  game: 'Pharaoh Gold',
  status: 'confirmed' as const,
  sequenceOrder: 1,
  sasMetersIn: 1_000_000,
  sasMetersOut: 500_000,
  manualMetersIn: 1_000_000,
  manualMetersOut: 500_000,
  prevSasMetersIn: 7_360_000,
  prevSasMetersOut: 3_680_000,
  metersMatch: true,
  hasRelay: true,
  ramClear: true,
  ramClearMetersIn: 8_000_000,
  ramClearMetersOut: 4_000_000,
  isSupplemental: false,
  machineGross: 960_000,
  sasGross: 960_000,
  grossDifference: 0,
  movement: { manualMetersIn: 1_640_000, manualMetersOut: 820_000, machineGross: 820_000 },
  lastCollectionTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasStartTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
  sasEndTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

export const MOCK_V2_MACHINE_SKIPPED = {
  reportedMachineId: 'rm_skip_001',
  machineId: 'mach_002',
  machineName: 'Golden Pharaoh',
  machineCustomName: 'Golden Pharaoh',
  serialNumber: 'SN-10002',
  status: 'skipped' as const,
  sequenceOrder: 1,
  hasRelay: true,
  ramClear: false,
  isSupplemental: false,
  metersMatch: null,
  sasMetersIn: 7_360_000,
  sasMetersOut: 3_680_000,
};

export const MOCK_V2_MACHINE_SUPPLEMENTAL = {
  reportedMachineId: 'rm_supp_001',
  machineId: 'mach_001',
  machineName: 'Lucky Dragon',
  machineCustomName: 'Lucky Dragon',
  serialNumber: 'SN-10001',
  status: 'captured' as const,
  sequenceOrder: 0,
  hasRelay: true,
  ramClear: false,
  isSupplemental: true,
  metersMatch: true,
  sasMetersIn: 9_646_000,
  sasMetersOut: 4_823_000,
};

// ─── Session detail responses ─────────────────────────────────────────────────

export const MOCK_V2_SESSION_DETAIL_SMIB = {
  success: true,
  data: {
    ...MOCK_V2_SESSION_SMIB,
    machines: [MOCK_V2_MACHINE_SMIB_PENDING],
  },
};

export const MOCK_V2_SESSION_DETAIL_NO_SMIB = {
  success: true,
  data: {
    ...MOCK_V2_SESSION_NO_SMIB,
    machines: [MOCK_V2_MACHINE_NO_SMIB_CAPTURED],
  },
};

export const MOCK_V2_SESSION_DETAIL_SUBMITTED = {
  success: true,
  data: {
    ...MOCK_V2_SESSION_SUBMITTED,
    machines: [MOCK_V2_MACHINE_SMIB_CAPTURED, MOCK_V2_MACHINE_RAM_CLEAR],
  },
};

export const MOCK_V2_SESSION_DETAIL_RAM_CLEAR = {
  success: true,
  data: {
    ...MOCK_V2_SESSION_SMIB,
    machines: [MOCK_V2_MACHINE_SMIB_PENDING, MOCK_V2_MACHINE_RAM_CLEAR],
  },
};

export const MOCK_V2_SESSION_DETAIL_WITH_SKIPPED = {
  success: true,
  data: {
    ...MOCK_V2_SESSION_SMIB,
    machinesCaptured: 1,
    machinesSkipped: 1,
    machines: [MOCK_V2_MACHINE_SMIB_CAPTURED, MOCK_V2_MACHINE_SKIPPED],
  },
};

// ─── Session create/submit responses ─────────────────────────────────────────

export const MOCK_V2_SESSION_CREATE_SUCCESS = {
  success: true,
  data: {
    sessionId: 'sess_new_001',
    locationId: 'loc_001',
    locationName: 'Grand Casino North',
    licencee: 'lic_001',
    collector: 'collector_001',
    collectorName: 'E2E Collector',
    machinesTotal: 2,
    machines: [
      {
        machineId: 'mach_001',
        machineName: 'Lucky Dragon',
        machineCustomName: 'Lucky Dragon',
        serialNumber: 'SN-10001',
        manufacturer: 'IGT',
        game: 'Dragon Fortune',
        sasMetersIn: 9_646_000,
        sasMetersOut: 4_823_000,
        collectionTime: new Date('2025-12-31T16:00:00.000Z').toISOString(),
        sequenceOrder: 0,
      },
      {
        machineId: 'mach_002',
        machineName: 'Golden Pharaoh',
        machineCustomName: 'Golden Pharaoh',
        serialNumber: 'SN-10002',
        manufacturer: 'Aristocrat',
        game: 'Pharaoh Gold',
        sasMetersIn: 7_360_000,
        sasMetersOut: 3_680_000,
        collectionTime: new Date('2025-12-31T16:00:00.000Z').toISOString(),
        sequenceOrder: 1,
      },
    ],
    reportedMachineIds: ['rm_new_001', 'rm_new_002'],
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SESSION_CREATE_EMPTY = {
  success: true,
  data: {
    sessionId: 'sess_empty_001',
    locationId: 'loc_002',
    locationName: 'South Bay Gaming',
    licencee: 'lic_001',
    collector: 'collector_001',
    collectorName: 'E2E Collector',
    machinesTotal: 0,
    machines: [] as unknown[],
    reportedMachineIds: [] as string[],
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_SUBMIT_SUCCESS = {
  success: true,
  data: {
    sessionId: 'sess_smib_001',
    machinesUpdated: 2,
    sessionStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
    sessionEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_V2_MACHINE_CAPTURE_SUCCESS = {
  success: true,
  data: MOCK_V2_MACHINE_SMIB_CAPTURED,
};

export const MOCK_V2_MACHINE_SKIP_SUCCESS = {
  success: true,
  data: MOCK_V2_MACHINE_SKIPPED,
};

// ─── Error responses ──────────────────────────────────────────────────────────

export const MOCK_V2_CHRONOLOGICAL_BLOCK = {
  success: false,
  error: 'Cannot submit: a newer session already exists for this machine. This session would insert data between existing records.',
};

export const MOCK_V2_SESSION_CONFLICT = {
  success: false,
  error: 'An active session already exists for this location.',
};

export const MOCK_V2_VALIDATION_ERROR = {
  success: false,
  error: 'ramClearMetersIn must be greater than or equal to prevSasMetersIn',
};

export const MOCK_V2_SESSION_NOT_FOUND = {
  success: false,
  error: 'Session not found',
};

export const MOCK_V2_SAVE_ERROR = {
  success: false,
  error: 'Internal server error. Please try again.',
};

// ─── Last collection time ─────────────────────────────────────────────────────

export const MOCK_V2_LAST_COLLECTION_TIME = {
  success: true,
  data: {
    collectionTime: new Date('2025-12-31T08:00:00.000Z').toISOString(),
    firstCollectionTime: new Date('2025-06-01T08:00:00.000Z').toISOString(),
  },
};
