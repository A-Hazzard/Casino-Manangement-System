/**
 * Mock payloads for authentication-related API routes.
 * Shape mirrors the standardised ApiResponse<T> envelope used throughout the app.
 */

// ─── Shared type for mock user payloads ──────────────────────────────────────

export type MockUserPayload = {
  _id: string;
  username: string;
  emailAddress: string;
  roles: string[];
  isEnabled: boolean;
  assignedLocations: string[];
  assignedLicencees: string[];
  profile: {
    firstName: string;
    lastName: string;
    gender: string;
    phoneNumber?: string;
  };
};

// ─── Mock users — one per role ────────────────────────────────────────────────
// dashboard access: developer ✅  admin ✅  manager ✅  location admin ✅
// no dashboard access: vault-manager ❌  cashier ❌  technician ❌  collector ❌

export const MOCK_USER_PAYLOAD: MockUserPayload = {
  _id: 'user_test_001',
  username: 'testadmin',
  emailAddress: 'testadmin@evolution1.com',
  roles: ['admin'],
  isEnabled: true,
  assignedLocations: ['loc_001', 'loc_002'],
  assignedLicencees: ['lic_001'],
  profile: {
    firstName: 'Test',
    lastName: 'Admin',
    gender: 'male',
    phoneNumber: '+18681234567',
  },
};

export const MOCK_USER_DEVELOPER: MockUserPayload = {
  _id: 'user_dev_001',
  username: 'testdeveloper',
  emailAddress: 'developer@evolution1.com',
  roles: ['developer'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Dev', lastName: 'User', gender: 'male' },
};

export const MOCK_USER_ADMIN = MOCK_USER_PAYLOAD; // alias

export const MOCK_USER_MANAGER: MockUserPayload = {
  _id: 'user_mgr_001',
  username: 'testmanager',
  emailAddress: 'manager@evolution1.com',
  roles: ['manager'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Manager', lastName: 'User', gender: 'female' },
};

export const MOCK_USER_LOCATION_ADMIN: MockUserPayload = {
  _id: 'user_locadmin_001',
  username: 'testlocationadmin',
  emailAddress: 'locadmin@evolution1.com',
  roles: ['location admin'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Location', lastName: 'Admin', gender: 'male' },
};

export const MOCK_USER_VAULT_MANAGER: MockUserPayload = {
  _id: 'user_vm_001',
  username: 'testvaultmanager',
  emailAddress: 'vaultmanager@evolution1.com',
  roles: ['vault-manager'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Vault', lastName: 'Manager', gender: 'male' },
};

export const MOCK_USER_CASHIER: MockUserPayload = {
  _id: 'user_cashier_001',
  username: 'testcashier',
  emailAddress: 'cashier@evolution1.com',
  roles: ['cashier'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Test', lastName: 'Cashier', gender: 'female' },
};

export const MOCK_USER_TECHNICIAN: MockUserPayload = {
  _id: 'user_tech_001',
  username: 'testtechnician',
  emailAddress: 'technician@evolution1.com',
  roles: ['technician'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Test', lastName: 'Technician', gender: 'male' },
};

export const MOCK_USER_COLLECTOR: MockUserPayload = {
  _id: 'user_collector_001',
  username: 'testcollector',
  emailAddress: 'collector@evolution1.com',
  roles: ['collector'],
  isEnabled: true,
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: { firstName: 'Test', lastName: 'Collector', gender: 'female' },
};

// ─── All role users map ───────────────────────────────────────────────────────

export const MOCK_USERS_BY_ROLE: Record<string, MockUserPayload> = {
  developer: MOCK_USER_DEVELOPER,
  admin: MOCK_USER_ADMIN,
  manager: MOCK_USER_MANAGER,
  'location admin': MOCK_USER_LOCATION_ADMIN,
  'vault-manager': MOCK_USER_VAULT_MANAGER,
  cashier: MOCK_USER_CASHIER,
  technician: MOCK_USER_TECHNICIAN,
  collector: MOCK_USER_COLLECTOR,
};

// ─── Auth API response helpers ────────────────────────────────────────────────

/** Successful login response */
export const MOCK_LOGIN_SUCCESS = {
  success: true,
  data: {
    user: MOCK_USER_PAYLOAD,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    requiresPasswordUpdate: false,
    requiresProfileUpdate: false,
  },
  message: 'Login successful',
  timestamp: new Date().toISOString(),
};

/** Failed login response — wrong credentials */
export const MOCK_LOGIN_FAILURE = {
  success: false,
  error: 'Invalid credentials',
  message: 'The identifier or password you entered is incorrect.',
  code: 'AUTH_FAILED',
  timestamp: new Date().toISOString(),
};

/** Current-user endpoint response (admin) */
export const MOCK_CURRENT_USER = {
  success: true,
  data: MOCK_USER_PAYLOAD,
  timestamp: new Date().toISOString(),
};

/** Build a current-user response for any role's mock user */
export function mockCurrentUserResponse(userPayload: MockUserPayload) {
  return {
    success: true,
    data: userPayload,
    timestamp: new Date().toISOString(),
  };
}
