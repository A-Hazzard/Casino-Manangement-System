/**
 * Float Request Helper Functions
 *
 * This file contains helper functions for float request operations.
 * It supports:
 * - Fetching float requests with filtering
 * - Creating float requests
 * - Approving/rejecting requests
 * - Editing decrease requests
 * - Acknowledgment workflow
 *
 * @module app/api/lib/helpers/vault/floatRequests
 */

import { FloatRequest } from '@/app/api/lib/models/floatRequests';
import type {
  CreateFloatRequestRequest,
  DenominationBreakdown,
  FloatRequestDocument,
  FloatRequestQueryParams,
} from '@/app/api/lib/types/vault';

// ============================================================================
// Data Fetching Functions
// ============================================================================

/**
 * Fetch float requests with filtering and pagination
 * @param params - Query parameters
 * @param allowedLocationIds - Array of location IDs user can access, or 'all'
 * @returns Object with float requests array and pagination info
 */
export async function fetchFloatRequests(
  params: FloatRequestQueryParams,
  allowedLocationIds: string[] | 'all'
) {
  const {
    page = 1,
    limit = 20,
    status,
    type,
    cashierId,
    locationId,
    shiftId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  // Build match stage
  const matchStage: Record<string, unknown> = {
    deletedAt: new Date('1969-12-31T23:59:59.999+0000'),
  };

  // Apply location filter
  if (allowedLocationIds !== 'all') {
    if (locationId && allowedLocationIds.includes(locationId)) {
      matchStage.locationId = locationId;
    } else if (!locationId) {
      matchStage.locationId = { $in: allowedLocationIds };
    } else {
      // User doesn't have access to requested location
      return {
        floatRequests: [],
        pagination: {
          page,
          limit,
          totalCount: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  } else if (locationId) {
    matchStage.locationId = locationId;
  }

  // Apply filters
  if (status) {
    matchStage.status = status;
  }

  if (type) {
    matchStage.type = type;
  }

  if (cashierId) {
    matchStage.cashierId = cashierId;
  }

  if (shiftId) {
    matchStage.shiftId = shiftId;
  }

  // Build sort
  const sort: Record<string, 1 | -1> = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Calculate skip
  const skip = (page - 1) * limit;

  // Execute query
  const [floatRequests, totalCount] = await Promise.all([
    FloatRequest.find(matchStage).sort(sort).skip(skip).limit(limit).lean(),
    FloatRequest.countDocuments(matchStage),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    floatRequests: floatRequests as unknown as FloatRequestDocument[],
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Get float request by ID
 * @param id - Float request ID
 * @returns Float request document or null
 */
export async function getFloatRequestById(
  id: string
): Promise<FloatRequestDocument | null> {
  const request = await FloatRequest.findOne({ _id: id }).lean();
  return request as unknown as FloatRequestDocument | null;
}

// ============================================================================
// Calculation Functions
// ============================================================================

/**
 * Calculate total from denomination breakdown
 * @param denom - Denomination breakdown object
 * @returns Calculated total amount
 */
export function calculateDenominationTotal(
  denom: DenominationBreakdown
): number {
  if (!denom || typeof denom !== 'object') {
    return 0;
  }

  return Object.entries(denom).reduce(
    (sum, [value, count]) => sum + Number(value) * Number(count || 0),
    0
  );
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate float request status transition
 * @param currentStatus - Current status
 * @param newStatus - New status
 * @returns Error message if invalid transition, null if valid
 */
export function validateFloatRequestStatusTransition(
  currentStatus: string,
  newStatus: string
): string | null {
  const validTransitions: Record<string, string[]> = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['ACKNOWLEDGED'],
    REJECTED: [],
    CONFIRMED: ['ACKNOWLEDGED'],
    ACKNOWLEDGED: [],
  };

  const allowed = validTransitions[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    return `Invalid status transition from ${currentStatus} to ${newStatus}`;
  }

  return null;
}

/**
 * Check if both parties have acknowledged the float request
 * @param request - Float request document
 * @returns boolean indicating if both parties acknowledged
 */
export function checkDualAcknowledgment(
  request: FloatRequestDocument
): boolean {
  return (
    request.acknowledgedByCashier === true &&
    request.acknowledgedByManager === true
  );
}

// ============================================================================
// Data Creation Functions
// ============================================================================

/**
 * Create float request
 * @param data - Float request data
 * @param cashier - Cashier user object
 * @returns Created float request document
 */
export async function createFloatRequest(
  data: CreateFloatRequestRequest,
  cashier: { _id: string; profile?: { firstName?: string; lastName?: string } }
): Promise<FloatRequestDocument> {
  // Calculate requested total amount
  const requestedTotalAmount = calculateDenominationTotal(data.requestedDenom);

  // Get cashier name
  const cashierName =
    cashier.profile?.firstName && cashier.profile?.lastName
      ? `${cashier.profile.firstName} ${cashier.profile.lastName}`
      : 'Unknown';

  // Create float request
  const requestId = new (
    await import('mongoose')
  ).default.Types.ObjectId().toHexString();

  const floatRequest = await FloatRequest.create({
    _id: requestId,
    type: data.type,
    cashierId: cashier._id,
    cashierName,
    requestedDenom: data.requestedDenom,
    requestedTotalAmount,
    requestedFloatAt: new Date(),
    shiftId: data.shiftId,
    status: 'PENDING',
    totalAmount: requestedTotalAmount,
    locationId: data.locationId,
    approvedDenom: {
      '20': 0,
      '50': 0,
      '100': 0,
      '500': 0,
      '1000': 0,
      '2000': 0,
      '5000': 0,
    },
    approvedTotalAmount: 0,
    acknowledgedByCashier: false,
    acknowledgedByManager: false,
    deletedAt: new Date('1969-12-31T23:59:59.999+0000'),
  });

  return floatRequest.toObject() as FloatRequestDocument;
}

// ============================================================================
// Data Update Functions
// ============================================================================

/**
 * Approve float request with optional denomination edit
 * @param id - Float request ID
 * @param approvedDenom - Approved denomination breakdown (optional, uses requested if not provided)
 * @param manager - Vault manager user object
 * @returns Updated float request document
 */
export async function approveFloatRequest(
  id: string,
  approvedDenom: DenominationBreakdown | undefined,
  manager: { _id: string }
): Promise<FloatRequestDocument | null> {
  const request = await FloatRequest.findOne({ _id: id }).lean();
  if (!request) {
    throw new Error('Float request not found');
  }

  const requestDoc = request as unknown as FloatRequestDocument;

  // Use provided approvedDenom or requestedDenom
  const finalApprovedDenom = approvedDenom || requestDoc.requestedDenom;
  const approvedTotalAmount = calculateDenominationTotal(finalApprovedDenom);

  // Validate status transition
  const transitionError = validateFloatRequestStatusTransition(
    requestDoc.status,
    'APPROVED'
  );
  if (transitionError) {
    throw new Error(transitionError);
  }

  // Update request
  const updated = await FloatRequest.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: 'APPROVED',
        approvedDenom: finalApprovedDenom,
        approvedTotalAmount,
        approvedFloatAt: new Date(),
        approvedBy: manager._id,
        totalAmount: approvedTotalAmount,
        updatedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  return updated as unknown as FloatRequestDocument | null;
}

/**
 * Reject float request
 * @param id - Float request ID
 * @param reason - Rejection reason
 * @param manager - Vault manager user object
 * @returns Updated float request document
 */
export async function rejectFloatRequest(
  id: string,
  reason: string,
  manager: { _id: string }
): Promise<FloatRequestDocument | null> {
  const request = await FloatRequest.findOne({ _id: id }).lean();
  if (!request) {
    throw new Error('Float request not found');
  }

  const requestDoc = request as unknown as FloatRequestDocument;

  // Validate status transition
  const transitionError = validateFloatRequestStatusTransition(
    requestDoc.status,
    'REJECTED'
  );
  if (transitionError) {
    throw new Error(transitionError);
  }

  // Update request
  const updated = await FloatRequest.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        status: 'REJECTED',
        rejectionReason: reason,
        rejectedBy: manager._id,
        updatedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  return updated as unknown as FloatRequestDocument | null;
}

/**
 * Edit float request (only for FLOAT_DECREASE)
 * @param id - Float request ID
 * @param editedDenom - Edited denomination breakdown
 * @returns Updated float request document
 */
export async function editFloatRequest(
  id: string,
  editedDenom: DenominationBreakdown
): Promise<FloatRequestDocument | null> {
  const request = await FloatRequest.findOne({ _id: id }).lean();
  if (!request) {
    throw new Error('Float request not found');
  }

  const requestDoc = request as unknown as FloatRequestDocument;

  // Can only edit FLOAT_DECREASE requests
  if (requestDoc.type !== 'FLOAT_DECREASE') {
    throw new Error('Only FLOAT_DECREASE requests can be edited');
  }

  // Can only edit if status is PENDING
  if (requestDoc.status !== 'PENDING') {
    throw new Error('Can only edit requests with PENDING status');
  }

  // Calculate new totals
  const requestedTotalAmount = calculateDenominationTotal(editedDenom);

  // Update request
  const updated = await FloatRequest.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        requestedDenom: editedDenom,
        requestedTotalAmount,
        totalAmount: requestedTotalAmount,
        updatedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  return updated as unknown as FloatRequestDocument | null;
}

/**
 * Acknowledge float request (cashier or manager)
 * @param id - Float request ID
 * @param userRole - Role of user acknowledging ('cashier' or 'vault-manager')
 * @param user - User object
 * @returns Updated float request document
 */
export async function acknowledgeFloatRequest(
  id: string,
  userRole: 'cashier' | 'vault-manager',
  user: { _id: string }
): Promise<FloatRequestDocument | null> {
  const request = await FloatRequest.findOne({ _id: id }).lean();
  if (!request) {
    throw new Error('Float request not found');
  }

  const requestDoc = request as unknown as FloatRequestDocument;

  // Verify user is the correct party
  if (userRole === 'cashier' && requestDoc.cashierId !== user._id) {
    throw new Error('Only the requesting cashier can acknowledge');
  }

  if (userRole === 'vault-manager' && requestDoc.approvedBy !== user._id) {
    throw new Error('Only the approving manager can acknowledge');
  }

  // Update acknowledgment flags
  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (userRole === 'cashier') {
    update.acknowledgedByCashier = true;
  } else {
    update.acknowledgedByManager = true;
  }

  const updated = await FloatRequest.findOneAndUpdate(
    { _id: id },
    { $set: update },
    { new: true }
  ).lean();

  const updatedDoc = updated as unknown as FloatRequestDocument;

  // Check if both parties have acknowledged
  if (updatedDoc.acknowledgedByCashier && updatedDoc.acknowledgedByManager) {
    // Update status to ACKNOWLEDGED
    const finalUpdated = await FloatRequest.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          status: 'ACKNOWLEDGED',
          acknowledgedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).lean();

    return finalUpdated as unknown as FloatRequestDocument | null;
  }

  return updatedDoc;
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Transform float request for API response
 * @param request - Float request document
 * @returns Transformed float request object
 */
export function transformFloatRequestForResponse(
  request: FloatRequestDocument
): Record<string, unknown> {
  return {
    _id: request._id,
    type: request.type,
    cashierName: request.cashierName,
    cashierId: request.cashierId,
    requestedDenom: request.requestedDenom,
    requestedTotalAmount: request.requestedTotalAmount,
    requestedFloatAt: request.requestedFloatAt,
    shiftId: request.shiftId,
    status: request.status,
    totalAmount: request.totalAmount,
    location: request.location,
    locationId: request.locationId,
    approvedDenom: request.approvedDenom,
    approvedFloatAt: request.approvedFloatAt,
    approvedTotalAmount: request.approvedTotalAmount,
    approvedBy: request.approvedBy,
    rejectedBy: request.rejectedBy,
    rejectionReason: request.rejectionReason,
    acknowledgedByCashier: request.acknowledgedByCashier,
    acknowledgedByManager: request.acknowledgedByManager,
    acknowledgedAt: request.acknowledgedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}
