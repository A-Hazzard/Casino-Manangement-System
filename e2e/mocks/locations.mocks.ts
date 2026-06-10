/**
 * Mock payloads for Locations API routes.
 *
 * Endpoints covered:
 *   GET    /api/locations?compact=1
 *   GET    /api/locations/[locationId]
 *   POST   /api/locations
 *   PUT    /api/locations
 *   DELETE /api/locations
 *   GET    /api/locations/[locationId]/cabinets   (machine list for a location)
 */

// ─── Shared location shapes ───────────────────────────────────────────────────

export const MOCK_LOCATION_1 = {
  _id: 'loc_001',
  id: 'loc_001',
  name: 'Grand Casino North',
  country: 'Trinidad and Tobago',
  address: { street: '1 Northern Blvd', city: 'Port of Spain' },
  rel: { licencee: 'lic_001' },
  licenceeId: 'lic_001',
  profitShare: 60,
  gameDayOffset: 8,
  geoCoords: { latitude: 10.6918, longitude: -61.2225 },
  membershipEnabled: true,
  includeJackpot: false,
  noSMIBLocation: false,
  createdAt: '2024-01-10T12:00:00.000Z',
  updatedAt: '2024-06-01T08:30:00.000Z',
};

export const MOCK_LOCATION_2 = {
  _id: 'loc_002',
  id: 'loc_002',
  name: 'South Bay Gaming',
  country: 'Trinidad and Tobago',
  address: { street: '45 Bay Road', city: 'San Fernando' },
  rel: { licencee: 'lic_001' },
  licenceeId: 'lic_001',
  profitShare: 55,
  gameDayOffset: 8,
  geoCoords: { latitude: 10.2745, longitude: -61.4589 },
  membershipEnabled: false,
  includeJackpot: false,
  noSMIBLocation: false,
  createdAt: '2024-02-15T09:00:00.000Z',
  updatedAt: '2024-06-01T08:30:00.000Z',
};

// ─── List response ────────────────────────────────────────────────────────────

export const MOCK_LOCATIONS_LIST = {
  success: true,
  locations: [MOCK_LOCATION_1, MOCK_LOCATION_2],
  timestamp: new Date().toISOString(),
};

/** List with an extra "updated" location (after edit) */
export const MOCK_LOCATIONS_LIST_AFTER_EDIT = {
  success: true,
  locations: [
    { ...MOCK_LOCATION_1, name: 'Grand Casino North (Updated)' },
    MOCK_LOCATION_2,
  ],
  timestamp: new Date().toISOString(),
};

/** List after deletion of location 1 */
export const MOCK_LOCATIONS_LIST_AFTER_DELETE = {
  success: true,
  locations: [MOCK_LOCATION_2],
  timestamp: new Date().toISOString(),
};

// ─── Single location ──────────────────────────────────────────────────────────

export const MOCK_LOCATION_DETAIL = {
  success: true,
  location: MOCK_LOCATION_1,
  timestamp: new Date().toISOString(),
};

// ─── Create / Update / Delete responses ──────────────────────────────────────

export const MOCK_LOCATION_CREATE_SUCCESS = {
  success: true,
  location: {
    ...MOCK_LOCATION_1,
    _id: 'loc_003',
    id: 'loc_003',
    name: 'New Test Location',
    address: { street: '99 New Street', city: 'Arima' },
  },
  message: 'Location created successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_LOCATION_UPDATE_SUCCESS = {
  success: true,
  data: { ...MOCK_LOCATION_1, name: 'Grand Casino North (Updated)' },
  message: 'Location updated successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_LOCATION_DELETE_SUCCESS = {
  success: true,
  message: 'Location deleted successfully',
  timestamp: new Date().toISOString(),
};

// ─── Machines inside a location ───────────────────────────────────────────────

export const MOCK_LOCATION_MACHINES = {
  success: true,
  data: [
    {
      _id: 'mach_001',
      serialNumber: 'SN-10001',
      assetNumber: 'SN-10001',
      installedGame: 'Dragon Fortune',
      custom: { name: 'Lucky Dragon' },
      game: 'Dragon Fortune',
      gameType: 'slot',
      relayId: '1',
      gamingLocation: 'loc_001',
      locationId: 'loc_001',
      assetStatus: 'functional',
      status: 'functional',
      cabinetType: 'Standing',
      manufacturer: 'IGT',
      online: true,
      moneyIn: 96_460.0,
      moneyOut: 48_230.0,
      jackpot: 1_200.0,
      gross: 43_407.0,
      lastActivity: new Date().toISOString(),
    },
    {
      _id: 'mach_002',
      serialNumber: 'SN-10002',
      assetNumber: 'SN-10002',
      installedGame: 'Pharaoh Riches',
      custom: { name: 'Golden Pharaoh' },
      game: 'Pharaoh Riches',
      gameType: 'slot',
      relayId: '2',
      gamingLocation: 'loc_001',
      locationId: 'loc_001',
      assetStatus: 'functional',
      status: 'functional',
      cabinetType: 'Standing',
      manufacturer: 'Aristocrat',
      online: false,
      moneyIn: 73_600.0,
      moneyOut: 36_800.0,
      jackpot: 800.0,
      gross: 33_120.0,
      lastActivity: new Date(Date.now() - 3_600_000).toISOString(),
    },
  ],
  pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

export const MOCK_LOCATION_MACHINES_AFTER_ADD = {
  success: true,
  data: [
    ...(MOCK_LOCATION_MACHINES.data as Array<object>),
    {
      _id: 'mach_003',
      serialNumber: 'SN-NEW001',
      assetNumber: 'SN-NEW001',
      installedGame: 'Golden Bells',
      custom: { name: 'Test Machine' },
      game: 'Golden Bells',
      gameType: 'slot',
      relayId: '3',
      gamingLocation: 'loc_001',
      locationId: 'loc_001',
      assetStatus: 'functional',
      status: 'functional',
      cabinetType: 'Standing',
      manufacturer: 'IGT',
      online: false,
      moneyIn: 0,
      moneyOut: 0,
      jackpot: 0,
      gross: 0,
      lastActivity: null,
    },
  ],
  pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

// ─── Machine create/update/delete inside a location ───────────────────────────

export const MOCK_MACHINE_CREATE_SUCCESS = {
  success: true,
  data: {
    _id: 'mach_003',
    serialNumber: 'SN-NEW001',
    assetNumber: 'SN-NEW001',
    installedGame: 'Golden Bells',
    custom: { name: 'Test Machine' },
    game: 'Golden Bells',
    gameType: 'slot',
    relayId: '3',
    gamingLocation: 'loc_001',
    locationId: 'loc_001',
    assetStatus: 'functional',
    status: 'functional',
    cabinetType: 'Standing',
    manufacturer: 'IGT',
    online: false,
    moneyIn: 0,
    moneyOut: 0,
    jackpot: 0,
    gross: 0,
  },
  message: 'Machine created successfully',
  timestamp: new Date().toISOString(),
};

const MOCK_MACHINE_1 = (MOCK_LOCATION_MACHINES.data as Array<object>)[0] as Record<string, unknown>;

export const MOCK_MACHINE_UPDATE_SUCCESS = {
  success: true,
  data: {
    ...MOCK_MACHINE_1,
    custom: { name: 'Lucky Dragon (Updated)' },
  },
  message: 'Machine updated successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_MACHINE_DELETE_SUCCESS = {
  success: true,
  message: 'Machine deleted successfully',
  timestamp: new Date().toISOString(),
};

// ─── Licencees (needed for location forms and licencee management) ────────────

// `country` is a Country _id (matches MOCK_COUNTRIES option values); `countryName`
// holds the human-readable name shown in the licencee table.
export const MOCK_LICENCEE_1 = {
  _id: 'lic_001',
  name: 'Evolution1 Ltd',
  country: 'ctry_tt',
  countryName: 'Trinidad and Tobago',
  includeJackpot: false,
  gameDayOffset: 8,
  startDate: '2023-01-01T00:00:00.000Z',
  expiryDate: '2026-12-31T00:00:00.000Z',
  lastEdited: '2024-06-01T08:30:00.000Z',
};

/** A second licencee that has includeJackpot enabled */
export const MOCK_LICENCEE_2 = {
  _id: 'lic_002',
  name: 'Caribbean Gaming Corp',
  country: 'ctry_tt',
  countryName: 'Trinidad and Tobago',
  includeJackpot: true,
  gameDayOffset: 8,
  startDate: '2023-06-01T00:00:00.000Z',
  expiryDate: '2026-12-31T00:00:00.000Z',
  lastEdited: '2024-09-15T10:00:00.000Z',
};

// Countries — GET /api/countries returns { success, countries: [...] }.
// The edit-licencee modal renders <option value={country._id}>; a licencee's
// `country` field must match one of these _ids for the select to pre-select.
export const MOCK_COUNTRIES = {
  success: true,
  countries: [
    {
      _id: 'ctry_tt',
      name: 'Trinidad and Tobago',
      alpha2: 'TT',
      alpha3: 'TTO',
      isoNumeric: '780',
    },
    {
      _id: 'ctry_bb',
      name: 'Barbados',
      alpha2: 'BB',
      alpha3: 'BRB',
      isoNumeric: '052',
    },
  ],
  timestamp: new Date().toISOString(),
};

// fetchLicencees() reads response.licencees (not response.data)
export const MOCK_LICENCEES_LIST = {
  success: true,
  licencees: [MOCK_LICENCEE_1, MOCK_LICENCEE_2],
  pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

/** Post-edit payload where lic_001 has includeJackpot toggled on */
export const MOCK_LICENCEES_LIST_AFTER_EDIT = {
  success: true,
  licencees: [{ ...MOCK_LICENCEE_1, includeJackpot: true }, MOCK_LICENCEE_2],
  pagination: { page: 1, limit: 50, total: 2, totalPages: 1 },
  timestamp: new Date().toISOString(),
};

// ─── Members (location detail Membership tab) ──────────────────────────────────
// GET /api/members?... → { success, data: { members: [...], pagination } }
// The member table reads: profile.firstName/lastName/occupation, points,
// locationName, gamingLocation, winLoss, totalMoneyIn/Out, createdAt (string).

export const MOCK_MEMBER_1 = {
  _id: 'member_001',
  username: 'johnplayer',
  playerId: 'P-0001',
  profile: {
    firstName: 'John',
    lastName: 'Player',
    occupation: 'Engineer',
    gender: 'male',
  },
  points: 1_500,
  status: 'active',
  locationName: 'Grand Casino North',
  gamingLocation: 'loc_001',
  winLoss: 2_500,
  totalMoneyIn: 10_000,
  totalMoneyOut: 7_500,
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

export const MOCK_LOCATION_MEMBERS = {
  success: true,
  data: {
    members: [MOCK_MEMBER_1],
    pagination: { page: 1, totalCount: 1, totalMembers: 1, totalPages: 1 },
  },
  timestamp: new Date().toISOString(),
};
