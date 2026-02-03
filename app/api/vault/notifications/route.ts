/**
 * Vault Notifications API
 *
 * GET /api/vault/notifications
 * - Fetch unread notifications for the logged-in Vault Manager.
 *
 * POST /api/vault/notifications
 * - Mark notifications as read or dismiss them.
 *
 * @module app/api/vault/notifications/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
    dismissNotifications,
    getNotificationCounts,
    getRecentNotifications,
    markNotificationsAsRead
} from '@/lib/helpers/vault/notifications';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Missing locationId' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Fetch notifications
    // ============================================================================
    await connectDB();

    const [notifications, counts] = await Promise.all([
      getRecentNotifications(userPayload._id as string, locationId),
      getNotificationCounts(userPayload._id as string, locationId),
    ]);

    console.log(`[Notifications API] Fetched ${notifications.length} notifications for user ${userPayload._id} at location ${locationId}`);

    return NextResponse.json({
      success: true,
      notifications,
      ...counts,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // ============================================================================
    // STEP 1: Authentication
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 2: Parse request
    // ============================================================================
    const body = await request.json();
    const { action, notificationIds } = body;

    if (!action || !notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: action, notificationIds' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Process action
    // ============================================================================
    await connectDB();

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
  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
