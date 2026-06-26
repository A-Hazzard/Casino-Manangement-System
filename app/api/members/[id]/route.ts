/**
 * Member by ID API Route
 *
 * This route handles CRUD operations for a specific member by ID.
 * It supports:
 * - Fetching member details with location information
 * - Updating member profile and settings
 * - Soft deleting members
 *
 * @module app/api/members/[id]/route
 */

import {
  calculateChanges,
  logActivity,
  mapDeletedFieldsToChanges,
} from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Member } from '@/app/api/lib/models/members';
import {
  logRouteFetch,
  logRouteUpdate,
  logRouteDelete,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';
import {
  fetchMemberWithLocation,
  updateMemberProfileFields,
  checkMemberFieldUniqueness,
  softDeleteMember,
  buildDeleteActivityParams,
} from '@/app/api/lib/helpers/members/memberByIdOperations';

/**
 * GET /api/members/[id]
 *
 * Fetches a single member document with its associated gaming location name joined
 * via aggregation; used by the Member Details page to populate the member profile view.
 *
 * URL params:
 * @param id {string} Required (path). The string `_id` of the member to retrieve.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/members/[id]';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async () => {
    try {
      // ============================================================================
      // STEP 1: Parse route parameters
      // ============================================================================
      const { pathname } = request.nextUrl;
      const id = pathname.split('/').pop();

      // ============================================================================
      // STEP 2: Fetch member with location information using aggregation
      // ============================================================================
      const member = await fetchMemberWithLocation(id || '');

      // ============================================================================
      // STEP 3: Return member data
      // ============================================================================
      if (!member) {
        logRouteError(
          functionName,
          'GET',
          '/api/members/[id]',
          `Not found: ${id}`,
          user
        );
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      const duration = Date.now() - startTime;
      logRouteFetch(functionName, 'GET', '/api/members/[id]', 1, user, duration);
      return NextResponse.json(member);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(functionName, 'GET', '/api/members/[id]', errorMessage, user);
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/members/[id]
 *
 * Updates a member's profile and account settings; restricted to admin and developer
 * roles. Changes are activity-logged with a before/after diff. Requires the caller
 * to be authenticated via session cookie.
 *
 * URL params:
 * @param id {string} Required (path). The string `_id` of the member to update.
 *
 * Body fields (all optional; only provided keys are applied):
 * @param profile          {object}  Nested profile sub-document. Accepted sub-fields:
 *                                    `firstName` {string} — member's given name.
 *                                    `lastName`  {string} — member's family name.
 *                                    `email`     {string} — contact email; must be unique.
 *                                    `occupation` {string} — member's stated occupation.
 *                                    `address`   {string} — member's physical address.
 *                                    `gender`    {string} — member's gender.
 *                                    `dob`       {string} — date of birth (ISO string or locale date).
 * @param username         {string}  Member's login/display username; must be unique.
 * @param phoneNumber      {string}  Member's contact phone number.
 * @param points           {number}  Current loyalty points balance.
 * @param uaccount         {unknown} Universal account reference object.
 * @param gamingLocation   {string}  ID of the gaming location this member belongs to.
 */
export async function PUT(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PUT /api/members/[id]';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, userRoles, isAdminOrDev }) => {
    try {
      // ============================================================================
      // STEP 1: Parse route parameters and request body
      // ============================================================================
      const { pathname } = request.nextUrl;
      const memberId = pathname.split('/').pop();
      const body = await request.json();

      // ============================================================================
      // STEP 2: Validate member ID
      // ============================================================================
      if (!memberId) {
        return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
      }

      // ============================================================================
      // STEP 3: Authorize caller (admin or developer only)
      // ============================================================================
      const isAdminOrDeveloper = isAdminOrDev || userRoles.some(
        role => role === 'admin' || role === 'developer'
      );

      if (!isAdminOrDeveloper) {
        logRouteError(functionName, 'PUT', '/api/members/[id]', 'Forbidden - insufficient permissions', user);
        return NextResponse.json(
          { error: 'Forbidden: Only administrators and developers can edit members' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 4: Find member by ID
      // ============================================================================
      const member = await Member.findOne({ _id: memberId });

      if (!member) {
        logRouteError(functionName, 'PUT', '/api/members/[id]', `Member not found: ${memberId}`, user);
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      const originalMemberData = member.toObject();

      // ============================================================================
      // STEP 5: Update member fields
      // ============================================================================
      if (body.profile !== undefined) {
        if (!member.profile) {
          member.profile = {
            firstName: '',
            lastName: '',
            email: '',
            occupation: '',
            address: '',
            gender: '',
            dob: '',
            indentification: { number: '', type: '' },
          };
        }

        const trimString = (value: unknown): string =>
          typeof value === 'string' ? value.trim() : '';

        if (body.profile.firstName !== undefined) {
          const trimmed = trimString(body.profile.firstName);
          if (!trimmed) {
            return NextResponse.json({ error: 'First name cannot be blank' }, { status: 400 });
          }
        }
        if (body.profile.lastName !== undefined) {
          const trimmed = trimString(body.profile.lastName);
          if (!trimmed) {
            return NextResponse.json({ error: 'Last name cannot be blank' }, { status: 400 });
          }
        }
        if (body.profile.email !== undefined) {
          const trimmedEmail = trimString(body.profile.email);
          if (trimmedEmail) {
            const exists = await checkMemberFieldUniqueness('profile.email', trimmedEmail, memberId);
            if (exists) {
              logRouteError(functionName, 'PUT', '/api/members/[id]', 'Email address already in use', user);
              return NextResponse.json({ error: 'Email address already in use' }, { status: 400 });
            }
          }
        }

        const updatedProfile = updateMemberProfileFields(
          member.profile as Record<string, unknown>,
          body.profile
        );
        if (updatedProfile) {
          member.profile = updatedProfile;
        }
      }

      if (body.username !== undefined) {
        const trimmedUsername = typeof body.username === 'string' ? body.username.trim() : '';
        if (!trimmedUsername) {
          return NextResponse.json({ error: 'Username is required and cannot be blank' }, { status: 400 });
        }
        const exists = await checkMemberFieldUniqueness('username', trimmedUsername, memberId);
        if (exists) {
          logRouteError(functionName, 'PUT', '/api/members/[id]', 'Username already exists', user);
          return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
        }
        member.username = trimmedUsername;
      }

      if (body.phoneNumber !== undefined) {
        member.phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : body.phoneNumber;
      }
      if (body.points !== undefined) {
        member.points = body.points;
      }
      if (body.uaccount !== undefined) {
        member.uaccount = body.uaccount;
      }
      if (body.gamingLocation !== undefined) {
        const trimmedLocation = typeof body.gamingLocation === 'string' ? body.gamingLocation.trim() : '';
        if (trimmedLocation) {
          member.gamingLocation = trimmedLocation;
        } else {
          logRouteError(functionName, 'PUT', '/api/members/[id]', 'gamingLocation is required and cannot be empty', user);
          return NextResponse.json(
            { error: 'gamingLocation is required and cannot be empty' },
            { status: 400 }
          );
        }
      }

      if (!member.gamingLocation || member.gamingLocation.trim() === '') {
        member.gamingLocation = 'default';
      }

      // ============================================================================
      // STEP 6: Save updated member
      // ============================================================================
      await member.save();

      // ============================================================================
      // STEP 7: Activity log + return updated member
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteUpdate(functionName, 'PUT', '/api/members/[id]', 1, user, duration);

      if (Date.now() - startTime > 1000) {
        console.error(`[Member PUT] Slow response: ${Date.now() - startTime}ms`);
      }

      logActivity({
        action: 'update',
        details: `Member ${member.username || memberId} profile updated`,
        userId: String(currentUser._id),
        username: String(currentUser.username || currentUser.emailAddress || currentUser._id),
        metadata: {
          resource: 'member',
          resourceId: memberId,
          resourceName: member.username || memberId,
          changes: calculateChanges(
            originalMemberData as unknown as Record<string, unknown>,
            body as Record<string, unknown>
          ),
          previousData: originalMemberData,
          newData: member.toObject(),
        },
      }).catch(err => console.error('[Member PUT] Activity log failed:', err));

      return NextResponse.json(member);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      logRouteError(functionName, 'PUT', '/api/members/[id]', errorMessage, user);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/members/[id]
 *
 * Soft-deletes a member by setting `deletedAt` to the current timestamp; the record
 * is retained in the database and excluded from active queries via the deleted-state filter.
 *
 * URL params:
 * @param id {string} Required (path). The string `_id` of the member to soft-delete.
 */
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'DELETE /api/members/[id]';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: currentUser, userRoles, isAdminOrDev }) => {
    try {
      // ============================================================================
      // STEP 1: Parse route parameters
      // ============================================================================
      const { pathname } = request.nextUrl;
      const memberId = pathname.split('/').pop();

      // ============================================================================
      // STEP 2: Validate member ID
      // ============================================================================
      if (!memberId) {
        return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
      }

      // ============================================================================
      // STEP 3: Authorize caller (admin, developer, or owner)
      // ============================================================================
      const isAdminOrDeveloper = isAdminOrDev || userRoles.some(
        role => role === 'admin' || role === 'developer' || role === 'owner'
      );
      if (!isAdminOrDeveloper) {
        logRouteError(
          functionName,
          'DELETE',
          '/api/members/[id]',
          'Forbidden - insufficient permissions',
          user
        );
        return NextResponse.json(
          {
            error:
              'Forbidden: Only administrators and developers can delete members',
          },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 4: Soft delete member
      // ============================================================================
      const { success, member } = await softDeleteMember(memberId);

      if (!success || !member) {
        logRouteError(functionName, 'DELETE', '/api/members/[id]', `Member not found: ${memberId}`, user);
        return NextResponse.json({ error: 'Member not found' }, { status: 404 });
      }

      // ============================================================================
      // STEP 5: Log activity
      // ============================================================================
      if (currentUser.emailAddress) {
        try {
          const activityParams = buildDeleteActivityParams(
            memberId,
            member,
            {
              _id: String(currentUser._id),
              emailAddress: currentUser.emailAddress as string,
            },
            request
          );
          activityParams.metadata.changes = mapDeletedFieldsToChanges(member);

          await logActivity(activityParams);
        } catch (logError) {
          console.error('Failed to log activity:', logError);
        }
      }

      // ============================================================================
      // STEP 6: Return success response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteDelete(functionName, 'DELETE', '/api/members/[id]', 1, user, duration);

      if (Date.now() - startTime > 1000) {
        console.error(`[Member DELETE] Slow response: ${Date.now() - startTime}ms`);
      }

      return NextResponse.json({ message: 'Member deleted successfully' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal server error';
      logRouteError(functionName, 'DELETE', '/api/members/[id]', errorMessage, user);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  });
}
