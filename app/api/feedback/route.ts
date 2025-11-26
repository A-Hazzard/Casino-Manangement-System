/**
 * Feedback API Route
 *
 * This route handles feedback submission and retrieval.
 * It supports:
 * - Feedback submission with validation
 * - User authentication and identification
 * - Activity logging for feedback creation
 * - Admin-only feedback retrieval with filtering
 * - Pagination and sorting
 *
 * @module app/api/feedback/route
 */

import { calculateChanges } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { ActivityLog } from '@/app/api/lib/models/activityLog';
import { FeedbackModel } from '@/app/api/lib/models/feedback';
import { formatIPForDisplay, getIPInfo } from '@/lib/utils/ipDetection';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const feedbackSchema = z.object({
  email: z.string().email('Please provide a valid email address').optional(),
  username: z.string().optional(),
  userId: z.string().optional(),
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

/**
 * Main POST handler for submitting feedback
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse and validate request body
 * 3. Validate email or username requirement
 * 4. Get logged-in user info if available
 * 5. Generate feedback ID
 * 6. Create feedback entry
 * 7. Log activity for feedback creation
 * 8. Return success response
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, username, userId, category, description } =
      validationResult.data;

    // ============================================================================
    // STEP 3: Validate email or username requirement
    // ============================================================================
    if (!email && !username) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either email or username must be provided',
        },
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
        // Verify the userId matches the logged-in user
        if (loggedInUser && String(loggedInUser._id) !== userId) {
          loggedInUser = null; // Don't use if mismatch
        }
      } catch {
        // User not logged in or error, continue without logged-in user info
      }
    }

    // Use logged-in user info if available, otherwise use provided values
    const finalEmail = (loggedInUser?.emailAddress || email || '').toString();
    const finalUsername = loggedInUser?.username || username || null;
    const finalUserId = loggedInUser?._id
      ? String(loggedInUser._id)
      : userId || null;

    // ============================================================================
    // STEP 5: Generate feedback ID
    // ============================================================================
    const feedbackId =
      new Date().getTime().toString() +
      Math.random().toString(36).substring(2, 9);

    // ============================================================================
    // STEP 6: Create feedback entry
    // ============================================================================
    const feedback = new FeedbackModel({
      _id: feedbackId,
      email: finalEmail.toLowerCase().trim(),
      username: finalUsername,
      userId: finalUserId,
      category,
      description: description.trim(),
      submittedAt: new Date(),
      status: 'pending',
      archived: false,
    });

    await feedback.save();

    // ============================================================================
    // STEP 7: Send email notification via SendGrid
    // ============================================================================
    try {
      const { sendEmail } = await import('@/app/api/lib/utils/email');
      const emailUser = process.env.EMAIL_USER || '';
      
      if (emailUser) {
        const categoryLabels: Record<string, string> = {
          bug: '🐛 Bug Report',
          suggestion: '💡 Suggestion',
          'general-review': '⭐ General Review',
          'feature-request': '✨ Feature Request',
          performance: '⚡ Performance Issue',
          'ui-ux': '🎨 UI/UX Feedback',
          other: '📝 Other',
        };

        const categoryLabel = categoryLabels[category] || category;
        const submitterEmail = finalEmail;
        const submitterName = finalUsername || finalEmail;
        const subject = `New Feedback: ${categoryLabel} from ${submitterName}`;
        
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ECF0F9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #ECF0F9; padding: 20px;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; background-color: #FFFFFF; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #5119E9; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">New Feedback Submission</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <!-- Category -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <strong style="color: #707070; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Category</strong>
                    <p style="margin: 8px 0 0 0; color: #1F2937; font-size: 16px; font-weight: 500;">${categoryLabel}</p>
                  </td>
                </tr>
                
                <!-- From -->
                <tr>
                  <td style="padding-bottom: 16px;">
                    <strong style="color: #707070; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">From</strong>
                    <p style="margin: 8px 0 0 0; color: #1F2937; font-size: 16px;">${submitterName}</p>
                    <p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">${submitterEmail}</p>
                    ${finalUserId ? `<p style="margin: 4px 0 0 0; color: #6B7280; font-size: 14px;">User ID: ${finalUserId}</p>` : ''}
                  </td>
                </tr>
                
                <!-- Submitted At -->
                <tr>
                  <td style="padding-bottom: 24px;">
                    <strong style="color: #707070; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Submitted</strong>
                    <p style="margin: 8px 0 0 0; color: #1F2937; font-size: 16px;">${new Date(feedback.submittedAt).toLocaleString()}</p>
                  </td>
                </tr>
                
                <!-- Description -->
                <tr>
                  <td style="padding-top: 24px; border-top: 2px solid #E5E7EB;">
                    <strong style="color: #707070; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Description</strong>
                    <div style="margin-top: 16px; padding: 16px; background-color: #F9FAFB; border-radius: 6px; border-left: 4px solid #5119E9;">
                      <p style="margin: 0; color: #1F2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${description.trim()}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; background-color: #F9FAFB; border-radius: 0 0 8px 8px; border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0; color: #6B7280; font-size: 12px;">This is an automated notification from Evolution CMS</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        const text = `New Feedback Submission

Category: ${categoryLabel}
From: ${submitterName}
Email: ${submitterEmail}
${finalUserId ? `User ID: ${finalUserId}\n` : ''}Submitted: ${new Date(feedback.submittedAt).toLocaleString()}

Description:
${description.trim()}

---
This is an automated notification from Evolution CMS
        `;

        await sendEmail(emailUser, subject, text, html, submitterEmail);
      }
    } catch (emailError) {
      console.error('Error sending feedback email notification:', emailError);
      // Don't fail the request if email fails
    }

    // ============================================================================
    // STEP 8: Log activity for feedback creation
    // ============================================================================
    try {
      const ipInfo = getIPInfo(request);
      const formattedIP = formatIPForDisplay(ipInfo);
      const activityLogId = await generateMongoId();

      const newData = {
        _id: feedback._id,
        email,
        category,
        status: 'pending',
        submittedAt: feedback.submittedAt,
      };

      const activityLog = new ActivityLog({
        _id: activityLogId,
        timestamp: new Date(),
        userId: finalUserId || `feedback-${finalEmail}`,
        username: finalUsername || finalEmail,
        action: 'create',
        resource: 'feedback',
        resourceId: feedback._id,
        resourceName: `Feedback from ${finalUsername || finalEmail}`,
        details: `User submitted feedback: ${category} - ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
        actor: {
          id: finalUserId || `feedback-${finalEmail}`,
          email: finalEmail,
          role:
            loggedInUser &&
            Array.isArray(loggedInUser.roles) &&
            loggedInUser.roles.length > 0
              ? (loggedInUser.roles[0] as string)
              : 'feedback-submitter',
        },
        ipAddress: formattedIP,
        userAgent: ipInfo.userAgent,
        previousData: null,
        newData: newData,
        changes: [],
      });

      await activityLog.save();
    } catch (logError) {
      console.error('Error logging feedback creation activity:', logError);
      // Don't fail the request if logging fails
    }

    // ============================================================================
    // STEP 9: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Feedback API] POST completed in ${duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your feedback!',
        feedbackId: feedback._id,
      },
      { status: 201 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback. Please try again later.';
    console.error(`[Feedback API] POST error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Main GET handler for fetching feedback (Admin only)
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate user
 * 3. Check admin/developer role
 * 4. Parse query parameters (filters, pagination)
 * 5. Build query filter
 * 6. Fetch feedback with pagination
 * 7. Return paginated feedback list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user
    // ============================================================================
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 3: Check admin/developer role
    // ============================================================================
    const userRoles = (currentUser.roles as string[]) || [];
    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const emailFilter = searchParams.get('email') || '';
    const categoryFilter = searchParams.get('category') || '';
    const statusFilter = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    // Build query
    const query: Record<string, unknown> = {};

    if (emailFilter) {
      // Check if it looks like an _id (MongoDB ObjectId format or string ID)
      const isObjectIdFormat = /^[0-9a-fA-F]{24}$/.test(emailFilter.trim());
      if (isObjectIdFormat) {
        // Try to match _id
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

    // Handle archived filter
    if (statusFilter === 'archived') {
      // If filtering by archived, show only archived items
      query.archived = true;
      // Remove status filter when showing archived items
      delete query.status;
    } else {
      // By default, exclude archived items unless explicitly filtered
      query.archived = { $ne: true };
    }

    // ============================================================================
    // STEP 6: Fetch feedback with pagination
    // ============================================================================
    const totalCount = await FeedbackModel.countDocuments(query);
    const feedback = await FeedbackModel.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    // ============================================================================
    // STEP 7: Return paginated feedback list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Feedback API] GET completed in ${duration}ms`);
    }

    return NextResponse.json(
      {
        success: true,
        data: feedback,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedback. Please try again later.',
      },
      { status: 500 }
    );
  }
}

const updateFeedbackSchema = z.object({
  _id: z.string(),
  status: z.enum(['pending', 'reviewed', 'resolved']).optional(),
  archived: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  reviewedBy: z.string().optional().nullable(),
  reviewedAt: z.union([z.string(), z.date()]).optional().nullable(),
});

// PATCH endpoint for specific field updates (like archiving) to avoid schema/middleware issues
export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is admin or developer
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (currentUser.roles as string[]) || [];
    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { _id, archived, status, notes } = body;

    if (!_id) {
      return NextResponse.json(
        { success: false, error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    console.log('📥 PATCH /api/feedback - Received data:', {
      _id,
      archived,
      status,
      notes,
    });

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

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    console.log(
      '💾 EXECUTING PATCH with:',
      JSON.stringify(updateData, null, 2)
    );

    // Use updateOne for a direct MongoDB update, bypassing Mongoose document middleware if any
    const result = await FeedbackModel.collection.updateOne(
      { _id },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Fetch the updated document to return
    const updatedFeedback = await FeedbackModel.findOne({ _id }).lean();

    // Log activity
    try {
      const ipInfo = getIPInfo(request);
      const formattedIP = formatIPForDisplay(ipInfo);
      const activityLogId = await generateMongoId();
      const userId = currentUser._id?.toString() || 'unknown';
      const username =
        currentUser.username || currentUser.emailAddress || 'unknown';
      const profile = currentUser.profile as
        | { firstName?: string; lastName?: string }
        | undefined;
      const userDisplayName =
        profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : username;

      const activityLog = new ActivityLog({
        _id: activityLogId,
        timestamp: new Date(),
        userId: userId,
        username: userDisplayName,
        action: 'update',
        resource: 'feedback',
        resourceId: _id,
        resourceName: `Feedback update`,
        details: `Admin updated feedback (PATCH): ${JSON.stringify(updateData)}`,
        actor: {
          id: userId,
          email: username,
          role: userRoles[0] || 'admin',
        },
        ipAddress: formattedIP,
        userAgent: ipInfo.userAgent,
        newData: updateData,
      });

      await activityLog.save();
    } catch (logError) {
      console.error('Error logging feedback update activity:', logError);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback updated successfully',
        feedback: updatedFeedback,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating feedback (PATCH):', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update feedback',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is admin or developer
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (currentUser.roles as string[]) || [];
    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = updateFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { _id, status, archived, notes, reviewedBy, reviewedAt } =
      validationResult.data;

    console.log('📥 PUT /api/feedback - Received data:', {
      _id,
      status,
      archived,
      notes,
    });

    // Get existing feedback
    const existingFeedback = await FeedbackModel.findOne({ _id }).lean();
    if (!existingFeedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const existingFeedbackData = existingFeedback as {
      _id?: unknown;
      archived?: boolean;
      status?: string;
    };
    console.log('📋 Existing feedback:', {
      _id: existingFeedbackData._id,
      archived: existingFeedbackData.archived,
      status: existingFeedbackData.status,
    });

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      // If status is being changed to reviewed or resolved, automatically set reviewedBy and reviewedAt
      // Always update reviewedBy when changing to reviewed/resolved (use username/email, not ID)
      if (status === 'reviewed' || status === 'resolved') {
        // Use username or emailAddress for reviewedBy instead of ID
        const reviewerName =
          currentUser.username ||
          currentUser.emailAddress ||
          currentUser._id?.toString() ||
          'unknown';
        updateData.reviewedBy = reviewerName;
        updateData.reviewedAt = new Date();
      }
    }
    // Handle archived field - explicitly check for both true and false
    // Always set archived if it's provided in the request, even if it's false
    if (archived !== undefined && archived !== null) {
      updateData.archived = Boolean(archived);
      console.log('✅ Archived field will be updated:', {
        oldValue: existingFeedbackData.archived,
        newValue: updateData.archived,
        rawValue: archived,
        type: typeof archived,
        convertedValue: updateData.archived,
      });
    } else {
      console.log('⚠️ Archived field not provided in request:', {
        archived,
        type: typeof archived,
      });
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

    console.log('💾 Update data to save:', JSON.stringify(updateData, null, 2));
    console.log('💾 Update data keys:', Object.keys(updateData));
    if ('archived' in updateData) {
      console.log(
        '💾 Update data archived value:',
        updateData.archived,
        typeof updateData.archived
      );
    } else {
      console.log('💾 WARNING: archived NOT in updateData!');
    }

    // Update feedback - use findOneAndUpdate with explicit $set
    console.log(
      '💾 EXECUTING UPDATE with:',
      JSON.stringify(updateData, null, 2)
    );

    const updatedFeedback = await FeedbackModel.findOneAndUpdate(
      { _id },
      { $set: updateData },
      { new: true, lean: true, runValidators: false } // Disable validators temporarily to test if it's a schema validation issue
    );

    if (!updatedFeedback) {
      console.error(
        '❌ Failed to update feedback - findOneAndUpdate returned null'
      );
      return NextResponse.json(
        {
          success: false,
          error:
            'Failed to update feedback - document not found or update failed',
        },
        { status: 500 }
      );
    }

    // Force re-read to verify persistence
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const verifiedDoc = await FeedbackModel.findOne({ _id }).lean();
    const verifiedData = verifiedDoc as { archived?: boolean };

    console.log('💾 VERIFICATION POST-UPDATE:', {
      returnedFromUpdate: (updatedFeedback as { archived?: boolean }).archived,
      persistedInDb: verifiedData.archived,
      updateDataArchived: updateData.archived,
    });

    const responseFeedback = {
      ...updatedFeedback,
      archived: verifiedData.archived ?? false, // Use verified DB value
    };
    console.log('📤 Response feedback includes archived:', {
      hasArchived: 'archived' in responseFeedback,
      archivedValue: responseFeedback.archived,
    });

    // Log activity - admin updated feedback
    try {
      const ipInfo = getIPInfo(request);
      const formattedIP = formatIPForDisplay(ipInfo);
      const activityLogId = await generateMongoId();

      const userId = currentUser._id?.toString() || 'unknown';
      const username =
        currentUser.username || currentUser.emailAddress || 'unknown';
      const profile = currentUser.profile as
        | { firstName?: string; lastName?: string }
        | undefined;
      const userDisplayName =
        profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : username;

      const changes = calculateChanges(
        existingFeedback as Record<string, unknown>,
        updatedFeedback as Record<string, unknown>
      );
      const changesSummary = changes
        .map(
          c =>
            `${c.field}: ${JSON.stringify(c.oldValue)} → ${JSON.stringify(c.newValue)}`
        )
        .join(', ');

      const activityLog = new ActivityLog({
        _id: activityLogId,
        timestamp: new Date(),
        userId: userId,
        username: userDisplayName,
        action: 'update',
        resource: 'feedback',
        resourceId: _id,
        resourceName: `Feedback from ${(existingFeedback as { email?: string }).email || 'unknown'}`,
        details: `Admin updated feedback: ${changesSummary || 'No changes detected'}`,
        actor: {
          id: userId,
          email: username,
          role: userRoles[0] || 'admin',
        },
        ipAddress: formattedIP,
        userAgent: ipInfo.userAgent,
        previousData: existingFeedback,
        newData: updatedFeedback,
        changes: changes,
      });

      await activityLog.save();
    } catch (logError) {
      console.error('Error logging feedback update activity:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback updated successfully',
        feedback: responseFeedback, // Use responseFeedback with explicit archived field
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update feedback. Please try again later.',
      },
      { status: 500 }
    );
  }
}

const deleteFeedbackSchema = z.object({
  _id: z.string(),
});

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is admin or developer
    const currentUser = await getUserFromServer();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (currentUser.roles as string[]) || [];
    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validationResult = deleteFeedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { _id } = validationResult.data;

    // Get existing feedback before deletion
    const existingFeedback = await FeedbackModel.findOne({ _id }).lean();
    if (!existingFeedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Delete feedback
    await FeedbackModel.findOneAndDelete({ _id });

    // Log activity - admin deleted feedback
    try {
      const ipInfo = getIPInfo(request);
      const formattedIP = formatIPForDisplay(ipInfo);
      const activityLogId = await generateMongoId();

      const userId = currentUser._id?.toString() || 'unknown';
      const username =
        currentUser.username || currentUser.emailAddress || 'unknown';
      const profile = currentUser.profile as
        | { firstName?: string; lastName?: string }
        | undefined;
      const userDisplayName =
        profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : username;

      const feedbackData = existingFeedback as {
        email?: string;
        category?: string;
        description?: string;
      };
      const feedbackEmail = feedbackData.email || 'unknown';
      const feedbackCategory = feedbackData.category || 'unknown';
      const feedbackDescription = feedbackData.description || '';
      const descriptionPreview =
        feedbackDescription.substring(0, 100) +
        (feedbackDescription.length > 100 ? '...' : '');

      const activityLog = new ActivityLog({
        _id: activityLogId,
        timestamp: new Date(),
        userId: userId,
        username: userDisplayName,
        action: 'delete',
        resource: 'feedback',
        resourceId: _id,
        resourceName: `Feedback from ${feedbackEmail}`,
        details: `Admin deleted feedback: ${feedbackCategory} - ${descriptionPreview}`,
        actor: {
          id: userId,
          email: username,
          role: userRoles[0] || 'admin',
        },
        ipAddress: formattedIP,
        userAgent: ipInfo.userAgent,
        previousData: existingFeedback,
        newData: null,
        changes: [],
      });

      await activityLog.save();
    } catch (logError) {
      console.error('Error logging feedback deletion activity:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete feedback. Please try again later.',
      },
      { status: 500 }
    );
  }
}

