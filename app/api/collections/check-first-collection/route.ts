import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Collections } from '@/app/api/lib/models/collections';

/**
 * Check if this would be the first collection for a machine
 * GET /api/collections/check-first-collection?machineId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json(
        { error: 'machineId is required' },
        { status: 400 }
      );
    }

    // Check if any collections exist for this machine
    const existingCollection = await Collections.findOne({
      machineId: machineId,
    })
      .select('_id')
      .lean();

    const isFirstCollection = !existingCollection;

    return NextResponse.json({
      isFirstCollection,
      machineId,
    });
  } catch (error) {
    console.error('Error checking first collection:', error);
    return NextResponse.json(
      {
        error: 'Failed to check collection status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

