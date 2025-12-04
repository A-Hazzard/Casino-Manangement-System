/**
 * Top Performers Metrics API Route
 *
 * This route handles fetching the top performing machine for a specific location.
 * It supports:
 * - Filtering by location and time period
 * - Custom date range support
 * - Optional filtering by licensee
 * - Aggregating financial and gaming metrics
 *
 * @module app/api/metrics/top-performers/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { getDatesForTimePeriod } from '@/app/api/lib/utils/dates';
import type { TimePeriod } from '@/app/api/lib/types';
import { Meters } from '@/app/api/lib/models/meters';
import type { Db } from 'mongodb';
import type { PipelineStage } from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Builds aggregation pipeline for top performer
 *
 * @param locationId - Location ID to filter by
 * @param startDate - Start date
 * @param endDate - End date
 * @param licencee - Optional licensee to filter by
 * @returns Aggregation pipeline stages
 */
function buildTopPerformerPipeline(
  locationId: string,
  startDate: Date,
  endDate: Date,
  licencee?: string | null
): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    {
      $match: {
        location: locationId,
        readAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $lookup: {
        from: 'machines',
        localField: 'machine',
        foreignField: '_id',
        as: 'machineDetails',
      },
    },
    {
      $unwind: '$machineDetails',
    },
    {
      $lookup: {
        from: 'gaminglocations',
        localField: 'location',
        foreignField: '_id',
        as: 'locationDetails',
      },
    },
    {
      $unwind: '$locationDetails',
    },
  ];

  if (licencee) {
    pipeline.push({
      $match: {
        'locationDetails.rel.licencee': licencee,
      },
    } as PipelineStage);
  }

  pipeline.push(
    {
      $group: {
        _id: '$machine',
        machineName: { $first: '$machineDetails.Custom.name' },
        serialNumber: { $first: '$machineDetails.serialNumber' },
        revenue: {
          $sum: {
            $subtract: [
              { $ifNull: ['$movement.drop', 0] },
              { $ifNull: ['$movement.totalCancelledCredits', 0] },
            ],
          },
        },
        drop: { $sum: { $ifNull: ['$movement.drop', 0] } },
        cancelledCredits: {
          $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] },
        },
        gamesPlayed: { $sum: { $ifNull: ['$movement.gamesPlayed', 0] } },
      },
    },
    {
      $addFields: {
        holdPercentage: {
          $cond: [
            { $gt: ['$drop', 0] },
            { $multiply: [{ $divide: ['$revenue', '$drop'] }, 100] },
            0,
          ],
        },
      },
    },
    {
      $sort: { revenue: -1 },
    },
    {
      $limit: 1,
    },
    {
      $project: {
        _id: 0,
        machineId: '$_id',
        machineName: {
          $cond: [
            { $ne: ['$machineName', null] },
            '$machineName',
            { $concat: ['Machine ', '$serialNumber'] },
          ],
        },
        revenue: '$revenue',
        holdPercentage: { $round: ['$holdPercentage', 1] },
        drop: '$drop',
        cancelledCredits: '$cancelledCredits',
        gamesPlayed: '$gamesPlayed',
      },
    }
  );

  return pipeline;
}

/**
 * Fetches top performer for a location
 *
 * @param db - Database connection
 * @param locationId - Location ID to filter by
 * @param timePeriod - Time period
 * @param startDateParam - Optional custom start date
 * @param endDateParam - Optional custom end date
 * @param licencee - Optional licensee to filter by
 * @returns Top performer data or null
 */
async function getTopPerformer(
  db: Db,
  locationId: string,
  timePeriod: TimePeriod,
  startDateParam?: string | null,
  endDateParam?: string | null,
  licencee?: string | null
): Promise<unknown | null> {
  let startDate: Date | undefined;
  let endDate: Date | undefined;

  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
  } else {
    const dateRange = getDatesForTimePeriod(timePeriod);
    startDate = dateRange.startDate;
    endDate = dateRange.endDate;

    if (!startDate || !endDate) {
      const now = new Date();
      endDate = now;
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  const pipeline = buildTopPerformerPipeline(
    locationId,
    startDate!,
    endDate!,
    licencee
  );

  const topPerformers = await Meters.aggregate(pipeline);
  return topPerformers[0] || null;
}

/**
 * Main GET handler for fetching top performer
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Fetch top performer data
 * 4. Return top performer
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const timePeriod =
      (searchParams.get('timePeriod') as TimePeriod) || 'Today';
    const licencee = searchParams.get('licencee');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Connect to database
    // ============================================================================
    const db = await connectDB();
    if (!db) {
      return NextResponse.json(
        { error: 'Database connection not established' },
        { status: 500 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch top performer data
    // ============================================================================
    const topPerformer = await getTopPerformer(
      db,
      locationId,
      timePeriod,
      startDateParam,
      endDateParam,
      licencee
    );

    // ============================================================================
    // STEP 4: Return top performer
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Top Performers API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      locationId,
      timePeriod,
      topPerformer,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch top performers';
    console.error(
      `[Top Performers Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
