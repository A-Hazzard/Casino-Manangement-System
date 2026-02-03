/**
 * Vault Notification Helper Functions
 *
 * Utilities for creating, managing, and querying vault notifications.
 *
 * @module lib/helpers/vault/notifications
 */

import VaultNotificationModel, {
  type IVaultNotification,
  type NotificationStatus,
  type NotificationType,
} from '@/app/api/lib/models/vaultNotification';
import type { FloatRequest } from '@/shared/types/vault';

// ============================================================================
// Notification Creation
// ============================================================================

/**
 * Create a notification for a float request
 */
export async function createFloatRequestNotification(
  floatRequest: FloatRequest,
  cashierName: string,
  vaultManagerId: string
): Promise<IVaultNotification> {
  const notification = await VaultNotificationModel.create({
    locationId: floatRequest.locationId,
    type: 'float_request' as NotificationType,
    recipientId: vaultManagerId,
    recipientRole: 'vault-manager',
    title: `Float Request from ${cashierName}`,
    message: `${cashierName} has requested a ${floatRequest.type} of TT$${floatRequest.requestedAmount.toFixed(2)}`,
    urgent: floatRequest.requestedAmount > 5000, // Mark large requests as urgent
    relatedEntityType: 'float_request',
    relatedEntityId: floatRequest._id,
    metadata: {
      cashierId: floatRequest.cashierId,
      cashierName,
      requestedAmount: floatRequest.requestedAmount,
      requestType: floatRequest.type,
      requestedDenominations: floatRequest.requestedDenominations,
    },
    status: 'unread',
    actionUrl: `/vault/management?floatRequestId=${floatRequest._id}`,
  });

  return notification;
}

/**
 * Create a notification for a shift review
 */
export async function createShiftReviewNotification(
  cashierShiftId: string,
  locationId: string,
  cashierName: string,
  cashierId: string,
  discrepancyAmount: number,
  vaultManagerId: string
): Promise<IVaultNotification> {
  const notification = await VaultNotificationModel.create({
    locationId,
    type: 'shift_review' as NotificationType,
    recipientId: vaultManagerId,
    recipientRole: 'vault-manager',
    title: `Shift Review Required - ${cashierName}`,
    message: `${cashierName}'s shift has a discrepancy and requires review`,
    urgent: Math.abs(discrepancyAmount) > 100, // Mark large discrepancies as urgent
    relatedEntityType: 'cashier_shift',
    relatedEntityId: cashierShiftId,
    metadata: {
      cashierId,
      cashierName,
      discrepancyAmount,
    },
    status: 'unread',
    actionUrl: `/vault/management/shift-review/${cashierShiftId}`,
  });

  return notification;
}

/**
 * Create a system alert notification
 */
export async function createSystemAlertNotification(
  locationId: string,
  vaultManagerId: string,
  title: string,
  message: string,
  urgent: boolean = false,
  metadata?: Record<string, any>
): Promise<IVaultNotification> {
  const notification = await VaultNotificationModel.create({
    locationId,
    type: 'system_alert' as NotificationType,
    recipientId: vaultManagerId,
    recipientRole: 'vault-manager',
    title,
    message,
    urgent,
    relatedEntityType: 'vault_shift',
    relatedEntityId: 'system',
    metadata: metadata || {},
    status: 'unread',
  });

  return notification;
}

/**
 * Create a low balance warning notification
 */
export async function createLowBalanceNotification(
  locationId: string,
  vaultManagerId: string,
  currentBalance: number,
  threshold: number
): Promise<IVaultNotification> {
  const notification = await VaultNotificationModel.create({
    locationId,
    type: 'low_balance' as NotificationType,
    recipientId: vaultManagerId,
    recipientRole: 'vault-manager',
    title: 'Low Vault Balance Warning',
    message: `Vault balance (TT$${currentBalance.toFixed(2)}) is below threshold (TT$${threshold.toFixed(2)})`,
    urgent: true,
    relatedEntityType: 'vault_shift',
    relatedEntityId: 'system',
    metadata: {
      currentBalance,
      threshold,
    },
    status: 'unread',
    actionUrl: '/vault/management',
  });

  return notification;
}

// ============================================================================
// Notification Status Management
// ============================================================================

/**
 * Mark notification(s) as read
 */
export async function markNotificationsAsRead(
  notificationIds: string[]
): Promise<void> {
  await VaultNotificationModel.updateMany(
    { _id: { $in: notificationIds }, status: 'unread' },
    {
      $set: {
        status: 'read' as NotificationStatus,
        readAt: new Date(),
      },
    }
  );
}

/**
 * Mark notification as actioned (when user takes action on the related entity)
 */
export async function markNotificationAsActioned(
  notificationId: string
): Promise<void> {
  await VaultNotificationModel.updateOne(
    { _id: notificationId },
    {
      $set: {
        status: 'actioned' as NotificationStatus,
        actionedAt: new Date(),
      },
    }
  );
}

/**
 * Mark notification as actioned by related entity ID
 */
export async function markNotificationAsActionedByEntity(
  relatedEntityId: string,
  relatedEntityType: string
): Promise<void> {
  await VaultNotificationModel.updateMany(
    { relatedEntityId, relatedEntityType },
    {
      $set: {
        status: 'actioned' as NotificationStatus,
        actionedAt: new Date(),
      },
    }
  );
}

/**
 * Mark notification as cancelled by related entity ID
 */
export async function markNotificationAsCancelledByEntity(
  relatedEntityId: string,
  relatedEntityType: string
): Promise<void> {
  await VaultNotificationModel.updateMany(
    { relatedEntityId, relatedEntityType },
    {
      $set: {
        status: 'cancelled' as NotificationStatus,
        actionedAt: new Date(),
      },
    }
  );
}

/**
 * Dismiss notification(s)
 */
/**
 * Dismiss notification(s) for a specific user
 */
export async function dismissNotifications(
  notificationIds: string[],
  userId?: string
): Promise<void> {
  const update: any = {
    $set: {
      deletedAt: new Date(),
    },
  };
  
  if (userId) {
    update.$addToSet = { dismissedByUsers: userId };
  } else {
    // Fallback for system updates: mark as globally dismissed
    update.$set.status = 'dismissed' as NotificationStatus;
    update.$set.dismissedAt = new Date();
  }

  await VaultNotificationModel.updateMany(
    { _id: { $in: notificationIds } },
    update
  );
}

// ============================================================================
// Notification Queries
// ============================================================================

/**
 * Fetch recent notifications for a user (excluding dismissed)
 */
export async function getRecentNotifications(
  userId: string,
  locationId: string,
  limit: number = 50
): Promise<IVaultNotification[]> {
  const notifications = await VaultNotificationModel.find({
    $or: [
      { recipientId: userId },
      { recipientRole: 'vault-manager' }
    ],
    locationId,
    status: { $ne: 'dismissed' },
    dismissedByUsers: { $ne: userId }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return notifications;
}

/**
 * Fetch all notifications for a user with optional status filter
 */
export async function getNotifications(
  userId: string,
  locationId: string,
  status?: NotificationStatus,
  limit: number = 50
): Promise<IVaultNotification[]> {
  const query: any = {
    $or: [
      { recipientId: userId },
      { recipientRole: 'vault-manager' }
    ],
    locationId,
    dismissedByUsers: { $ne: userId }
  };

  if (status) {
    query.status = status;
  }

  const notifications = await VaultNotificationModel.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return notifications;
}

/**
 * Get notification counts by type and status
 */
export async function getNotificationCounts(
  userId: string,
  locationId: string
): Promise<{
  unreadCount: number;
  pendingFloatRequests: number;
  pendingShiftReviews: number;
}> {
  const baseQuery = {
    $or: [
      { recipientId: userId },
      { recipientRole: 'vault-manager' }
    ],
    locationId,
    status: 'unread',
    dismissedByUsers: { $ne: userId }
  };

  const [unreadCount, floatRequestCount, shiftReviewCount] = await Promise.all([
    VaultNotificationModel.countDocuments(baseQuery),
    VaultNotificationModel.countDocuments({
      ...baseQuery,
      type: 'float_request',
    }),
    VaultNotificationModel.countDocuments({
      ...baseQuery,
      type: 'shift_review',
    }),
  ]);

  return {
    unreadCount,
    pendingFloatRequests: floatRequestCount,
    pendingShiftReviews: shiftReviewCount,
  };
}

/**
 * Clean up old notifications (for maintenance)
 */
export async function cleanupOldNotifications(
  retentionDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await VaultNotificationModel.deleteMany({
    status: { $in: ['actioned', 'dismissed'] },
    updatedAt: { $lt: cutoffDate },
  });

  return result.deletedCount || 0;
}
