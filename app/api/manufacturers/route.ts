import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching manufacturers
 */
export async function GET(req: NextRequest) {
  return withApiAuth(req, async () => {
    const startTime = Date.now();
    try {
      const manufacturers = await Machine.aggregate([
        { $project: { manufacturer: 1, manuf: 1 } },
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
            allManufacturers: { $setUnion: ['$manufacturers', '$manufs'] },
          },
        },
      ]);

      const uniqueManufacturers = manufacturers[0]?.allManufacturers || [];
      const filteredManufacturers = uniqueManufacturers.filter(
        (m: unknown) =>
          m && typeof m === 'string' && (m as string).trim() !== ''
      );
      const sortedManufacturers = filteredManufacturers.sort();

      const duration = Date.now() - startTime;
      if (duration > 1000)
        console.warn(`[Manufacturers API] Completed in ${duration}ms`);
      return NextResponse.json(sortedManufacturers);
    } catch (error) {
      console.error(`[Manufacturers API] Error:`, error);
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  });
}
