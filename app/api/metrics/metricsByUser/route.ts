/**
 * User Metrics API Route
 *
 * This route handles fetching aggregated metrics for a specific user.
 * It supports:
 * - Fetching user metrics from casinoMetrics collection
 * - Validating time period parameter
 *
 * @module app/api/metrics/metricsByUser/route
 */

import {
  getUserMetrics,
  validateTimePeriod,
} from '@/app/api/lib/helpers/users/metrics';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching user metrics
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Validate time period
 * 3. Fetch user metrics
 * 4. Return user metrics
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get('userId');
    const timePeriod = searchParams.get('timePeriod');

    if (!userIdStr) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 2: Validate time period
    // ============================================================================
    const timePeriodError = validateTimePeriod(timePeriod);
    if (timePeriodError) {
      return NextResponse.json({ error: timePeriodError }, { status: 400 });
    }

    // ============================================================================
    // STEP 3: Fetch user metrics
    // ============================================================================
    const metricsForLocations = await getUserMetrics(userIdStr);

    if (!metricsForLocations) {
      return NextResponse.json(
        { error: 'User metrics not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Return user metrics
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Metrics By User API] Completed in ${duration}ms`);
    }
    return NextResponse.json(metricsForLocations, { status: 200 });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[User Metrics GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

