import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { getTopPerformingMetrics } from '@/app/api/lib/helpers/top-performing';
import { TimePeriod } from '@/app/api/lib/types';

type ActiveTab = 'locations' | 'Cabinets';

/**
 * Gets TOP 5 Performing Locations or Cabinets based on moneyIn (drop).
 *
 * Parameters:
 * - activeTab: "locations" or "Cabinets" (default: "locations")
 * - timePeriod: "Today", "Yesterday", "7d", "30d" (default: "7d")
 *
 * Response includes the activeTab, timePeriod, and data array with location/machine
 * names, totalDrop, totalGamesPlayed, and totalJackpot values.
 */
export async function GET(req: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      console.error('Database connection failed');
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const activeTab =
      (searchParams.get('activeTab') as ActiveTab) || 'locations';
    const timePeriod: TimePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || '7d';

    const data = await getTopPerformingMetrics(db, activeTab, timePeriod);

    return NextResponse.json({ activeTab, timePeriod, data });
  } catch (error) {
    console.error('Error in top-performing API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
