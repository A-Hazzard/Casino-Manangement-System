import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectDB();

    // Use aggregation to populate location name
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

    const member = members[0];

    if (!member) {
      return NextResponse.json(
        { success: false, error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: memberId } = await params;
    const body = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Update member fields
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

    await member.save();

    return NextResponse.json(member);
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id: memberId } = await params;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Soft delete by setting deletedAt
    member.deletedAt = new Date();
    await member.save();

    return NextResponse.json({ message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
