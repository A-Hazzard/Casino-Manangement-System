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

import { Member } from '@/app/api/lib/models/members';
import { connectDB } from '@/app/api/lib/middleware/db';
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
                    { $eq: [{ $toString: '$_id' }, { $toString: '$$memberLocation' }] },
                    { $eq: ['$_id', { $toObjectId: { $ifNull: ['$$memberLocation', ''] } }] },
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
    console.error(
      `[Member API GET] Error after ${duration}ms:`,
      errorMessage
    );
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
    // STEP 5: Update member fields
    // ============================================================================
    if (body.profile) {
      member.profile = { ...member.profile, ...body.profile };
    }
    if (body.phoneNumber !== undefined) {
      member.phoneNumber = body.phoneNumber;
    }
    if (body.points !== undefined) {
      member.points = body.points;
    }
    if (body.uaccount !== undefined) {
      member.uaccount = body.uaccount;
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
    console.error(
      `[Member API PUT] Error after ${duration}ms:`,
      errorMessage
    );
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
