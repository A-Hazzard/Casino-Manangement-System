import { getMemberCountsPerLocation } from '@/app/api/lib/helpers/membershipAggregation';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextResponse } from 'next/server';

export async function GET() {
  await connectDB();

  // Simulate search-all aggregation
  const aggregationResult = await GamingLocations.aggregate([
    { 
      $match: { 
        name: { $regex: 'Bet Cabana', $options: 'i' }
      } 
    },
    // No lookup needed for this test, just want to see the root doc fields
  ]).exec();
  
  const betCabana = aggregationResult[0];
  const allIds = aggregationResult.map(l => String(l._id));
  const counts = await getMemberCountsPerLocation(allIds);

  return NextResponse.json({
    found: aggregationResult.length,
    betCabana: betCabana ? {
      _id: betCabana._id,
      name: betCabana.name,
      membershipEnabled: betCabana.membershipEnabled,
      enableMembership: betCabana.enableMembership,
      allFields: Object.keys(betCabana),
      countFromHelper: counts.get(String(betCabana._id))
    } : 'Not Found'
  });
}
