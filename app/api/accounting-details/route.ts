/**
 * Accounting Details API Route
 *
 * This route handles fetching accounting details for a specific machine.
 * It supports:
 * - Machine-specific accounting data
 * - Time period filtering (today, week, month, etc.)
 * - Accepted bills information
 *
 * @module app/api/accounting-details/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getAccountingDetails } from '@/app/api/lib/helpers/accountingDetails';
import type { BillValidatorTimePeriod } from '@/shared/types/billValidator';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/accounting-details
 *
 * Returns accounting details (including accepted bill information) for a single
 * machine, filtered by a predefined time period.
 *
 * Query params:
 * @param machineId   {string}                 Required. The ID of the machine to retrieve
 *                                             accounting details for.
 * @param timePeriod  {BillValidatorTimePeriod} Optional. Time window for the data. Defaults
 *                                             to 'today'. Accepted values are those defined
 *                                             by BillValidatorTimePeriod.
 *
 * Flow:
 * 1. Parse query parameters (machineId, timePeriod)
 * 2. Validate machine ID
 * 3. Fetch accounting details including accepted bills
 * 4. Return accounting details
 */
export async function GET(req: NextRequest) {
  const functionName = 'GET /api/accounting-details';
  const user = extractUserFromRequest(req);

  return withApiAuth(req, async () => {
    const startTime = Date.now();

    // ============================================================================
    // STEP 1: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    const timePeriod =
      (searchParams.get('timePeriod') as BillValidatorTimePeriod) || 'today';

    // ============================================================================
    // STEP 2: Validate machine ID
    // ============================================================================
    if (!machineId) {
      logRouteError(
        functionName,
        'GET',
        '/api/accounting-details',
        'Machine ID is required',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch accounting details including accepted bills
    // ============================================================================
    try {
      const accountingDetails = await getAccountingDetails(machineId, timePeriod);

      // ============================================================================
      // STEP 4: Return accounting details
      // ============================================================================
      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`[${functionName}] slow: ${duration}ms`);
      }
      logRouteFetch(
        functionName,
        'GET',
        '/api/accounting-details',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        data: accountingDetails,
      });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      logRouteError(
        functionName,
        'GET',
        '/api/accounting-details',
        errorMessage,
        user
      );
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch accounting details',
          details: errorMessage,
        },
        { status: 500 }
      );
    }
  });
}
