import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import type { MachineAnalytics } from '@/lib/types/reports';
import { PipelineStage } from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const query: Record<string, string | number> = {};
    const limit = Number(searchParams.get('limit')) || 5;

    if (searchParams.has('location')) {
      query.locationId = searchParams.get('location') as string;
    }

    if (searchParams.has('licensee')) {
      query.licenseeId = searchParams.get('licensee') as string;
    }

    const machinesPipeline: PipelineStage[] = [
      // Stage 1: Filter machines by location and licensee criteria
      { $match: query },

      // Stage 2: Join machines with locations to get location details
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },

      // Stage 3: Flatten the location details array (each machine now has location info)
      {
        $unwind: '$locationDetails',
      },

      // Stage 4: Filter by licensee to ensure only relevant machines are included
      {
        $match: {
          'locationDetails.rel.licencee': query.licenseeId,
        },
      },

      // Stage 5: Project only the fields needed for analytics
      {
        $project: {
          _id: 1,
          name: 1,
          locationName: '$locationDetails.name',
          totalDrop: 1,
          gross: 1,
          isOnline: 1,
          hasSas: 1,
        },
      },

      // Stage 6: Sort machines by total drop in descending order (highest performers first)
      {
        $sort: {
          totalDrop: -1,
        },
      },
    ];

    if (limit) {
      machinesPipeline.push({ $limit: limit });
    }

    const machines: MachineAnalytics[] =
      await Machine.aggregate(machinesPipeline);
    return NextResponse.json({ machines });
  } catch (error: unknown) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
