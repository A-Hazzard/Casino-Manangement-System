/**
 * GET /api/manufacturers
 *
 * Returns a sorted, deduplicated list of all machine manufacturer names sourced
 * from the machines collection. Called by filter dropdowns and machine management
 * forms. Merges the 'manufacturer' and 'manuf' fields to handle legacy data.
 * Requires authentication via withApiAuth.
 *
 * No query parameters.
 *
 * @module app/api/manufacturers/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/manufacturers';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async () => {
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
      logRouteFetch(
        functionName,
        'GET',
        '/api/manufacturers',
        sortedManufacturers.length,
        user,
        duration
      );
      return NextResponse.json(sortedManufacturers);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed';
      logRouteError(
        functionName,
        'GET',
        '/api/manufacturers',
        errorMessage,
        user
      );
      return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
  });
}
