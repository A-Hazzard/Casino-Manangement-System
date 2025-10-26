import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';

/**
 * GET /api/machines/by-id?id=<machineId>
 * Get a single machine by ID with its gamingLocation field and smibConfig
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Fetch machine with gamingLocation field and smibConfig
    const machine = await Machine.findOne({
      _id: id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).select(
      '_id serialNumber game gamingLocation assetStatus cabinetType createdAt updatedAt smibConfig relayId smibBoard'
    );

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Error fetching machine:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch machine' },
      { status: 500 }
    );
  }
}

export function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
