/**
 * Vault Notification Model
 *
 * Mongoose model for vault management notifications.
 * Tracks all notifications for Vault Managers including float requests,
 * shift reviews, and system alerts.
 *
 * @module app/api/lib/models/vaultNotification
 */

import mongoose, { Model, Schema } from 'mongoose';

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | 'float_request'
  | 'shift_review'
  | 'system_alert'
  | 'low_balance';

export type NotificationStatus = 'unread' | 'read' | 'actioned' | 'dismissed' | 'cancelled';

export type RelatedEntityType =
  | 'float_request'
  | 'cashier_shift'
  | 'vault_shift'
  | 'expense';

export interface IVaultNotification {
  _id: string;
  locationId: string;
  type: NotificationType;

  // Recipient
  recipientId: string;
  recipientRole: string;

  // Content
  title: string;
  message: string;
  urgent: boolean;

  // Related entities
  relatedEntityType: RelatedEntityType;
  relatedEntityId: string;

  // Metadata
  metadata: {
    cashierId?: string;
    cashierName?: string;
    requestedAmount?: number;
    requestType?: 'increase' | 'decrease';
    discrepancyAmount?: number;
    requestedDenominations?: any[];
    [key: string]: any;
  };

  // Status
  status: NotificationStatus;
  readAt?: Date;
  actionedAt?: Date;
  dismissedAt?: Date;
  deletedAt?: Date;
  dismissedByUsers?: string[]; // Array of user IDs who dismissed this

  // Action URL
  actionUrl?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schema
// ============================================================================

const VaultNotificationSchema = new Schema<IVaultNotification>(
  {
    locationId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['float_request', 'shift_review', 'system_alert', 'low_balance'],
      required: true,
      index: true,
    },

    // Recipient
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      required: true,
      default: 'vault-manager',
    },

    // Content
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    urgent: {
      type: Boolean,
      default: false,
    },

    // Related entities
    relatedEntityType: {
      type: String,
      enum: ['float_request', 'cashier_shift', 'vault_shift', 'expense'],
      required: true,
    },
    relatedEntityId: {
      type: String,
      required: true,
      index: true,
    },

    // Metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // Status
    status: {
      type: String,
      enum: ['unread', 'read', 'actioned', 'dismissed', 'cancelled'],
      default: 'unread',
      index: true,
    },
    readAt: {
      type: Date,
    },
    actionedAt: {
      type: Date,
    },
    dismissedAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
    },
    dismissedByUsers: {
      type: [String],
      default: [],
      index: true,
    },

    // Action URL
    actionUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'vaultNotifications',
  }
);

// ============================================================================
// Indexes
// ============================================================================

// Compound index for efficient querying
VaultNotificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
VaultNotificationSchema.index({ locationId: 1, status: 1, createdAt: -1 });
VaultNotificationSchema.index({ relatedEntityId: 1, relatedEntityType: 1 });

// ============================================================================
// Model
// ============================================================================

const VaultNotificationModel: Model<IVaultNotification> =
  mongoose.models.VaultNotification ||
  mongoose.model<IVaultNotification>(
    'VaultNotification',
    VaultNotificationSchema
  );

export default VaultNotificationModel;
