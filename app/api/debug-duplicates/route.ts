import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Member } from '@/app/api/lib/models/members';
import { NextResponse } from 'next/server';

export async function GET() {
  await connectDB();
  
  const matches = await GamingLocations.find({ name: /Bet Cabana/i }).lean();
  
  const details = await Promise.all(matches.map(async (loc) => {
    const memberCount = await Member.countDocuments({ 
        gamingLocation: String(loc._id),
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
    });
    return {
      _id: loc._id,
      name: loc.name,
      membershipEnabled: loc.membershipEnabled,
      enableMembership: (loc as any).enableMembership,
      memberCount
    };
  }));
  
  return NextResponse.json({
    count: matches.length,
    details
  });
}
