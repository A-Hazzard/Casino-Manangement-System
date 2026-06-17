/**
 * Feedback API Route
 *
 * Handles feedback submission (POST), admin retrieval (GET), targeted field
 * updates (PATCH), full record updates (PUT), and deletion (DELETE).
 *
 * POST /api/feedback — Submit a feedback entry. No authentication required;
 * authenticated users have their session info merged in automatically.
 *
 * Body fields (POST):
 * @param {string} category - Required. One of: 'bug' | 'suggestion' | 'general-review' |
 *   'feature-request' | 'performance' | 'ui-ux' | 'other'.
 * @param {string} description - Required. Feedback body text; 10–5000 characters.
 * @param {string} [email] - Optional. Submitter email (required if username is absent).
 * @param {string} [username] - Optional. Submitter username (required if email is absent).
 * @param {string} [userId] - Optional. Authenticated user's ID; used to merge session data.
 * @param {string} [firstName] - Optional. Submitter first name.
 * @param {string} [lastName] - Optional. Submitter last name.
 * @param {string} [locationId] - Optional. The location the feedback is associated with.
 * @param {string} [licenceeId] - Optional. The licencee the feedback is associated with.
 *
 * GET /api/feedback — Retrieve paginated feedback list. Admin/developer/owner only.
 *
 * Query parameters (GET):
 * @param {string} [email] - Optional. Filter by submitter email (regex) or exact feedback _id.
 * @param {string} [category] - Optional. Filter by feedback category.
 * @param {string} [status] - Optional. Filter by status ('pending' | 'reviewed' | 'resolved' |
 *   'archived'). Archived items are normally excluded unless status='archived'.
 * @param {number} [page] - Optional. Page number for pagination. Defaults to 1.
 * @param {number} [limit] - Optional. Records per page. Defaults to 50.
 *
 * PATCH /api/feedback — Partial update (archive, status, notes). Admin/developer/owner only.
 *
 * Body fields (PATCH):
 * @param {string} _id - Required. Feedback document ID.
 * @param {boolean} [archived] - Optional. Set to true to archive, false to unarchive.
 * @param {string} [status] - Optional. New status value.
 * @param {string} [notes] - Optional. Internal admin notes.
 *
 * PUT /api/feedback — Full update with Zod validation. Admin/developer/owner only.
 *
 * Body fields (PUT):
 * @param {string} _id - Required. Feedback document ID.
 * @param {string} [status] - Optional. New status ('pending' | 'reviewed' | 'resolved').
 * @param {boolean} [archived] - Optional. Archive flag.
 * @param {string} [notes] - Optional. Internal admin notes.
 * @param {string} [reviewedBy] - Optional. Reviewer identifier; auto-set when status changes to
 *   'reviewed' or 'resolved'.
 * @param {string|Date} [reviewedAt] - Optional. Review timestamp; auto-set on status change.
 *
 * DELETE /api/feedback — Permanently delete a feedback record. Admin/developer only.
 *
 * Body fields (DELETE):
 * @param {string} _id - Required. Feedback document ID to delete.
 *
 * @module app/api/feedback/route
 */

import {
  authenticateAdminUser,
  buildFeedbackQuery,
  createFeedbackEntry,
  feedbackSchema,
  logFeedbackCreateActivity,
  deleteFeedbackSchema,
  updateFeedbackSchema,
} from '@/app/api/lib/helpers/feedbackOperations';
import {
  handleFeedbackPatch,
  handleFeedbackPut,
  handleFeedbackDelete,
} from '@/app/api/lib/helpers/feedbackHandlers';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { FeedbackModel } from '@/app/api/lib/models/feedback';
import {
  logRouteFetch,
  logRouteCreate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { FeedbackDocument } from '@shared/types';
import { NextRequest, NextResponse } from 'next/server';


/**
 * POST /api/feedback — Submit a new feedback entry
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Validate email or username requirement
 * 4. Get logged-in user info if available
 * 5. Create feedback entry (generates ID, resolves names, persists)
 * 6. Log activity for feedback creation
 * 7. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/feedback';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body = await request.json();
    const validationResult = feedbackSchema.safeParse(body);

    if (!validationResult.success) {
      logRouteError(functionName, 'POST', '/api/feedback', 'Validation failed', logUser);
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      email,
      username,
      userId,
      firstName,
      lastName,
      locationId,
      licenceeId,
      category,
      description,
    } = validationResult.data;

    // ============================================================================
    // STEP 3: Validate email or username requirement
    // ============================================================================
    if (!email && !username) {
      logRouteError(
        functionName,
        'POST',
        '/api/feedback',
        'Either email or username must be provided',
        logUser
      );
      return NextResponse.json(
        { success: false, error: 'Either email or username must be provided' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Get logged-in user info if available
    // ============================================================================
    let loggedInUser = null;
    if (userId) {
      try {
        loggedInUser = await getUserFromServer();
        if (loggedInUser && String(loggedInUser._id) !== userId) {
          loggedInUser = null;
        }
      } catch {
        // User not logged in or error, continue without logged-in user info
      }
    }

    const loggedInUserRecord = loggedInUser as Record<string, unknown> | null;
    const finalEmail = String(loggedInUserRecord?.emailAddress || email || '');
    const finalUsername =
      typeof loggedInUserRecord?.username === 'string'
        ? loggedInUserRecord.username
        : (username || null);
    const finalUserId =
      loggedInUserRecord?._id
        ? String(loggedInUserRecord._id)
        : (userId || null);

    // ============================================================================
    // STEP 5: Create feedback entry (generates ID, resolves names, persists)
    // ============================================================================
    const feedback = await createFeedbackEntry({
      finalEmail,
      finalUsername,
      finalUserId,
      firstName,
      lastName,
      locationId,
      licenceeId,
      category,
      description,
    });

    // ============================================================================
    // STEP 6: Log activity for feedback creation
    // ============================================================================
    await logFeedbackCreateActivity({
      request,
      feedback,
      email,
      finalEmail,
      finalUsername,
      finalUserId,
      loggedInUser,
      category,
      description,
      functionName,
      logUser,
    });

    // ============================================================================
    // STEP 7: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    logRouteCreate(functionName, 'POST', '/api/feedback', 1, logUser, duration);

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your feedback!',
        feedbackId: feedback._id,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to submit feedback. Please try again later.';
    logRouteError(functionName, 'POST', '/api/feedback', errorMessage, logUser);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback — Retrieve paginated feedback list
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate user and check admin role
 * 3. Parse query parameters and build query
 * 4. Fetch feedback with pagination
 * 5. Return paginated feedback list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/feedback';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check admin role
    // ============================================================================
    const authResult = await authenticateAdminUser('GET', functionName, logUser);
    if (authResult instanceof NextResponse) return authResult;

    // ============================================================================
    // STEP 3: Parse query parameters and build query
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const emailFilter = searchParams.get('email') || '';
    const categoryFilter = searchParams.get('category') || '';
    const statusFilter = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const query = buildFeedbackQuery({ emailFilter, categoryFilter, statusFilter });

    // ============================================================================
    // STEP 4: Fetch feedback with pagination
    // ============================================================================
    const totalCount = await FeedbackModel.countDocuments(query);
    const feedback = await FeedbackModel.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<FeedbackDocument[]>()
      .exec();

    // ============================================================================
    // STEP 5: Return paginated feedback list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Feedback API] GET completed in ${duration}ms`);
    }

    logRouteFetch(functionName, 'GET', '/api/feedback', feedback.length, logUser, duration);
    return NextResponse.json(
      {
        success: true,
        data: feedback,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch feedback';
    console.error('Error fetching feedback:', error);
    logRouteError(functionName, 'GET', '/api/feedback', errorMessage, logUser);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feedback. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/feedback — Partial update (archive, status, notes)
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate user and check admin role
 * 3. Parse request body and build update data
 * 4. Pre-fetch existing feedback for before-state
 * 5. Execute update
 * 6. Log activity
 * 7. Return success response
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/feedback';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check admin role
    // ============================================================================
    const authResult = await authenticateAdminUser('PATCH', functionName, logUser);
    if (authResult instanceof NextResponse) return authResult;
    const { currentUser, userRoles } = authResult;

    // ============================================================================
    // STEP 3: Parse body and delegate execution
    // ============================================================================
    const body = await request.json();

    return await handleFeedbackPatch(body, currentUser, userRoles, request, functionName, logUser, startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to update feedback';
    console.error('Error updating feedback:', error);
    logRouteError(functionName, 'PATCH', '/api/feedback', errorMessage, logUser);
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/feedback — Full update with Zod validation
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate user and check admin role
 * 3. Parse and validate request body
 * 4. Pre-fetch existing feedback for before-state
 * 5. Build update data and execute update
 * 6. Log activity
 * 7. Return success response
 */
export async function PUT(request: NextRequest) {
  const functionName = 'PUT /api/feedback';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check admin role
    // ============================================================================
    const authResult = await authenticateAdminUser('PUT', functionName, logUser);
    if (authResult instanceof NextResponse) return authResult;
    const { currentUser, userRoles } = authResult;

    // ============================================================================
    // STEP 3: Parse and validate request body
    // ============================================================================
    const body = await request.json();
    const validationResult = updateFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Delegate to handler
    // ============================================================================
    return await handleFeedbackPut(validationResult.data, currentUser, userRoles, request, functionName, logUser);
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update feedback. Please try again later.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/feedback — Permanently delete a feedback record
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate user and check admin/developer role
 * 3. Parse and validate request body
 * 4. Pre-fetch existing feedback for before-state
 * 5. Delete feedback document
 * 6. Log activity
 * 7. Return success response
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/feedback';
  const logUser = extractUserFromRequest(request);

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user and check admin/developer role
    // ============================================================================
    const authResult = await authenticateAdminUser('DELETE', functionName, logUser, false);
    if (authResult instanceof NextResponse) return authResult;
    const { currentUser, userRoles } = authResult;

    // ============================================================================
    // STEP 3: Parse and validate request body
    // ============================================================================
    const body = await request.json();
    const validationResult = deleteFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Delegate to handler
    // ============================================================================
    return await handleFeedbackDelete(validationResult.data, currentUser, userRoles, request, functionName, logUser, startTime);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete feedback';
    console.error('Error deleting feedback:', error);
    logRouteError(functionName, 'DELETE', '/api/feedback', errorMessage, logUser);
    return NextResponse.json(
      { success: false, error: 'Failed to delete feedback. Please try again later.' },
      { status: 500 }
    );
  }
}
