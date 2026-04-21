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
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for vault notifications
 *
 * @param {string} locationId - REQUIRED. Fetch notifications for specific gaming location.
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'Missing locationId' },
          { status: 400 }
        );

      const [notifications, counts] = await Promise.all([
        getRecentNotifications(userPayload._id as string, locationId),
        getNotificationCounts(userPayload._id as string, locationId),
      ]);

      return NextResponse.json({ success: true, notifications, ...counts });
    } catch (error: unknown) {
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
  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      const body = await request.json();
      const { action, notificationIds } = body;

      if (!action || !notificationIds || !Array.isArray(notificationIds)) {
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
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true });
    } catch (error: unknown) {
      console.error('Error processing notification action:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
