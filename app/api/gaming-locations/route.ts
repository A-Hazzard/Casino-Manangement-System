import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');
    const licensees = searchParams.get('licensees'); // Support multiple licensees (comma-separated)

    const query: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    // If multiple licensees are provided (comma-separated), filter by all of them
    if (licensees) {
      const licenseeArray = licensees.split(',').map(l => l.trim()).filter(l => l);
      if (licenseeArray.length > 0) {
        query['rel.licencee'] = { $in: licenseeArray };
      }
    } else if (licensee) {
      // Single licensee filter (backwards compatibility)
      query['rel.licencee'] = licensee;
    }

    const locations = await GamingLocations.find(query, {
      _id: 1,
      name: 1,
      'rel.licencee': 1,
    })
      .sort({ name: 1 })
      .lean();

    const formattedLocations = locations.map(loc => {
      const licenceeRaw = loc.rel?.licencee;
      let licenseeId: string | null = null;

      if (Array.isArray(licenceeRaw)) {
        licenseeId =
          licenceeRaw.length > 0 && licenceeRaw[0]
            ? String(licenceeRaw[0])
            : null;
      } else if (licenceeRaw) {
        licenseeId = String(licenceeRaw);
      }

      return {
        _id: loc._id,
        id: String(loc._id), // Also include 'id' for compatibility
        name: loc.name,
        licenseeId,
      };
    });

    // Return in format expected by fetchAllGamingLocations (direct array)
    // Also support the { success: true, data: [...] } format for backwards compatibility
    return NextResponse.json(formattedLocations);
  } catch (error) {
    console.error('Error fetching gaming locations:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch gaming locations',
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
