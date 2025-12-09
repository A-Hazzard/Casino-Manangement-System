/**
 * Meter Trends Metrics API Route
 *
 * This route handles fetching meter trend data for gaming locations.
 * It supports:
 * - Filtering by time period or custom date range
 * - Filtering by licensee
 * - Role-based location filtering
 * - Currency conversion for admin/developer users
 * - Hourly or daily aggregation based on time period
 *
 * @module app/api/metrics/meters/route
 */

import { getUserAccessibleLicenseesFromToken } from '@/app/api/lib/helpers/licenseeFilter';
import {
  getMeterTrends,
  validateCustomDateRange,
} from '@/app/api/lib/helpers/meterTrends';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { CurrencyCode } from '@/shared/types/currency';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles MongoDB-specific errors and returns appropriate HTTP responses
 *
 * @param error - Error object
 * @returns NextResponse with error details
 */
function handleMongoDBError(error: unknown): NextResponse | null {
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes('mongonetworktimeouterror') ||
      (errorMessage.includes('connection') &&
        errorMessage.includes('timed out'))
    ) {
      return NextResponse.json(
        {
          error: 'Database connection timeout',
          message:
            'The database is currently experiencing high load. Please try again in a few moments.',
          type: 'CONNECTION_TIMEOUT',
          retryable: true,
        },
        { status: 503 }
      );
    }

    if (
      errorMessage.includes('mongoserverselectionerror') ||
      errorMessage.includes('server selection')
    ) {
      return NextResponse.json(
        {
          error: 'Database server unavailable',
          message:
            'Unable to connect to the database server. Please try again later.',
          type: 'SERVER_UNAVAILABLE',
          retryable: true,
        },
        { status: 503 }
      );
    }

    if (
      errorMessage.includes('mongodb') ||
      errorMessage.includes('connection')
    ) {
      return NextResponse.json(
        {
          error: 'Database connection failed',
          message:
            'Unable to establish connection to the database. Please try again.',
          type: 'CONNECTION_ERROR',
          retryable: true,
        },
        { status: 503 }
      );
    }
  }

  return null;
}

/**
 * Main GET handler for fetching meter trends
 *
 * Flow:
 * 1. Parse and validate request parameters
 * 2. Connect to database
 * 3. Authenticate user and get accessible locations
 * 4. Validate licensee access
 * 5. Validate custom date range if applicable
 * 6. Fetch meter trends data
 * 7. Return aggregated metrics
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse and validate request parameters
    // ============================================================================
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const { startDate, endDate } = params;
    const timePeriod = params.timePeriod;
    const rawLicencee =
      params.licencee || params.licensee || params.licenceeId || '';
    const licencee =
      rawLicencee && rawLicencee !== 'all' ? String(rawLicencee) : '';
    const displayCurrency =
      (params.currency as CurrencyCode | undefined) || 'USD';
    const granularity = params.granularity as 'hourly' | 'minute' | undefined;

    if (!timePeriod) {
      return NextResponse.json(
        { error: 'timePeriod parameter is required' },
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
    // STEP 3: Authenticate user and get accessible locations
    // ============================================================================
    const accessibleLicensees = await getUserAccessibleLicenseesFromToken();
    const userPayload = await getUserFromServer();
    const userRoles = (userPayload?.roles as string[]) || [];
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLocations?: string[] })?.assignedLocations
      )
    ) {
      userLocationPermissions = (userPayload as { assignedLocations: string[] })
        .assignedLocations;
    }

    // ============================================================================
    // STEP 4: Validate licensee access
    // ============================================================================
    if (licencee && accessibleLicensees !== 'all') {
      if (!accessibleLicensees.includes(licencee)) {
        return NextResponse.json(
          { error: 'Unauthorized: You do not have access to this licensee' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 5: Validate custom date range if applicable
    // ============================================================================
    const dateRangeError = validateCustomDateRange(
      timePeriod,
      startDate,
      endDate
    );
    if (dateRangeError) {
      return NextResponse.json({ error: dateRangeError }, { status: 400 });
    }

    // ============================================================================
    // STEP 6: Fetch meter trends data
    // ============================================================================
    const aggregatedMetrics = await getMeterTrends(
      db,
      {
        timePeriod,
        licencee,
        startDate,
        endDate,
        displayCurrency,
        granularity,
      },
      accessibleLicensees,
      userRoles,
      userLocationPermissions
    );

    // ============================================================================
    // STEP 7: Return aggregated metrics
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Metrics Meters API] Completed in ${duration}ms`);
    }
    return NextResponse.json(aggregatedMetrics);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[Meter Trends Metrics GET API] Error after ${duration}ms:`,
      error
    );

    const mongoErrorResponse = handleMongoDBError(error);
    if (mongoErrorResponse) {
      return mongoErrorResponse;
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.',
        type: 'INTERNAL_ERROR',
        retryable: false,
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? { message: errorMessage, stack: error.stack }
            : undefined,
      },
      { status: 500 }
    );
  }
}
