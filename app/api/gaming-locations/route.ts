/**
 * Gaming Locations API Route
 *
 * This route handles fetching gaming locations filtered by licensee.
 * It supports:
 * - Single licensee filtering
 * - Multiple licensees filtering (comma-separated)
 * - Deleted location exclusion
 *
 * @module app/api/gaming-locations/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching gaming locations
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licensee, licensees)
 * 3. Build query filter with deleted location exclusion
 * 4. Apply licensee filtering
 * 5. Fetch locations from database
 * 6. Format locations with licensee ID
 * 7. Return formatted locations list
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licensee = searchParams.get('licensee');
    const licensees = searchParams.get('licensees'); // Support multiple licensees (comma-separated)
    const ids = searchParams.get('ids'); // Support specific IDs (comma-separated)
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // ============================================================================
    // STEP 3: Build query filter with deleted location exclusion
    // ============================================================================
    const query: Record<string, unknown> = {};

    if (!includeDeleted) {
      query.$or = [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ];
    }

    // ============================================================================
    // STEP 4: Apply licensee filtering
    // ============================================================================
    // If multiple licensees are provided (comma-separated), filter by all of them
    if (licensees) {
      const licenseeArray = licensees
        .split(',')
        .map(l => l.trim())
        .filter(l => l);
      if (licenseeArray.length > 0) {
        query['rel.licencee'] = { $in: licenseeArray };
      }
    } else if (licensee) {
      // Single licensee filter (backwards compatibility)
      query['rel.licencee'] = licensee;
    }

    // Filter by specific IDs if provided
    if (ids) {
      const idArray = ids.split(',').map(id => id.trim()).filter(id => id);
      if (idArray.length > 0) {
        query._id = { $in: idArray };
        // If IDs are provided, we often want to bypass the licensee filter 
        // especially for profile display of assigned locations
        delete query['rel.licencee'];
      }
    }

    // ============================================================================
    // STEP 5: Fetch locations from database
    // ============================================================================
    const locations = await GamingLocations.find(query, {
      _id: 1,
      name: 1,
      'rel.licencee': 1,
    })
      .sort({ name: 1 })
      .lean();

    // ============================================================================
    // STEP 6: Format locations with licensee ID
    // ============================================================================
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

    // ============================================================================
    // STEP 7: Return formatted locations list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Gaming Locations API] Completed in ${duration}ms`);
    }

    return NextResponse.json(formattedLocations);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to fetch gaming locations';
    console.error(
      `[Gaming Locations API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch gaming locations',
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

