import { NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Member } from '@/app/api/lib/models/members';

export async function GET() {
  try {
    await connectDB();

    // Get basic counts
    const totalMembers = await Member.countDocuments({});
    const membersWithDeletedAt = await Member.countDocuments({
      deletedAt: { $exists: true },
    });
    const membersWithoutDeletedAt = await Member.countDocuments({
      deletedAt: { $exists: false },
    });
    const membersWithNullDeletedAt = await Member.countDocuments({
      deletedAt: null,
    });

    // Get a few sample members
    const sampleMembers = await Member.find({}).limit(5).lean();

    const response = {
      success: true,
      data: {
        counts: {
          totalMembers,
          membersWithDeletedAt,
          membersWithoutDeletedAt,
          membersWithNullDeletedAt,
        },
        sampleMembers,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in members debug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
