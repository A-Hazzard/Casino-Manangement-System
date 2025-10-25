import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';

/**
 * GET /api/machines/[id]
 * Get a single machine by ID with its gamingLocation field
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await connectDB();

    // Fetch machine with gamingLocation field
    const machine = await Machine.findOne({
      _id: id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    }).select(
      '_id serialNumber game gamingLocation assetStatus cabinetType createdAt updatedAt'
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
