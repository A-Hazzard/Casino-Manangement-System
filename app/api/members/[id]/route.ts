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

import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching a member by ID
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Connect to database
 * 3. Fetch member with location information using aggregation
 * 4. Return member data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters
    // ============================================================================
    const { id } = await params;

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3: Fetch member with location information using aggregation
    // ============================================================================

    const members = await Member.aggregate([
      { $match: { _id: id } },
      {
        $lookup: {
          from: 'gaminglocations',
          let: { memberLocation: '$gamingLocation' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$memberLocation'] },
                    {
                      $eq: [
                        { $toString: '$_id' },
                        { $toString: '$$memberLocation' },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'locationInfo',
        },
      },
      {
        $addFields: {
          locationName: { $arrayElemAt: ['$locationInfo.name', 0] },
        },
      },
      {
        $project: {
          locationInfo: 0, // Remove the lookup array
        },
      },
    ]);

    // ============================================================================
    // STEP 4: Return member data
    // ============================================================================
    const member = members[0];

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Member API GET] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * PUT handler for updating a member
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate member ID
 * 3. Connect to database
 * 4. Find member by ID
 * 5. Update member fields
 * 6. Save updated member
 * 7. Return updated member
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and request body
    // ============================================================================
    const { id: memberId } = await params;
    const body = await request.json();

    // ============================================================================
    // STEP 2: Validate member ID
    // ============================================================================
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database and authenticate user
    // ============================================================================
    await connectDB();
    const userPayload = await getUserFromServer();

    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or developer
    const userRoles = (userPayload.roles as string[]) || [];
    const isAdminOrDeveloper = userRoles.some(
      role => role === 'admin' || role === 'developer'
    );

    if (!isAdminOrDeveloper) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Only administrators and developers can edit members',
        },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 4: Find member by ID
    // ============================================================================
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const member = await Member.findOne({ _id: memberId });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // ============================================================================
    // STEP 5: Update member fields
    // ============================================================================
    if (body.profile) {
      // Ensure member.profile exists and has all required fields
      if (!member.profile) {
        member.profile = {
          firstName: '',
          lastName: '',
          email: '',
          occupation: '',
          address: '',
          gender: '',
          dob: '',
          indentification: {
            number: '',
            type: '',
          },
        };
      }

      // Preserve existing indentification field (not editable in UI, but required by schema)
      const existingIndentification = member.profile.indentification || {
        number: '',
        type: '',
      };

      // Ensure indentification is always an object with number and type
      const safeIndentification = {
        number: existingIndentification.number || '',
        type: existingIndentification.type || '',
      };

      // Only update fields that are explicitly provided in body.profile
      // and are not undefined, preserving indentification
      const updatedProfile = {
        firstName: member.profile.firstName || '',
        lastName: member.profile.lastName || '',
        email: member.profile.email || '',
        occupation: member.profile.occupation || '',
        address: member.profile.address || '',
        gender: member.profile.gender || '',
        dob: member.profile.dob || '',
        indentification: safeIndentification,
      };

      // Helper function to trim string or return empty string
      const trimString = (value: unknown): string => {
        if (typeof value === 'string') {
          return value.trim();
        }
        return '';
      };

      // Update only defined fields from body.profile, trimming all string values
      if (body.profile.firstName !== undefined) {
        const trimmedFirstName = trimString(body.profile.firstName);
        if (!trimmedFirstName) {
          return NextResponse.json(
            { error: 'First name cannot be blank' },
            { status: 400 }
          );
        }
        updatedProfile.firstName = trimmedFirstName;
      }
      if (body.profile.lastName !== undefined) {
        const trimmedLastName = trimString(body.profile.lastName);
        if (!trimmedLastName) {
          return NextResponse.json(
            { error: 'Last name cannot be blank' },
            { status: 400 }
          );
        }
        updatedProfile.lastName = trimmedLastName;
      }
      if (body.profile.email !== undefined) {
        const trimmedEmail = trimString(body.profile.email);
        // Check if email is already taken by another member (if email is provided)
        if (trimmedEmail) {
          const existingMember = await Member.findOne({
            'profile.email': trimmedEmail,
            _id: { $ne: memberId },
          });
          if (existingMember) {
            return NextResponse.json(
              { error: 'Email address already in use' },
              { status: 400 }
            );
          }
        }
        updatedProfile.email = trimmedEmail;
      }
      if (body.profile.occupation !== undefined) {
        updatedProfile.occupation = trimString(body.profile.occupation);
      }
      if (body.profile.address !== undefined) {
        updatedProfile.address = trimString(body.profile.address);
      }
      if (body.profile.gender !== undefined) {
        updatedProfile.gender = trimString(body.profile.gender);
      }
      if (body.profile.dob !== undefined) {
        updatedProfile.dob = trimString(body.profile.dob);
      }

      // Always ensure indentification is set (never undefined)
      updatedProfile.indentification = safeIndentification;

      member.profile = updatedProfile;
    }
    if (body.username !== undefined) {
      const trimmedUsername =
        typeof body.username === 'string' ? body.username.trim() : '';
      if (!trimmedUsername) {
        return NextResponse.json(
          { error: 'Username is required and cannot be blank' },
          { status: 400 }
        );
      }
      // Check if username is already taken by another member
      const existingMember = await Member.findOne({
        username: trimmedUsername,
        _id: { $ne: memberId },
      });
      if (existingMember) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        );
      }
      member.username = trimmedUsername;
    }
    if (body.phoneNumber !== undefined) {
      member.phoneNumber =
        typeof body.phoneNumber === 'string'
          ? body.phoneNumber.trim()
          : body.phoneNumber;
    }
    if (body.points !== undefined) {
      member.points = body.points;
    }
    if (body.uaccount !== undefined) {
      member.uaccount = body.uaccount;
    }
    if (body.gamingLocation !== undefined) {
      // Ensure gamingLocation is always a valid non-empty string (required field)
      const trimmedLocation =
        typeof body.gamingLocation === 'string'
          ? body.gamingLocation.trim()
          : '';

      if (trimmedLocation) {
        member.gamingLocation = trimmedLocation;
      } else {
        // If empty or invalid, return error since gamingLocation is required
        return NextResponse.json(
          { error: 'gamingLocation is required and cannot be empty' },
          { status: 400 }
        );
      }
    }

    // Ensure gamingLocation is always set (required field)
    // This is a safety check in case gamingLocation wasn't in the update payload
    if (!member.gamingLocation || member.gamingLocation.trim() === '') {
      member.gamingLocation = 'default';
    }

    // ============================================================================
    // STEP 6: Save updated member
    // ============================================================================
    await member.save();

    // ============================================================================
    // STEP 7: Return updated member
    // ============================================================================
    return NextResponse.json(member);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Member API PUT] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE handler for soft-deleting a member
 *
 * Flow:
 * 1. Parse route parameters
 * 2. Validate member ID
 * 3. Connect to database
 * 4. Find member by ID
 * 5. Soft delete member (set deletedAt)
 * 6. Save member
 * 7. Return success response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters
    // ============================================================================
    const { id: memberId } = await params;

    // ============================================================================
    // STEP 2: Validate member ID
    // ============================================================================
    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find member by ID
    // ============================================================================
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const member = await Member.findOne({ _id: memberId });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // ============================================================================
    // STEP 5: Soft delete member (set deletedAt)
    // ============================================================================
    member.deletedAt = new Date();

    // ============================================================================
    // STEP 6: Save member
    // ============================================================================
    await member.save();

    // ============================================================================
    // STEP 7: Return success response
    // ============================================================================
    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Member API DELETE] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
