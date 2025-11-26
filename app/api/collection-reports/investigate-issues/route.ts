/**
 * Investigate Issues API Route
 *
 * This route handles investigating collection report issues.
 * It supports:
 * - GET: Investigates the most recent collection report and identifies all issues
 *        with SAS times, history, and prevIn/prevOut values
 *
 * @module app/api/collection-reports/investigate-issues/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../lib/middleware/db';
import { getUserIdFromServer, getUserById } from '../../lib/helpers/users';
import { investigateMostRecentReport } from '@/app/api/lib/helpers/collectionIssueChecker';

/**
 * Main GET handler for investigating issues
 *
 * Flow:
 * 1. Connect to database
 * 2. Authenticate and authorize user (admin/developer only)
 * 3. Investigate most recent report using helper
 * 4. Return investigation results
 */
export async function GET(_request: NextRequest) {
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
          `[Investigate Issues GET API] Unauthorized access after ${duration}ms.`
        );
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const user = await getUserById(userId);
      if (!user) {
        const duration = Date.now() - startTime;
        console.error(
          `[Investigate Issues GET API] User not found after ${duration}ms.`
        );
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (
        !user.roles?.includes('admin') &&
        !user.roles?.includes('developer')
      ) {
        const duration = Date.now() - startTime;
        console.error(
          `[Investigate Issues GET API] Insufficient permissions after ${duration}ms.`
        );
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // ============================================================================
    // STEP 3: Investigate most recent report using helper
    // ============================================================================
    const result = await investigateMostRecentReport();

    if (!result.success) {
      const duration = Date.now() - startTime;
      console.error(
        `[Investigate Issues GET API] Failed to investigate report after ${duration}ms: ${result.error}`
      );
      return NextResponse.json(
        { error: result.error || 'Failed to investigate report' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Return investigation results
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Investigate Issues GET API] Successfully investigated report ${result.reportId}: ${result.collectionsWithIssues} collections with issues, ${result.machinesWithIssues} machines with issues after ${duration}ms.`
    );
    return NextResponse.json({
      success: true,
      summary: {
        reportId: result.reportId,
        reportDetails: result.reportDetails,
        totalCollections: result.totalCollections,
        collectionsWithIssues: result.collectionsWithIssues,
        machinesWithIssues: result.machinesWithIssues,
        issues: result.issues,
      },
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Investigate Issues GET API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: 'Investigation failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
