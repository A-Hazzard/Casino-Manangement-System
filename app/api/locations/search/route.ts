/**
 * Locations Search API Route
 *
 * This route handles searching locations with financial metrics.
 * It supports:
 * - Location name search
 * - Licensee filtering
 * - Time period filtering
 * - Financial metrics aggregation (money in, money out, gross)
 * - Machine statistics (total, online)
 *
 * @module app/api/locations/search/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import {
  LocationResponse,
  MeterMatchStage,
  Metric,
} from '@/lib/types/location';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for searching locations
 *
 * Flow:
 * 1. Parse query parameters (licensee, timePeriod, search, dates)
 * 2. Build location match filter
 * 3. Connect to database
 * 4. Build metrics aggregation pipeline
 * 5. Fetch location data with machine statistics
 * 6. Combine location and metrics data
 * 7. Return search results
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const searchParams = new URL(request.url).searchParams;
    const licencee = searchParams.get('licencee') ?? '';
    const search = searchParams.get('search')?.trim() || '';

    // ============================================================================
    // STEP 2: Build location match filter
    // ============================================================================
    const locationMatch: Record<string, unknown> = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    };

    if (search) {
      locationMatch.name = { $regex: search, $options: 'i' };
    }
    if (licencee) locationMatch['rel.licencee'] = licencee;

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { success: false, message: 'DB connection failed' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 4: Build metrics aggregation pipeline
    // ============================================================================
    const { searchParams: searchParamsFromRequest } = new URL(request.url);
    const startDate = new Date(
      searchParamsFromRequest.get('startDate') ??
        Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const endDate = new Date(
      searchParamsFromRequest.get('endDate') ?? Date.now()
    );

    const matchStage: MeterMatchStage = {
      readAt: { $gte: startDate, $lte: endDate },
    };
    if (licencee) {
      matchStage['rel.licencee'] = licencee;
    }

    // ============================================================================
    // STEP 5: Fetch location data with machine statistics
    // ============================================================================
    const metrics = await db
      .collection('meters')
      .aggregate<Metric>([
        // Stage 1: Filter meter records by date range and licencee
        { $match: matchStage },
        // Stage 2: Group by location to calculate financial metrics
        {
          $group: {
            _id: '$location',
            moneyIn: { $sum: '$movement.drop' },
            moneyOut: { $sum: '$movement.totalCancelledCredits' },
          },
        },
        // Stage 3: Calculate gross revenue (money in minus money out)
        { $addFields: { gross: { $subtract: ['$moneyIn', '$moneyOut'] } } },
      ])
      .toArray();

    const metricsMap = new Map<string, Metric>(
      metrics.map((m: Metric) => [m._id, m])
    );

    // ============================================================================
    // STEP 6: Combine location and metrics data
    // ============================================================================
    const locations = await db
      .collection('gaminglocations')
      .aggregate<LocationResponse>([
        // Stage 1: Filter locations by deletion status, search term, and licencee
        { $match: locationMatch },
        // Stage 2: Lookup machine statistics for each location
        {
          $lookup: {
            from: 'machines',
            let: { id: '$_id' },
            pipeline: [
              // Stage 2a: Match machines for this location (excluding deleted ones)
              {
                $match: {
                  $expr: { $eq: ['$gamingLocation', '$$id'] },
                  $or: [
                    { deletedAt: null },
                    { deletedAt: { $lt: new Date('2020-01-01') } },
                  ],
                },
              },
              // Stage 2b: Group machines to calculate counts and online status
              {
                $group: {
                  _id: null,
                  totalMachines: { $sum: 1 },
                  onlineMachines: {
                    $sum: {
                      $cond: [
                        {
                          $gt: [
                            '$lastActivity',
                            new Date(Date.now() - 3 * 60 * 1000),
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                },
              },
            ],
            as: 'machineStats',
          },
        },
        // Stage 3: Add computed fields for machine statistics and location flags
        {
          $addFields: {
            totalMachines: {
              $ifNull: [
                { $arrayElemAt: ['$machineStats.totalMachines', 0] },
                0,
              ],
            },
            onlineMachines: {
              $ifNull: [
                { $arrayElemAt: ['$machineStats.onlineMachines', 0] },
                0,
              ],
            },
            isLocalServer: { $ifNull: ['$isLocalServer', false] },
            hasSmib: { $ifNull: ['$hasSmib', false] },
          },
        },
        // Stage 4: Project final fields for location response
        {
          $project: {
            _id: 1,
            name: 1,
            address: 1,
            country: 1,
            rel: 1,
            profitShare: 1,
            geoCoords: 1,
            totalMachines: 1,
            onlineMachines: 1,
            isLocalServer: 1,
            hasSmib: 1,
          },
        },
      ])
      .toArray();

    // ============================================================================
    // STEP 7: Return search results
    // ============================================================================
    const response = locations.map((loc: LocationResponse) => {
      const metric: Metric | undefined = metricsMap.get(loc._id);
      return {
        _id: loc._id,
        locationName: loc.name,
        country: loc.country,
        address: loc.address,
        rel: loc.rel,
        profitShare: loc.profitShare,
        geoCoords: loc.geoCoords,
        totalMachines: loc.totalMachines,
        onlineMachines: loc.onlineMachines,
        moneyIn: metric?.moneyIn ?? 0,
        moneyOut: metric?.moneyOut ?? 0,
        gross: metric?.gross ?? 0,
        isLocalServer: loc.isLocalServer,
        hasSmib: loc.hasSmib,
      };
    });

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Locations Search API] Completed in ${duration}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error(`[Locations Search API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
