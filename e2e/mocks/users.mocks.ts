/**
 * Mock payloads for User Management API routes.
 *
 * Endpoints covered:
 *   GET    /api/users
 *   GET    /api/users/[id]
 *   POST   /api/users
 *   PUT    /api/users
 *   DELETE /api/users
 */

// ─── Shared user shapes ───────────────────────────────────────────────────────

export const MOCK_USER_ADMIN = {
  _id: 'user_001',
  username: 'jdoe_admin',
  emailAddress: 'john.doe@evolution1.com',
  isEnabled: true,
  roles: ['admin'],
  assignedLocations: ['loc_001', 'loc_002'],
  assignedLicencees: ['lic_001'],
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    gender: 'male',
    phoneNumber: '+18681112222',
    address: {
      street: '10 Admin Lane',
      town: 'Port of Spain',
      region: 'POS',
      country: 'Trinidad and Tobago',
      postalCode: '00000',
    },
    identification: {
      dateOfBirth: '1985-04-12T00:00:00.000Z',
      idType: 'National ID',
      idNumber: 'TT-123456',
    },
  },
  createdAt: '2024-01-05T08:00:00.000Z',
  updatedAt: '2024-06-01T10:00:00.000Z',
};

export const MOCK_USER_CASHIER = {
  _id: 'user_002',
  username: 'msmith_cashier',
  emailAddress: 'mary.smith@evolution1.com',
  isEnabled: true,
  roles: ['cashier'],
  assignedLocations: ['loc_001'],
  assignedLicencees: ['lic_001'],
  profile: {
    firstName: 'Mary',
    lastName: 'Smith',
    gender: 'female',
    phoneNumber: '+18683334444',
    address: {
      street: '22 Cashier Rd',
      town: 'San Fernando',
      region: 'SF',
      country: 'Trinidad and Tobago',
      postalCode: '00001',
    },
  },
  createdAt: '2024-02-10T09:00:00.000Z',
  updatedAt: '2024-06-01T10:00:00.000Z',
};

export const MOCK_USER_MANAGER = {
  _id: 'user_003',
  username: 'rjones_mgr',
  emailAddress: 'robert.jones@evolution1.com',
  isEnabled: false,
  roles: ['manager'],
  assignedLocations: ['loc_001', 'loc_002'],
  assignedLicencees: ['lic_001'],
  profile: {
    firstName: 'Robert',
    lastName: 'Jones',
    gender: 'male',
    phoneNumber: '+18685556666',
  },
  createdAt: '2024-03-01T10:00:00.000Z',
  updatedAt: '2024-06-01T10:00:00.000Z',
};

// ─── List responses ───────────────────────────────────────────────────────────

export const MOCK_USERS_LIST = {
  success: true,
  data: {
    users: [MOCK_USER_ADMIN, MOCK_USER_CASHIER, MOCK_USER_MANAGER],
    pagination: {
      page: 1,
      limit: 10,
      total: 3,
      totalPages: 1,
    },
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_USERS_LIST_AFTER_CREATE = {
  success: true,
  data: {
    users: [
      MOCK_USER_ADMIN,
      MOCK_USER_CASHIER,
      MOCK_USER_MANAGER,
      {
        _id: 'user_004',
        username: 'newuser_test',
        emailAddress: 'newuser@evolution1.com',
        isEnabled: true,
        roles: ['technician'],
        assignedLocations: [],
        assignedLicencees: ['lic_001'],
        profile: { firstName: 'New', lastName: 'User', gender: 'other' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    pagination: { page: 1, limit: 10, total: 4, totalPages: 1 },
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_USERS_LIST_AFTER_EDIT = {
  success: true,
  data: {
    users: [
      { ...MOCK_USER_ADMIN, emailAddress: 'john.doe.updated@evolution1.com' },
      MOCK_USER_CASHIER,
      MOCK_USER_MANAGER,
    ],
    pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
  },
  timestamp: new Date().toISOString(),
};

export const MOCK_USERS_LIST_AFTER_DELETE = {
  success: true,
  data: {
    users: [MOCK_USER_ADMIN, MOCK_USER_CASHIER],
    pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
  },
  timestamp: new Date().toISOString(),
};

// ─── Single user ──────────────────────────────────────────────────────────────



// ─── Create / Update / Delete ─────────────────────────────────────────────────

export const MOCK_USER_CREATE_SUCCESS = {
  success: true,
  data: {
    user: {
      _id: 'user_004',
      username: 'newuser_test',
      emailAddress: 'newuser@evolution1.com',
      isEnabled: true,
      roles: ['technician'],
      assignedLocations: [],
      assignedLicencees: ['lic_001'],
      profile: { firstName: 'New', lastName: 'User', gender: 'other' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  message: 'User created successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_USER_UPDATE_SUCCESS = {
  success: true,
  data: {
    ...MOCK_USER_ADMIN,
    emailAddress: 'john.doe.updated@evolution1.com',
  },
  message: 'User updated successfully',
  timestamp: new Date().toISOString(),
};

export const MOCK_USER_DELETE_SUCCESS = {
  success: true,
  message: 'User deleted successfully',
  timestamp: new Date().toISOString(),
};

// ─── Error responses ──────────────────────────────────────────────────────────

export const MOCK_USER_DUPLICATE_USERNAME = {
  success: false,
  error: 'Validation Error',
  message: 'A user with this username already exists.',
  code: 'DUPLICATE_USERNAME',
  timestamp: new Date().toISOString(),
};


