/**
 * Investigate Machine API Route
 *
 * This route provides deep diagnostic analysis of machine data lineage, including:
 * - Analyzing collectionMetersHistory for issues (field naming, prevMeters accuracy)
 * - Matching collections with history entries
 * - Investigating individual machines or all machines in a report
 *
 * Supports:
 * - Investigating specific machine by machineId
 * - Investigating all machines in a report by reportId
 * - Admin/developer access control only
 *
 * @module app/api/collection-reports/investigate-machine/route
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  investigateReportMachines,
  investigateSpecificMachine,
} from '../../lib/helpers/machineInvestigation';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main POST handler for investigating machine data lineage
 *
 * Flow:
 * 1. Connect to database and authenticate user (admin/developer required)
 * 2. Parse request body to get machineId or reportId
 * 3. Execute investigation for specific machine or all machines in report
 * 4. Return detailed analysis and summary
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();
    console.warn('🔍 Starting machine investigation...');

    // ============================================================================
    // STEP 2: Authenticate user and check permissions (admin/developer required)
    // ============================================================================
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔍 Skipping authentication in development mode');
    } else {
      const userId = await getUserIdFromServer();
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user || Array.isArray(user)) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('developer')
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 3: Parse request body to get machineId or reportId
    // ============================================================================
    const body = await request.json().catch(() => ({}));
    const { machineId, reportId } = body;

    if (!machineId && !reportId) {
      return NextResponse.json(
        { error: 'Either machineId or reportId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Execute investigation
    // ============================================================================
    let results;

    if (reportId) {
      // Investigate all machines in a report
      results = await investigateReportMachines(reportId);
    } else {
      // Investigate specific machine
      results = await investigateSpecificMachine(machineId);
    }

    // ============================================================================
    // STEP 5: Return detailed analysis
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Investigate Machine POST API] Investigation completed after ${duration}ms.`
    );

    return NextResponse.json(results);
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Investigate Machine POST API] Error after ${duration}ms:`,
      errorMessage
    );

    // Handle specific error cases
    if (
      errorMessage === 'Machine not found' ||
      errorMessage === 'Collection report not found'
    ) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

