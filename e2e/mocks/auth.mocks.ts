/**
 * Mock payloads for authentication-related API routes.
 * Shape mirrors the standardised ApiResponse<T> envelope used throughout the app.
 */

export const MOCK_USER_PAYLOAD = {
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

/** Current-user endpoint response */
export const MOCK_CURRENT_USER = {
  success: true,
  data: MOCK_USER_PAYLOAD,
  timestamp: new Date().toISOString(),
};
