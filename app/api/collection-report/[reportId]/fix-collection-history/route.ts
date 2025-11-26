/**
 * Fix Collection History API Route
 *
 * This route handles fixing collection history issues for a specific collection report.
 * It supports:
 * - POST: Fixes prevIn/prevOut issues in collectionMetersHistory for all machines in a report
 *
 * @module app/api/collection-report/[reportId]/fix-collection-history/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';
import { getUserIdFromServer, getUserById } from '../../../lib/helpers/users';
import { fixCollectionHistoryForReport } from '@/app/api/lib/helpers/sasTimesFix';

/**
 * Main POST handler for fixing collection history
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate and authorize user (admin/developer only)
 * 3. Extract and validate reportId from URL params
 * 4. Fix collection history for report using helper
 * 5. Return summary of fixes applied
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to the database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate and authorize user (admin/developer only)
    // ============================================================================
    if (process.env.NODE_ENV !== 'development') {
      const userId = await getUserIdFromServer();
      if (!userId) {
        const duration = Date.now() - startTime;
        console.error(
          `[Fix Collection History POST API] Unauthorized access after ${duration}ms.`
        );
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        const duration = Date.now() - startTime;
        console.error(
          `[Fix Collection History POST API] User not found after ${duration}ms.`
        );
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('developer')
      ) {
        const duration = Date.now() - startTime;
        console.error(
          `[Fix Collection History POST API] Insufficient permissions after ${duration}ms.`
        );
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 3: Extract and validate reportId from URL params
    // ============================================================================
    const { reportId } = await params;

    if (!reportId) {
      const duration = Date.now() - startTime;
      console.error(
        `[Fix Collection History POST API] Missing report ID after ${duration}ms.`
      );
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Fix collection history for report using helper
    // ============================================================================
    const result = await fixCollectionHistoryForReport(reportId);

    if (!result.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Fix Collection History POST API] Failed to fix collection history for report ${reportId} after ${duration}ms: ${result.error}`
      );
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to fix collection history',
        },
        { status: result.error === 'Report not found' ? 404 : 500 }
      );
    }

    // ============================================================================
    // STEP 5: Return summary of fixes applied
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix Collection History POST API] Successfully fixed collection history for report ${reportId}: ${result.machinesFixedCount} machines fixed, ${result.totalHistoryRebuilt} history entries rebuilt after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      message: 'Collection history fix completed successfully',
      summary: {
        totalMachinesInReport: result.totalMachinesInReport,
        machinesWithIssues: result.machinesWithIssues,
        machinesFixed: result.machinesFixedCount,
        totalHistoryRebuilt: result.totalHistoryRebuilt,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Fix Collection History POST API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix collection history',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
