/**
 * Vault Notifications API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  dismissNotifications,
  getNotificationCounts,
  getRecentNotifications,
  markNotificationsAsRead,
} from '@/lib/helpers/vault/notifications';
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for vault notifications
 *
 * @param {string} locationId - REQUIRED. Fetch notifications for specific gaming location.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/notifications';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId) {
        logRouteError(
          functionName,
          'GET',
          '/api/vault/notifications',
          'Missing locationId',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing locationId' },
          { status: 400 }
        );
      }

      const [notifications, counts] = await Promise.all([
        getRecentNotifications(userPayload._id as string, locationId),
        getNotificationCounts(userPayload._id as string, locationId),
      ]);

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/notifications',
        notifications.length,
        user,
        duration
      );

      return NextResponse.json({ success: true, notifications, ...counts });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch notifications';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/notifications',
        errorMessage,
        user
      );
      console.error('Error fetching notifications:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/notifications';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      const body = await request.json();
      const { action, notificationIds } = body;

      if (!action || !notificationIds || !Array.isArray(notificationIds)) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/notifications',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      if (action === 'mark_read') {
        await markNotificationsAsRead(notificationIds);
      } else if (action === 'dismiss') {
        await dismissNotifications(notificationIds, userPayload._id as string);
      } else {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/notifications',
          'Invalid action',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/vault/notifications',
        notificationIds.length,
        user,
        duration
      );

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to process notification action';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/notifications',
        errorMessage,
        user
      );
      console.error('Error processing notification action:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
