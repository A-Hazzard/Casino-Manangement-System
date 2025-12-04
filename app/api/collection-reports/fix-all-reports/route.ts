/**
 * Fix All Reports API Route
 *
 * This route handles fixing all collection reports with data integrity issues, including:
 * - Checking all reports for issues (prevIn/prevOut mismatches, machine history problems)
 * - Fixing reports using comprehensive fix operations
 * - Batch processing with detailed progress tracking
 *
 * Supports:
 * - Bulk processing of all collection reports
 * - Admin/developer access control only
 * - Comprehensive error tracking and reporting
 *
 * @module app/api/collection-reports/fix-all-reports/route
 */

import { NextResponse } from 'next/server';
import { fixAllReportsData } from '../../lib/helpers/bulkReportsFix';
import { getUserById, getUserIdFromServer } from '../../lib/helpers/users';
import { connectDB } from '../../lib/middleware/db';

/**
 * Main POST handler for fixing all collection reports with data integrity issues
 *
 * Flow:
 * 1. Connect to database and authenticate user (admin/developer required)
 * 2. Check all reports for issues
 * 3. Execute fix operation for reports with issues
 * 4. Return detailed summary of all fixes and errors
 */
export async function POST() {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();
    console.warn('🔧 Starting fix all reports...');

    // ============================================================================
    // STEP 2: Authenticate user and check permissions (admin/developer required)
    // ============================================================================
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔧 Skipping authentication in development mode');
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
    // STEP 3: Check all reports for issues and fix them
    // ============================================================================
    const results = await fixAllReportsData();

    // ============================================================================
    // STEP 4: Return detailed summary of fixes
    // ============================================================================
    const duration = Date.now() - startTime;
    console.log(
      `[Fix All Reports POST API] Fixed ${results.reportsFixed}/${results.totalReportsChecked} reports with ${results.totalIssuesFixed} total issues after ${duration}ms.`
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalReportsChecked: results.totalReportsChecked,
        reportsWithIssues: results.reportsWithIssues,
        reportsFixed: results.reportsFixed,
        totalIssuesFixed: results.totalIssuesFixed,
        errorCount: results.errors.length,
      },
      details: results.details,
      errors: results.errors.length > 0 ? results.errors : undefined,
      message: `Checked ${results.totalReportsChecked} reports. Found ${results.reportsWithIssues} with issues. Fixed ${results.reportsFixed} reports with ${results.totalIssuesFixed} total issues.`,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[Fix All Reports POST API] Error after ${duration}ms:`,
      errorMessage
    );

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
