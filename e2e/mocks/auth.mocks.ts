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
  _id: '69b46e8854694ea2246da698',
  username: 'admin',
  emailAddress: 'admin@gmail.com',
  roles: ['developer', 'admin'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: [
    '9a5db2cb29ffd2d962fd1d91',
    '732b094083226f216b3fc11a',
    'c03b094083226f216b3fc39c'
  ],
  profile: {
    firstName: 'Evolution',
    lastName: 'Admin',
    gender: 'other',
    phoneNumber: '18681234566',
  },
};

export const MOCK_USER_DEVELOPER: MockUserPayload = {
  _id: '69b46e8854694ea2246da699',
  username: 'developer',
  emailAddress: 'developer@gmail.com',
  roles: ['developer', 'admin'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'Developer', gender: 'other' },
};

export const MOCK_USER_ADMIN = MOCK_USER_PAYLOAD; // admin@gmail.com

export const MOCK_USER_MANAGER: MockUserPayload = {
  _id: '69b6ff3588664816450beac8', // Real manager from list_users
  username: 'manager',
  emailAddress: 'manager@gmail.com',
  roles: ['manager', 'admin'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'Manager', gender: 'other' },
};

export const MOCK_USER_LOCATION_ADMIN: MockUserPayload = {
  _id: '69b46e8854694ea2246da69a',
  username: 'location admin',
  emailAddress: 'locationadmin@gmail.com',
  roles: ['location admin'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'LocAdmin', gender: 'other' },
};

export const MOCK_USER_VAULT_MANAGER: MockUserPayload = {
  _id: '69b46e8854694ea2246da69b',
  username: 'vaultManager',
  emailAddress: 'vaultmanager@gmail.com',
  roles: ['vault-manager'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'VaultManager', gender: 'other' },
};

export const MOCK_USER_CASHIER: MockUserPayload = {
  _id: '69b46e8854694ea2246da69c',
  username: 'cashier',
  emailAddress: 'cashier@gmail.com',
  roles: ['cashier'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'Cashier', gender: 'other' },
};

export const MOCK_USER_TECHNICIAN: MockUserPayload = {
  _id: '69b46e8854694ea2246da69d',
  username: 'technician',
  emailAddress: 'technician@gmail.com',
  roles: ['technician'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'Technician', gender: 'other' },
};

export const MOCK_USER_COLLECTOR: MockUserPayload = {
  _id: '  69b46e8854694ea2246da69e',
  username: 'collector',
  emailAddress: 'collector@gmail.com',
  roles: ['collector'],
  isEnabled: true,
  assignedLocations: [],
  assignedLicencees: ['9a5db2cb29ffd2d962fd1d91'],
  profile: { firstName: 'E2E', lastName: 'Collector', gender: 'other' },
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

/**
 * Build a current-user API response that matches the EXACT shape returned by
 * GET /api/auth/current-user (see app/api/auth/current-user/route.ts).
 *
 * The response uses "user" (not "data") as the key, and "id" (not "_id").
 * useCurrentUserQuery reads data.user.id and data.user.roles to update Zustand.
 */
export function mockCurrentUserResponse(userPayload: MockUserPayload) {
  return {
    success: true,
    user: {
      id: userPayload._id,
      _id: userPayload._id,
      username: userPayload.username,
      emailAddress: userPayload.emailAddress,
      profile: userPayload.profile,
      roles: userPayload.roles,
      isEnabled: userPayload.isEnabled,
      assignedLocations: userPayload.assignedLocations,
      assignedLicencees: userPayload.assignedLicencees,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requiresProfileUpdate: false,
      requiresPasswordUpdate: false,
      tempPasswordChanged: true,
    },
  };
}

/** Current-user endpoint response (admin) — matches GET /api/auth/current-user shape */
export const MOCK_CURRENT_USER = mockCurrentUserResponse(MOCK_USER_PAYLOAD);
