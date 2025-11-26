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

import { connectDB } from '@/app/api/lib/middleware/db';
import { getAccountingDetails } from '@/lib/helpers/accountingDetails';
import type { BillValidatorTimePeriod } from '@/shared/types/billValidator';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching accounting details
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters (machineId, timePeriod)
 * 3. Validate machine ID
 * 4. Fetch accounting details including accepted bills
 * 5. Return accounting details
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId');
    const timePeriod =
      (searchParams.get('timePeriod') as BillValidatorTimePeriod) || 'today';

    // ============================================================================
    // STEP 3: Validate machine ID
    // ============================================================================
    if (!machineId) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Fetch accounting details including accepted bills
    // ============================================================================
    const accountingDetails = await getAccountingDetails(machineId, timePeriod);

    // ============================================================================
    // STEP 5: Return accounting details
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Accounting Details API] Completed in ${duration}ms`);
    }

    return NextResponse.json({
      success: true,
      data: accountingDetails,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Accounting Details API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch accounting details',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
