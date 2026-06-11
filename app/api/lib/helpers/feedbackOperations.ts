/**
 * Feedback Operations Helpers
 *
 * Business logic for the feedback API route: authentication checks,
 * query building, update data construction, activity logging, and
 * location/licencee name resolution.
 *
 * @module app/api/lib/helpers/feedbackOperations
 */

import { calculateChanges } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { GamingLocations as GamingLocationsModel } from '@/app/api/lib/models/gaminglocations';
import { Licencee as LicenceeModel } from '@/app/api/lib/models/licencee';
import { logRouteError } from '@/app/api/lib/utils/routeLogger';
import { generateMongoId } from '@/lib/utils/id';
import { formatIPForDisplay, getIPInfo } from '@/lib/utils/ipAddress';
import { FeedbackModel } from '@/app/api/lib/models/feedback';
import type {
  FeedbackDocument,
  GamingLocationDocument,
  LicenceeDocument,
} from '@shared/types';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// ============================================================================
// Types
// ============================================================================

export type UserPayload = {
  _id?: string | number;
  username?: string;
  emailAddress?: string;
  roles?: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
  };
};

type AdminAuthResult = {
  currentUser: UserPayload;
  userRoles: string[];
};

export type LogContextUser = {
  _id: string;
  username?: string;
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
};

type FeedbackQueryParams = {
  emailFilter: string;
  categoryFilter: string;
  statusFilter: string;
};

type PatchUpdateInput = {
  archived?: boolean;
  status?: string;
  notes?: string;
};

type PutUpdateInput = {
  status?: string;
  archived?: boolean | null;
  notes?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | Date | null;
};

type ActivityAction = 'create' | 'update' | 'delete';

type FeedbackActivityParams = {
  request: NextRequest;
  action: ActivityAction;
  feedbackId: string;
  currentUser: UserPayload;
  userRoles: string[];
  existingFeedback?: FeedbackDocument | null;
  updateData?: Record<string, unknown>;
  resourceName?: string;
  details?: string;
  newData?: Record<string, unknown> | null;
};

// ============================================================================
// Zod Schemas
// ============================================================================

export const feedbackSchema = z.object({
  email: z.string().email('Please provide a valid email address').optional(),
  username: z.string().optional(),
  userId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  locationId: z.string().optional(),
  licenceeId: z.string().optional(),
  category: z.enum([
    'bug',
    'suggestion',
    'general-review',
    'feature-request',
    'performance',
    'ui-ux',
    'other',
  ]),
  description: z
    .string()
    .min(10, 'Feedback description must be at least 10 characters')
    .max(5000, 'Feedback description cannot exceed 5000 characters'),
});

export const updateFeedbackSchema = z.object({
  _id: z.string(),
  status: z.enum(['pending', 'reviewed', 'resolved']).optional(),
  archived: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  reviewedBy: z.string().optional().nullable(),
  reviewedAt: z.union([z.string(), z.date()]).optional().nullable(),
});

export const deleteFeedbackSchema = z.object({
  _id: z.string(),
});

// ============================================================================
// Authentication
// ============================================================================

/**
 * Authenticates the current user and verifies admin-level access.
 *
 * @param {string} method - HTTP method for logging (GET, PATCH, PUT, DELETE)
 * @param {string} functionName - Route function name for logging
 * @param {LogContextUser | null | undefined} logUser - Extracted user context for logging
 * @param {boolean} [includeOwner=true] - Whether 'owner' role grants access
 * @returns {Promise<AdminAuthResult | NextResponse>} Auth result or error response
 */
export async function authenticateAdminUser(
  method: string,
  functionName: string,
  logUser: LogContextUser | null | undefined,
  includeOwner: boolean = true
): Promise<AdminAuthResult | NextResponse> {
  const currentUser = (await getUserFromServer()) as UserPayload | null;

  if (!currentUser) {
    logRouteError(functionName, method, '/api/feedback', 'Unauthorized', logUser);
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userRoles = (currentUser.roles as string[]) || [];
  const adminRoles = ['admin', 'developer'];
  if (includeOwner) adminRoles.push('owner');

  const isAdmin = adminRoles.some(role => userRoles.includes(role));

  if (!isAdmin) {
    logRouteError(
      functionName,
      method,
      '/api/feedback',
      'Forbidden: Admin access required',
      logUser
    );
    return NextResponse.json(
      { success: false, error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  return { currentUser, userRoles };
}

// ============================================================================
// Query Building
// ============================================================================

/**
 * Builds a MongoDB query object for filtering feedback documents.
 *
 * @param {FeedbackQueryParams} params - Filter parameters from query string
 * @returns {Record<string, unknown>} MongoDB query object
 */
export function buildFeedbackQuery(params: FeedbackQueryParams): Record<string, unknown> {
  const { emailFilter, categoryFilter, statusFilter } = params;
  const query: Record<string, unknown> = {};

  if (emailFilter) {
    const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(emailFilter.trim());
    if (isObjectIdFormat) {
      query.$or = [
        { _id: emailFilter.trim() },
        { email: { $regex: emailFilter, $options: 'i' } },
      ];
    } else {
      query.email = { $regex: emailFilter, $options: 'i' };
    }
  }

  if (categoryFilter) {
    query.category = categoryFilter;
  }

  if (statusFilter && statusFilter !== 'archived') {
    query.status = statusFilter;
  }

  if (statusFilter === 'archived') {
    query.archived = true;
    delete query.status;
  } else {
    query.archived = { $ne: true };
  }

  return query;
}

// ============================================================================
// Update Data Builders
// ============================================================================

/**
 * Builds the update data object for a PATCH request (partial updates).
 *
 * @param {PatchUpdateInput} body - Parsed request body fields
 * @param {UserPayload} currentUser - Authenticated user for reviewer auto-fill
 * @returns {Record<string, unknown>} Update fields to apply
 */
export function buildPatchUpdateData(
  body: PatchUpdateInput,
  currentUser: UserPayload
): Record<string, unknown> {
  const { archived, status, notes } = body;
  const updateData: Record<string, unknown> = {};

  if (archived !== undefined) {
    updateData.archived = Boolean(archived);
  }

  if (status !== undefined) {
    updateData.status = status;
    if (status === 'reviewed' || status === 'resolved') {
      const reviewerName =
        currentUser.username ||
        currentUser.emailAddress ||
        currentUser._id?.toString() ||
        'unknown';
      updateData.reviewedBy = reviewerName;
      updateData.reviewedAt = new Date();
    }
  }

  if (notes !== undefined) {
    updateData.notes = notes;
  }

  return updateData;
}

/**
 * Builds the update data object for a PUT request (full update).
 *
 * @param {PutUpdateInput} validatedData - Zod-validated request body
 * @param {UserPayload} currentUser - Authenticated user for reviewer auto-fill
 * @returns {Record<string, unknown>} Update fields to apply
 */
export function buildPutUpdateData(
  validatedData: PutUpdateInput,
  currentUser: UserPayload
): Record<string, unknown> {
  const { status, archived, notes, reviewedBy, reviewedAt } = validatedData;
  const updateData: Record<string, unknown> = {};

  if (status !== undefined) {
    updateData.status = status;
    if (status === 'reviewed' || status === 'resolved') {
      const reviewerName =
        currentUser.username ||
        currentUser.emailAddress ||
        currentUser._id?.toString() ||
        'unknown';
      updateData.reviewedBy = reviewerName;
      updateData.reviewedAt = new Date();
    }
  }

  if (archived !== undefined && archived !== null) {
    updateData.archived = Boolean(archived);
  }

  if (notes !== undefined) updateData.notes = notes;
  if (reviewedBy !== undefined) updateData.reviewedBy = reviewedBy || null;

  if (reviewedAt !== undefined) {
    updateData.reviewedAt = reviewedAt
      ? typeof reviewedAt === 'string'
        ? new Date(reviewedAt)
        : reviewedAt
      : null;
  }

  return updateData;
}

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * Logs a feedback-related activity entry (create, update, or delete).
 *
 * @param {FeedbackActivityParams} params - Activity log parameters
 * @returns {Promise<void>}
 */
export async function logFeedbackActivity(
  params: FeedbackActivityParams
): Promise<void> {
  const {
    request,
    action,
    feedbackId,
    currentUser,
    userRoles,
    existingFeedback,
    updateData,
    resourceName,
    details,
    newData,
  } = params;

  try {
    const ipInfo = getIPInfo(request);
    const formattedIP = formatIPForDisplay(ipInfo);
    const activityLogId = await generateMongoId();

    const userId = currentUser._id?.toString() || 'unknown';
    const username =
      currentUser.username || currentUser.emailAddress || 'unknown';
    const profile = currentUser.profile;
    const userDisplayName =
      profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : username;

    let changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

    if (action === 'update' && existingFeedback && updateData) {
      changes = calculateChanges(
        existingFeedback as Record<string, unknown>,
        updateData
      );
    }

    const resolvedDetails =
      details ?? buildDefaultDetails(action, existingFeedback, updateData, changes);

    const resolvedResourceName =
      resourceName ?? buildDefaultResourceName(action, existingFeedback);

    const activityLog = new ActivityLog({
      _id: activityLogId,
      timestamp: new Date(),
      userId,
      username: userDisplayName,
      action,
      resource: 'feedback',
      resourceId: feedbackId,
      resourceName: resolvedResourceName,
      details: resolvedDetails,
      actor: {
        id: userId,
        email: username,
        role: userRoles[0] || 'admin',
      },
      ipAddress: formattedIP,
      userAgent: ipInfo.userAgent,
      previousData: action === 'delete' ? existingFeedback : existingFeedback || null,
      newData: newData ?? updateData ?? null,
      changes,
    });

    await activityLog.save();
  } catch (logError) {
    console.error(
      `[logFeedbackActivity] Error logging feedback ${action} activity:`,
      logError instanceof Error ? logError.message : 'Unknown error'
    );
  }
}

/**
 * Builds a default details string for activity logging.
 *
 * @param {ActivityAction} action - The activity action type
 * @param {FeedbackDocument | null | undefined} existingFeedback - Pre-update document
 * @param {Record<string, unknown> | undefined} updateData - Applied update fields
 * @param {Array<{ field: string; oldValue: unknown; newValue: unknown }>} changes - Computed changes
 * @returns {string} Human-readable details string
 */
function buildDefaultDetails(
  action: ActivityAction,
  existingFeedback: FeedbackDocument | null | undefined,
  updateData: Record<string, unknown> | undefined,
  changes: Array<{ field: string; oldValue: unknown; newValue: unknown }>
): string {
  if (action === 'delete' && existingFeedback) {
    const feedbackCategory = existingFeedback.category || 'unknown';
    const feedbackDescription = existingFeedback.description || '';
    const descriptionPreview =
      feedbackDescription.substring(0, 100) +
      (feedbackDescription.length > 100 ? '...' : '');
    return `Admin deleted feedback: ${feedbackCategory} - ${descriptionPreview}`;
  }

  if (action === 'update' && updateData) {
    if (changes.length > 0) {
      const changesSummary = changes
        .map(
          change =>
            `${change.field}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`
        )
        .join(', ');
      return `Admin updated feedback: ${changesSummary}`;
    }
    return `Admin updated feedback (PATCH): ${JSON.stringify(updateData)}`;
  }

  return `Admin ${action}d feedback`;
}

/**
 * Builds a default resource name for activity logging.
 *
 * @param {ActivityAction} action - The activity action type
 * @param {FeedbackDocument | null | undefined} existingFeedback - The feedback document
 * @returns {string} Resource name string
 */
function buildDefaultResourceName(
  action: ActivityAction,
  existingFeedback: FeedbackDocument | null | undefined
): string {
  if (action === 'delete' && existingFeedback) {
    return `Feedback from ${existingFeedback.email || 'unknown'}`;
  }
  if (action === 'update') {
    return 'Feedback update';
  }
  return 'Feedback';
}

// ============================================================================
// Location & Licencee Resolution
// ============================================================================

/**
 * Resolves location and licencee names from their IDs.
 *
 * @param {string | undefined} locationId - Location document ID
 * @param {string | undefined} licenceeId - Licencee document ID
 * @returns {Promise<{ resolvedLocationName: string | null; resolvedLicenceeName: string | null }>}
 */
export async function resolveLocationAndLicenceeNames(
  locationId: string | undefined,
  licenceeId: string | undefined
): Promise<{
  resolvedLocationName: string | null;
  resolvedLicenceeName: string | null;
}> {
  let resolvedLocationName: string | null = null;
  let resolvedLicenceeName: string | null = null;

  if (locationId) {
    try {
      const location = await GamingLocationsModel.findOne({ _id: locationId })
        .select('name')
        .lean<GamingLocationDocument>();
      resolvedLocationName = location?.name || null;
    } catch {
      /* ignore lookup errors */
    }
  }

  if (licenceeId) {
    try {
      const licencee = await LicenceeModel.findOne({ _id: licenceeId })
        .select('name')
        .lean<LicenceeDocument>();
      resolvedLicenceeName = licencee?.name || null;
    } catch {
      /* ignore lookup errors */
    }
  }

  return { resolvedLocationName, resolvedLicenceeName };
}

// ============================================================================
// Feedback Document Creation
// ============================================================================

/**
 * Creates and persists a new feedback document with resolved location/licencee names.
 *
 * @param {Object} params - Creation parameters
 * @param {string} params.finalEmail - Submitter email (lowercased)
 * @param {string | null} params.finalUsername - Submitter username
 * @param {string | null} params.finalUserId - Authenticated user ID
 * @param {string | undefined} [params.firstName] - Submitter first name
 * @param {string | undefined} [params.lastName] - Submitter last name
 * @param {string | undefined} [params.locationId] - Location ID for name resolution
 * @param {string | undefined} [params.licenceeId] - Licencee ID for name resolution
 * @param {string} params.category - Feedback category
 * @param {string} params.description - Feedback body text
 * @returns {Promise<{ _id: string; submittedAt: Date }>} Created feedback identity
 */
export async function createFeedbackEntry(params: {
  finalEmail: string;
  finalUsername: string | null;
  finalUserId: string | null;
  firstName?: string;
  lastName?: string;
  locationId?: string;
  licenceeId?: string;
  category: string;
  description: string;
}): Promise<{ _id: string; submittedAt: Date }> {
  const feedbackId =
    new Date().getTime().toString() +
    Math.random().toString(36).substring(2, 9);

  const { resolvedLocationName, resolvedLicenceeName } =
    await resolveLocationAndLicenceeNames(params.locationId, params.licenceeId);

  const feedback = new FeedbackModel({
    _id: feedbackId,
    email: params.finalEmail.toLowerCase().trim(),
    username: params.finalUsername,
    userId: params.finalUserId,
    firstName: params.firstName?.trim() || null,
    lastName: params.lastName?.trim() || null,
    locationId: params.locationId || null,
    locationName: resolvedLocationName,
    licenceeId: params.licenceeId || null,
    licenceeName: resolvedLicenceeName,
    category: params.category,
    description: params.description.trim(),
    submittedAt: new Date(),
    status: 'pending',
    archived: false,
  });

  await feedback.save();

  return { _id: feedback._id, submittedAt: feedback.submittedAt };
}

// ============================================================================
// Activity Logging - Create
// ============================================================================

/**
 * Logs an activity entry for the initial feedback creation (POST) flow.
 * Separate from logFeedbackActivity because the actor is the submitter,
 * not an admin performing an update.
 *
 * @param {Object} params - Activity log parameters
 * @param {NextRequest} params.request - Request object for IP/user-agent
 * @param {{ _id: string; submittedAt: Date }} params.feedback - Created feedback identity
 * @param {string | undefined} params.email - Original email from the submission body
 * @param {string} params.finalEmail - Resolved submitter email
 * @param {string | null} params.finalUsername - Resolved submitter username
 * @param {string | null} params.finalUserId - Resolved submitter user ID
 * @param {UserPayload | null} params.loggedInUser - Authenticated user (if any)
 * @param {string} params.category - Feedback category
 * @param {string} params.description - Feedback body text
 * @param {string} params.functionName - Route function name for error logging
 * @param {LogContextUser | null | undefined} params.logUser - Extracted user context for logging
 * @returns {Promise<void>}
 */
export async function logFeedbackCreateActivity(params: {
  request: NextRequest;
  feedback: { _id: string; submittedAt: Date };
  email: string | undefined;
  finalEmail: string;
  finalUsername: string | null;
  finalUserId: string | null;
  loggedInUser: Record<string, unknown> | null;
  category: string;
  description: string;
  functionName: string;
  logUser: LogContextUser | null | undefined;
}): Promise<void> {
  try {
    const ipInfo = getIPInfo(params.request);
    const formattedIP = formatIPForDisplay(ipInfo);
    const activityLogId = await generateMongoId();

    const newData = {
      _id: params.feedback._id,
      email: params.email,
      category: params.category,
      status: 'pending',
      submittedAt: params.feedback.submittedAt,
    };

    const activityLog = new ActivityLog({
      _id: activityLogId,
      timestamp: new Date(),
      userId: params.finalUserId || `feedback-${params.finalEmail}`,
      username: params.finalUsername || params.finalEmail,
      action: 'create',
      resource: 'feedback',
      resourceId: params.feedback._id,
      resourceName: `Feedback from ${params.finalUsername || params.finalEmail}`,
      details: `User submitted feedback: ${params.category} - ${params.description.substring(0, 100)}${params.description.length > 100 ? '...' : ''}`,
      actor: {
        id: params.finalUserId || `feedback-${params.finalEmail}`,
        email: params.finalEmail,
        role:
          params.loggedInUser &&
          Array.isArray(params.loggedInUser.roles) &&
          params.loggedInUser.roles.length > 0
            ? (params.loggedInUser.roles[0] as string)
            : 'feedback-submitter',
      },
      ipAddress: formattedIP,
      userAgent: ipInfo.userAgent,
      previousData: null,
      newData,
      changes: [],
    });

    await activityLog.save();
  } catch (logError) {
    logRouteError(
      params.functionName,
      'POST',
      '/api/feedback',
      logError instanceof Error
        ? logError
        : 'Error logging feedback creation activity',
      params.logUser
    );
  }
}
