import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';

export async function GET(_request: NextRequest) {
  try {
    await connectDB();

    // Get unique manufacturers from the machines collection
    // We'll check both 'manufacturer' and 'manuf' fields
    // Simplified approach: get all manufacturers and filter out empty ones
    const manufacturers = await Machine.aggregate([
      {
        $project: {
          manufacturer: 1,
          manuf: 1,
        },
      },
      {
        $group: {
          _id: null,
          manufacturers: { $addToSet: '$manufacturer' },
          manufs: { $addToSet: '$manuf' },
        },
      },
      {
        $project: {
          _id: 0,
          allManufacturers: {
            $setUnion: ['$manufacturers', '$manufs'],
          },
        },
      },
    ]);

    // Extract the unique manufacturers array
    const uniqueManufacturers = manufacturers[0]?.allManufacturers || [];

    // Filter out null, undefined, and empty string values
    const filteredManufacturers = uniqueManufacturers.filter(
      (manufacturer: string) => manufacturer && manufacturer.trim() !== ''
    );

    // Sort alphabetically
    const sortedManufacturers = filteredManufacturers.sort();

    return NextResponse.json(sortedManufacturers);
  } catch (error) {
    console.error('Error fetching manufacturers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manufacturers' },
      { status: 500 }
    );
  }
}
