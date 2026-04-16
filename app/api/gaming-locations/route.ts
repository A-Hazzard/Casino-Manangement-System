/**
 * Gaming Locations API Route
 *
 * This route handles fetching gaming locations filtered by licencee.
 *
 * @module app/api/gaming-locations/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';

/**
 * Main GET handler for fetching gaming locations
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = new URL(request.url);
    const licencee = searchParams.get('licencee');
    const licencees = searchParams.get('licencees');
    const ids = searchParams.get('ids');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const query: Record<string, unknown> = {};

    if (!includeDeleted) {
      query.$or = [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ];
    }

    if (licencees) {
      const licenceeArray = licencees.split(',').map(l => l.trim()).filter(l => l);
      if (licenceeArray.length > 0) {
        query['rel.licencee'] = { $in: licenceeArray };
      }
    } else if (licencee) {
      query['rel.licencee'] = licencee;
    }

    if (ids) {
      const idArray = ids.split(',').map(id => id.trim()).filter(id => id);
      if (idArray.length > 0) {
        query._id = { $in: idArray };
        delete query['rel.licencee'];
        delete query.$or;
      }
    }

    const locations = await GamingLocations.find(query, {
      _id: 1,
      name: 1,
      'rel.licencee': 1,
    }).sort({ name: 1 }).lean() as unknown as Pick<LocationDocument, '_id' | 'name' | 'rel'>[];

    const formattedLocations = locations.map((loc) => {
      const licenceeRaw = loc.rel?.licencee;
      let licenceeId: string | null = null;

      if (Array.isArray(licenceeRaw)) {
        licenceeId = licenceeRaw.length > 0 && licenceeRaw[0] ? String(licenceeRaw[0]) : null;
      } else if (licenceeRaw) {
        licenceeId = String(licenceeRaw);
      }

      return {
        _id: loc._id,
        id: String(loc._id),
        name: loc.name,
        licenceeId,
      };
    });

    return NextResponse.json(formattedLocations);
  });
}
