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
import { Meters } from '@/app/api/lib/models/meters';
import { LocationResponse, MeterMatchStage } from '@/lib/types/location';
import type { PipelineStage } from 'mongoose';
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
        { deletedAt: { $lt: new Date('2025-01-01') } },
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
    // STEP 5 & 6: Single aggregation combining meters, machines, and locations
    // ============================================================================
    // 🚀 OPTIMIZED: Single aggregation starting from Meters, joining to machines, then locations
    // This eliminates the need for 2 separate queries and in-memory combination
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

    const aggregationPipeline: PipelineStage[] = [
      // Stage 1: Start from Meters - filter by date range
      { $match: matchStage },
      // Stage 2: Join to machines to get gamingLocation
      {
        $lookup: {
          from: 'machines',
          localField: 'machine',
          foreignField: '_id',
          as: 'machineDetails',
        },
      },
      {
        $unwind: {
          path: '$machineDetails',
          preserveNullAndEmptyArrays: false,
        },
      },
      // Stage 3: Join to locations to apply location filters and get location data
      {
        $lookup: {
          from: 'gaminglocations',
          localField: 'machineDetails.gamingLocation',
          foreignField: '_id',
          as: 'locationDetails',
        },
      },
      {
        $unwind: {
          path: '$locationDetails',
          preserveNullAndEmptyArrays: false,
        },
      },
      // Stage 4: Apply location filters (deletion status, search, licensee)
      // Note: locationMatch already includes deletion status, search, and licensee filters
      { $match: locationMatch },
      // Stage 5: Group by location to calculate financial metrics and machine stats
            {
              $group: {
          _id: '$locationDetails._id',
          // Location fields
          name: { $first: '$locationDetails.name' },
          address: { $first: '$locationDetails.address' },
          country: { $first: '$locationDetails.country' },
          rel: { $first: '$locationDetails.rel' },
          profitShare: { $first: '$locationDetails.profitShare' },
          geoCoords: { $first: '$locationDetails.geoCoords' },
          isLocalServer: { $first: '$locationDetails.isLocalServer' },
          // Financial metrics from meters
          moneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
          moneyOut: {
            $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
          },
          // Machine statistics (count unique machines and online status)
          machineIds: { $addToSet: '$machineDetails._id' },
          onlineMachineIds: {
            $addToSet: {
                    $cond: [
                      {
                  $and: [
                    { $ne: ['$machineDetails.lastActivity', null] },
                    {
                      $gte: ['$machineDetails.lastActivity', threeMinutesAgo],
                    },
                        ],
                      },
                '$machineDetails._id',
                '$$REMOVE',
                    ],
                  },
                },
              },
            },
      // Stage 6: Calculate derived fields
      {
        $addFields: {
          gross: { $subtract: ['$moneyIn', '$moneyOut'] },
          totalMachines: { $size: '$machineIds' },
          onlineMachines: { $size: '$onlineMachineIds' },
        },
      },
      // Stage 7: Project final fields
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
          moneyIn: 1,
          moneyOut: 1,
          gross: 1,
          isLocalServer: { $ifNull: ['$isLocalServer', false] },
          hasSmib: { $gt: ['$totalMachines', 0] }, // Simplified - assumes machines with meters have SMIB
        },
      },
    ];

    // Use cursor for performance (MANDATORY for Meters aggregations)
    const locations: Array<LocationResponse & { moneyIn?: number; moneyOut?: number }> = [];
    const cursor = Meters.aggregate<
      LocationResponse & { moneyIn?: number; moneyOut?: number }
    >(aggregationPipeline).cursor({ batchSize: 1000 });

    for await (const doc of cursor) {
      locations.push(doc as LocationResponse & { moneyIn?: number; moneyOut?: number });
    }

    // ============================================================================
    // STEP 7: Return search results
    // ============================================================================
    const response = locations.map(loc => ({
        _id: loc._id,
        locationName: loc.name,
        country: loc.country,
        address: loc.address,
        rel: loc.rel,
        profitShare: loc.profitShare,
        geoCoords: loc.geoCoords,
      totalMachines: loc.totalMachines || 0,
      onlineMachines: loc.onlineMachines || 0,
      moneyIn: (loc as { moneyIn?: number }).moneyIn || 0,
      moneyOut: (loc as { moneyOut?: number }).moneyOut || 0,
      gross: loc.gross || 0,
      isLocalServer: loc.isLocalServer || false,
      hasSmib: loc.hasSmib || false,
    }));

    const duration = Date.now() - startTime;
    if (duration > 2000) {
      console.warn(`[Locations Search API] Completed in ${duration}ms`);
    }

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Locations Search API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
