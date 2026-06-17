/**
 * Vault Float Request Operations
 *
 * Shared helper functions for float request CRUD operations.
 * Supports listing, creating, and cancelling float requests.
 *
 * @module app/api/lib/helpers/vault/floatRequestOperations
 */

import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultNotificationModel from '@/app/api/lib/models/vaultNotification';
import { generateMongoId } from '@/lib/utils/id';
import type { FloatRequestDocument, VaultShiftDocument } from '@shared/types';
import type { PipelineStage } from 'mongoose';

// ============================================================================
// Query Building
// ============================================================================

/**
 * Build a MongoDB query from float request filter parameters.
 * @param params - Query filter parameters
 * @returns MongoDB query object
 */
export function buildFloatRequestQuery(params: {
  locationId?: string | null;
  cashierId?: string | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
}): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  const { locationId, cashierId, status, startDate, endDate } = params;

  if (locationId) query.locationId = locationId;
  if (cashierId) query.cashierId = cashierId;
  if (status && status !== 'all') query.status = status;

  if (startDate || endDate) {
    query.requestedAt = {};
    if (startDate) {
      (query.requestedAt as Record<string, unknown>).$gte = new Date(startDate);
    }
    if (endDate) {
      (query.requestedAt as Record<string, unknown>).$lte = new Date(endDate);
    }
  }

  return query;
}

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Fetch float requests with user details (cashier + processed-by) via aggregation.
 * @param query - MongoDB query object
 * @param page - Page number
 * @param limit - Results per page
 * @param skip - Number of docs to skip
 * @returns Float requests array and total count
 */
export async function fetchFloatRequestsWithDetails(
  query: Record<string, unknown>,
  page: number,
  limit: number,
  skip: number
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const pipeline: PipelineStage[] = [
    { $match: query },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    {
      $addFields: {
        cashierIdStr: {
          $ifNull: [{ $toString: '$cashierId' }, '$cashierId'],
        },
        processedByStr: {
          $ifNull: [{ $toString: '$processedBy' }, '$processedBy'],
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'cashierIdStr',
        foreignField: '_id',
        as: 'cashierDetails',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'processedByStr',
        foreignField: '_id',
        as: 'processedByDetails',
      },
    },
    {
      $addFields: {
        cashierName: {
          $let: {
            vars: { user: { $arrayElemAt: ['$cashierDetails', 0] } },
            in: {
              $cond: {
                if: { $ne: ['$$user', null] },
                then: {
                  $let: {
                    vars: {
                      fullName: {
                        $trim: {
                          input: {
                            $concat: [
                              { $ifNull: ['$$user.profile.firstName', ''] },
                              ' ',
                              { $ifNull: ['$$user.profile.lastName', ''] },
                            ],
                          },
                        },
                      },
                    },
                    in: {
                      $cond: {
                        if: {
                          $and: [
                            { $ne: ['$$fullName', null] },
                            { $ne: ['$$fullName', ''] },
                            { $ne: ['$$fullName', ' '] },
                          ],
                        },
                        then: {
                          $concat: [
                            { $ifNull: ['$$user.username', 'Cashier'] },
                            ' (',
                            '$$fullName',
                            ')',
                          ],
                        },
                        else: {
                          $ifNull: ['$$user.username', '$cashierId'],
                        },
                      },
                    },
                  },
                },
                else: '$cashierId',
              },
            },
          },
        },
        processedByName: {
          $let: {
            vars: { user: { $arrayElemAt: ['$processedByDetails', 0] } },
            in: {
              $cond: {
                if: { $ne: ['$$user', null] },
                then: {
                  $let: {
                    vars: {
                      fullName: {
                        $trim: {
                          input: {
                            $concat: [
                              { $ifNull: ['$$user.profile.firstName', ''] },
                              ' ',
                              { $ifNull: ['$$user.profile.lastName', ''] },
                            ],
                          },
                        },
                      },
                    },
                    in: {
                      $cond: {
                        if: {
                          $and: [
                            { $ne: ['$$fullName', null] },
                            { $ne: ['$$fullName', ''] },
                          ],
                        },
                        then: '$$fullName',
                        else: {
                          $ifNull: ['$$user.username', '$processedBy'],
                        },
                      },
                    },
                  },
                },
                else: '$processedBy',
              },
            },
          },
        },
      },
    },
    {
      $project: {
        cashierDetails: 0,
        processedByDetails: 0,
        cashierIdStr: 0,
        processedByStr: 0,
      },
    },
  ];

  const [data, total] = await Promise.all([
    FloatRequestModel.aggregate(pipeline).exec(),
    FloatRequestModel.countDocuments(query),
  ]);

  return { data, total };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate required fields for creating a float request.
 * @param body - Parsed request body
 * @returns Error response object or null if valid
 */
export type FloatRequestBody = {
  type: string;
  amount: number;
  denominations?: unknown[];
  reason?: string;
  locationId: string;
  cashierShiftId: string;
};

export function validateFloatRequestBody(body: FloatRequestBody): {
  valid: boolean;
  error?: string;
  status?: number;
} {
  const { type, amount, locationId, cashierShiftId } = body;

  if (!type || !amount || !locationId || !cashierShiftId) {
    return { valid: false, error: 'Missing required fields', status: 400 };
  }

  return { valid: true };
}

// ============================================================================
// Vault Shift
// ============================================================================

/**
 * Get the active vault shift for a location.
 * @param locationId - Location ID
 * @returns Active vault shift document or null
 */
export async function getActiveVaultShift(
  locationId: string
): Promise<VaultShiftDocument | null> {
  return await VaultShiftModel.findOne({
    locationId,
    status: 'active',
  }).lean<VaultShiftDocument | null>();
}

// ============================================================================
// Creation
// ============================================================================

/**
 * Create a float request document.
 * @param params - Creation parameters
 * @returns Created float request document
 */
export async function createFloatRequestRecord(params: {
  locationId: string;
  cashierId: string;
  cashierShiftId: string;
  vaultShiftId: string;
  type: string;
  amount: number;
  denominations: unknown[];
  reason?: string;
}): Promise<FloatRequestDocument> {
  const requestId = await generateMongoId();
  const now = new Date();

  const floatRequest = await FloatRequestModel.create({
    _id: requestId,
    locationId: params.locationId,
    cashierId: params.cashierId,
    cashierShiftId: params.cashierShiftId,
    vaultShiftId: params.vaultShiftId,
    type: params.type,
    requestedAmount: params.amount,
    requestedDenominations: params.denominations,
    requestNotes: params.reason,
    requestedAt: now,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    auditLog: [
      {
        action: 'created',
        performedBy: params.cashierId,
        timestamp: now,
        notes: params.reason,
      },
    ],
  });

  return floatRequest.toObject() as FloatRequestDocument;
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Send a notification for a newly created float request.
 * @param floatRequest - Created float request object
 * @param username - Cashier username
 * @param vaultManagerId - Target vault manager ID
 */
export async function sendFloatRequestNotification(
  floatRequest: FloatRequestDocument,
  username: string,
  vaultManagerId: string
): Promise<void> {
  try {
    const { createFloatRequestNotification } = await import(
      '@/lib/helpers/vault/notifications'
    );
    await createFloatRequestNotification(
      floatRequest as Parameters<typeof createFloatRequestNotification>[0],
      username,
      vaultManagerId
    );
  } catch (e) {
    console.error(
      '[sendFloatRequestNotification] Notification failed:',
      e instanceof Error ? e.message : 'Unknown error'
    );
  }
}

/**
 * Delete all vault notifications related to a float request.
 * @param requestId - Float request ID
 */
export async function cleanupFloatRequestNotifications(
  requestId: string
): Promise<void> {
  try {
    const notifDeleteResult = await VaultNotificationModel.deleteMany({
      relatedEntityId: requestId,
      relatedEntityType: 'float_request',
    });
    if (notifDeleteResult.deletedCount === 0) {
      console.warn(
        `[cleanupFloatRequestNotifications] No notifications found for requestId: ${requestId}`
      );
    }
  } catch (e) {
    console.error(
      '[cleanupFloatRequestNotifications] Notification cleanup failed:',
      e instanceof Error ? e.message : 'Unknown error'
    );
  }
}

// ============================================================================
// Cancellation
// ============================================================================

/**
 * Validate that a float request can be cancelled by the requesting user.
 * @param requestDoc - Float request document
 * @param userId - Current user ID
 * @param userRoles - Current user roles
 * @returns Validation result
 */
export function validateCancellationPermissions(
  requestDoc: FloatRequestDocument,
  userId: string,
  userRoles: string[]
): { valid: boolean; error?: string; status?: number } {
  const isVM = userRoles.some(role =>
    ['admin', 'manager', 'vault-manager'].includes(String(role).toLowerCase())
  );

  if (String(requestDoc.cashierId) !== userId && !isVM) {
    return { valid: false, error: 'Unauthorized', status: 403 };
  }

  const allowedStatuses = ['pending', 'approved_vm'];
  if (!allowedStatuses.includes(String(requestDoc.status))) {
    return {
      valid: false,
      error: `Cannot cancel ${String(requestDoc.status)} requests`,
      status: 400,
    };
  }

  return { valid: true };
}

/**
 * Update float request status to cancelled and add audit log entry.
 * @param requestDoc - Float request document to cancel (Mongoose doc with .save())
 */
export async function cancelFloatRequestDocument(
  requestDoc: FloatRequestDocument & { save: () => Promise<unknown> },
  userId: string
): Promise<void> {
  requestDoc.status = 'cancelled';
  requestDoc.auditLog?.push({
    action: 'cancelled',
    performedBy: userId,
    timestamp: new Date(),
    notes: '',
  });
  await requestDoc.save();
}
