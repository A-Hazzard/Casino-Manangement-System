import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * API Data Management Tests
 * ─────────────────────────
 * This spec verifies the CRUD operations for Licencees, Locations, and Users
 * via the backend API. It also serves as a mechanism to create and cleanup
 * real test data in the database.
 */

const TEST_DATA_FILE = path.join(__dirname, '../test-data.json');

test.describe.serial('API-based Data Management', () => {
  let licenceeId: string;
  let locationId: string;
  let userId: string;

  test('Step 1: Create a temporary Licencee via API', async ({ request }) => {
    const response = await request.post('/api/licencees', {
      data: {
        name: `E2E_TEST_LICENCEE_${Date.now()}`,
        description: 'Temporary licencee for E2E dashboard testing',
        country: '699ef6e695fc27943db16c14', // Trinidad and Tobago
        startDate: new Date().toISOString(),
      },
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();
    licenceeId = body.licencee._id;
  });

  test('Step 2: Create a temporary Location via API', async ({ request }) => {
    test.skip(!licenceeId, 'Licencee creation failed');

    const response = await request.post('/api/locations', {
      data: {
        name: `E2E_TEST_LOCATION_${Date.now()}`,
        country: '699ef6e695fc27943db16c14',
        rel: { licencee: licenceeId },
        profitShare: 50,
        gameDayOffset: 8,
      },
    });

    if (!response.ok()) {
      const errorBody = await response.json();
      console.error('Location creation failed:', errorBody);
    }
    expect(response.ok()).toBe(true);
    const body = await response.json();
    locationId = body.location._id;
    expect(locationId).toBeDefined();
  });

  test('Step 3: Create a temporary Admin User via API', async ({ request }) => {
    test.skip(!licenceeId || !locationId, 'Licencee or Location creation failed');

    const response = await request.post('/api/users', {
      data: {
        username: `e2eAdmin${Date.now()}`,
        emailAddress: `e2e_admin_${Date.now()}@example.com`,
        password: 'Decrypted12!',
        roles: ['admin'],
        profile: {
          firstName: 'E2E',
          lastName: 'Automated',
          gender: 'male'
        },
        assignedLicencees: [licenceeId],
        assignedLocations: [locationId],
      },
    });

    if (!response.ok()) {
      const errorBody = await response.json();
      console.error('User creation failed:', errorBody);
    }
    expect(response.ok()).toBe(true);
    const body = await response.json();
    userId = body.user._id;
    expect(userId).toBeDefined();

    // Persist IDs for potential external cleanup if the test run crashes
    fs.writeFileSync(TEST_DATA_FILE, JSON.stringify({ licenceeId, locationId, userId }, null, 2));
  });

  test('Step 4: Cleanup - Delete the test User', async ({ request }) => {
    test.skip(!userId, 'User was not created');

    const response = await request.delete('/api/users', {
      data: { _id: userId },
    });

    expect(response.ok()).toBe(true);
    expect(response.ok()).toBe(true);
  });

  test('Step 5: Cleanup - Delete the test Location', async ({ request }) => {
    test.skip(!locationId, 'Location was not created');

    const response = await request.delete(`/api/locations?id=${locationId}`);

    expect(response.ok()).toBe(true);
    expect(response.ok()).toBe(true);
  });

  test('Step 6: Cleanup - Delete the test Licencee', async ({ request }) => {
    test.skip(!licenceeId, 'Licencee was not created');

    const response = await request.delete('/api/licencees', {
      data: { _id: licenceeId },
    });

    expect(response.ok()).toBe(true);
    expect(response.ok()).toBe(true);

    // Remove the tracking file
    if (fs.existsSync(TEST_DATA_FILE)) {
      fs.unlinkSync(TEST_DATA_FILE);
    }
  });
});
