/**
 * Bulk Reports Fix Helpers
 *
 * This module provides functions for fixing all collection reports with data integrity issues:
 * - Checking reports for issues (prevIn/prevOut mismatches, machine history problems)
 * - Fixing reports using the comprehensive fixReportIssues function
 * - Batch processing with progress tracking
 *
 * @module app/api/lib/helpers/bulkReportsFix
 */

import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import type { MachineWithOptionalHistory } from '@/app/api/lib/types';
import { fixReportIssues } from './fixOperations';

type CollectionDocument = {
  _id: unknown;
  machineId?: string;
  collectionTime?: Date;
  timestamp: Date;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  locationReportId?: string;
  deletedAt?: Date;
  isCompleted?: boolean;
};

type ReportDocument = {
  locationReportId: string;
  timestamp: Date;
  location?: string;
};

/**
 * Fix all collection reports with data integrity issues
 *
 * Flow:
 * 1. Get all collection reports sorted by timestamp
 * 2. Check each report for issues (prevIn/prevOut mismatches, machine history)
 * 3. For reports with issues, apply comprehensive fixes using fixReportIssues
 * 4. Return detailed summary of fixes
 *
 * @returns Object containing processing summary and detailed results
 */
export async function fixAllReportsData(): Promise<{
  totalReportsChecked: number;
  reportsWithIssues: number;
  reportsFixed: number;
  totalIssuesFixed: number;
  errors: Array<{ reportId: string; error: string }>;
  details: Array<{
    reportId: string;
    reportName: string;
    issuesFixed: number;
  }>;
}> {
  console.warn('🔧 Starting fix all reports...');

  // Get all collection reports
  const reports = (await CollectionReport.find({}).sort({
    timestamp: -1,
  })) as ReportDocument[];

  console.warn(`📊 Found ${reports.length} total reports to check`);

  const fixResults = {
    totalReportsChecked: reports.length,
    reportsWithIssues: 0,
    reportsFixed: 0,
    totalIssuesFixed: 0,
    errors: [] as { reportId: string; error: string }[],
    details: [] as {
      reportId: string;
      reportName: string;
      issuesFixed: number;
    }[],
  };

  // Check which reports have issues first
  const reportsToFix: string[] = [];

  console.warn('🔍 Checking reports for issues...');

  for (const report of reports) {
    const reportId = report.locationReportId;
    const hasIssues = await checkReportForIssues(reportId);

    if (hasIssues) {
      reportsToFix.push(reportId);
    }
  }

  fixResults.reportsWithIssues = reportsToFix.length;
  console.warn(`📊 Found ${reportsToFix.length} reports with issues to fix`);

  // Fix each report that has issues
  for (const reportId of reportsToFix) {
    try {
      const report = await CollectionReport.findOne({
        locationReportId: reportId,
      });
      if (!report) continue;

      console.warn(
        `\n🔧 Fixing report: ${reportId} (${(report as ReportDocument).location || 'Unknown'})`
      );

      // Use the comprehensive fix function from fixReportOperations
      const { fixResults: reportFixResults } = await fixReportIssues(reportId);

      const totalIssuesFixed = Object.values(
        reportFixResults.issuesFixed
      ).reduce((sum, val) => sum + val, 0);

      if (totalIssuesFixed > 0) {
        fixResults.reportsFixed++;
        fixResults.totalIssuesFixed += totalIssuesFixed;
        fixResults.details.push({
          reportId,
          reportName: (report as ReportDocument).location || reportId,
          issuesFixed: totalIssuesFixed,
        });

        console.warn(
          `✅ Fixed ${totalIssuesFixed} issues in report ${reportId}`
        );
      }
    } catch (error) {
      console.error(`❌ Error fixing report ${reportId}:`, error);
      fixResults.errors.push({
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.warn('\n🎉 FIX ALL REPORTS COMPLETED:');
  console.warn(
    `   📊 Total reports checked: ${fixResults.totalReportsChecked}`
  );
  console.warn(`   ⚠️  Reports with issues: ${fixResults.reportsWithIssues}`);
  console.warn(`   🔧 Reports fixed: ${fixResults.reportsFixed}`);
  console.warn(`   ✅ Total issues fixed: ${fixResults.totalIssuesFixed}`);
  console.warn(`   ❌ Errors: ${fixResults.errors.length}`);

  return fixResults;
}

/**
 * Check if a report has issues that need fixing
 *
 * Checks for:
 * - prevIn/prevOut mismatches in collections
 * - Machine history issues (entries with 0 prevIn/prevOut)
 *
 * @param reportId - Report ID to check
 * @returns True if report has issues, false otherwise
 */
async function checkReportForIssues(reportId: string): Promise<boolean> {
  const collections = (await Collections.find({
    locationReportId: reportId,
  })) as CollectionDocument[];

  // Check prevIn/prevOut issues
  for (const collection of collections) {
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machine = await Machine.findOne({ _id: collection.machineId }).lean();

    if (machine) {
      // Find the actual previous collection to get correct prevIn/prevOut values
      const actualPreviousCollection = (await Collections.findOne({
        machineId: collection.machineId,
        $and: [
          {
            $or: [
              {
                collectionTime: {
                  $lt: collection.collectionTime || collection.timestamp,
                },
              },
              {
                timestamp: {
                  $lt: collection.collectionTime || collection.timestamp,
                },
              },
            ],
          },
          {
            $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
          },
          { isCompleted: true },
        ],
      })
        .sort({ collectionTime: -1, timestamp: -1 })
        .lean()) as CollectionDocument | null;

      if (actualPreviousCollection) {
        const expectedPrevIn = actualPreviousCollection.metersIn || 0;
        const expectedPrevOut = actualPreviousCollection.metersOut || 0;

        // Allow for minor precision differences (within 0.1)
        const prevInDiff = Math.abs(collection.prevIn - expectedPrevIn);
        const prevOutDiff = Math.abs(collection.prevOut - expectedPrevOut);

        if (prevInDiff > 0.1 || prevOutDiff > 0.1) {
          return true;
        }
      } else {
        // No previous collection exists, so prevIn/prevOut should be 0
        if (collection.prevIn !== 0 || collection.prevOut !== 0) {
          return true;
        }
      }
    }
  }

  // Check machine history issues
  const machineIds = [...new Set(collections.map(c => c.machineId))];
  for (const machineId of machineIds) {
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machine = (await Machine.findOne({
      _id: machineId,
    }).lean()) as MachineWithOptionalHistory | null;
    if (machine && machine.collectionMetersHistory) {
      const history = machine.collectionMetersHistory;
      for (let i = 1; i < history.length; i++) {
        const entry = history[i];
        if (
          (!entry.prevMetersIn || entry.prevMetersIn === 0) &&
          (!entry.prevMetersOut || entry.prevMetersOut === 0)
        ) {
          return true;
        }
      }
    }
  }

  return false;
}
