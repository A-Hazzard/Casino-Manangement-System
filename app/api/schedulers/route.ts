/**
 * Schedulers API Route
 *
 * This route handles fetching collection schedulers with filtering.
 * It supports:
 * - Licensee filtering
 * - Location filtering
 * - Collector filtering
 * - Status filtering
 * - Date range filtering
 *
 * @module app/api/schedulers/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import Scheduler from '@/app/api/lib/models/scheduler';
import type { MongoDBQueryValue } from '@/lib/types/common';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching schedulers
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (licensee, location, collector, status, dates)
 * 3. Build query filters
 * 4. Fetch schedulers from database
 * 5. Return schedulers list
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
    const searchParams = request.nextUrl.searchParams;
    const licencee = searchParams.get('licencee');
    const location = searchParams.get('location');
    const collector = searchParams.get('collector');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // ============================================================================
    // STEP 3: Build query filters
    // ============================================================================
    const query: Record<string, MongoDBQueryValue> = {};

    if (licencee && licencee.toLowerCase() !== 'all') {
      query.licencee = licencee;
    }

    if (location && location.toLowerCase() !== 'all') {
      query.location = location;
    }

    if (collector && collector.toLowerCase() !== 'all') {
      query.collector = collector;
    }

    if (status && status.toLowerCase() !== 'all') {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.startTime = {} as Record<string, Date>;
      if (startDate) {
        (query.startTime as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        (query.startTime as Record<string, Date>).$lte = new Date(endDate);
      }
    }

    // ============================================================================
    // STEP 4: Fetch schedulers from database with aggregated names
    // ============================================================================
    const schedulers = await Scheduler.aggregate([
      { $match: query },
      { $sort: { startTime: -1 } },
      // Join with GamingLocations for location name
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'location',
          foreignField: '_id',
          as: 'locationInfo',
        },
      },
      // Join with Users for collector name
      {
        $lookup: {
          from: 'users',
          localField: 'collector',
          foreignField: '_id',
          as: 'collectorInfo',
        },
      },
      // Join with Users for creator (manager) name
      {
        $lookup: {
          from: 'users',
          localField: 'creator',
          foreignField: '_id',
          as: 'creatorInfo',
        },
      },
      // Project fields to include names
      {
        $addFields: {
          locationName: {
            $ifNull: [{ $arrayElemAt: ['$locationInfo.name', 0] }, '$location'],
          },
          collectorName: {
            $let: {
              vars: { user: { $arrayElemAt: ['$collectorInfo', 0] } },
              in: {
                $cond: {
                  if: {
                    $and: [
                      '$$user.profile.firstName',
                      '$$user.profile.lastName',
                    ],
                  },
                  then: {
                    $concat: [
                      '$$user.profile.firstName',
                      ' ',
                      '$$user.profile.lastName',
                    ],
                  },
                  else: { $ifNull: ['$$user.username', '$collector'] },
                },
              },
            },
          },
          creatorName: {
            $let: {
              vars: { user: { $arrayElemAt: ['$creatorInfo', 0] } },
              in: {
                $cond: {
                  if: {
                    $and: [
                      '$$user.profile.firstName',
                      '$$user.profile.lastName',
                    ],
                  },
                  then: {
                    $concat: [
                      '$$user.profile.firstName',
                      ' ',
                      '$$user.profile.lastName',
                    ],
                  },
                  else: { $ifNull: ['$$user.username', '$creator'] },
                },
              },
            },
          },
        },
      },
      // Remove the join detail fields
      {
        $project: {
          locationInfo: 0,
          collectorInfo: 0,
          creatorInfo: 0,
        },
      },
    ]);

    // ============================================================================
    // STEP 5: Return schedulers list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Schedulers API] Completed in ${duration}ms`);
    }

    return NextResponse.json(schedulers);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`[Schedulers API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch schedulers', details: errorMessage },
      { status: 500 }
    );
  }
}

