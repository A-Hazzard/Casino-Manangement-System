import { test, expect } from '../fixtures/test.fixture';
import { type Page, type Route } from 'playwright';
import { MOCK_USER_PAYLOAD, mockCurrentUserResponse } from '../mocks/auth.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';

// Ensure the user has an assigned location so the panel fetches notifications
const MOCK_USER_WITH_LOC = {
  ...MOCK_USER_PAYLOAD,
  assignedLocations: ['loc_001'],
};

const MOCK_CURRENT_USER = mockCurrentUserResponse(MOCK_USER_WITH_LOC);

const MOCK_NOTIFICATIONS_RESPONSE = {
  success: true,
  unreadCount: 3,
  pendingFloatRequests: 1,
  pendingShiftReviews: 0,
  notifications: [
    {
      _id: 'notif_001',
      type: 'float_request',
      title: 'Float Increase Request - Jane Smith',
      message: 'Jane Smith has requested an increase of TT$500.00',
      status: 'unread',
      urgent: true,
      createdAt: '2026-06-01T10:00:00.000Z',
      metadata: {
        cashierId: 'user_cashier_001',
        cashierName: 'Jane Smith',
        requestedAmount: 500,
        requestType: 'increase',
      },
    },
    {
      _id: 'notif_002',
      type: 'low_balance',
      title: 'Low Vault Balance Warning',
      message: 'Vault balance is below threshold',
      status: 'unread',
      urgent: true,
      createdAt: '2026-06-01T09:30:00.000Z',
      metadata: {},
    },
    {
      _id: 'notif_003',
      type: '2fa_recovery_request',
      title: '2FA Reset Requested',
      message: 'Bob Jones has requested a 2FA reset.',
      status: 'unread',
      urgent: true,
      createdAt: '2026-06-01T08:45:00.000Z',
      metadata: {
        cashierId: 'user_cashier_002',
        cashierName: 'Bob Jones',
        requestType: '2fa_recovery',
      },
    },
    {
      _id: 'notif_004',
      type: 'system_alert',
      title: 'Shift Opened',
      message: 'Vault shift has been successfully opened.',
      status: 'read',
      urgent: false,
      createdAt: '2026-05-31T08:05:00.000Z',
      metadata: {},
    },
  ],
};

async function mockVaultNotificationsAPIs(page: Page, notificationsResponse: Record<string, unknown> = MOCK_NOTIFICATIONS_RESPONSE as unknown as Record<string, unknown>) {
  // Mock auth APIs
  await page.route('**/api/auth/current-user', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token', (route: Route) =>
    route.fulfill({ status: 200, json: { userId: MOCK_USER_WITH_LOC._id } })
  );
  await page.route('**/api/users/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_USER_WITH_LOC } })
  );

  // Mock location / licencee lookups
  await page.route('**/api/licencees', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: MOCK_LOCATION_1, location: MOCK_LOCATION_1 } })
  );
  await page.route('**/api/locations', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, locations: [MOCK_LOCATION_1] } })
  );

  // Broad vault mock to prevent header crash
  await page.route('**/api/vault/**', (route: Route) => {
    const url = route.request().url();
    if (url.includes('/api/vault/notifications')) {
      return route.fulfill({ status: 200, json: notificationsResponse });
    }
    return route.fulfill({ status: 200, json: { success: true, data: [] } });
  });
}

test.describe('Vault Notifications Page', () => {
  test('1. Page renders heading and unread count subtitle', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);
    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Vault Notifications' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('3 unread alerts', { exact: false })).toBeVisible();
  });

  test('2. All notification titles are visible', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);
    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Float Increase Request - Jane Smith')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Low Vault Balance Warning')).toBeVisible();
    await expect(page.getByText('2FA Reset Requested')).toBeVisible();
    await expect(page.getByText('Shift Opened')).toBeVisible();
  });

  test('3. Mark All Read and Clear All buttons are enabled when unread exists', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);
    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    const markAllReadBtn = page.getByRole('button', { name: /mark all read/i });
    const clearAllBtn = page.getByRole('button', { name: /clear all/i });

    await expect(markAllReadBtn).toBeVisible({ timeout: 10_000 });
    await expect(markAllReadBtn).toBeEnabled();
    await expect(clearAllBtn).toBeVisible();
    await expect(clearAllBtn).toBeEnabled();
  });

  test('4. Reset 2FA button is visible on 2FA recovery request notification', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);
    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    const resetBtn = page.getByRole('button', { name: 'Reset 2FA for Bob Jones' });
    await expect(resetBtn).toBeVisible({ timeout: 10_000 });
  });

  test('5. 2FA reset dialog triggers reset API and displays success toast', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);

    let resetCalled = false;
    await page.route('**/api/auth/totp/reset', route => {
      resetCalled = true;
      return route.fulfill({
        status: 200,
        json: { success: true, message: '2FA reset successfully' },
      });
    });

    // Also mock notifications dismiss/action which gets called afterwards to clear notification
    await page.route('**/api/vault/notifications', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 200, json: { success: true } });
      }
      return route.fulfill({ status: 200, json: MOCK_NOTIFICATIONS_RESPONSE });
    });

    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept());

    await page.getByRole('button', { name: 'Reset 2FA for Bob Jones' }).click();

    await expect(page.getByText('2FA reset successfully', { exact: false }).first()).toBeVisible({ timeout: 10_000 });
    expect(resetCalled).toBe(true);
  });

  test('6. Mark All Read calls notifications action API', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);

    let actionCalled = false;
    await page.route('**/api/vault/notifications', route => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        if (body.action === 'mark_read') {
          actionCalled = true;
        }
        return route.fulfill({ status: 200, json: { success: true } });
      }
      return route.fulfill({ status: 200, json: MOCK_NOTIFICATIONS_RESPONSE });
    });

    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /mark all read/i }).click();

    expect(actionCalled).toBe(true);
  });

  test('7. Empty state renders No Alerts when response notifications list is empty', async ({ page }) => {
    await mockVaultNotificationsAPIs(page, {
      success: true,
      unreadCount: 0,
      pendingFloatRequests: 0,
      pendingShiftReviews: 0,
      notifications: [],
    });

    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No Alerts')).toBeVisible({ timeout: 10_000 });
  });

  test('8. Read notification has muted status styling', async ({ page }) => {
    await mockVaultNotificationsAPIs(page);
    await page.goto('/vault/notifications');
    await page.waitForLoadState('networkidle');

    // Read notification is notif_004 ('Shift Opened')
    const notifItem = page.locator('div.group').filter({ hasText: 'Shift Opened' });
    await expect(notifItem).toBeVisible({ timeout: 10_000 });
    await expect(notifItem).toHaveClass(/opacity-75/);
  });
});
